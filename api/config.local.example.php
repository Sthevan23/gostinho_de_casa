<?php
/**
 * Copie para config.local.php
 *
 * Sem MySQL: deixe driver = sqlite (grava api/gostinho.sqlite).
 * Hostinger MySQL: driver = mysql e preencha name/user/pass.
 */
$httpHost = $_SERVER['HTTP_HOST'] ?? 'cli';
$isLocalDev = (bool) preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/i', $httpHost);

return [
  'driver' => 'sqlite',
  'host' => $isLocalDev ? 'localhost' : 'localhost',
  'port' => 3306,
  'name' => 'u000000000_gostinho',
  'user' => 'u000000000_gostinho',
  'pass' => 'COLOQUE_A_SENHA_DO_MYSQL_AQUI',
  'charset' => 'utf8mb4',
];
