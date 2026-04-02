<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/auth_codes.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents('php://input'), true);
$email = normalize_auth_email($data['email'] ?? '');
$purpose = $data['purpose'] ?? EMAIL_CODE_VERIFY;

if (!$email || !in_array($purpose, [EMAIL_CODE_VERIFY, EMAIL_CODE_RESET, EMAIL_CODE_LOGIN], true)) {
  echo json_encode(['error' => 'Solicitud invalida.']);
  exit;
}

try {
  $stmt = $pdo->prepare('SELECT id, email_verified, role FROM users WHERE email = ? LIMIT 1');
  $stmt->execute([$email]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    echo json_encode(['success' => true, 'message' => 'Si el correo existe, enviamos un nuevo codigo.']);
    exit;
  }

  if ($purpose === EMAIL_CODE_LOGIN) {
    $pending = $_SESSION['pending_2fa'] ?? null;
    if (!is_array($pending) || normalize_auth_email((string) ($pending['email'] ?? '')) !== $email) {
      http_response_code(403);
      echo json_encode(['error' => 'La verificacion ya no es valida. Inicia sesion otra vez.']);
      exit;
    }

    if (!user_requires_login_two_factor($user)) {
      http_response_code(403);
      echo json_encode(['error' => 'Esta cuenta no requiere segundo factor.']);
      exit;
    }
  }

  if ($purpose === EMAIL_CODE_VERIFY && filter_var($user['email_verified'], FILTER_VALIDATE_BOOLEAN)) {
    echo json_encode(['error' => 'Esta cuenta ya fue verificada.']);
    exit;
  }

  $ttl = $purpose === EMAIL_CODE_LOGIN ? 10 : 15;
  $code = issue_email_code($pdo, $email, $purpose, (int) $user['id'], $ttl);
  send_auth_code_email($email, $purpose, $code);

  echo json_encode(['success' => true, 'message' => 'Enviamos un nuevo codigo a tu correo.']);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['error' => 'No se pudo reenviar el codigo.']);
}
