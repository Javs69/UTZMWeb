<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/auth_codes.php';
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$email = normalize_auth_email($data['email'] ?? '');
$code = trim((string) ($data['code'] ?? ''));
$challengeToken = trim((string) ($data['challenge_token'] ?? ''));
$pending = $challengeToken !== '' ? auth_parse_challenge($challengeToken, EMAIL_CODE_LOGIN) : null;

if (!$email || !$code) {
  echo json_encode(['error' => 'Ingresa el correo y el codigo.']);
  exit;
}

if (!is_array($pending) || normalize_auth_email((string) ($pending['email'] ?? '')) !== $email) {
  http_response_code(403);
  echo json_encode(['error' => 'La verificacion ya no es valida. Inicia sesion otra vez.']);
  exit;
}

try {
  $consumed = consume_email_code($pdo, $email, EMAIL_CODE_LOGIN, $code);
  if (!$consumed) {
    echo json_encode(['error' => 'El codigo es incorrecto o ya vencio.']);
    exit;
  }

  $userId = (int) ($pending['sub'] ?? 0);
  if ($userId <= 0) {
    http_response_code(403);
    echo json_encode(['error' => 'La verificacion ya no es valida. Inicia sesion otra vez.']);
    exit;
  }

  $user = fetch_public_user($pdo, $userId);
  if (!$user || !in_array($user['role'] ?? 'customer', ['support', 'admin'], true)) {
    http_response_code(403);
    echo json_encode(['error' => 'La cuenta ya no tiene acceso al panel protegido.']);
    exit;
  }

  echo json_encode([
    'success' => true,
    'user' => $user,
    'token' => auth_issue_access_token((int) $user['id']),
  ]);
} catch (Throwable $error) {
  http_response_code(500);
  echo json_encode(['error' => 'No se pudo verificar el codigo.']);
}
