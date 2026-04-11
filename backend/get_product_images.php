<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

$currentUser = auth_require_user($pdo);
$product_id = isset($_GET['product_id']) ? (int) $_GET['product_id'] : 0;

if ($product_id <= 0) {
  http_response_code(422);
  echo json_encode(['error' => 'Producto inválido']);
  exit;
}

$ownerStmt = $pdo->prepare("SELECT seller_id FROM products WHERE id = ? LIMIT 1");
$ownerStmt->execute([$product_id]);
$sellerId = (int) $ownerStmt->fetchColumn();

if ($sellerId <= 0) {
  http_response_code(404);
  echo json_encode(['error' => 'Producto no encontrado']);
  exit;
}

if ($sellerId !== (int) $currentUser['id']) {
  http_response_code(403);
  echo json_encode(['error' => 'No autorizado']);
  exit;
}

$stmt = $pdo->prepare(
  "SELECT id, url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order NULLS LAST, id ASC"
);
$stmt->execute([$product_id]);
$images = array_map(static function (array $row) {
  return [
    'id'         => (int) $row['id'],
    'url'        => $row['url'],
    'sort_order' => isset($row['sort_order']) ? (int) $row['sort_order'] : null,
  ];
}, $stmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode(['images' => $images]);
