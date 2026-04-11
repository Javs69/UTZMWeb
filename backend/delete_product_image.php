<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

$currentUser = auth_require_user($pdo);
$payload = json_decode(file_get_contents('php://input'), true);
$image_id = isset($payload['image_id']) ? (int) $payload['image_id'] : 0;

if ($image_id <= 0) {
  http_response_code(422);
  echo json_encode(['error' => 'Imagen inválida']);
  exit;
}

// Verificar propiedad a través del producto
$stmt = $pdo->prepare("
  SELECT pi.id, pi.url, p.seller_id
  FROM product_images pi
  JOIN products p ON p.id = pi.product_id
  WHERE pi.id = ?
  LIMIT 1
");
$stmt->execute([$image_id]);
$image = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$image) {
  http_response_code(404);
  echo json_encode(['error' => 'Imagen no encontrada']);
  exit;
}

if ((int) $image['seller_id'] !== (int) $currentUser['id']) {
  http_response_code(403);
  echo json_encode(['error' => 'No autorizado']);
  exit;
}

$pdo->prepare("DELETE FROM product_images WHERE id = ?")->execute([$image_id]);

// Intentar eliminar el archivo físico si es una subida local
$url = (string) $image['url'];
if (str_starts_with($url, '/public/uploads/')) {
  $filePath = realpath(__DIR__ . '/..' . $url);
  $uploadsBase = realpath(__DIR__ . '/../public/uploads');
  // Solo borrar si el archivo está dentro de la carpeta de uploads (evitar path traversal)
  if ($filePath && $uploadsBase && str_starts_with($filePath, $uploadsBase . DIRECTORY_SEPARATOR)) {
    @unlink($filePath);
  }
}

echo json_encode(['success' => true]);
