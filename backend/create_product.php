<?php
require __DIR__ . '/../db.php';
session_start();
header('Content-Type: application/json');

// Requiere sesión
if (!isset($_SESSION['user']['id'])) {
  echo json_encode(["error" => "No autorizado"]);
  exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$name  = trim($data['name'] ?? '');
$desc  = trim($data['description'] ?? '');
$price = (float)($data['price'] ?? 0);
$stock = (int)($data['stock'] ?? 0);

if ($name === '' || $price <= 0 || $desc === '') {
  echo json_encode(["error" => "Nombre, descripción y precio son obligatorios"]);
  exit;
}

$price_cents = (int) round($price * 100);
$seller_id = (int) $_SESSION['user']['id'];

try {
  $stmt = $pdo->prepare(
    "INSERT INTO products (name, description, price_cents, stock, seller_id) VALUES (?,?,?,?,?) RETURNING id"
  );
  $stmt->execute([$name, $desc, $price_cents, $stock, $seller_id]);
  $product_id = (int)$stmt->fetchColumn();

  echo json_encode(["success" => true, "product_id" => $product_id]);
} catch (Exception $e) {
  echo json_encode(["error" => $e->getMessage()]);
}
