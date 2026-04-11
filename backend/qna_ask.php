<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

if (false) {
  echo json_encode(["error" => "No autorizado"]);
  exit;
}

$currentUser = auth_require_user($pdo);
$data = json_decode(file_get_contents('php://input'), true);
$product_id = (int)($data['product_id'] ?? 0);
$text = trim($data['text'] ?? '');
if ($product_id <= 0 || $text === '') {
  echo json_encode(["error" => "Datos inválidos"]);
  exit;
}

try {
  $stmt = $pdo->prepare("INSERT INTO questions (product_id, user_id, text) VALUES (?,?,?) RETURNING id");
  $stmt->execute([$product_id, (int) $currentUser['id'], $text]);
  $id = (int)$stmt->fetchColumn();
  echo json_encode(["success" => true, "id" => $id]);
} catch (Exception $e) {
  echo json_encode(["error" => $e->getMessage()]);
}
