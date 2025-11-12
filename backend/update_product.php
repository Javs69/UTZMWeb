<?php
require __DIR__ . '/../db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']['id'])) {
  echo json_encode(["error" => "No autorizado"]);
  exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id    = (int)($data['id'] ?? 0);
$name  = trim($data['name'] ?? '');
$desc  = trim($data['description'] ?? '');
$price = (float)($data['price'] ?? 0);

if ($id <= 0) { echo json_encode(["error" => "ID invalido"]); exit; }
if ($name === '' || $desc === '' || $price <= 0) {
  echo json_encode(["error" => "Nombre, descripcion y precio son obligatorios"]);
  exit;
}

$price_cents = (int) round($price * 100);
$user_id = (int) $_SESSION['user']['id'];

try {
  // Verificar propiedad
  $chk = $pdo->prepare("SELECT seller_id FROM products WHERE id = ?");
  $chk->execute([$id]);
  $row = $chk->fetch(PDO::FETCH_ASSOC);
  if (!$row) { echo json_encode(["error" => "Producto no encontrado"]); exit; }
  if ((int)$row['seller_id'] !== $user_id) { echo json_encode(["error" => "Prohibido"]); exit; }

  // Actualizar
  $upd = $pdo->prepare("UPDATE products SET name = ?, description = ?, price_cents = ? WHERE id = ?");
  $upd->execute([$name, $desc, $price_cents, $id]);
  echo json_encode(["success" => true]);
} catch (Exception $e) {
  echo json_encode(["error" => $e->getMessage()]);
}

