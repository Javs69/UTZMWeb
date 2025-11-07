<?php
require "db.php";

$stmt = $pdo->query("
  SELECT p.id, p.name, p.price_cents, p.stock,
  (SELECT url FROM product_images WHERE product_id=p.id ORDER BY sort_order LIMIT 1) AS image
  FROM products p
  WHERE p.stock > 0
  ORDER BY p.created_at DESC
");

echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
