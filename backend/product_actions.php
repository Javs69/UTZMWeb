<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/product_catalog.php';

session_start();
header('Content-Type: application/json; charset=utf-8');

ensure_marketplace_product_schema($pdo);

if (!isset($_SESSION['user']['id'])) {
  echo json_encode(['error' => 'No autorizado']);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$productId = (int) ($payload['id'] ?? 0);
$action = strtolower(trim((string) ($payload['action'] ?? '')));
$userId = (int) $_SESSION['user']['id'];

if ($productId <= 0) {
  echo json_encode(['error' => 'Producto invalido']);
  exit;
}

if (!in_array($action, ['pause', 'resume', 'delete', 'duplicate', 'mark_out_of_stock'], true)) {
  echo json_encode(['error' => 'Accion invalida']);
  exit;
}

try {
  $pdo->beginTransaction();

  $productStmt = $pdo->prepare("
    SELECT
      p.id,
      p.seller_id,
      p.name,
      p.description,
      p.price_cents,
      p.stock,
      p.category_id,
      p.status,
      p.condition_code,
      p.pickup_location,
      p.is_featured
    FROM products p
    WHERE p.id = ?
    LIMIT 1
  ");
  $productStmt->execute([$productId]);
  $product = $productStmt->fetch(PDO::FETCH_ASSOC);

  if (!$product) {
    $pdo->rollBack();
    echo json_encode(['error' => 'Producto no encontrado']);
    exit;
  }

  if ((int) $product['seller_id'] !== $userId) {
    $pdo->rollBack();
    echo json_encode(['error' => 'Prohibido']);
    exit;
  }

  $currentStatus = normalize_product_status((string) ($product['status'] ?? 'active'));

  if ($action === 'duplicate') {
    if ($currentStatus === 'deleted') {
      $pdo->rollBack();
      echo json_encode(['error' => 'No puedes duplicar una publicacion eliminada']);
      exit;
    }

    $insertStmt = $pdo->prepare("
      INSERT INTO products (
        seller_id,
        name,
        description,
        price_cents,
        stock,
        category_id,
        status,
        condition_code,
        pickup_location,
        is_featured
      ) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?) RETURNING id
    ");
    $insertStmt->execute([
      $userId,
      $product['name'] . ' (copia)',
      $product['description'],
      (int) $product['price_cents'],
      max(0, (int) $product['stock']),
      $product['category_id'] !== null ? (int) $product['category_id'] : null,
      normalize_product_condition((string) ($product['condition_code'] ?? 'good')),
      $product['pickup_location'] ?: null,
      filter_var($product['is_featured'] ?? false, FILTER_VALIDATE_BOOLEAN),
    ]);
    $newProductId = (int) $insertStmt->fetchColumn();

    $imagesStmt = $pdo->prepare('SELECT url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order, id');
    $imagesStmt->execute([$productId]);
    $images = $imagesStmt->fetchAll(PDO::FETCH_ASSOC);

    if ($images) {
      $insertImageStmt = $pdo->prepare('INSERT INTO product_images (product_id, url, sort_order) VALUES (?, ?, ?)');
      foreach ($images as $image) {
        $insertImageStmt->execute([$newProductId, $image['url'], (int) $image['sort_order']]);
      }
    }

    $pdo->commit();
    echo json_encode([
      'success' => true,
      'message' => 'Publicacion duplicada correctamente.',
      'product_id' => $newProductId,
    ]);
    exit;
  }

  $nextStatus = $currentStatus;
  $nextStock = (int) $product['stock'];
  $message = 'Publicacion actualizada.';

  if ($action === 'pause') {
    if ($currentStatus === 'deleted') {
      $pdo->rollBack();
      echo json_encode(['error' => 'No puedes pausar una publicacion eliminada']);
      exit;
    }
    $nextStatus = 'paused';
    $message = 'Publicacion pausada.';
  } elseif ($action === 'resume') {
    if ($currentStatus === 'deleted') {
      $pdo->rollBack();
      echo json_encode(['error' => 'No puedes reactivar una publicacion eliminada']);
      exit;
    }
    $nextStatus = 'active';
    $message = 'Publicacion reactivada.';
  } elseif ($action === 'delete') {
    $nextStatus = 'deleted';
    $message = 'Publicacion eliminada.';
  } elseif ($action === 'mark_out_of_stock') {
    if ($currentStatus === 'deleted') {
      $pdo->rollBack();
      echo json_encode(['error' => 'No puedes modificar una publicacion eliminada']);
      exit;
    }
    $nextStock = 0;
    $message = 'Publicacion marcada como agotada.';
  }

  $updateStmt = $pdo->prepare("
    UPDATE products
    SET status = ?, stock = ?, updated_at = NOW()
    WHERE id = ?
  ");
  $updateStmt->execute([$nextStatus, $nextStock, $productId]);

  $pdo->commit();

  echo json_encode([
    'success' => true,
    'message' => $message,
    'status' => $nextStatus,
    'stock' => $nextStock,
  ]);
} catch (Throwable $error) {
  if ($pdo->inTransaction()) {
    $pdo->rollBack();
  }

  echo json_encode(['error' => $error->getMessage()]);
}
