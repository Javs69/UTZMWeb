<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

if (!isset($_FILES['imagen'])) {
  die(json_encode(["error" => "No se recibió archivo"]));
}

$currentUser = auth_require_user($pdo);
$product_id = isset($_POST['product_id']) ? (int) $_POST['product_id'] : 0;
if ($product_id <= 0) {
  echo json_encode(["error" => "Producto invalido"]);
  exit;
}

$ownerStmt = $pdo->prepare("SELECT seller_id FROM products WHERE id = ? LIMIT 1");
$ownerStmt->execute([$product_id]);
$sellerId = (int) $ownerStmt->fetchColumn();
if ($sellerId <= 0) {
  echo json_encode(["error" => "Producto no encontrado"]);
  exit;
}
if ($sellerId !== (int) $currentUser['id']) {
  echo json_encode(["error" => "No autorizado"]);
  exit;
}

// Crear carpeta si no existe
$dir = "../public/uploads/";
if (!is_dir($dir)) {
  mkdir($dir, 0777, true);
}

$filename = time() . "_" . basename($_FILES['imagen']['name']);
$path = $dir . $filename;

if (move_uploaded_file($_FILES['imagen']['tmp_name'], $path)) {

  $url = "/public/uploads/" . $filename;

  // Guardar la URL en BD
  $stmt = $pdo->prepare("INSERT INTO product_images (product_id, url) VALUES (?, ?)");
  $stmt->execute([$product_id, $url]);

  echo json_encode(["success" => true, "url" => $url]);

} else {
  echo json_encode(["error" => "No se pudo mover el archivo"]);
}
