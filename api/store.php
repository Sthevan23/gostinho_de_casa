<?php

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/seed_data.php';

function gostinho_json_enc($v): string {
  return json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
}

function gostinho_json_dec($v, $fallback = []) {
  if (is_array($v)) return $v;
  if ($v === null || $v === '') return $fallback;
  $d = json_decode((string) $v, true);
  return is_array($d) ? $d : $fallback;
}

function gostinho_bool($v): int {
  return !empty($v) ? 1 : 0;
}

function gostinho_id(string $prefix = 'id'): string {
  return $prefix . '-' . bin2hex(random_bytes(6));
}

function gostinho_ensure_schema(PDO $pdo): void {
  static $done = false;
  if ($done) return;
  $done = true;

  $sql = <<<SQL
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY,
  data TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS extras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT DEFAULT '',
  price REAL NOT NULL DEFAULT 0,
  image TEXT DEFAULT '',
  category_id TEXT NOT NULL,
  ingredients TEXT DEFAULT '',
  protein REAL,
  calories REAL,
  carbs REAL,
  fats REAL,
  weight INTEGER,
  featured INTEGER DEFAULT 0,
  promotional INTEGER DEFAULT 0,
  promo_price REAL,
  active INTEGER DEFAULT 1,
  stock INTEGER DEFAULT 40,
  sizes TEXT DEFAULT '[]',
  extra_ids TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS delivery_zones (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  type TEXT NOT NULL,
  value REAL NOT NULL DEFAULT 0,
  min_order REAL DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  expires_at TEXT,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS promotions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  type TEXT DEFAULT '',
  value REAL DEFAULT 0,
  image TEXT DEFAULT '',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  comment TEXT DEFAULT '',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  number INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT DEFAULT '',
  address_number TEXT DEFAULT '',
  complement TEXT DEFAULT '',
  neighborhood TEXT DEFAULT '',
  delivery_type TEXT NOT NULL,
  delivery_fee REAL DEFAULT 0,
  payment_method TEXT NOT NULL,
  change_for REAL,
  notes TEXT DEFAULT '',
  coupon_code TEXT DEFAULT '',
  discount REAL DEFAULT 0,
  subtotal REAL NOT NULL,
  total REAL NOT NULL,
  status TEXT DEFAULT 'NEW',
  printed INTEGER DEFAULT 0,
  scheduled_date TEXT NOT NULL,
  scheduled_slot TEXT DEFAULT 'ALMOCO',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  size_name TEXT DEFAULT '',
  extras TEXT DEFAULT '',
  notes TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS finance (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  description TEXT DEFAULT '',
  date TEXT NOT NULL,
  order_id TEXT
);
SQL;

  foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
    if ($stmt !== '') $pdo->exec($stmt);
  }
}

function gostinho_seed_if_empty(PDO $pdo): void {
  $count = (int) $pdo->query('SELECT COUNT(*) FROM products')->fetchColumn();
  if ($count > 0) return;

  $data = gostinho_default_data();
  $pdo->beginTransaction();
  try {
    gostinho_save_settings($pdo, $data['settings']);
    foreach ($data['categories'] as $c) gostinho_save_category($pdo, $c);
    foreach ($data['extras'] as $e) gostinho_save_extra($pdo, $e);
    foreach ($data['products'] as $p) gostinho_save_product($pdo, $p);
    foreach ($data['zones'] as $z) gostinho_save_zone($pdo, $z);
    foreach ($data['coupons'] as $c) gostinho_save_coupon($pdo, $c);
    foreach ($data['promotions'] as $p) gostinho_save_promotion($pdo, $p);
    foreach ($data['reviews'] as $r) gostinho_save_review($pdo, $r);
    $pdo->commit();
  } catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
  }
  gostinho_write_catalog($pdo);
}

function gostinho_save_settings(PDO $pdo, array $s): void {
  $stmt = $pdo->prepare('INSERT INTO settings (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data');
  if (!gostinho_is_sqlite($pdo)) {
    $stmt = $pdo->prepare('INSERT INTO settings (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)');
  }
  $stmt->execute(['main', gostinho_json_enc($s)]);
}

function gostinho_get_settings(PDO $pdo): array {
  $row = $pdo->query("SELECT data FROM settings WHERE id = 'main'")->fetch();
  $s = gostinho_json_dec($row['data'] ?? '{}', []);
  $defaults = gostinho_default_data()['settings'];
  return array_merge($defaults, $s);
}

function gostinho_get_auth(PDO $pdo): array {
  $s = gostinho_get_settings($pdo);
  return [
    'email' => (string) ($s['adminEmail'] ?? 'admin@gostinhodecasa.com'),
    'password' => (string) ($s['adminPassword'] ?? 'admin123'),
  ];
}

function gostinho_save_category(PDO $pdo, array $c): void {
  $id = $c['id'] ?? gostinho_id('cat');
  $pdo->prepare('INSERT OR REPLACE INTO categories (id,name,slug,description,image,sort_order,active) VALUES (?,?,?,?,?,?,?)')
    ->execute([
      $id,
      $c['name'] ?? '',
      $c['slug'] ?? '',
      $c['description'] ?? '',
      $c['image'] ?? '',
      (int) ($c['sortOrder'] ?? 0),
      gostinho_bool($c['active'] ?? true),
    ]);
}

function gostinho_save_extra(PDO $pdo, array $e): void {
  $id = $e['id'] ?? gostinho_id('ex');
  $pdo->prepare('INSERT OR REPLACE INTO extras (id,name,price,active) VALUES (?,?,?,?)')
    ->execute([$id, $e['name'] ?? '', (float) ($e['price'] ?? 0), gostinho_bool($e['active'] ?? true)]);
}

function gostinho_save_product(PDO $pdo, array $p): void {
  $id = $p['id'] ?? gostinho_id('p');
  $pdo->prepare('INSERT OR REPLACE INTO products (id,name,slug,description,price,image,category_id,ingredients,protein,calories,carbs,fats,weight,featured,promotional,promo_price,active,stock,sizes,extra_ids) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([
      $id,
      $p['name'] ?? '',
      $p['slug'] ?? '',
      $p['description'] ?? '',
      (float) ($p['price'] ?? 0),
      $p['image'] ?? '',
      $p['categoryId'] ?? '',
      $p['ingredients'] ?? '',
      $p['protein'] ?? null,
      $p['calories'] ?? null,
      $p['carbs'] ?? null,
      $p['fats'] ?? null,
      $p['weight'] ?? null,
      gostinho_bool($p['featured'] ?? false),
      gostinho_bool($p['promotional'] ?? false),
      $p['promoPrice'] ?? null,
      gostinho_bool($p['active'] ?? true),
      (int) ($p['stock'] ?? 40),
      gostinho_json_enc($p['sizes'] ?? []),
      gostinho_json_enc($p['extraIds'] ?? []),
    ]);
  return;
}

function gostinho_save_zone(PDO $pdo, array $z): void {
  $id = $z['id'] ?? gostinho_id('z');
  $pdo->prepare('INSERT OR REPLACE INTO delivery_zones (id,name,price,active) VALUES (?,?,?,?)')
    ->execute([$id, $z['name'] ?? '', (float) ($z['price'] ?? 0), gostinho_bool($z['active'] ?? true)]);
}

function gostinho_save_coupon(PDO $pdo, array $c): void {
  $id = $c['id'] ?? gostinho_id('c');
  $pdo->prepare('INSERT OR REPLACE INTO coupons (id,code,type,value,min_order,max_uses,used_count,expires_at,active) VALUES (?,?,?,?,?,?,?,?,?)')
    ->execute([
      $id,
      strtoupper(trim((string) ($c['code'] ?? ''))),
      $c['type'] ?? 'percent',
      (float) ($c['value'] ?? 0),
      (float) ($c['minOrder'] ?? 0),
      $c['maxUses'] ?? null,
      (int) ($c['usedCount'] ?? 0),
      $c['expiresAt'] ?? null,
      gostinho_bool($c['active'] ?? true),
    ]);
}

function gostinho_save_promotion(PDO $pdo, array $p): void {
  $id = $p['id'] ?? gostinho_id('promo');
  $pdo->prepare('INSERT OR REPLACE INTO promotions (id,name,description,type,value,image,active) VALUES (?,?,?,?,?,?,?)')
    ->execute([
      $id,
      $p['name'] ?? '',
      $p['description'] ?? '',
      $p['type'] ?? '',
      (float) ($p['value'] ?? 0),
      $p['image'] ?? '',
      gostinho_bool($p['active'] ?? true),
    ]);
}

function gostinho_save_review(PDO $pdo, array $r): void {
  $id = $r['id'] ?? gostinho_id('r');
  $pdo->prepare('INSERT OR REPLACE INTO reviews (id,name,rating,comment,active) VALUES (?,?,?,?,?)')
    ->execute([$id, $r['name'] ?? '', (int) ($r['rating'] ?? 5), $r['comment'] ?? '', gostinho_bool($r['active'] ?? true)]);
}

function gostinho_map_product(array $row, array $extrasById, array $catsById): array {
  $extraIds = gostinho_json_dec($row['extra_ids'] ?? '[]');
  $extras = [];
  foreach ($extraIds as $eid) {
    if (!empty($extrasById[$eid]) && !empty($extrasById[$eid]['active'])) {
      $extras[] = $extrasById[$eid];
    }
  }
  $cat = $catsById[$row['category_id']] ?? null;
  return [
    'id' => $row['id'],
    'name' => $row['name'],
    'slug' => $row['slug'],
    'description' => $row['description'],
    'price' => (float) $row['price'],
    'image' => $row['image'],
    'categoryId' => $row['category_id'],
    'category' => $cat,
    'ingredients' => $row['ingredients'],
    'protein' => $row['protein'] !== null ? (float) $row['protein'] : null,
    'calories' => $row['calories'] !== null ? (float) $row['calories'] : null,
    'carbs' => $row['carbs'] !== null ? (float) $row['carbs'] : null,
    'fats' => $row['fats'] !== null ? (float) $row['fats'] : null,
    'weight' => $row['weight'] !== null ? (int) $row['weight'] : null,
    'featured' => (bool) $row['featured'],
    'promotional' => (bool) $row['promotional'],
    'promoPrice' => $row['promo_price'] !== null ? (float) $row['promo_price'] : null,
    'active' => (bool) $row['active'],
    'stock' => (int) $row['stock'],
    'sizes' => gostinho_json_dec($row['sizes']),
    'extraIds' => $extraIds,
    'extras' => $extras,
  ];
}

function gostinho_load_all(PDO $pdo, string $mode = 'public'): array {
  $settings = gostinho_get_settings($pdo);
  $cats = [];
  foreach ($pdo->query('SELECT * FROM categories ORDER BY sort_order, name') as $row) {
    $cats[] = [
      'id' => $row['id'],
      'name' => $row['name'],
      'slug' => $row['slug'],
      'description' => $row['description'],
      'image' => $row['image'],
      'sortOrder' => (int) $row['sort_order'],
      'active' => (bool) $row['active'],
    ];
  }
  $catsById = [];
  foreach ($cats as $c) $catsById[$c['id']] = $c;

  $extras = [];
  $extrasById = [];
  foreach ($pdo->query('SELECT * FROM extras') as $row) {
    $e = ['id' => $row['id'], 'name' => $row['name'], 'price' => (float) $row['price'], 'active' => (bool) $row['active']];
    $extras[] = $e;
    $extrasById[$e['id']] = $e;
  }

  $products = [];
  $sql = 'SELECT * FROM products ORDER BY name';
  foreach ($pdo->query($sql) as $row) {
    $p = gostinho_map_product($row, $extrasById, $catsById);
    if ($mode === 'public' && (!$p['active'] || ($p['category']['slug'] ?? '') === 'sobremesas')) continue;
    $products[] = $p;
  }

  $zones = [];
  foreach ($pdo->query('SELECT * FROM delivery_zones ORDER BY price, name') as $row) {
    $z = ['id' => $row['id'], 'name' => $row['name'], 'price' => (float) $row['price'], 'active' => (bool) $row['active']];
    if ($mode === 'public' && !$z['active']) continue;
    $zones[] = $z;
  }

  $coupons = [];
  foreach ($pdo->query('SELECT * FROM coupons') as $row) {
    $c = [
      'id' => $row['id'],
      'code' => $row['code'],
      'type' => $row['type'],
      'value' => (float) $row['value'],
      'minOrder' => (float) $row['min_order'],
      'maxUses' => $row['max_uses'] !== null ? (int) $row['max_uses'] : null,
      'usedCount' => (int) $row['used_count'],
      'expiresAt' => $row['expires_at'],
      'active' => (bool) $row['active'],
    ];
    if ($mode === 'public') {
      if (!$c['active']) continue;
      $coupons[] = ['code' => $c['code'], 'type' => $c['type'], 'value' => $c['value'], 'minOrder' => $c['minOrder']];
    } else {
      $coupons[] = $c;
    }
  }

  $promotions = [];
  foreach ($pdo->query('SELECT * FROM promotions') as $row) {
    $p = [
      'id' => $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'type' => $row['type'],
      'value' => (float) $row['value'],
      'image' => $row['image'],
      'active' => (bool) $row['active'],
    ];
    if ($mode === 'public' && !$p['active']) continue;
    $promotions[] = $p;
  }

  $reviews = [];
  foreach ($pdo->query('SELECT * FROM reviews') as $row) {
    $r = ['id' => $row['id'], 'name' => $row['name'], 'rating' => (int) $row['rating'], 'comment' => $row['comment'], 'active' => (bool) $row['active']];
    if ($mode === 'public' && !$r['active']) continue;
    $reviews[] = $r;
  }

  $out = [
    'settings' => $settings,
    'categories' => $mode === 'public' ? array_values(array_filter($cats, fn($c) => $c['active'] && $c['slug'] !== 'sobremesas')) : $cats,
    'products' => $products,
    'extras' => $extras,
    'zones' => $zones,
    'coupons' => $coupons,
    'promotions' => $promotions,
    'reviews' => $reviews,
  ];

  if ($mode === 'full') {
    $out['orders'] = gostinho_load_orders($pdo);
    $out['finance'] = gostinho_load_finance($pdo);
    $out['settings']['adminEmail'] = $settings['adminEmail'] ?? '';
    unset($out['settings']['adminPassword']);
    $out['settings']['adminPasswordSet'] = true;
  } else {
    unset($out['settings']['adminEmail'], $out['settings']['adminPassword']);
  }

  return $out;
}

function gostinho_load_finance(PDO $pdo): array {
  $rows = [];
  try {
    foreach ($pdo->query('SELECT * FROM finance ORDER BY date DESC, id DESC') as $row) {
      $rows[] = [
        'id' => $row['id'],
        'type' => $row['type'],
        'amount' => (float) $row['amount'],
        'description' => $row['description'],
        'date' => $row['date'],
        'orderId' => $row['order_id'],
      ];
    }
  } catch (Throwable $e) {
    return [];
  }
  return $rows;
}

function gostinho_save_finance(PDO $pdo, array $f): void {
  $id = $f['id'] ?? gostinho_id('fin');
  $pdo->prepare('INSERT OR REPLACE INTO finance (id,type,amount,description,date,order_id) VALUES (?,?,?,?,?,?)')
    ->execute([
      $id,
      ($f['type'] ?? 'expense') === 'income' ? 'income' : 'expense',
      (float) ($f['amount'] ?? 0),
      $f['description'] ?? '',
      substr((string) ($f['date'] ?? gostinho_today_ymd()), 0, 10),
      $f['orderId'] ?? null,
    ]);
}

function gostinho_load_orders(PDO $pdo): array {
  $orders = [];
  foreach ($pdo->query('SELECT * FROM orders ORDER BY number DESC') as $row) {
    $items = [];
    $stmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
    $stmt->execute([$row['id']]);
    foreach ($stmt as $it) {
      $items[] = [
        'id' => $it['id'],
        'productId' => $it['product_id'],
        'productName' => $it['product_name'],
        'quantity' => (int) $it['quantity'],
        'unitPrice' => (float) $it['unit_price'],
        'size' => $it['size_name'],
        'extras' => $it['extras'],
        'notes' => $it['notes'],
      ];
    }
    $orders[] = [
      'id' => $row['id'],
      'number' => (int) $row['number'],
      'customerName' => $row['customer_name'],
      'phone' => $row['phone'],
      'address' => $row['address'],
      'addressNumber' => $row['address_number'],
      'complement' => $row['complement'],
      'neighborhood' => $row['neighborhood'],
      'deliveryType' => $row['delivery_type'],
      'deliveryFee' => (float) $row['delivery_fee'],
      'paymentMethod' => $row['payment_method'],
      'changeFor' => $row['change_for'] !== null ? (float) $row['change_for'] : null,
      'notes' => $row['notes'],
      'couponCode' => $row['coupon_code'],
      'discount' => (float) $row['discount'],
      'subtotal' => (float) $row['subtotal'],
      'total' => (float) $row['total'],
      'status' => $row['status'],
      'printed' => (bool) $row['printed'],
      'scheduledDate' => $row['scheduled_date'],
      'scheduledSlot' => $row['scheduled_slot'],
      'createdAt' => $row['created_at'],
      'items' => $items,
    ];
  }
  return $orders;
}

function gostinho_write_catalog(PDO $pdo): bool {
  $data = gostinho_load_all($pdo, 'public');
  $path = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'catalog.json';
  return (bool) @file_put_contents($path, gostinho_json_enc($data));
}

function gostinho_today_ymd(): string {
  $tz = new DateTimeZone('America/Sao_Paulo');
  return (new DateTime('now', $tz))->format('Y-m-d');
}

function gostinho_add_days_ymd(string $ymd, int $days): string {
  $d = DateTime::createFromFormat('Y-m-d', $ymd, new DateTimeZone('UTC'));
  if (!$d) $d = new DateTime('now', new DateTimeZone('UTC'));
  $d->modify(($days >= 0 ? '+' : '') . $days . ' days');
  return $d->format('Y-m-d');
}

function gostinho_format_brl(float $v): string {
  return 'R$ ' . number_format($v, 2, ',', '.');
}

function gostinho_slot_label(string $slot): string {
  return $slot === 'JANTAR' ? 'Jantar' : 'Almoço';
}

function gostinho_pay_label(string $m): string {
  return [
    'PIX' => 'Pix',
    'CASH' => 'Dinheiro',
    'CARD' => 'Cartão',
    'CARD_DELIVERY' => 'Cartão na entrega',
  ][$m] ?? $m;
}

function gostinho_wa_message(array $order): string {
  $lines = [];
  $lines[] = 'Olá! Gostaria de fazer uma encomenda.';
  $lines[] = '';
  $lines[] = 'Pedido #' . str_pad((string) $order['number'], 3, '0', STR_PAD_LEFT);
  if (!empty($order['scheduledDate'])) {
    $d = DateTime::createFromFormat('Y-m-d', substr($order['scheduledDate'], 0, 10));
    $label = $d ? $d->format('d/m/Y') : $order['scheduledDate'];
    $lines[] = 'Encomenda para: ' . $label . ' (' . gostinho_slot_label($order['scheduledSlot'] ?? 'ALMOCO') . ')';
  }
  $lines[] = '';
  foreach ($order['items'] as $item) {
    $extra = !empty($item['extras']) ? ' (' . $item['extras'] . ')' : '';
    $size = !empty($item['size']) ? ' ' . $item['size'] : '';
    $lines[] = $item['quantity'] . 'x ' . $item['productName'] . $size . $extra . ' — ' . gostinho_format_brl($item['unitPrice'] * $item['quantity']);
  }
  $lines[] = '';
  $lines[] = 'Subtotal: ' . gostinho_format_brl($order['subtotal']);
  if (($order['discount'] ?? 0) > 0) $lines[] = 'Desconto: -' . gostinho_format_brl($order['discount']);
  $lines[] = 'Entrega: ' . (($order['deliveryType'] ?? '') === 'PICKUP' ? 'Retirada' : gostinho_format_brl($order['deliveryFee']));
  $lines[] = 'Total: ' . gostinho_format_brl($order['total']);
  $lines[] = '';
  $lines[] = 'Pagamento: ' . gostinho_pay_label($order['paymentMethod'] ?? '');
  if (($order['paymentMethod'] ?? '') === 'CASH' && !empty($order['changeFor'])) {
    $lines[] = 'Troco para: ' . gostinho_format_brl((float) $order['changeFor']);
  }
  if (!empty($order['couponCode'])) $lines[] = 'Cupom: ' . $order['couponCode'];
  $lines[] = '';
  if (($order['deliveryType'] ?? '') === 'PICKUP') {
    $lines[] = 'Retirada no local';
  } else {
    $lines[] = 'Endereço:';
    $lines[] = trim(($order['address'] ?? '') . ', ' . ($order['addressNumber'] ?? '') . (!empty($order['complement']) ? ' - ' . $order['complement'] : ''));
    if (!empty($order['neighborhood'])) $lines[] = $order['neighborhood'];
  }
  if (!empty($order['notes'])) {
    $lines[] = '';
    $lines[] = 'Observações:';
    $lines[] = $order['notes'];
  }
  $lines[] = '';
  $lines[] = 'Obrigado!';
  return implode("\n", $lines);
}

function gostinho_wa_url(string $phone, string $message): string {
  $digits = preg_replace('/\D+/', '', $phone);
  if (!str_starts_with($digits, '55')) $digits = '55' . $digits;
  return 'https://wa.me/' . $digits . '?text=' . rawurlencode($message);
}

function gostinho_create_order(PDO $pdo, array $body): array {
  $settings = gostinho_get_settings($pdo);
  $minDate = gostinho_add_days_ymd(gostinho_today_ymd(), max(1, (int) ($settings['minAdvanceDays'] ?? 1)));
  $scheduled = substr((string) ($body['scheduledDate'] ?? ''), 0, 10);
  if ($scheduled === '' || $scheduled < $minDate) {
    throw new InvalidArgumentException('Os pedidos são por encomenda. Escolha uma data com pelo menos 1 dia de antecedência.');
  }

  $itemsIn = $body['items'] ?? [];
  if (!is_array($itemsIn) || !$itemsIn) {
    throw new InvalidArgumentException('Carrinho vazio.');
  }

  $name = trim((string) ($body['customerName'] ?? ''));
  $phone = preg_replace('/\D+/', '', (string) ($body['phone'] ?? ''));
  if ($name === '' || strlen($phone) < 10) {
    throw new InvalidArgumentException('Informe nome e WhatsApp.');
  }

  $deliveryType = ($body['deliveryType'] ?? 'DELIVERY') === 'PICKUP' ? 'PICKUP' : 'DELIVERY';
  $zones = [];
  foreach ($pdo->query('SELECT * FROM delivery_zones WHERE active = 1') as $row) {
    $zones[$row['name']] = (float) $row['price'];
  }
  $neighborhood = (string) ($body['neighborhood'] ?? '');
  $deliveryFee = $deliveryType === 'PICKUP' ? 0 : ($zones[$neighborhood] ?? 0);
  if ($deliveryType === 'DELIVERY' && $neighborhood === '') {
    throw new InvalidArgumentException('Selecione o bairro.');
  }

  $extrasRows = [];
  foreach ($pdo->query('SELECT * FROM extras') as $row) $extrasRows[$row['id']] = $row;

  $subtotal = 0;
  $lines = [];
  foreach ($itemsIn as $it) {
    $pid = (string) ($it['productId'] ?? '');
    $stmt = $pdo->prepare('SELECT * FROM products WHERE id = ? AND active = 1');
    $stmt->execute([$pid]);
    $p = $stmt->fetch();
    if (!$p) throw new InvalidArgumentException('Produto indisponível.');
    $qty = max(1, (int) ($it['quantity'] ?? 1));
    $price = (float) $p['price'];
    $sizeName = '';
    $sizes = gostinho_json_dec($p['sizes']);
    if (!empty($it['sizeId'])) {
      foreach ($sizes as $s) {
        if (($s['id'] ?? '') === $it['sizeId']) {
          $price = (float) $s['price'];
          $sizeName = (string) ($s['name'] ?? '');
        }
      }
    }
    $extraNames = [];
    $extraSum = 0;
    foreach (($it['extraIds'] ?? []) as $eid) {
      if (!empty($extrasRows[$eid])) {
        $extraSum += (float) $extrasRows[$eid]['price'];
        $extraNames[] = $extrasRows[$eid]['name'];
      }
    }
    $unit = $price + $extraSum;
    if (!empty($p['promotional']) && $p['promo_price'] !== null && empty($it['sizeId'])) {
      $unit = (float) $p['promo_price'] + $extraSum;
    }
    $subtotal += $unit * $qty;
    $lines[] = [
      'productId' => $p['id'],
      'productName' => $p['name'],
      'quantity' => $qty,
      'unitPrice' => $unit,
      'size' => $sizeName,
      'extras' => implode(', ', $extraNames),
      'notes' => (string) ($it['notes'] ?? ''),
    ];
  }

  if (($settings['minOrderValue'] ?? 0) > 0 && $subtotal < (float) $settings['minOrderValue']) {
    throw new InvalidArgumentException('Pedido mínimo: ' . gostinho_format_brl((float) $settings['minOrderValue']));
  }

  $discount = 0;
  $couponCode = strtoupper(trim((string) ($body['couponCode'] ?? '')));
  if ($couponCode !== '') {
    $cstmt = $pdo->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1');
    $cstmt->execute([$couponCode]);
    $coupon = $cstmt->fetch();
    if ($coupon && $subtotal >= (float) $coupon['min_order']) {
      if ($coupon['expires_at'] && $coupon['expires_at'] < gostinho_today_ymd()) {
        throw new InvalidArgumentException('Cupom expirado.');
      }
      if ($coupon['max_uses'] !== null && (int) $coupon['used_count'] >= (int) $coupon['max_uses']) {
        throw new InvalidArgumentException('Cupom esgotado.');
      }
      $discount = $coupon['type'] === 'fixed'
        ? min((float) $coupon['value'], $subtotal)
        : round($subtotal * ((float) $coupon['value'] / 100), 2);
    }
  }

  $total = max(0, $subtotal - $discount) + $deliveryFee;
  $id = gostinho_id('ord');
  $number = (int) $pdo->query('SELECT COALESCE(MAX(number), 0) + 1 FROM orders')->fetchColumn();
  $now = (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('c');

  $pdo->prepare('INSERT INTO orders (id,number,customer_name,phone,address,address_number,complement,neighborhood,delivery_type,delivery_fee,payment_method,change_for,notes,coupon_code,discount,subtotal,total,status,printed,scheduled_date,scheduled_slot,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
    ->execute([
      $id, $number, $name, $phone,
      (string) ($body['address'] ?? ''),
      (string) ($body['addressNumber'] ?? ''),
      (string) ($body['complement'] ?? ''),
      $neighborhood, $deliveryType, $deliveryFee,
      (string) ($body['paymentMethod'] ?? 'PIX'),
      isset($body['changeFor']) && $body['changeFor'] !== null && $body['changeFor'] !== '' ? (float) $body['changeFor'] : null,
      (string) ($body['notes'] ?? ''),
      $discount > 0 ? $couponCode : '',
      $discount, $subtotal, $total, 'NEW', 0, $scheduled,
      ($body['scheduledSlot'] ?? 'ALMOCO') === 'JANTAR' ? 'JANTAR' : 'ALMOCO',
      $now,
    ]);

  $ins = $pdo->prepare('INSERT INTO order_items (id,order_id,product_id,product_name,quantity,unit_price,size_name,extras,notes) VALUES (?,?,?,?,?,?,?,?,?)');
  foreach ($lines as $line) {
    $ins->execute([gostinho_id('oi'), $id, $line['productId'], $line['productName'], $line['quantity'], $line['unitPrice'], $line['size'], $line['extras'], $line['notes']]);
  }

  if ($discount > 0 && $couponCode !== '') {
    $pdo->prepare('UPDATE coupons SET used_count = used_count + 1 WHERE code = ?')->execute([$couponCode]);
  }

  $order = [
    'id' => $id,
    'number' => $number,
    'customerName' => $name,
    'phone' => $phone,
    'address' => (string) ($body['address'] ?? ''),
    'addressNumber' => (string) ($body['addressNumber'] ?? ''),
    'complement' => (string) ($body['complement'] ?? ''),
    'neighborhood' => $neighborhood,
    'deliveryType' => $deliveryType,
    'deliveryFee' => $deliveryFee,
    'paymentMethod' => (string) ($body['paymentMethod'] ?? 'PIX'),
    'changeFor' => $body['changeFor'] ?? null,
    'notes' => (string) ($body['notes'] ?? ''),
    'couponCode' => $discount > 0 ? $couponCode : '',
    'discount' => $discount,
    'subtotal' => $subtotal,
    'total' => $total,
    'status' => 'NEW',
    'scheduledDate' => $scheduled,
    'scheduledSlot' => ($body['scheduledSlot'] ?? 'ALMOCO') === 'JANTAR' ? 'JANTAR' : 'ALMOCO',
    'items' => $lines,
  ];
  $message = gostinho_wa_message($order);
  return [
    'order' => $order,
    'message' => $message,
    'whatsappUrl' => gostinho_wa_url($settings['whatsapp'] ?? '', $message),
  ];
}

function gostinho_get_order(PDO $pdo, string $id): ?array {
  $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? OR CAST(number AS TEXT) = ?');
  $stmt->execute([$id, $id]);
  $row = $stmt->fetch();
  if (!$row) return null;
  $items = [];
  $it = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ?');
  $it->execute([$row['id']]);
  foreach ($it as $line) {
    $items[] = [
      'productName' => $line['product_name'],
      'quantity' => (int) $line['quantity'],
      'unitPrice' => (float) $line['unit_price'],
      'size' => $line['size_name'],
      'extras' => $line['extras'],
    ];
  }
  return [
    'id' => $row['id'],
    'number' => (int) $row['number'],
    'customerName' => $row['customer_name'],
    'status' => $row['status'],
    'total' => (float) $row['total'],
    'subtotal' => (float) $row['subtotal'],
    'discount' => (float) $row['discount'],
    'deliveryFee' => (float) $row['delivery_fee'],
    'deliveryType' => $row['delivery_type'],
    'scheduledDate' => $row['scheduled_date'],
    'scheduledSlot' => $row['scheduled_slot'],
    'paymentMethod' => $row['payment_method'],
    'items' => $items,
  ];
}

function gostinho_validate_coupon(PDO $pdo, string $code, float $subtotal): array {
  $code = strtoupper(trim($code));
  $stmt = $pdo->prepare('SELECT * FROM coupons WHERE code = ? AND active = 1');
  $stmt->execute([$code]);
  $c = $stmt->fetch();
  if (!$c) throw new InvalidArgumentException('Cupom inválido.');
  if ($c['expires_at'] && $c['expires_at'] < gostinho_today_ymd()) {
    throw new InvalidArgumentException('Cupom expirado.');
  }
  if ((float) $c['min_order'] > $subtotal) {
    throw new InvalidArgumentException('Pedido mínimo para este cupom: ' . gostinho_format_brl((float) $c['min_order']));
  }
  $discount = $c['type'] === 'fixed'
    ? min((float) $c['value'], $subtotal)
    : round($subtotal * ((float) $c['value'] / 100), 2);
  return ['code' => $code, 'discount' => $discount];
}

function gostinho_mysql_upsert_fix(PDO $pdo): void {
  if (gostinho_is_sqlite($pdo)) return;
  // MySQL uses ON DUPLICATE instead of INSERT OR REPLACE — handled in save_settings only.
}
