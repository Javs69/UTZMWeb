<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/product_catalog.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

ensure_marketplace_product_schema($pdo);

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if ($id <= 0) {
  http_response_code(422);
  echo json_encode(['error' => 'Producto invalido']);
  exit;
}

$stmt = $pdo->prepare("
  SELECT
    p.id,
    p.name,
    p.description,
    p.price_cents,
    p.stock,
    p.seller_id,
    p.category_id,
    p.status,
    p.condition_code,
    p.pickup_location,
    p.is_featured,
    u.full_name AS seller_name,
    u.email AS seller_email,
    u.seller_verified,
    u.store_name,
    u.seller_bio,
    COALESCE(review_stats.avg_rating, 0) AS seller_rating_avg,
    COALESCE(review_stats.review_count, 0) AS seller_review_count
  FROM products p
  LEFT JOIN users u ON u.id = p.seller_id
  LEFT JOIN LATERAL (
    SELECT
      ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
      COUNT(*) AS review_count
    FROM order_reviews r
    WHERE r.reviewee_id = p.seller_id
  ) review_stats ON true
  WHERE p.id = ?
  LIMIT 1
");
$stmt->execute([$id]);
$product = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$product) {
  http_response_code(404);
  echo json_encode(['error' => 'Producto no encontrado']);
  exit;
}

$viewer = auth_user_from_access_token($pdo);
$viewerId = (int) ($viewer['id'] ?? 0);
$sellerId = (int) ($product['seller_id'] ?? 0);
$status = normalize_product_status((string) ($product['status'] ?? 'active'));

if ($status === 'deleted' || ($status !== 'active' && $viewerId !== $sellerId)) {
  http_response_code(404);
  echo json_encode(['error' => 'Producto no disponible']);
  exit;
}

$imgs = $pdo->prepare('SELECT url FROM product_images WHERE product_id = ? ORDER BY sort_order NULLS LAST, id ASC');
$imgs->execute([$id]);
$images = array_values(array_filter(array_map(fn($row) => $row['url'] ?? null, $imgs->fetchAll(PDO::FETCH_ASSOC))));

$product['id'] = (int) $product['id'];
$product['price_cents'] = (int) $product['price_cents'];
$product['stock'] = (int) $product['stock'];
$product['seller_id'] = (int) $product['seller_id'];
$product['category_id'] = isset($product['category_id']) ? (int) $product['category_id'] : null;
$product['status'] = $status;
$product['condition_code'] = normalize_product_condition((string) ($product['condition_code'] ?? 'good'));
$product['pickup_location'] = $product['pickup_location'] ?: null;
$product['is_featured'] = filter_var($product['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN);
$product['seller_verified'] = filter_var($product['seller_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
$product['seller_rating_avg'] = (float) $product['seller_rating_avg'];
$product['seller_review_count'] = (int) $product['seller_review_count'];
$product['images'] = $images;

echo json_encode($product);
