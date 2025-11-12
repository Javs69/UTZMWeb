<?php
require __DIR__ . '/../db.php';
header('Content-Type: application/json; charset=utf-8');

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
if ($id <= 0) {
  echo json_encode(["error" => "ID inválido"]);
  exit;
}

$stmt = $pdo->prepare("SELECT p.id, p.name, p.description, p.price_cents, p.stock, p.seller_id, u.full_name AS seller_name, u.email AS seller_email
                       FROM products p
                       LEFT JOIN users u ON u.id = p.seller_id
                       WHERE p.id = ? LIMIT 1");
$stmt->execute([$id]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$product) {
  echo json_encode(["error" => "Producto no encontrado"]);
  exit;
}

// Imágenes
$imgs = $pdo->prepare("SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order NULLS LAST, id ASC");
$imgs->execute([$id]);
$images = array_map(function($row){ return $row['url']; }, $imgs->fetchAll(PDO::FETCH_ASSOC));

$product['images'] = $images;
echo json_encode($product);
