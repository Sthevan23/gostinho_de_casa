<?php
$local = __DIR__ . '/config.local.php';
$example = __DIR__ . '/config.local.example.php';

if (is_file($local)) {
  return require $local;
}

if (is_file($example)) {
  return require $example;
}

return [
  'driver' => 'sqlite',
  'host' => 'localhost',
  'port' => 3306,
  'name' => '',
  'user' => '',
  'pass' => '',
  'charset' => 'utf8mb4',
];
