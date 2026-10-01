<?php
/**
 * Copie para config.local.php
 *
 * Hostinger MySQL:
 * 1. Importe gostinho.sql no phpMyAdmin
 * 2. driver = mysql e preencha name/user/pass do hPanel
 *
 * Sem MySQL: deixe driver = sqlite (grava api/gostinho.sqlite).
 */
$httpHost = $_SERVER['HTTP_HOST'] ?? 'cli';
$isLocalDev = (bool) preg_match('/^(localhost|127\.0\.0\.1)(:\d+)?$/i', $httpHost);

return [
  'driver' => 'sqlite',
  'host' => $isLocalDev ? 'localhost' : 'localhost',
  'port' => 3306,
  'name' => 'u586160337_decasa',
  'user' => 'u586160337_decasa',
  'pass' => 'COLOQUE_A_SENHA_DO_MYSQL_AQUI',
  'charset' => 'utf8mb4',
];
