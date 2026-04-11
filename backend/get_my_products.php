<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/product_catalog.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

ensure_marketplace_product_schema($pdo);

if (false) {
  echo json_encode(["error" => "No autorizado"]);
  exit;
}

$currentUser = auth_require_user($pdo);
$seller_id = (int) $currentUser['id'];

try {
  $stmt = $pdo->prepare("
    SELECT
      p.id,
      p.name,
      p.description,
      p.price_cents,
      p.stock,
      p.category_id,
      p.status,
      p.condition_code,
      p.pickup_location,
      p.is_featured,
      p.created_at,
      p.updated_at,
      (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image
    FROM products p
    WHERE p.seller_id = ?
    ORDER BY
      CASE p.status
        WHEN 'active' THEN 0
        WHEN 'paused' THEN 1
        ELSE 2
      END,
      p.is_featured DESC,
      p.created_at DESC
  ");
  $stmt->execute([$seller_id]);
  $products = array_map(static function (array $row) {
    return [
      'id' => (int) $row['id'],
      'name' => $row['name'],
      'description' => $row['description'],
      'price_cents' => (int) $row['price_cents'],
      'stock' => (int) $row['stock'],
      'category_id' => isset($row['category_id']) ? (int) $row['category_id'] : null,
      'status' => normalize_product_status((string) ($row['status'] ?? 'active')),
      'condition_code' => normalize_product_condition((string) ($row['condition_code'] ?? 'good')),
      'pickup_location' => $row['pickup_location'] ?: null,
      'is_featured' => filter_var($row['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
      'created_at' => $row['created_at'],
      'updated_at' => $row['updated_at'],
      'image' => $row['image'] ?? null,
    ];
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));

  echo json_encode($products);
} catch (Exception $e) {
  echo json_encode(["error" => $e->getMessage()]);
}
