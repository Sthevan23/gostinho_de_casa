<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Password');

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

if ($method === 'GET' && !isset($_GET['full']) && $action !== 'full' && $action !== 'order') {
  $catalogFile = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'catalog.json';
  if (is_file($catalogFile) && !isset($_GET['rebuild'])) {
    $raw = @file_get_contents($catalogFile);
    if (is_string($raw) && $raw !== '' && strpos($raw, '"products"') !== false) {
      header('Cache-Control: no-store, max-age=0');
      echo $raw;
      exit;
    }
  }
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
  $allowed = ['NEW', 'CONFIRMED', 'PREPARING', 'DELIVERING', 'DELIVERED', 'CANCELLED'];
  if (!in_array($status, $allowed, true)) json_out(['error' => 'Status inválido'], 400);
  $pdo->prepare('UPDATE orders SET status = ? WHERE id = ?')->execute([$status, $id]);
  if (!empty($body['printed'])) {
    $pdo->prepare('UPDATE orders SET printed = 1 WHERE id = ?')->execute([$id]);
  }
  json_out(['ok' => true]);
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
