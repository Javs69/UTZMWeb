<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

try {
  $stmt = $pdo->query('SELECT id, name FROM categories ORDER BY id');
  $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
  $categories = array_map(fn($row) => [
    'id' => (int) $row['id'],
    'name' => (string) $row['name'],
  ], $rows);
  echo json_encode(['categories' => $categories]);
} catch (Throwable $e) {
  echo json_encode(['categories' => []]);
}
