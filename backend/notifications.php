<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/notifications.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user']['id'])) {
  http_response_code(401);
  echo json_encode(['error' => 'No autenticado']);
  exit;
}

$userId = (int) ($_SESSION['user']['id'] ?? 0);

if (!notifications_are_available($pdo)) {
  echo json_encode(['notifications' => [], 'unread_count' => 0]);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'GET') {
  $limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 12;

  $stmt = $pdo->prepare(
    'SELECT id, type, title, body, href, meta, is_read, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT ' . $limit
  );
  $stmt->execute([$userId]);

  $notifications = array_map(static function (array $row): array {
    $meta = [];
    if (!empty($row['meta'])) {
      $decoded = json_decode((string) $row['meta'], true);
      if (is_array($decoded)) {
        $meta = $decoded;
      }
    }

    return [
      'id' => (int) $row['id'],
      'type' => $row['type'],
      'title' => $row['title'],
      'body' => $row['body'],
      'href' => $row['href'],
      'meta' => $meta,
      'is_read' => filter_var($row['is_read'], FILTER_VALIDATE_BOOLEAN),
      'created_at' => $row['created_at'],
    ];
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));

  $countStmt = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = false');
  $countStmt->execute([$userId]);

  echo json_encode([
    'notifications' => $notifications,
    'unread_count' => (int) $countStmt->fetchColumn(),
  ]);
  exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Metodo no permitido']);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true) ?? [];
$action = strtolower(trim((string) ($payload['action'] ?? '')));

if ($action === 'mark_all_read') {
  $stmt = $pdo->prepare('UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = ? AND is_read = false');
  $stmt->execute([$userId]);
} elseif ($action === 'mark_read') {
  $ids = array_values(array_filter(array_map('intval', (array) ($payload['ids'] ?? []))));
  if ($ids) {
    $placeholders = implode(', ', array_fill(0, count($ids), '?'));
    $params = array_merge([$userId], $ids);
    $stmt = $pdo->prepare(
      "UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE user_id = ? AND id IN ({$placeholders})"
    );
    $stmt->execute($params);
  }
} else {
  http_response_code(422);
  echo json_encode(['error' => 'Accion no valida']);
  exit;
}

$countStmt = $pdo->prepare('SELECT COUNT(*) FROM notifications WHERE user_id = ? AND is_read = false');
$countStmt->execute([$userId]);

echo json_encode([
  'success' => true,
  'unread_count' => (int) $countStmt->fetchColumn(),
]);
