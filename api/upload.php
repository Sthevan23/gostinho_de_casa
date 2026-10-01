<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Admin-Password');

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
  http_response_code(204);
  exit;
}

header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método não permitido']);
  exit;
}

require_once __DIR__ . '/store.php';

try {
  $pdo = gostinho_db();
  $auth = gostinho_get_auth($pdo);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'Falha no banco', 'detail' => $e->getMessage()]);
  exit;
}

$password = (string) ($_SERVER['HTTP_X_ADMIN_PASSWORD'] ?? '');
if ($password === '' || $auth['password'] === '' || !hash_equals($auth['password'], $password)) {
  http_response_code(401);
  echo json_encode(['error' => 'Senha inválida']);
  exit;
}

if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
  http_response_code(400);
  echo json_encode(['error' => 'Envie uma imagem válida (JPG/PNG)']);
  exit;
}

$file = $_FILES['image'];
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($file['tmp_name']);
$allowed = [
  'image/jpeg' => 'jpg',
  'image/png' => 'png',
  'image/webp' => 'webp',
];
if (!isset($allowed[$mime])) {
  http_response_code(400);
  echo json_encode(['error' => 'Use JPG, PNG ou WEBP']);
  exit;
}
if ($file['size'] > 8 * 1024 * 1024) {
  http_response_code(400);
  echo json_encode(['error' => 'Imagem maior que 8MB']);
  exit;
}

$dir = dirname(__DIR__) . DIRECTORY_SEPARATOR . 'uploads';
if (!is_dir($dir)) mkdir($dir, 0755, true);
$name = 'img-' . date('YmdHis') . '-' . bin2hex(random_bytes(3)) . '.' . $allowed[$mime];
$dest = $dir . DIRECTORY_SEPARATOR . $name;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
  http_response_code(500);
  echo json_encode(['error' => 'Não foi possível gravar o arquivo']);
  exit;
}

echo json_encode(['ok' => true, 'url' => '/uploads/' . $name]);
