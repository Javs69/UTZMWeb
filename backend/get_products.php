<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/product_catalog.php';

header('Content-Type: application/json; charset=utf-8');

ensure_marketplace_product_schema($pdo);

$q = trim($_GET['q'] ?? '');
$category = (int) ($_GET['category'] ?? 0);
$availability = strtolower(trim($_GET['availability'] ?? 'in_stock'));
$sort = strtolower(trim($_GET['sort'] ?? 'recent'));
$minPrice = max(0, (float) ($_GET['min_price'] ?? 0));
$maxPrice = max(0, (float) ($_GET['max_price'] ?? 0));
$condition = strtolower(trim($_GET['condition'] ?? ''));
$featuredOnly = filter_var($_GET['featured'] ?? false, FILTER_VALIDATE_BOOLEAN);
$ids = array_values(array_filter(array_map('intval', explode(',', (string) ($_GET['ids'] ?? ''))), fn($id) => $id > 0));
$page = max(1, (int) ($_GET['page'] ?? 1));
$pageSize = max(1, min(24, (int) ($_GET['page_size'] ?? 12)));

$whereParts = ["p.status = 'active'"];
$params = [];

if ($availability === 'in_stock' || $availability === '') {
  $whereParts[] = 'p.stock > 0';
} elseif ($availability === 'out_of_stock') {
  $whereParts[] = 'p.stock <= 0';
}

if ($category > 0) {
  $whereParts[] = 'p.category_id = ?';
  $params[] = $category;
}

if ($minPrice > 0) {
  $whereParts[] = 'p.price_cents >= ?';
  $params[] = (int) round($minPrice * 100);
}

if ($maxPrice > 0) {
  $whereParts[] = 'p.price_cents <= ?';
  $params[] = (int) round($maxPrice * 100);
}

if (in_array($condition, ['new', 'like_new', 'good', 'fair'], true)) {
  $whereParts[] = 'p.condition_code = ?';
  $params[] = $condition;
}

if ($featuredOnly) {
  $whereParts[] = 'p.is_featured = TRUE';
}

if ($ids) {
  $placeholders = implode(',', array_fill(0, count($ids), '?'));
  $whereParts[] = "p.id IN ($placeholders)";
  array_push($params, ...$ids);
}

if ($q !== '') {
  $tokens = preg_split('/\s+/', $q);
  $tokens = array_filter($tokens, fn($token) => $token !== '');
  if ($tokens) {
    $searchParts = [];
    foreach ($tokens as $token) {
      $searchParts[] = '(
        p.name ILIKE ? OR
        p.description ILIKE ? OR
        u.full_name ILIKE ? OR
        COALESCE(u.store_name, \'\') ILIKE ?
      )';
      $wildcard = '%' . $token . '%';
      $params[] = $wildcard;
      $params[] = $wildcard;
      $params[] = $wildcard;
      $params[] = $wildcard;
    }
    $whereParts[] = '(' . implode(' AND ', $searchParts) . ')';
  }
}

$where = $whereParts ? 'WHERE ' . implode(' AND ', $whereParts) : '';

$orderBy = 'p.is_featured DESC, p.created_at DESC';
if ($sort === 'price_asc') {
  $orderBy = 'p.is_featured DESC, p.price_cents ASC, p.created_at DESC';
} elseif ($sort === 'price_desc') {
  $orderBy = 'p.is_featured DESC, p.price_cents DESC, p.created_at DESC';
} elseif ($sort === 'oldest') {
  $orderBy = 'p.is_featured DESC, p.created_at ASC';
} elseif ($sort === 'featured') {
  $orderBy = 'p.is_featured DESC, p.stock DESC, p.created_at DESC';
}

$countSql = "
  SELECT COUNT(*)
  FROM products p
  LEFT JOIN users u ON u.id = p.seller_id
  $where
";

$countStmt = $pdo->prepare($countSql);
$countStmt->execute($params);
$total = (int) $countStmt->fetchColumn();
$totalPages = $total > 0 ? (int) ceil($total / $pageSize) : 0;

if ($totalPages > 0 && $page > $totalPages) {
  $page = $totalPages;
}

$offset = ($page - 1) * $pageSize;

$itemsSql = "
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
    p.created_at,
    COALESCE(u.store_name, u.full_name) AS seller_name,
    (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image
  FROM products p
  LEFT JOIN users u ON u.id = p.seller_id
  $where
  ORDER BY $orderBy
  LIMIT $pageSize OFFSET $offset
";

$itemsStmt = $pdo->prepare($itemsSql);
$itemsStmt->execute($params);
$items = array_map(static function (array $row) {
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
    'created_at' => $row['created_at'],
    'seller_name' => $row['seller_name'],
    'image' => $row['image'] ?? null,
  ];
}, $itemsStmt->fetchAll(PDO::FETCH_ASSOC));

echo json_encode([
  'items' => $items,
  'pagination' => build_pagination_payload($page, $pageSize, $total),
]);
