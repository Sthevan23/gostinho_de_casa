<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Password, X-Customer-Token');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

function json_out($payload, int $code = 200): void {
  http_response_code($code);
  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'GET' && isset($_GET['ping'])) {
  header('Cache-Control: no-store');
  echo '{"ok":true,"light":true,"ts":' . time() . '}';
  exit;
}

$publicDbGet = ['order', 'me', 'my_orders', 'favorites', 'notifications'];
if ($method === 'GET' && !isset($_GET['full']) && $action !== 'full' && !in_array($action, $publicDbGet, true) && !isset($_GET['rebuild']) && !isset($_GET['order'])) {
  $catalogFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'catalog.json';
  if (is_file($catalogFile)) {
    $raw = @file_get_contents($catalogFile);
    if (is_string($raw) && $raw !== '' && strpos($raw, '"products"') !== false) {
      header('Cache-Control: no-store, max-age=0');
      echo $raw;
      exit;
    }
  }
  require_once __DIR__ . '/seed_data.php';
  $fallback = gostinho_default_data();
  unset($fallback['settings']['adminEmail'], $fallback['settings']['adminPassword']);
  header('Cache-Control: no-store, max-age=0');
  json_out($fallback);
}

require_once __DIR__ . '/store.php';

function gostinho_require_admin(PDO $pdo): void {
  $password = (string) ($_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '');
  $auth = gostinho_get_auth($pdo);
  if ($password === '' || $auth['password'] === '' || !hash_equals($auth['password'], $password)) {
    json_out(['error' => 'Senha inválida'], 401);
  }
}

try {
  $pdo = gostinho_db();
} catch (Throwable $e) {
  json_out(['error' => 'Falha no banco', 'detail' => $e->getMessage()], 500);
}

if ($method === 'GET') {
  if ($action === 'me') {
    try {
      json_out(['customer' => gostinho_customer_public(gostinho_require_customer($pdo), $pdo)]);
    } catch (InvalidArgumentException $e) {
      json_out(['error' => $e->getMessage()], 401);
    }
  }
  if ($action === 'my_orders') {
    try {
      $row = gostinho_require_customer($pdo);
      json_out(['orders' => gostinho_customer_orders($pdo, $row)]);
    } catch (InvalidArgumentException $e) {
      json_out(['error' => $e->getMessage()], 401);
    }
  }
  if ($action === 'order' || isset($_GET['order'])) {
    $id = (string) ($_GET['order'] ?? $_GET['id'] ?? '');
    $order = gostinho_get_order($pdo, $id);
    if (!$order) json_out(['error' => 'Pedido não encontrado'], 404);
    json_out($order);
  }
  $wantFull = isset($_GET['full']) || $action === 'full';
  if ($wantFull) {
    gostinho_require_admin($pdo);
    json_out(gostinho_load_all($pdo, 'full'));
  }
  try {
    gostinho_write_catalog($pdo);
  } catch (Throwable $e) {
  }
  json_out(gostinho_load_all($pdo, 'public'));
}

if ($method !== 'POST') {
  json_out(['error' => 'Método não permitido'], 405);
}

$raw = file_get_contents('php://input');
$body = json_decode($raw ?: '[]', true);
if (!is_array($body)) json_out(['error' => 'JSON inválido'], 400);

$actionName = (string) ($body['action'] ?? $action);

if ($actionName === 'login') {
  $auth = gostinho_get_auth($pdo);
  $email = trim((string) ($body['email'] ?? ''));
  $pass = (string) ($body['password'] ?? '');
  if (!hash_equals($auth['email'], $email) || !hash_equals($auth['password'], $pass)) {
    json_out(['error' => 'E-mail ou senha incorretos.'], 401);
  }
  try { gostinho_write_catalog($pdo); } catch (Throwable $e) {}
  $data = gostinho_load_all($pdo, 'full');
  json_out(['ok' => true, 'data' => $data]);
}

if ($actionName === 'register') {
  try {
    json_out(['ok' => true, 'customer' => gostinho_register_customer($pdo, $body)]);
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  }
}
if ($actionName === 'customer_login') {
  try {
    json_out(['ok' => true, 'customer' => gostinho_login_customer($pdo, $body)]);
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 401);
  }
}
if ($actionName === 'reset_password') {
  try {
    json_out(gostinho_reset_customer($pdo, $body));
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  }
}
if ($actionName === 'update_profile') {
  try {
    json_out(['ok' => true, 'customer' => gostinho_update_customer($pdo, gostinho_require_customer($pdo), $body)]);
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  }
}
if ($actionName === 'save_address') {
  try {
    $row = gostinho_require_customer($pdo);
    json_out(gostinho_save_address($pdo, $row['id'], $body['address'] ?? $body));
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  }
}
if ($actionName === 'delete_address') {
  try {
    $row = gostinho_require_customer($pdo);
    $pdo->prepare('DELETE FROM addresses WHERE id = ? AND customer_id = ?')->execute([(string) ($body['id'] ?? ''), $row['id']]);
    json_out(['ok' => true]);
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 401);
  }
}
if ($actionName === 'toggle_favorite') {
  try {
    $row = gostinho_require_customer($pdo);
    json_out(gostinho_toggle_favorite($pdo, $row['id'], (string) ($body['productId'] ?? '')));
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 401);
  }
}
if ($actionName === 'review_order') {
  try {
    json_out(gostinho_save_order_review($pdo, gostinho_require_customer($pdo), $body));
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  }
}

if ($actionName === 'create_order') {
  try {
    json_out(gostinho_create_order($pdo, $body));
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  } catch (Throwable $e) {
    json_out(['error' => 'Falha ao gravar pedido', 'detail' => $e->getMessage()], 500);
  }
}

if ($actionName === 'validate_coupon') {
  try {
    json_out(gostinho_validate_coupon($pdo, (string) ($body['code'] ?? ''), (float) ($body['subtotal'] ?? 0)));
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  }
}

gostinho_require_admin($pdo);

if ($actionName === 'save_product') {
  $p = $body['product'] ?? null;
  if (!is_array($p)) json_out(['error' => 'Produto inválido'], 400);
  gostinho_save_product($pdo, $p);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_product') {
  $id = (string) ($body['id'] ?? '');
  $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'save_category') {
  $c = $body['category'] ?? null;
  if (!is_array($c)) json_out(['error' => 'Categoria inválida'], 400);
  gostinho_save_category($pdo, $c);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_category') {
  $pdo->prepare('DELETE FROM categories WHERE id = ?')->execute([(string) ($body['id'] ?? '')]);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'save_settings') {
  $cur = gostinho_get_settings($pdo);
  $next = array_merge($cur, $body['settings'] ?? []);
  if (empty($next['adminPassword'])) $next['adminPassword'] = $cur['adminPassword'];
  gostinho_save_settings($pdo, $next);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'save_coupon') {
  gostinho_save_coupon($pdo, $body['coupon'] ?? []);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_coupon') {
  $pdo->prepare('DELETE FROM coupons WHERE id = ?')->execute([(string) ($body['id'] ?? '')]);
  json_out(['ok' => true]);
}
if ($actionName === 'save_zone') {
  gostinho_save_zone($pdo, $body['zone'] ?? []);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_zone') {
  $pdo->prepare('DELETE FROM delivery_zones WHERE id = ?')->execute([(string) ($body['id'] ?? '')]);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'save_promotion') {
  gostinho_save_promotion($pdo, $body['promotion'] ?? []);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_promotion') {
  $pdo->prepare('DELETE FROM promotions WHERE id = ?')->execute([(string) ($body['id'] ?? '')]);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'update_order') {
  $id = (string) ($body['id'] ?? '');
  $status = (string) ($body['status'] ?? '');
  $allowed = ['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERING', 'DELIVERED', 'CANCELLED'];
  if (!in_array($status, $allowed, true)) json_out(['error' => 'Status inválido'], 400);
  $prev = gostinho_get_order($pdo, $id);
  $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$status, $id]);
  if (!empty($body['printed'])) {
    $pdo->prepare('UPDATE orders SET printed = 1 WHERE id = ?')->execute([$id]);
  }
  if (!empty($body['driverId'])) {
    try {
      $pdo->prepare('UPDATE orders SET driver_id = ? WHERE id = ?')->execute([(string) $body['driverId'], $id]);
      $pdo->prepare("UPDATE delivery_persons SET status = 'BUSY' WHERE id = ?")->execute([(string) $body['driverId']]);
    } catch (Throwable $e) {
    }
  }
  if ($status === 'DELIVERED') {
    try {
      $drv = (string) ($prev['driverId'] ?? '');
      if ($drv !== '') $pdo->prepare("UPDATE delivery_persons SET status = 'AVAILABLE' WHERE id = ?")->execute([$drv]);
    } catch (Throwable $e) {
    }
    if ($prev && ($prev['status'] ?? '') !== 'DELIVERED') {
      $settings = gostinho_get_settings($pdo);
      if (!empty($settings['loyaltyEnabled']) && !empty($prev['phone'])) {
        $pts = (int) floor((float) $prev['total'] * (float) ($settings['loyaltyPerReal'] ?? 1));
        $cid = (string) ($prev['customerId'] ?? '');
        $pdo->prepare('UPDATE customers SET points = points + ? WHERE phone = ? OR id = ?')->execute([$pts, $prev['phone'], $cid]);
      }
    }
  }
  if ($prev) {
    $copy = gostinho_status_copy($status);
    $cid = (string) ($prev['customerId'] ?? '');
    if ($cid === '' && !empty($prev['phone'])) {
      $st = $pdo->prepare('SELECT id FROM customers WHERE phone = ?');
      $st->execute([$prev['phone']]);
      $cid = (string) ($st->fetchColumn() ?: '');
    }
    if ($cid !== '') gostinho_notify($pdo, 'CLIENTE', $copy[0], $copy[1], $id, $cid);
  }
  $order = gostinho_get_order($pdo, $id);
  json_out(['ok' => true, 'order' => $order, 'whatsappUrl' => $order ? gostinho_wa_status_url($pdo, $order, $status) : '']);
}
if ($actionName === 'save_driver') {
  gostinho_save_driver($pdo, $body['driver'] ?? []);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_driver') {
  $pdo->prepare('DELETE FROM delivery_persons WHERE id = ?')->execute([(string) ($body['id'] ?? '')]);
  json_out(['ok' => true]);
}
if ($actionName === 'save_stock_item') {
  gostinho_save_stock_item($pdo, $body['item'] ?? []);
  json_out(['ok' => true]);
}
if ($actionName === 'move_stock') {
  try {
    gostinho_move_stock($pdo, $body);
    json_out(['ok' => true]);
  } catch (InvalidArgumentException $e) {
    json_out(['error' => $e->getMessage()], 400);
  }
}
if ($actionName === 'reports') {
  json_out(gostinho_reports($pdo, (string) ($body['from'] ?? ''), (string) ($body['to'] ?? '')));
}
if ($actionName === 'update_stock') {
  $id = (string) ($body['id'] ?? '');
  $stock = (int) ($body['stock'] ?? 0);
  $pdo->prepare('UPDATE products SET stock = ? WHERE id = ?')->execute([$stock, $id]);
  json_out(['ok' => true]);
}
if ($actionName === 'save_extra') {
  gostinho_save_extra($pdo, $body['extra'] ?? []);
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_extra') {
  $pdo->prepare('DELETE FROM extras WHERE id = ?')->execute([(string) ($body['id'] ?? '')]);
  json_out(['ok' => true]);
}
if ($actionName === 'save_finance') {
  gostinho_save_finance($pdo, $body['entry'] ?? []);
  json_out(['ok' => true]);
}
if ($actionName === 'delete_finance') {
  $pdo->prepare('DELETE FROM finance WHERE id = ?')->execute([(string) ($body['id'] ?? '')]);
  json_out(['ok' => true]);
}
if ($actionName === 'rebuild_catalog') {
  gostinho_write_catalog($pdo);
  json_out(['ok' => true]);
}

json_out(['error' => 'Ação desconhecida'], 400);
