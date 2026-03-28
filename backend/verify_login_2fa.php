<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/auth_codes.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$email = normalize_auth_email($data['email'] ?? '');
$code = trim((string) ($data['code'] ?? ''));
$pending = $_SESSION['pending_2fa'] ?? null;

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

  $userId = (int) ($pending['user_id'] ?? 0);
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

  unset($_SESSION['pending_2fa']);
  $_SESSION['user'] = $user;

  echo json_encode(['success' => true, 'user' => $user]);
} catch (Throwable $error) {
  http_response_code(500);
  echo json_encode(['error' => 'No se pudo verificar el codigo.']);
}
