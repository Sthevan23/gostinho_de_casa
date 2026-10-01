<?php

function gostinho_cfg(): array {
  static $cfg = null;
  if ($cfg === null) {
    $cfg = require __DIR__ . '/config.php';
  }
  return $cfg;
}

function gostinho_use_mysql(): bool {
  $cfg = gostinho_cfg();
  $pass = (string) ($cfg['pass'] ?? '');
  return ($cfg['driver'] ?? '') === 'mysql'
    && $pass !== ''
    && $pass !== 'COLOQUE_A_SENHA_DO_MYSQL_AQUI'
    && !empty($cfg['name'])
    && !empty($cfg['user']);
}

function gostinho_db(): PDO {
  static $pdo = null;
  if ($pdo instanceof PDO) {
    return $pdo;
  }

  if (gostinho_use_mysql()) {
    $cfg = gostinho_cfg();
    $dsn = sprintf(
      'mysql:host=%s;port=%d;dbname=%s;charset=%s',
      $cfg['host'] ?? 'localhost',
      (int) ($cfg['port'] ?? 3306),
      $cfg['name'],
      $cfg['charset'] ?? 'utf8mb4'
    );
    $pdo = new PDO($dsn, $cfg['user'], $cfg['pass'], [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
      PDO::ATTR_EMULATE_PREPARES => false,
    ]);
  } else {
    $path = __DIR__ . '/gostinho.sqlite';
    $pdo = new PDO('sqlite:' . $path, null, null, [
      PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
      PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA journal_mode = WAL');
  }

  gostinho_ensure_schema($pdo);
  gostinho_seed_if_empty($pdo);
  return $pdo;
}

function gostinho_is_sqlite(PDO $pdo): bool {
  return $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'sqlite';
}
