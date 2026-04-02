<?php
require __DIR__ . '/../db.php';
require_once __DIR__ . '/lib/auth_codes.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$defaultAvatar = '/public/uploads/blank-profile.png';
$data = json_decode(file_get_contents('php://input'), true);
$email = strtolower(trim($data['email'] ?? ''));
$password = $data['password'] ?? '';

$stmt = $pdo->prepare('SELECT id, full_name, email, password_hash, avatar_url, role, email_verified, seller_verified, store_name, seller_bio FROM users WHERE email = ? LIMIT 1');
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user['password_hash'])) {
  echo json_encode(['error' => 'Credenciales incorrectas']);
  exit;
}

if (!filter_var($user['email_verified'], FILTER_VALIDATE_BOOLEAN)) {
  http_response_code(403);
  echo json_encode([
    'error' => 'Debes verificar tu correo antes de iniciar sesion.',
    'verification_required' => true,
    'email' => $user['email'],
  ]);
  exit;
}

if (empty($user['avatar_url'])) {
  $user['avatar_url'] = $defaultAvatar;
}

if (user_requires_login_two_factor($user)) {
  try {
    $code = issue_email_code($pdo, $user['email'], EMAIL_CODE_LOGIN, (int) $user['id'], 10);
    send_auth_code_email($user['email'], EMAIL_CODE_LOGIN, $code);
    unset($_SESSION['user']);
    $_SESSION['pending_2fa'] = [
      'user_id' => (int) $user['id'],
      'email' => $user['email'],
      'role' => $user['role'],
      'issued_at' => time(),
    ];

    echo json_encode([
      'success' => true,
      'two_factor_required' => true,
      'email' => $user['email'],
      'message' => 'Enviamos un codigo de acceso a tu correo.',
    ]);
    exit;
  } catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => 'No se pudo enviar el codigo de acceso.']);
    exit;
  }
}

unset($user['password_hash'], $user['email_verified']);
$_SESSION['user'] = $user;

echo json_encode(['success' => true, 'user' => $user]);
