<?php
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(true);
session_destroy();
header('Content-Type: application/json; charset=utf-8');
echo json_encode(["success" => true]);
