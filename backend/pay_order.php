<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/cvv_storage.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['error' => 'Método no permitido']);
  exit;
}

if (!isset($_SESSION['user'])) {
  http_response_code(401);
  echo json_encode(['error' => 'Debes iniciar sesión']);
  exit;
}

$payload = json_decode(file_get_contents('php://input'), true);
$order_id = isset($payload['order_id']) ? (int)$payload['order_id'] : 0;
$payment_method_id = isset($payload['payment_method_id']) ? (int)$payload['payment_method_id'] : 0;
$payment_method_type = isset($payload['payment_method_type']) ? strtolower(trim($payload['payment_method_type'])) : null;
$payment_method_label = isset($payload['payment_method_label']) ? trim($payload['payment_method_label']) : null;
$payment_method_last4 = isset($payload['payment_method_last4']) ? preg_replace('/\D/', '', (string)$payload['payment_method_last4']) : null;
$payment_method_last4 = $payment_method_last4 ? substr($payment_method_last4, -4) : null;
$amount_cents = isset($payload['amount_cents']) ? (int)$payload['amount_cents'] : 0;
$cvv_code = isset($payload['cvv']) ? preg_replace('/\D/', '', (string)$payload['cvv']) : null;
$cvv_code = $cvv_code === '' ? null : $cvv_code;
$user_id = (int)($_SESSION['user']['id'] ?? 0);

if ($order_id <= 0 || $amount_cents <= 0) {
  http_response_code(422);
  echo json_encode(['error' => 'Datos de pago incompletos']);
  exit;
}

$orderStmt = $pdo->prepare("SELECT id, buyer_id, status, total_cents FROM orders WHERE id = ?");
$orderStmt->execute([$order_id]);
$order = $orderStmt->fetch(PDO::FETCH_ASSOC);

if (!$order) {
  http_response_code(404);
  echo json_encode(['error' => 'Orden no encontrada']);
  exit;
}

if ((int)$order['buyer_id'] !== $user_id) {
  http_response_code(403);
  echo json_encode(['error' => 'No puedes pagar una orden que no es tuya']);
  exit;
}

if ($order['status'] === 'paid') {
  echo json_encode(['message' => 'La orden ya estaba pagada']);
  exit;
}

if ($amount_cents !== (int)$order['total_cents']) {
  http_response_code(422);
  echo json_encode(['error' => 'El monto no coincide con el total de la orden']);
  exit;
}

if ($payment_method_type === null && $payment_method_id === 0) {
  $payment_method_type = 'card';
}
if (!$payment_method_label && $payment_method_type) {
  $payment_method_label = $payment_method_type === 'cash' ? 'Efectivo' : 'Tarjeta';
}
$isCardMethod = ($payment_method_type ?: '') === 'card';
$requiresCvv = $isCardMethod;
if ($requiresCvv && !$cvv_code) {
  http_response_code(422);
  echo json_encode(['error' => 'Ingresa el CVV de tu tarjeta']);
  exit;
}
// Normalizar etiqueta: quitar prefijo "Tarjeta" y limpiar espacios/demo.
if ($payment_method_label) {
  $payment_method_label = preg_replace('/\bdemo\b/i', '', $payment_method_label);
  $payment_method_label = preg_replace('/^tarjeta\s*/i', '', $payment_method_label);
  $payment_method_label = trim(preg_replace('/\s{2,}/', ' ', $payment_method_label));
  if ($payment_method_type === 'card' && $payment_method_label === '') {
    $payment_method_label = 'Tarjeta';
  }
}

$payment_method_id = max(0, (int)$payment_method_id);
$isNewMethod = false;
if ($payment_method_id === 0) {
  // Reutiliza método existente (mismo usuario + tipo + last4) para evitar duplicados
  $find = $pdo->prepare("
    SELECT id FROM payment_methods
    WHERE user_id = :user_id AND type = :type AND COALESCE(last4,'') = COALESCE(:last4,'')
    ORDER BY id DESC
    LIMIT 1
  ");
  $find->execute([
    ':user_id' => $user_id,
    ':type' => $payment_method_type ?: 'card',
    ':last4' => $payment_method_last4,
  ]);
  $payment_method_id = (int)$find->fetchColumn();
}

if ($isCardMethod && $payment_method_id > 0) {
  $storedMeta = cvv_storage_fetch($payment_method_id);
  if (!$storedMeta) {
    if ($cvv_code) {
      cvv_storage_save($payment_method_id, $cvv_code);
    }
  } elseif (!cvv_storage_verify($payment_method_id, $cvv_code ?? '')) {
    http_response_code(422);
    echo json_encode(['error' => 'El CVV no coincide con la tarjeta guardada']);
    exit;
  }
}

if ($payment_method_id === 0) {
  // Alinear secuencia por si quedó desfasada
  try {
    $pdo->exec("SELECT setval('payment_methods_id_seq', (SELECT COALESCE(MAX(id),0) FROM payment_methods))");
  } catch (Exception $e) {
    // continuar aunque falle
  }

  $insertMethod = $pdo->prepare("
    INSERT INTO payment_methods (user_id, type, label, last4)
    VALUES (:user_id, :type, :label, :last4)
    RETURNING id
  ");
  $insertMethod->execute([
    ':user_id' => $user_id,
    ':type' => $payment_method_type ?: 'card',
    ':label' => $payment_method_label,
    ':last4' => $payment_method_last4,
  ]);
  $payment_method_id = (int)$insertMethod->fetchColumn();
  $isNewMethod = true;
  if ($isCardMethod && $cvv_code) {
    cvv_storage_save($payment_method_id, $cvv_code);
  }
}

$insertPay = $pdo->prepare("
  INSERT INTO payments (order_id, payment_method_id, amount_cents, status, paid_at)
  VALUES (:order_id, :payment_method_id, :amount_cents, 'captured', NOW())
");
$insertPay->execute([
  ':order_id' => $order_id,
  ':payment_method_id' => $payment_method_id ?: 1,
  ':amount_cents' => $amount_cents
]);

$pdo->prepare("UPDATE orders SET status = 'paid' WHERE id = ?")->execute([$order_id]);

echo json_encode(['message' => 'Pago registrado y orden marcada como pagada']);
