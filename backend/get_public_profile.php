<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/product_catalog.php';
header('Content-Type: application/json; charset=utf-8');

ensure_marketplace_product_schema($pdo);

$userId = isset($_GET['user_id']) ? (int) $_GET['user_id'] : 0;
$reviewsPage = max(1, (int) ($_GET['reviews_page'] ?? 1));
$reviewsPageSize = max(1, min(12, (int) ($_GET['reviews_page_size'] ?? 6)));
$productsPage = max(1, (int) ($_GET['products_page'] ?? 1));
$productsPageSize = max(1, min(24, (int) ($_GET['products_page_size'] ?? 8)));
if ($userId <= 0) {
  http_response_code(422);
  echo json_encode(['error' => 'Usuario invalido']);
  exit;
}

$profileStmt = $pdo->prepare("
  SELECT
    u.id,
    u.full_name,
    u.email,
    u.avatar_url,
    u.role,
    u.seller_verified,
    u.store_name,
    u.seller_bio,
    COALESCE(review_stats.avg_rating, 0) AS avg_rating,
    COALESCE(review_stats.review_count, 0) AS review_count,
    COALESCE(product_stats.product_count, 0) AS product_count,
    COALESCE(order_stats.sales_count, 0) AS sales_count
  FROM users u
  LEFT JOIN LATERAL (
    SELECT
      ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
      COUNT(*) AS review_count
    FROM order_reviews r
    WHERE r.reviewee_id = u.id
  ) review_stats ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS product_count
    FROM products p
    WHERE p.seller_id = u.id AND p.status = 'active'
  ) product_stats ON true
  LEFT JOIN LATERAL (
    SELECT COUNT(*) AS sales_count
    FROM orders o
    WHERE o.seller_id = u.id AND o.status = 'delivered'
  ) order_stats ON true
  WHERE u.id = ?
  LIMIT 1
");
$profileStmt->execute([$userId]);
$profile = $profileStmt->fetch(PDO::FETCH_ASSOC);

if (!$profile) {
  http_response_code(404);
  echo json_encode(['error' => 'Perfil no encontrado']);
  exit;
}

$reviewsCountStmt = $pdo->prepare('SELECT COUNT(*) FROM order_reviews WHERE reviewee_id = ?');
$reviewsCountStmt->execute([$userId]);
$reviewsTotal = (int) $reviewsCountStmt->fetchColumn();
$reviewsTotalPages = $reviewsTotal > 0 ? (int) ceil($reviewsTotal / $reviewsPageSize) : 0;
if ($reviewsTotalPages > 0 && $reviewsPage > $reviewsTotalPages) {
  $reviewsPage = $reviewsTotalPages;
}
$reviewsOffset = ($reviewsPage - 1) * $reviewsPageSize;

$reviewsStmt = $pdo->prepare("
  SELECT
    r.id,
    r.rating,
    r.comment,
    r.created_at,
    reviewer.id AS reviewer_id,
    reviewer.full_name AS reviewer_name,
    reviewer.store_name AS reviewer_store_name
  FROM order_reviews r
  JOIN users reviewer ON reviewer.id = r.reviewer_id
  WHERE r.reviewee_id = ?
  ORDER BY r.created_at DESC
  LIMIT $reviewsPageSize OFFSET $reviewsOffset
");
$reviewsStmt->execute([$userId]);
$reviews = array_map(static function (array $row) {
  return [
    'id' => (int) $row['id'],
    'rating' => (int) $row['rating'],
    'comment' => $row['comment'],
    'created_at' => $row['created_at'],
    'reviewer_id' => (int) $row['reviewer_id'],
    'reviewer_name' => $row['reviewer_store_name'] ?: $row['reviewer_name'],
  ];
}, $reviewsStmt->fetchAll(PDO::FETCH_ASSOC));

$productsCountStmt = $pdo->prepare("SELECT COUNT(*) FROM products WHERE seller_id = ? AND status = 'active'");
$productsCountStmt->execute([$userId]);
$productsTotal = (int) $productsCountStmt->fetchColumn();
$productsTotalPages = $productsTotal > 0 ? (int) ceil($productsTotal / $productsPageSize) : 0;
if ($productsTotalPages > 0 && $productsPage > $productsTotalPages) {
  $productsPage = $productsTotalPages;
}
$productsOffset = ($productsPage - 1) * $productsPageSize;

$productsStmt = $pdo->prepare("
  SELECT
    p.id,
    p.name,
    p.price_cents,
    p.stock,
    p.seller_id,
    p.category_id,
    p.condition_code,
    p.pickup_location,
    p.is_featured,
    (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image
  FROM products p
  WHERE p.seller_id = ? AND p.status = 'active'
  ORDER BY p.is_featured DESC, p.created_at DESC
  LIMIT $productsPageSize OFFSET $productsOffset
");
$productsStmt->execute([$userId]);
$products = array_map(static function (array $row) {
  return [
    'id' => (int) $row['id'],
    'name' => $row['name'],
    'price_cents' => (int) $row['price_cents'],
    'stock' => (int) $row['stock'],
    'seller_id' => (int) $row['seller_id'],
    'category_id' => isset($row['category_id']) ? (int) $row['category_id'] : null,
    'condition_code' => normalize_product_condition((string) ($row['condition_code'] ?? 'good')),
    'pickup_location' => $row['pickup_location'] ?: null,
    'is_featured' => filter_var($row['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'image' => $row['image'] ?? null,
  ];
}, $productsStmt->fetchAll(PDO::FETCH_ASSOC));

$profile['id'] = (int) $profile['id'];
$profile['avg_rating'] = (float) $profile['avg_rating'];
$profile['review_count'] = (int) $profile['review_count'];
$profile['product_count'] = (int) $profile['product_count'];
$profile['sales_count'] = (int) $profile['sales_count'];
$profile['seller_verified'] = filter_var($profile['seller_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
$profile['avatar_url'] = $profile['avatar_url'] ?: '/public/uploads/blank-profile.png';

echo json_encode([
  'profile' => $profile,
  'reviews' => $reviews,
  'products' => $products,
  'reviews_pagination' => build_pagination_payload($reviewsPage, $reviewsPageSize, $reviewsTotal),
  'products_pagination' => build_pagination_payload($productsPage, $productsPageSize, $productsTotal),
]);
