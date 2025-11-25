<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
session_start();
$_SESSION['user'] = ['id'=>2,'full_name'=>'seller'];
$payload = json_encode(['order_id'=>10]);
file_put_contents('php://input', $payload);
// No direct way to override php://input; instead we fake stream by setting to global? We'll call script via include and set php://input using stream wrapper trick.
