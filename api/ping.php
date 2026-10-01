<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');
echo '{"ok":true,"light":true,"app":"gostinho","ts":' . time() . '}';
