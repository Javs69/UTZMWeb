<?php
require __DIR__ . '/../db.php';

header('Content-Type: application/json; charset=utf-8');

$q = trim($_GET['q'] ?? '');
$category = (int)($_GET['category'] ?? 0);
$params = [];
$where = "WHERE p.stock > 0";

if ($category > 0) {
  $where .= " AND p.category_id = ?";
  $params[] = $category;
}

if ($q !== '') {
  // Busca de forma laxa por cada token en nombre o descripción
  $tokens = preg_split('/\s+/', $q);
  $tokens = array_filter($tokens, fn($t) => $t !== '');
  if ($tokens) {
    $parts = [];
    foreach ($tokens as $tok) {
      $parts[] = "(p.name ILIKE ? OR p.description ILIKE ?)";
      $wild = '%' . $tok . '%';
      $params[] = $wild;
      $params[] = $wild;
    }
    $where .= " AND (" . implode(" OR ", $parts) . ")";
  }
}

$sql = "
  SELECT
    p.id,
    p.name,
    p.price_cents,
    p.stock,
    p.seller_id,
    p.category_id,
    (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) AS image
  FROM products p
  $where
  ORDER BY p.created_at DESC
";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
