<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/product_catalog.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

ensure_marketplace_product_schema($pdo);

if (!isset($_SESSION['user']['id'])) {
  echo json_encode(["error" => "No autorizado"]);
  exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$id    = (int)($data['id'] ?? 0);
$name  = trim($data['name'] ?? '');
$desc  = trim($data['description'] ?? '');
$price = (float)($data['price'] ?? 0);
$stock = (int)($data['stock'] ?? -1);
$category_raw = $data['category'] ?? null;
$category_id = (is_numeric($category_raw)) ? (int)$category_raw : 0;
$condition_code = normalize_product_condition((string)($data['condition'] ?? 'good'));
$pickup_location = normalize_product_location($data['location'] ?? null);
$is_featured = filter_var($data['featured'] ?? false, FILTER_VALIDATE_BOOLEAN);
if (!is_numeric($category_raw) && is_string($category_raw)) {
  $norm = strtolower(trim($category_raw));
  if ($norm === 'juegos') $category_id = 0; // handled as free-text, no fixed id
  if ($norm === 'salud') $category_id = 0;
}

if ($id <= 0) { echo json_encode(["error" => "ID inválido"]); exit; }
if ($name === '' || $desc === '' || $price <= 0 || $stock < 0) {
  echo json_encode(["error" => "Nombre, descripción, precio y stock son obligatorios"]);
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
  $upd = $pdo->prepare("
    UPDATE products
    SET
      name = ?,
      description = ?,
      price_cents = ?,
      stock = ?,
      category_id = ?,
      condition_code = ?,
      pickup_location = ?,
      is_featured = ?,
      updated_at = NOW()
    WHERE id = ?
  ");
  $upd->execute([
    $name,
    $desc,
    $price_cents,
    $stock,
    $category_id > 0 ? $category_id : null,
    $condition_code,
    $pickup_location,
    $is_featured,
    $id,
  ]);
  echo json_encode(["success" => true]);
} catch (Exception $e) {
  echo json_encode(["error" => $e->getMessage()]);
}
