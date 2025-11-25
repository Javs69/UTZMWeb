<?php
require "db.php";

$data = json_decode(file_get_contents("php://input"), true);
$order_id = $data["order_id"];
$payment_method_id = $data["payment_method_id"];
$amount_cents = $data["amount_cents"];

$stmt = $pdo->prepare("
  INSERT INTO payments (order_id, payment_method_id, amount_cents, status, paid_at)
  VALUES (?, ?, ?, 'captured', NOW())
");
$stmt->execute([$order_id, $payment_method_id, $amount_cents]);

$pdo->prepare("UPDATE orders SET status='paid' WHERE id=?")->execute([$order_id]);

echo json_encode(["message" => "Pago registrado y orden marcada como pagada"]);
