<?php
require __DIR__ . '/support_common.php';

$user = support_require_user($pdo);
support_require_admin($user);

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  support_json(['error' => 'Metodo no permitido'], 405);
}

$payload = support_read_json();
$hasRoleUpdate = array_key_exists('role', $payload);
$hasSellerVerificationUpdate = array_key_exists('seller_verified', $payload);

if (!$hasRoleUpdate && !$hasSellerVerificationUpdate) {
  support_json(['error' => 'No hay cambios por aplicar'], 422);
}

$role = strtolower(trim((string)($payload['role'] ?? 'customer')));
if ($hasRoleUpdate && !in_array($role, ['customer', 'support', 'admin'], true)) {
  support_json(['error' => 'Rol no valido'], 422);
}

$targetUserId = isset($payload['user_id']) ? (int)$payload['user_id'] : 0;
$targetEmail = trim((string)($payload['email'] ?? ''));

if ($targetUserId <= 0 && $targetEmail === '') {
  support_json(['error' => 'Indica el usuario por id o correo'], 422);
}

if ($targetUserId > 0) {
  $stmt = $pdo->prepare('SELECT id, full_name, email, role, seller_verified FROM users WHERE id = ? LIMIT 1');
  $stmt->execute([$targetUserId]);
} else {
  $stmt = $pdo->prepare('SELECT id, full_name, email, role, seller_verified FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1');
  $stmt->execute([$targetEmail]);
}

$target = $stmt->fetch(PDO::FETCH_ASSOC);
if (!$target) {
  support_json(['error' => 'No se encontro el usuario indicado'], 404);
}

if ($hasRoleUpdate && (int)$target['id'] === (int)$user['id'] && $role !== 'admin') {
  support_json(['error' => 'No puedes quitarte el rol de administrador desde esta vista'], 422);
}

$sets = [];
$params = [':id' => (int)$target['id']];

if ($hasRoleUpdate) {
  $sets[] = 'role = :role';
  $params[':role'] = $role;
}

if ($hasSellerVerificationUpdate) {
  $sellerVerified = filter_var($payload['seller_verified'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
  if ($sellerVerified === null) {
    $sellerVerified = !empty($payload['seller_verified']);
  }
  $sets[] = 'seller_verified = :seller_verified';
  $params[':seller_verified'] = $sellerVerified ? 't' : 'f';
}

$updateStmt = $pdo->prepare(
  'UPDATE users SET ' . implode(', ', $sets) . ' WHERE id = :id RETURNING id, full_name, email, role, seller_verified'
);
$updateStmt->execute($params);
$updated = $updateStmt->fetch(PDO::FETCH_ASSOC);

support_json([
  'success' => true,
  'user' => [
    'id' => (int)$updated['id'],
    'full_name' => $updated['full_name'],
    'email' => $updated['email'],
    'role' => $updated['role'],
    'seller_verified' => filter_var($updated['seller_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
  ],
]);
