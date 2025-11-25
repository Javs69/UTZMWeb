<?php
session_id('cli-test');
session_start();
$_SESSION['user'] = ['id'=>4,'full_name'=>'demo'];
$payload = json_encode(['order_id'=>10]);
$context = stream_context_create(['http'=>[
  'method'=>'POST',
  'header'=>'Content-Type: application/json',
  'content'=>$payload,
  'ignore_errors'=>true
]]);
include __DIR__ . '/backend/cancel_order.php';
