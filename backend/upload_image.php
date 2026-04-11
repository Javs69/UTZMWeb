<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

if (!isset($_FILES['imagen']) || $_FILES['imagen']['error'] === UPLOAD_ERR_NO_FILE) {
  http_response_code(422);
  echo json_encode(["error" => "No se recibió archivo"]);
  exit;
}

$currentUser = auth_require_user($pdo);
$product_id = isset($_POST['product_id']) ? (int) $_POST['product_id'] : 0;
if ($product_id <= 0) {
  http_response_code(422);
  echo json_encode(["error" => "Producto invalido"]);
  exit;
}

$ownerStmt = $pdo->prepare("SELECT seller_id FROM products WHERE id = ? LIMIT 1");
$ownerStmt->execute([$product_id]);
$sellerId = (int) $ownerStmt->fetchColumn();
if ($sellerId <= 0) {
  http_response_code(404);
  echo json_encode(["error" => "Producto no encontrado"]);
  exit;
}
if ($sellerId !== (int) $currentUser['id']) {
  http_response_code(403);
  echo json_encode(["error" => "No autorizado"]);
  exit;
}

$file = $_FILES['imagen'];
if ($file['error'] !== UPLOAD_ERR_OK) {
  http_response_code(422);
  echo json_encode(["error" => "Error al recibir el archivo"]);
  exit;
}

if ($file['size'] > 5 * 1024 * 1024) {
  http_response_code(422);
  echo json_encode(["error" => "La imagen debe pesar menos de 5 MB"]);
  exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$detectedMime = $finfo ? finfo_file($finfo, $file['tmp_name']) : null;
if ($finfo) {
  finfo_close($finfo);
}

$allowed = [
  'image/jpeg' => 'jpg',
  'image/png'  => 'png',
  'image/webp' => 'webp',
  'image/gif'  => 'gif',
];
$ext = $allowed[$detectedMime] ?? null;
if (!$ext) {
  http_response_code(422);
  echo json_encode(["error" => "Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF."]);
  exit;
}

$dir = __DIR__ . '/../public/uploads/';
if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
  http_response_code(500);
  echo json_encode(["error" => "No se pudo preparar el directorio de cargas"]);
  exit;
}

$filename = sprintf('%s_%s.%s', time(), bin2hex(random_bytes(8)), $ext);
$path = $dir . $filename;

if (!move_uploaded_file($file['tmp_name'], $path)) {
  http_response_code(500);
  echo json_encode(["error" => "No se pudo guardar el archivo"]);
  exit;
}

$url = "/public/uploads/" . $filename;
$stmt = $pdo->prepare("INSERT INTO product_images (product_id, url) VALUES (?, ?)");
$stmt->execute([$product_id, $url]);

echo json_encode(["success" => true, "url" => $url]);
