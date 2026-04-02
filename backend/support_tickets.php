<?php
require __DIR__ . '/support_common.php';
require_once __DIR__ . '/lib/notifications.php';

$user = support_require_user($pdo);
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

function support_ticket_priority_for_category(string $category): string
{
  return match ($category) {
    'report_seller', 'report_product', 'dispute', 'refund' => 'high',
    default => 'normal',
  };
}

if ($method === 'GET') {
  $where = [];
  $params = [];
  $limit = isset($_GET['limit']) ? max(1, min(100, (int)$_GET['limit'])) : 60;

  if (!support_is_staff($user)) {
    $where[] = 't.user_id = :uid';
    $params[':uid'] = (int)$user['id'];
  }

  $status = strtolower(trim((string)($_GET['status'] ?? 'all')));
  if ($status !== '' && $status !== 'all') {
    if (!support_validate_status($status)) {
      support_json(['error' => 'Estado de ticket no válido'], 422);
    }
    $where[] = 't.status = :status';
    $params[':status'] = $status;
  }

  if (support_is_staff($user)) {
    $assignment = strtolower(trim((string)($_GET['assignment'] ?? 'all')));
    if ($assignment === 'mine') {
      $where[] = 't.assigned_to = :assigned_uid';
      $params[':assigned_uid'] = (int)$user['id'];
    } elseif ($assignment === 'unassigned') {
      $where[] = 't.assigned_to IS NULL';
    }
  }

  $query = trim((string)($_GET['q'] ?? ''));
  if ($query !== '') {
    $where[] = '(t.subject ILIKE :q OR t.category ILIKE :q OR requester.full_name ILIKE :q OR requester.email ILIKE :q)';
    $params[':q'] = '%' . $query . '%';
  }

  $sql = "
    SELECT
      t.id,
      t.user_id,
      t.assigned_to,
      t.order_id,
      t.context_type,
      t.context_id,
      t.context_meta,
      t.category,
      t.subject,
      t.status,
      t.priority,
      t.created_at,
      t.updated_at,
      t.last_message_at,
      requester.full_name AS requester_name,
      requester.email AS requester_email,
      assignee.full_name AS assignee_name
    FROM support_tickets t
    JOIN users requester ON requester.id = t.user_id
    LEFT JOIN users assignee ON assignee.id = t.assigned_to
  ";

  if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
  }

  $sql .= "
    ORDER BY
      CASE t.status
        WHEN 'open' THEN 0
        WHEN 'in_progress' THEN 1
        WHEN 'waiting_user' THEN 2
        WHEN 'resolved' THEN 3
        ELSE 4
      END,
      t.last_message_at DESC
    LIMIT {$limit}
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($params);
  $tickets = array_map(static function (array $row): array {
    return [
      'id' => (int)$row['id'],
      'user_id' => (int)$row['user_id'],
      'assigned_to' => isset($row['assigned_to']) ? (int)$row['assigned_to'] : null,
      'order_id' => isset($row['order_id']) ? (int)$row['order_id'] : null,
      'context_type' => $row['context_type'] ?: null,
      'context_id' => isset($row['context_id']) ? (int)$row['context_id'] : null,
      'context_meta' => is_string($row['context_meta'] ?? null)
        ? (json_decode($row['context_meta'], true) ?: [])
        : (is_array($row['context_meta'] ?? null) ? $row['context_meta'] : []),
      'category' => $row['category'],
      'subject' => $row['subject'],
      'status' => $row['status'],
      'priority' => $row['priority'],
      'created_at' => $row['created_at'],
      'updated_at' => $row['updated_at'],
      'last_message_at' => $row['last_message_at'],
      'requester_name' => $row['requester_name'],
      'requester_email' => $row['requester_email'],
      'assignee_name' => $row['assignee_name'],
    ];
  }, $stmt->fetchAll(PDO::FETCH_ASSOC));

  support_json(['tickets' => $tickets]);
}

if ($method === 'POST') {
  $payload = support_read_json();
  if (support_is_staff($user)) {
    support_json(['error' => 'El equipo de soporte no puede crear tickets desde esta vista'], 403);
  }

  $subject = trim((string)($payload['subject'] ?? ''));
  $description = trim((string)($payload['description'] ?? ''));
  $category = trim((string)($payload['category'] ?? ''));
  $orderId = isset($payload['order_id']) && (int)$payload['order_id'] > 0 ? (int)$payload['order_id'] : null;
  $contextType = strtolower(trim((string)($payload['context_type'] ?? '')));
  $contextId = isset($payload['context_id']) ? (int)$payload['context_id'] : 0;
  $contextMeta = is_array($payload['context_meta'] ?? null) ? $payload['context_meta'] : [];

  if ($subject === '' || mb_strlen($subject) < 6) {
    support_json(['error' => 'El asunto debe tener al menos 6 caracteres'], 422);
  }

  if ($description === '' || mb_strlen($description) < 12) {
    support_json(['error' => 'Describe el problema con mayor detalle'], 422);
  }

  if ($category === '') {
    support_json(['error' => 'Selecciona una categoría'], 422);
  }

  if ($contextType !== '' && !in_array($contextType, ['product', 'seller', 'order'], true)) {
    support_json(['error' => 'Contexto de ticket no valido'], 422);
  }

  if ($contextType !== '' && $contextId <= 0) {
    support_json(['error' => 'El elemento relacionado no es valido'], 422);
  }

  if ($orderId !== null) {
    $orderStmt = $pdo->prepare('SELECT id, buyer_id, seller_id FROM orders WHERE id = ? LIMIT 1');
    $orderStmt->execute([$orderId]);
    $order = $orderStmt->fetch(PDO::FETCH_ASSOC);

    if (!$order) {
      support_json(['error' => 'El pedido asociado no existe'], 404);
    }

    $isOwner = (int)$order['buyer_id'] === (int)$user['id'] || (int)$order['seller_id'] === (int)$user['id'];
    if (!support_is_staff($user) && !$isOwner) {
      support_json(['error' => 'No puedes asociar un pedido ajeno'], 403);
    }
  }

  if ($contextType === 'product') {
    $productStmt = $pdo->prepare(
      'SELECT p.id, p.name, p.seller_id, COALESCE(u.store_name, u.full_name) AS seller_name
       FROM products p
       JOIN users u ON u.id = p.seller_id
       WHERE p.id = ? LIMIT 1'
    );
    $productStmt->execute([$contextId]);
    $product = $productStmt->fetch(PDO::FETCH_ASSOC);

    if (!$product) {
      support_json(['error' => 'El producto relacionado no existe'], 404);
    }

    $contextMeta = array_merge([
      'product_name' => $product['name'],
      'seller_id' => (int) $product['seller_id'],
      'seller_name' => $product['seller_name'],
    ], $contextMeta);
  }

  if ($contextType === 'seller') {
    $sellerStmt = $pdo->prepare('SELECT id, full_name, store_name FROM users WHERE id = ? LIMIT 1');
    $sellerStmt->execute([$contextId]);
    $seller = $sellerStmt->fetch(PDO::FETCH_ASSOC);

    if (!$seller) {
      support_json(['error' => 'El vendedor relacionado no existe'], 404);
    }

    $contextMeta = array_merge([
      'seller_name' => $seller['store_name'] ?: $seller['full_name'],
    ], $contextMeta);
  }

  if ($contextType === 'order') {
    if ($orderId === null) {
      $orderId = $contextId;
    }

    $orderContextStmt = $pdo->prepare(
      'SELECT o.id, o.buyer_id, o.seller_id, o.status, buyer.full_name AS buyer_name, seller.full_name AS seller_name
       FROM orders o
       JOIN users buyer ON buyer.id = o.buyer_id
       JOIN users seller ON seller.id = o.seller_id
       WHERE o.id = ? LIMIT 1'
    );
    $orderContextStmt->execute([$contextId]);
    $orderContext = $orderContextStmt->fetch(PDO::FETCH_ASSOC);

    if (!$orderContext) {
      support_json(['error' => 'El pedido relacionado no existe'], 404);
    }

    $isOwner = (int)$orderContext['buyer_id'] === (int)$user['id'] || (int)$orderContext['seller_id'] === (int)$user['id'];
    if (!support_is_staff($user) && !$isOwner) {
      support_json(['error' => 'No puedes reportar un pedido ajeno'], 403);
    }

    $contextMeta = array_merge([
      'order_status' => $orderContext['status'],
      'buyer_id' => (int) $orderContext['buyer_id'],
      'buyer_name' => $orderContext['buyer_name'],
      'seller_id' => (int) $orderContext['seller_id'],
      'seller_name' => $orderContext['seller_name'],
    ], $contextMeta);
  }

  try {
    $pdo->beginTransaction();
    $priority = support_ticket_priority_for_category($category);

    $ticketStmt = $pdo->prepare(
      "INSERT INTO support_tickets (user_id, order_id, context_type, context_id, context_meta, category, subject, description, status, priority, updated_at, last_message_at)
       VALUES (:user_id, :order_id, :context_type, :context_id, CAST(:context_meta AS jsonb), :category, :subject, :description, 'open', :priority, NOW(), NOW())
       RETURNING id"
    );
    $ticketStmt->execute([
      ':user_id' => (int)$user['id'],
      ':order_id' => $orderId,
      ':context_type' => $contextType !== '' ? $contextType : null,
      ':context_id' => $contextId > 0 ? $contextId : null,
      ':context_meta' => json_encode($contextMeta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
      ':category' => $category,
      ':subject' => $subject,
      ':description' => $description,
      ':priority' => $priority,
    ]);

    $ticketId = (int)$ticketStmt->fetchColumn();

    $messageStmt = $pdo->prepare(
      'INSERT INTO support_ticket_messages (ticket_id, sender_id, body, is_internal) VALUES (?, ?, ?, false)'
    );
    $messageStmt->execute([$ticketId, (int)$user['id'], $description]);

    notifications_insert_for_staff(
      $pdo,
      'support_ticket_created',
      "Nuevo ticket #{$ticketId}",
      $subject,
      '/soporte.html',
      ['ticket_id' => $ticketId],
      [(int) $user['id']]
    );

    $pdo->commit();
    support_json(['success' => true, 'ticket_id' => $ticketId], 201);
  } catch (Throwable $error) {
    if ($pdo->inTransaction()) {
      $pdo->rollBack();
    }

    support_json(['error' => 'No se pudo crear el ticket'], 500);
  }
}

support_json(['error' => 'Método no permitido'], 405);
