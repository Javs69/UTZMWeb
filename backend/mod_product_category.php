<?php
require __DIR__ . '/support_common.php';

$user = support_require_user($pdo);
support_require_staff($user);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  support_json(['error' => 'Metodo no permitido'], 405);
}

$payload = support_read_json();
$productId = (int)($payload['product_id'] ?? 0);

if ($productId <= 0) {
  support_json(['error' => 'ID de producto invalido'], 422);
}

if (!array_key_exists('category_id', $payload)) {
  support_json(['error' => 'category_id es requerido'], 422);
}

$categoryId = (int)$payload['category_id'];

// Validate: must be 0 (no category) or a known positive id (1-8)
if ($categoryId < 0 || $categoryId > 9) {
  support_json(['error' => 'Categoria invalida'], 422);
}

try {
  $check = $pdo->prepare("SELECT id FROM products WHERE id = ? AND status != 'deleted'");
  $check->execute([$productId]);
  if (!$check->fetch()) {
    support_json(['error' => 'Producto no encontrado'], 404);
  }

  $newCategoryId = $categoryId > 0 ? $categoryId : null;
  $upd = $pdo->prepare('UPDATE products SET category_id = :category_id, updated_at = NOW() WHERE id = :id');
  $upd->bindValue(':category_id', $newCategoryId, $newCategoryId !== null ? PDO::PARAM_INT : PDO::PARAM_NULL);
  $upd->bindValue(':id', $productId, PDO::PARAM_INT);
  $upd->execute();

  support_json(['success' => true]);
} catch (Throwable $e) {
  support_json(['error' => $e->getMessage()], 500);
}
