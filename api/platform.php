<?php

function gostinho_add_column(PDO $pdo, string $table, string $column, string $def): void {
  try {
    $pdo->exec("ALTER TABLE {$table} ADD COLUMN {$column} {$def}");
  } catch (Throwable $e) {
  }
}

function gostinho_ensure_platform(PDO $pdo): void {
  static $done = false;
  if ($done) return;
  $done = true;

  $sql = <<<SQL
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  email VARCHAR(191) DEFAULT '',
  phone VARCHAR(32) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  token VARCHAR(64) DEFAULT '',
  points INTEGER DEFAULT 0,
  role VARCHAR(32) DEFAULT 'CLIENTE',
  active INTEGER DEFAULT 1,
  created_at VARCHAR(32) NOT NULL
);
CREATE TABLE IF NOT EXISTS addresses (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  label VARCHAR(64) DEFAULT 'Casa',
  cep VARCHAR(16) DEFAULT '',
  street VARCHAR(191) DEFAULT '',
  number VARCHAR(32) DEFAULT '',
  complement VARCHAR(191) DEFAULT '',
  neighborhood VARCHAR(191) DEFAULT '',
  city VARCHAR(191) DEFAULT '',
  state VARCHAR(8) DEFAULT '',
  reference VARCHAR(191) DEFAULT '',
  is_default INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS favorites (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL
);
CREATE TABLE IF NOT EXISTS delivery_persons (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  phone VARCHAR(32) DEFAULT '',
  status VARCHAR(32) DEFAULT 'AVAILABLE',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS stock_items (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(191) NOT NULL,
  unit VARCHAR(32) DEFAULT 'kg',
  quantity DOUBLE DEFAULT 0,
  min_quantity DOUBLE DEFAULT 0,
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  item_id VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  quantity DOUBLE NOT NULL,
  note TEXT,
  created_at VARCHAR(32) NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  audience VARCHAR(32) DEFAULT 'ADMIN',
  customer_id VARCHAR(64) DEFAULT '',
  title VARCHAR(191) NOT NULL,
  body TEXT,
  order_id VARCHAR(64) DEFAULT '',
  read_flag INTEGER DEFAULT 0,
  created_at VARCHAR(32) NOT NULL
);
CREATE TABLE IF NOT EXISTS order_reviews (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) DEFAULT '',
  rating INTEGER NOT NULL,
  comment TEXT,
  created_at VARCHAR(32) NOT NULL
);
CREATE TABLE IF NOT EXISTS coupon_uses (
  id VARCHAR(64) PRIMARY KEY,
  coupon_code VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64) DEFAULT '',
  phone VARCHAR(32) DEFAULT '',
  created_at VARCHAR(32) NOT NULL
);
SQL;
  foreach (array_filter(array_map('trim', explode(';', $sql))) as $stmt) {
    if ($stmt !== '') $pdo->exec($stmt);
  }

  gostinho_add_column($pdo, 'orders', 'customer_id', "VARCHAR(64) DEFAULT ''");
  gostinho_add_column($pdo, 'orders', 'driver_id', "VARCHAR(64) DEFAULT ''");
  gostinho_add_column($pdo, 'orders', 'cep', "VARCHAR(16) DEFAULT ''");
  gostinho_add_column($pdo, 'orders', 'city', "VARCHAR(191) DEFAULT ''");
  gostinho_add_column($pdo, 'orders', 'state', "VARCHAR(8) DEFAULT ''");
  gostinho_add_column($pdo, 'orders', 'address_label', "VARCHAR(64) DEFAULT ''");
  gostinho_add_column($pdo, 'orders', 'reference_note', "VARCHAR(191) DEFAULT ''");
  gostinho_add_column($pdo, 'coupons', 'starts_at', "VARCHAR(32) DEFAULT ''");
  gostinho_add_column($pdo, 'coupons', 'max_per_customer', 'INTEGER DEFAULT 1');
  gostinho_add_column($pdo, 'reviews', 'product_id', "VARCHAR(64) DEFAULT ''");
  gostinho_add_column($pdo, 'reviews', 'order_id', "VARCHAR(64) DEFAULT ''");
}

function gostinho_now(): string {
  return (new DateTime('now', new DateTimeZone('America/Sao_Paulo')))->format('c');
}

function gostinho_token(): string {
  return bin2hex(random_bytes(24));
}

function gostinho_customer_public(array $row, PDO $pdo): array {
  $fav = [];
  $st = $pdo->prepare('SELECT product_id FROM favorites WHERE customer_id = ?');
  $st->execute([$row['id']]);
  foreach ($st as $f) $fav[] = $f['product_id'];

  $addrs = [];
  $st = $pdo->prepare('SELECT * FROM addresses WHERE customer_id = ?');
  $st->execute([$row['id']]);
  foreach ($st as $a) {
    $addrs[] = [
      'id' => $a['id'],
      'label' => $a['label'],
      'cep' => $a['cep'],
      'street' => $a['street'],
      'number' => $a['number'],
      'complement' => $a['complement'],
      'neighborhood' => $a['neighborhood'],
      'city' => $a['city'],
      'state' => $a['state'],
      'reference' => $a['reference'],
      'isDefault' => (bool) $a['is_default'],
    ];
  }

  $notes = [];
  $st = $pdo->prepare('SELECT * FROM notifications WHERE customer_id = ? ORDER BY created_at DESC LIMIT 30');
  $st->execute([$row['id']]);
  foreach ($st as $n) {
    $notes[] = [
      'id' => $n['id'],
      'title' => $n['title'],
      'body' => $n['body'],
      'orderId' => $n['order_id'],
      'read' => (bool) $n['read_flag'],
      'createdAt' => $n['created_at'],
    ];
  }

  return [
    'id' => $row['id'],
    'name' => $row['name'],
    'email' => $row['email'],
    'phone' => $row['phone'],
    'points' => (int) $row['points'],
    'role' => $row['role'] ?: 'CLIENTE',
    'token' => $row['token'],
    'favorites' => $fav,
    'addresses' => $addrs,
    'notifications' => $notes,
    'createdAt' => $row['created_at'],
  ];
}

function gostinho_find_customer_by_token(PDO $pdo, string $token): ?array {
  $token = trim($token);
  if ($token === '') return null;
  $st = $pdo->prepare('SELECT * FROM customers WHERE token = ? AND active = 1');
  $st->execute([$token]);
  $row = $st->fetch();
  return $row ?: null;
}

function gostinho_require_customer(PDO $pdo): array {
  $token = (string) ($_SERVER['HTTP_X_CUSTOMER_TOKEN'] ?? '');
  $row = gostinho_find_customer_by_token($pdo, $token);
  if (!$row) throw new InvalidArgumentException('Faça login para continuar.');
  return $row;
}

function gostinho_notify(PDO $pdo, string $audience, string $title, string $body, string $orderId = '', string $customerId = ''): void {
  gostinho_upsert($pdo, 'notifications', ['id','audience','customer_id','title','body','order_id','read_flag','created_at'], [
    gostinho_id('nt'), $audience, $customerId, $title, $body, $orderId, 0, gostinho_now(),
  ]);
}

function gostinho_status_copy(string $status): array {
  return [
    'NEW' => ['Pedido recebido', 'Recebemos o seu pedido e vamos confirmar em instantes.'],
    'CONFIRMED' => ['Pedido confirmado', 'Seu pedido foi confirmado. Já já começa o preparo.'],
    'PREPARING' => ['Em preparação', 'Sua comida caseira está sendo preparada com carinho.'],
    'READY' => ['Pedido pronto', 'Tudo pronto! Aguardando o entregador.'],
    'DELIVERING' => ['Saiu para entrega', 'Seu pedido saiu para entrega.'],
    'DELIVERED' => ['Pedido entregue', 'Bom apetite! Que tal avaliar o pedido?'],
    'CANCELLED' => ['Pedido cancelado', 'Este pedido foi cancelado.'],
  ][$status] ?? ['Atualização', 'O status do seu pedido mudou.'];
}

function gostinho_wa_status_url(PDO $pdo, array $order, string $status): string {
  $settings = gostinho_get_settings($pdo);
  $copy = gostinho_status_copy($status);
  $name = explode(' ', trim((string) ($order['customerName'] ?? $order['customer_name'] ?? '')))[0] ?: 'cliente';
  $num = str_pad((string) ($order['number'] ?? ''), 4, '0', STR_PAD_LEFT);
  $msg = "Olá, {$name}! Seu pedido #{$num} — {$copy[0]}. {$copy[1]}";
  $phone = (string) ($order['phone'] ?? '');
  return gostinho_wa_url($phone ?: ($settings['whatsapp'] ?? ''), $msg);
}

function gostinho_register_customer(PDO $pdo, array $body): array {
  $name = trim((string) ($body['name'] ?? ''));
  $phone = preg_replace('/\D+/', '', (string) ($body['phone'] ?? ''));
  $email = strtolower(trim((string) ($body['email'] ?? '')));
  $pass = (string) ($body['password'] ?? '');
  if ($name === '' || strlen($phone) < 10) throw new InvalidArgumentException('Informe nome e WhatsApp.');
  if (strlen($pass) < 4) throw new InvalidArgumentException('A senha precisa ter pelo menos 4 caracteres.');
  $st = $pdo->prepare('SELECT id FROM customers WHERE phone = ?');
  $st->execute([$phone]);
  if ($st->fetch()) throw new InvalidArgumentException('Este WhatsApp já está cadastrado. Faça login.');
  if ($email !== '') {
    $st = $pdo->prepare('SELECT id FROM customers WHERE email = ?');
    $st->execute([$email]);
    if ($st->fetch()) throw new InvalidArgumentException('Este e-mail já está cadastrado.');
  }
  $id = gostinho_id('cus');
  $token = gostinho_token();
  gostinho_upsert($pdo, 'customers', ['id','name','email','phone','password_hash','token','points','role','active','created_at'], [
    $id, $name, $email, $phone, password_hash($pass, PASSWORD_DEFAULT), $token, 0, 'CLIENTE', 1, gostinho_now(),
  ]);
  $st = $pdo->prepare('SELECT * FROM customers WHERE id = ?');
  $st->execute([$id]);
  return gostinho_customer_public($st->fetch(), $pdo);
}

function gostinho_login_customer(PDO $pdo, array $body): array {
  $login = trim((string) ($body['login'] ?? $body['email'] ?? $body['phone'] ?? ''));
  $pass = (string) ($body['password'] ?? '');
  $digits = preg_replace('/\D+/', '', $login);
  $st = $pdo->prepare('SELECT * FROM customers WHERE phone = ? OR email = ?');
  $st->execute([$digits !== '' ? $digits : $login, strtolower($login)]);
  $row = $st->fetch();
  if (!$row || !password_verify($pass, $row['password_hash'])) {
    throw new InvalidArgumentException('WhatsApp/e-mail ou senha incorretos.');
  }
  if (empty($row['active'])) throw new InvalidArgumentException('Conta desativada.');
  $token = gostinho_token();
  $pdo->prepare('UPDATE customers SET token = ? WHERE id = ?')->execute([$token, $row['id']]);
  $row['token'] = $token;
  return gostinho_customer_public($row, $pdo);
}

function gostinho_reset_customer(PDO $pdo, array $body): array {
  $login = trim((string) ($body['login'] ?? $body['phone'] ?? ''));
  $digits = preg_replace('/\D+/', '', $login);
  $st = $pdo->prepare('SELECT * FROM customers WHERE phone = ? OR email = ?');
  $st->execute([$digits !== '' ? $digits : $login, strtolower($login)]);
  $row = $st->fetch();
  if (!$row) throw new InvalidArgumentException('Não encontramos uma conta com esses dados.');
  $temp = (string) random_int(100000, 999999);
  $pdo->prepare('UPDATE customers SET password_hash = ? WHERE id = ?')->execute([password_hash($temp, PASSWORD_DEFAULT), $row['id']]);
  $settings = gostinho_get_settings($pdo);
  $msg = "Olá! Sua senha temporária no Gostinho de Casa é: {$temp}";
  return [
    'ok' => true,
    'message' => 'Enviamos uma senha temporária. Confirme no WhatsApp para recebê-la.',
    'whatsappUrl' => gostinho_wa_url($row['phone'] ?: ($settings['whatsapp'] ?? ''), $msg),
  ];
}

function gostinho_update_customer(PDO $pdo, array $row, array $body): array {
  $name = trim((string) ($body['name'] ?? $row['name']));
  $email = strtolower(trim((string) ($body['email'] ?? $row['email'])));
  $phone = preg_replace('/\D+/', '', (string) ($body['phone'] ?? $row['phone']));
  if ($name === '' || strlen($phone) < 10) throw new InvalidArgumentException('Informe nome e WhatsApp.');
  $pdo->prepare('UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?')->execute([$name, $email, $phone, $row['id']]);
  if (!empty($body['password'])) {
    if (strlen((string) $body['password']) < 4) throw new InvalidArgumentException('A senha precisa ter pelo menos 4 caracteres.');
    $pdo->prepare('UPDATE customers SET password_hash = ? WHERE id = ?')->execute([password_hash((string) $body['password'], PASSWORD_DEFAULT), $row['id']]);
  }
  $st = $pdo->prepare('SELECT * FROM customers WHERE id = ?');
  $st->execute([$row['id']]);
  return gostinho_customer_public($st->fetch(), $pdo);
}

function gostinho_save_address(PDO $pdo, string $customerId, array $a): array {
  $id = $a['id'] ?? gostinho_id('ad');
  if (!empty($a['isDefault'])) {
    $pdo->prepare('UPDATE addresses SET is_default = 0 WHERE customer_id = ?')->execute([$customerId]);
  }
  gostinho_upsert($pdo, 'addresses', ['id','customer_id','label','cep','street','number','complement','neighborhood','city','state','reference','is_default'], [
    $id, $customerId,
    $a['label'] ?? 'Casa',
    preg_replace('/\D+/', '', (string) ($a['cep'] ?? '')),
    $a['street'] ?? $a['address'] ?? '',
    $a['number'] ?? $a['addressNumber'] ?? '',
    $a['complement'] ?? '',
    $a['neighborhood'] ?? '',
    $a['city'] ?? '',
    strtoupper(substr((string) ($a['state'] ?? ''), 0, 2)),
    $a['reference'] ?? '',
    gostinho_bool($a['isDefault'] ?? false),
  ]);
  return ['ok' => true, 'id' => $id];
}

function gostinho_toggle_favorite(PDO $pdo, string $customerId, string $productId): array {
  $st = $pdo->prepare('SELECT id FROM favorites WHERE customer_id = ? AND product_id = ?');
  $st->execute([$customerId, $productId]);
  $ex = $st->fetch();
  if ($ex) {
    $pdo->prepare('DELETE FROM favorites WHERE id = ?')->execute([$ex['id']]);
    return ['ok' => true, 'favorited' => false];
  }
  gostinho_upsert($pdo, 'favorites', ['id','customer_id','product_id'], [gostinho_id('fv'), $customerId, $productId]);
  return ['ok' => true, 'favorited' => true];
}

function gostinho_customer_orders(PDO $pdo, array $row): array {
  $st = $pdo->prepare('SELECT id FROM orders WHERE customer_id = ? OR phone = ? ORDER BY number DESC');
  $st->execute([$row['id'], $row['phone']]);
  $out = [];
  foreach ($st as $r) {
    $o = gostinho_get_order($pdo, $r['id']);
    if ($o) $out[] = $o;
  }
  return $out;
}

function gostinho_save_order_review(PDO $pdo, array $row, array $body): array {
  $orderId = (string) ($body['orderId'] ?? '');
  $order = gostinho_get_order($pdo, $orderId);
  if (!$order) throw new InvalidArgumentException('Pedido não encontrado.');
  if (($order['status'] ?? '') !== 'DELIVERED') throw new InvalidArgumentException('Avalie depois que o pedido for entregue.');
  $rating = max(1, min(5, (int) ($body['rating'] ?? 5)));
  $comment = trim((string) ($body['comment'] ?? ''));
  $st = $pdo->prepare('SELECT id FROM order_reviews WHERE order_id = ?');
  $st->execute([$order['id']]);
  $id = $st->fetchColumn() ?: gostinho_id('orv');
  gostinho_upsert($pdo, 'order_reviews', ['id','order_id','customer_id','rating','comment','created_at'], [
    $id, $order['id'], $row['id'], $rating, $comment, gostinho_now(),
  ]);
  gostinho_upsert($pdo, 'reviews', ['id','name','rating','comment','active'], [
    'rev-' . $order['id'], $row['name'], $rating, $comment !== '' ? $comment : 'Pedido avaliado.', 1,
  ]);
  return ['ok' => true];
}

function gostinho_load_drivers(PDO $pdo): array {
  $out = [];
  try {
    foreach ($pdo->query('SELECT * FROM delivery_persons ORDER BY name') as $row) {
      $out[] = [
        'id' => $row['id'],
        'name' => $row['name'],
        'phone' => $row['phone'],
        'status' => $row['status'],
        'active' => (bool) $row['active'],
      ];
    }
  } catch (Throwable $e) {
    return [];
  }
  return $out;
}

function gostinho_save_driver(PDO $pdo, array $d): void {
  $id = $d['id'] ?? gostinho_id('drv');
  $status = strtoupper((string) ($d['status'] ?? 'AVAILABLE'));
  if (!in_array($status, ['AVAILABLE', 'BUSY', 'OFF'], true)) $status = 'AVAILABLE';
  gostinho_upsert($pdo, 'delivery_persons', ['id','name','phone','status','active'], [
    $id, $d['name'] ?? '', preg_replace('/\D+/', '', (string) ($d['phone'] ?? '')), $status, gostinho_bool($d['active'] ?? true),
  ]);
}

function gostinho_load_stock_items(PDO $pdo): array {
  $out = [];
  try {
    foreach ($pdo->query('SELECT * FROM stock_items ORDER BY name') as $row) {
      $out[] = [
        'id' => $row['id'],
        'name' => $row['name'],
        'unit' => $row['unit'],
        'quantity' => (float) $row['quantity'],
        'minQuantity' => (float) $row['min_quantity'],
        'active' => (bool) $row['active'],
        'low' => (float) $row['quantity'] <= (float) $row['min_quantity'],
      ];
    }
  } catch (Throwable $e) {
    return [];
  }
  return $out;
}

function gostinho_save_stock_item(PDO $pdo, array $s): void {
  $id = $s['id'] ?? gostinho_id('stk');
  gostinho_upsert($pdo, 'stock_items', ['id','name','unit','quantity','min_quantity','active'], [
    $id, $s['name'] ?? '', $s['unit'] ?? 'kg', (float) ($s['quantity'] ?? 0), (float) ($s['minQuantity'] ?? 0), gostinho_bool($s['active'] ?? true),
  ]);
}

function gostinho_move_stock(PDO $pdo, array $body): void {
  $id = (string) ($body['id'] ?? '');
  $type = (string) ($body['type'] ?? 'in');
  $qty = abs((float) ($body['quantity'] ?? 0));
  if ($qty <= 0) throw new InvalidArgumentException('Informe a quantidade.');
  $st = $pdo->prepare('SELECT * FROM stock_items WHERE id = ?');
  $st->execute([$id]);
  $item = $st->fetch();
  if (!$item) throw new InvalidArgumentException('Insumo não encontrado.');
  $current = (float) $item['quantity'];
  if ($type === 'out') $current -= $qty;
  elseif ($type === 'set') $current = $qty;
  else $current += $qty;
  $pdo->prepare('UPDATE stock_items SET quantity = ? WHERE id = ?')->execute([$current, $id]);
  gostinho_upsert($pdo, 'stock_movements', ['id','item_id','type','quantity','note','created_at'], [
    gostinho_id('sm'), $id, $type, $qty, (string) ($body['note'] ?? ''), gostinho_now(),
  ]);
}

function gostinho_load_customers_admin(PDO $pdo): array {
  $out = [];
  try {
    foreach ($pdo->query('SELECT * FROM customers ORDER BY created_at DESC') as $row) {
      $st = $pdo->prepare('SELECT COUNT(*) AS n, COALESCE(SUM(total),0) AS spent, MAX(created_at) AS last_at FROM orders WHERE customer_id = ? OR phone = ?');
      $st->execute([$row['id'], $row['phone']]);
      $agg = $st->fetch() ?: ['n' => 0, 'spent' => 0, 'last_at' => null];
      $n = (int) $agg['n'];
      $spent = (float) $agg['spent'];
      $out[] = [
        'id' => $row['id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'phone' => $row['phone'],
        'points' => (int) $row['points'],
        'active' => (bool) $row['active'],
        'orders' => $n,
        'spent' => $spent,
        'ticket' => $n ? round($spent / $n, 2) : 0,
        'lastOrder' => $agg['last_at'],
        'createdAt' => $row['created_at'],
      ];
    }
  } catch (Throwable $e) {
    return [];
  }
  return $out;
}

function gostinho_reports(PDO $pdo, string $from = '', string $to = ''): array {
  $orders = gostinho_load_orders($pdo);
  $ok = array_values(array_filter($orders, fn($o) => ($o['status'] ?? '') !== 'CANCELLED'));
  if ($from !== '') $ok = array_values(array_filter($ok, fn($o) => substr((string) $o['createdAt'], 0, 10) >= $from));
  if ($to !== '') $ok = array_values(array_filter($ok, fn($o) => substr((string) $o['createdAt'], 0, 10) <= $to));
  $cancelled = array_values(array_filter($orders, function ($o) use ($from, $to) {
    if (($o['status'] ?? '') !== 'CANCELLED') return false;
    $d = substr((string) $o['createdAt'], 0, 10);
    if ($from !== '' && $d < $from) return false;
    if ($to !== '' && $d > $to) return false;
    return true;
  }));
  $revenue = array_sum(array_map(fn($o) => (float) $o['total'], $ok));
  $fees = array_sum(array_map(fn($o) => (float) $o['deliveryFee'], $ok));
  $discounts = array_sum(array_map(fn($o) => (float) $o['discount'], $ok));
  $count = count($ok);
  $byDay = [];
  $byPay = [];
  $byProduct = [];
  $byCat = [];
  $byCustomer = [];
  $products = [];
  try {
    foreach ($pdo->query('SELECT id, name, category_id FROM products') as $p) $products[$p['id']] = $p;
  } catch (Throwable $e) {
  }
  $cats = [];
  try {
    foreach ($pdo->query('SELECT id, name FROM categories') as $c) $cats[$c['id']] = $c['name'];
  } catch (Throwable $e) {
  }
  foreach ($ok as $o) {
    $day = substr((string) $o['createdAt'], 0, 10);
    if (!isset($byDay[$day])) $byDay[$day] = ['date' => $day, 'orders' => 0, 'total' => 0];
    $byDay[$day]['orders']++;
    $byDay[$day]['total'] += (float) $o['total'];
    $pay = $o['paymentMethod'] ?: 'PIX';
    if (!isset($byPay[$pay])) $byPay[$pay] = ['method' => $pay, 'orders' => 0, 'total' => 0];
    $byPay[$pay]['orders']++;
    $byPay[$pay]['total'] += (float) $o['total'];
    $ck = $o['customerName'] . '|' . $o['phone'];
    if (!isset($byCustomer[$ck])) $byCustomer[$ck] = ['name' => $o['customerName'], 'phone' => $o['phone'], 'orders' => 0, 'total' => 0];
    $byCustomer[$ck]['orders']++;
    $byCustomer[$ck]['total'] += (float) $o['total'];
    foreach ($o['items'] as $it) {
      $pid = $it['productId'] ?: $it['productName'];
      if (!isset($byProduct[$pid])) $byProduct[$pid] = ['name' => $it['productName'], 'qty' => 0, 'total' => 0];
      $byProduct[$pid]['qty'] += (int) $it['quantity'];
      $byProduct[$pid]['total'] += (float) $it['unitPrice'] * (int) $it['quantity'];
      $catId = $products[$it['productId'] ?? '']['category_id'] ?? '';
      $catName = $cats[$catId] ?? 'Outros';
      if (!isset($byCat[$catName])) $byCat[$catName] = ['name' => $catName, 'qty' => 0, 'total' => 0];
      $byCat[$catName]['qty'] += (int) $it['quantity'];
      $byCat[$catName]['total'] += (float) $it['unitPrice'] * (int) $it['quantity'];
    }
  }
  usort($byProduct, fn($a, $b) => $b['qty'] <=> $a['qty']);
  usort($byCat, fn($a, $b) => $b['total'] <=> $a['total']);
  usort($byCustomer, fn($a, $b) => $b['total'] <=> $a['total']);
  ksort($byDay);
  return [
    'from' => $from,
    'to' => $to,
    'orders' => $count,
    'cancelled' => count($cancelled),
    'revenue' => round($revenue, 2),
    'deliveryFees' => round($fees, 2),
    'discounts' => round($discounts, 2),
    'ticket' => $count ? round($revenue / $count, 2) : 0,
    'estimatedProfit' => round($revenue * 0.62, 2),
    'byDay' => array_values($byDay),
    'byPayment' => array_values($byPay),
    'topProducts' => array_slice(array_values($byProduct), 0, 12),
    'topCategories' => array_values($byCat),
    'topCustomers' => array_slice(array_values($byCustomer), 0, 12),
  ];
}

function gostinho_admin_notifications(PDO $pdo): array {
  $out = [];
  try {
    foreach ($pdo->query("SELECT * FROM notifications WHERE audience = 'ADMIN' ORDER BY created_at DESC LIMIT 40") as $n) {
      $out[] = [
        'id' => $n['id'],
        'title' => $n['title'],
        'body' => $n['body'],
        'orderId' => $n['order_id'],
        'read' => (bool) $n['read_flag'],
        'createdAt' => $n['created_at'],
      ];
    }
  } catch (Throwable $e) {
    return [];
  }
  return $out;
}

function gostinho_seed_platform(PDO $pdo): void {
  gostinho_ensure_platform($pdo);
  $count = (int) $pdo->query('SELECT COUNT(*) FROM customers')->fetchColumn();
  if ($count > 0) {
    gostinho_seed_extra_coupons($pdo);
    return;
  }

  $hash = password_hash('123456', PASSWORD_DEFAULT);
  $maria = 'cus-maria';
  $joao = 'cus-joao';
  gostinho_upsert($pdo, 'customers', ['id','name','email','phone','password_hash','token','points','role','active','created_at'], [
    $maria, 'Maria Silva', 'maria@gostinho.com', '11988880001', $hash, gostinho_token(), 347, 'CLIENTE', 1, gostinho_now(),
  ]);
  gostinho_upsert($pdo, 'customers', ['id','name','email','phone','password_hash','token','points','role','active','created_at'], [
    $joao, 'João Souza', 'joao@gostinho.com', '11988880002', $hash, gostinho_token(), 120, 'CLIENTE', 1, gostinho_now(),
  ]);
  gostinho_upsert($pdo, 'addresses', ['id','customer_id','label','cep','street','number','complement','neighborhood','city','state','reference','is_default'], [
    'ad-casa', $maria, 'Casa', '01310100', 'Rua das Hortênsias', '120', 'Apto 12', 'Centro', 'São Paulo', 'SP', 'Portão azul', 1,
  ]);
  gostinho_upsert($pdo, 'addresses', ['id','customer_id','label','cep','street','number','complement','neighborhood','city','state','reference','is_default'], [
    'ad-trab', $maria, 'Trabalho', '01311000', 'Av. Paulista', '900', 'Sala 4', 'Bela Vista', 'São Paulo', 'SP', '', 0,
  ]);
  gostinho_upsert($pdo, 'favorites', ['id','customer_id','product_id'], ['fv-1', $maria, 'p-carne-acebolada']);
  gostinho_upsert($pdo, 'favorites', ['id','customer_id','product_id'], ['fv-2', $maria, 'p-strogonoff']);

  foreach ([
    ['drv-carlos', 'Carlos Mendes', '11977770001', 'AVAILABLE'],
    ['drv-ana', 'Ana Ribeiro', '11977770002', 'BUSY'],
    ['drv-pedro', 'Pedro Lima', '11977770003', 'OFF'],
  ] as $d) {
    gostinho_upsert($pdo, 'delivery_persons', ['id','name','phone','status','active'], [$d[0], $d[1], $d[2], $d[3], 1]);
  }

  foreach ([
    ['stk-arroz', 'Arroz', 'kg', 25, 8],
    ['stk-feijao', 'Feijão', 'kg', 10, 5],
    ['stk-carne', 'Carne', 'kg', 18, 6],
    ['stk-frango', 'Frango', 'kg', 22, 8],
    ['stk-ovo', 'Ovos', 'un', 48, 12],
  ] as $s) {
    gostinho_upsert($pdo, 'stock_items', ['id','name','unit','quantity','min_quantity','active'], [$s[0], $s[1], $s[2], $s[3], $s[4], 1]);
  }

  gostinho_seed_extra_coupons($pdo);
  gostinho_seed_demo_orders($pdo, $maria, $joao);
}

function gostinho_seed_extra_coupons(PDO $pdo): void {
  $st = $pdo->prepare('SELECT id FROM coupons WHERE code = ?');
  foreach ([
    ['c-gostinho10', 'GOSTINHO10', 'percent', 10, 40, 200, '2026-12-31'],
    ['c-primeira', 'PRIMEIRACOMPRA', 'fixed', 10, 30, 500, '2026-12-31'],
  ] as $c) {
    $st->execute([$c[1]]);
    if ($st->fetch()) continue;
    gostinho_upsert($pdo, 'coupons', ['id','code','type','value','min_order','max_uses','used_count','expires_at','active'], [
      $c[0], $c[1], $c[2], $c[3], $c[4], $c[5], 0, $c[6], 1,
    ]);
  }
  try {
    $cur = gostinho_get_settings($pdo);
    $changed = false;
    if (!isset($cur['freeDeliveryMin'])) { $cur['freeDeliveryMin'] = 80; $changed = true; }
    if (!isset($cur['deliveryMode'])) { $cur['deliveryMode'] = 'neighborhood'; $changed = true; }
    if (!isset($cur['fixedDeliveryFee'])) { $cur['fixedDeliveryFee'] = 8; $changed = true; }
    if (!isset($cur['loyaltyEnabled'])) { $cur['loyaltyEnabled'] = true; $changed = true; }
    if (!isset($cur['loyaltyPerReal'])) { $cur['loyaltyPerReal'] = 1; $changed = true; }
    if (!isset($cur['loyaltyRedeemPoints'])) { $cur['loyaltyRedeemPoints'] = 500; $changed = true; }
    if (!isset($cur['loyaltyRedeemValue'])) { $cur['loyaltyRedeemValue'] = 10; $changed = true; }
    if (!isset($cur['pixKey'])) { $cur['pixKey'] = '11988887777'; $changed = true; }
    if ($changed) gostinho_save_settings($pdo, $cur);
  } catch (Throwable $e) {
  }
}

function gostinho_seed_demo_orders(PDO $pdo, string $maria, string $joao): void {
  $n = (int) $pdo->query('SELECT COUNT(*) FROM orders')->fetchColumn();
  if ($n > 0) return;
  $today = gostinho_today_ymd();
  $tomorrow = gostinho_add_days_ymd($today, 1);
  $demos = [
    ['NEW', $maria, 'Maria Silva', '11988880001', 'Centro', 58.8],
    ['CONFIRMED', $joao, 'João Souza', '11988880002', 'São José', 49.8],
    ['PREPARING', $maria, 'Maria Silva', '11988880001', 'Centro', 99.9],
    ['READY', $joao, 'João Souza', '11988880002', 'Vila Nova', 27.9],
    ['DELIVERING', $maria, 'Maria Silva', '11988880001', 'Jardim América', 35.8],
    ['DELIVERED', $joao, 'João Souza', '11988880002', 'Centro', 24.9],
  ];
  $num = 1043;
  foreach ($demos as $i => $d) {
    $id = 'ord-demo-' . ($i + 1);
    $pdo->prepare('INSERT INTO orders (id,number,customer_name,phone,address,address_number,complement,neighborhood,delivery_type,delivery_fee,payment_method,change_for,notes,coupon_code,discount,subtotal,total,status,printed,scheduled_date,scheduled_slot,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      ->execute([
        $id, $num + $i, $d[2], $d[3], 'Rua das Hortênsias', '120', '', $d[4], 'DELIVERY',
        $d[5] >= 80 ? 0 : 5, 'PIX', null, $i === 2 ? 'Sem cebola' : '', '', 0, $d[5] - 5, $d[5], $d[0], 0,
        $tomorrow, 'ALMOCO', gostinho_now(),
      ]);
    try {
      $pdo->prepare('UPDATE orders SET customer_id = ?, city = ?, state = ?, cep = ? WHERE id = ?')
        ->execute([$d[1], 'São Paulo', 'SP', '01310100', $id]);
    } catch (Throwable $e) {
    }
    $ins = $pdo->prepare('INSERT INTO order_items (id,order_id,product_id,product_name,quantity,unit_price,size_name,extras,notes) VALUES (?,?,?,?,?,?,?,?,?)');
    $ins->execute([gostinho_id('oi'), $id, 'p-carne-acebolada', 'Carne acebolada com farofa', 2, 27.9, '', '', $i === 2 ? 'Sem cebola' : '']);
    if ($i === 0) $ins->execute([gostinho_id('oi'), $id, 'p-suco-laranja', 'Suco natural de laranja', 1, 8, '', '', '']);
  }
  gostinho_notify($pdo, 'ADMIN', 'Novo pedido recebido', 'Pedido #1043 de Maria Silva.', 'ord-demo-1');
}
