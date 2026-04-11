<?php

function auth_b64url_encode(string $value): string
{
  return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function auth_b64url_decode(string $value): ?string
{
  $padding = strlen($value) % 4;
  if ($padding > 0) {
    $value .= str_repeat('=', 4 - $padding);
  }

  $decoded = base64_decode(strtr($value, '-_', '+/'), true);
  return $decoded === false ? null : $decoded;
}

function auth_token_secret(): string
{
  $secret = env_value('AUTH_TOKEN_SECRET');
  if ($secret) {
    return $secret;
  }

  $fallback = (env_value('DB_PASSWORD') ?? env_value('PASSWORD') ?? 'utzmweb')
    . '|'
    . (env_value('DB_NAME') ?? 'utzmweb')
    . '|'
    . (env_value('MAIL_FROM_ADDRESS') ?? 'auth');

  return hash('sha256', $fallback);
}

function auth_build_token(array $payload): string
{
  $headerPart = auth_b64url_encode(json_encode(['alg' => 'HS256', 'typ' => 'JWT'], JSON_UNESCAPED_SLASHES));
  $payloadPart = auth_b64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES));
  $signature = hash_hmac('sha256', $headerPart . '.' . $payloadPart, auth_token_secret(), true);
  return $headerPart . '.' . $payloadPart . '.' . auth_b64url_encode($signature);
}

function auth_decode_token(string $token): ?array
{
  $parts = explode('.', $token);
  if (count($parts) !== 3) {
    return null;
  }

  [$headerPart, $payloadPart, $signaturePart] = $parts;
  $expected = auth_b64url_encode(hash_hmac('sha256', $headerPart . '.' . $payloadPart, auth_token_secret(), true));
  if (!hash_equals($expected, $signaturePart)) {
    return null;
  }

  $payloadJson = auth_b64url_decode($payloadPart);
  if ($payloadJson === null) {
    return null;
  }

  $payload = json_decode($payloadJson, true);
  if (!is_array($payload)) {
    return null;
  }

  $exp = isset($payload['exp']) ? (int) $payload['exp'] : 0;
  if ($exp > 0 && $exp < time()) {
    return null;
  }

  return $payload;
}

function auth_issue_access_token(int $userId, int $ttlSeconds = 2592000): string
{
  $now = time();
  return auth_build_token([
    'type' => 'access',
    'sub' => $userId,
    'iat' => $now,
    'exp' => $now + $ttlSeconds,
  ]);
}

function auth_issue_challenge_token(int $userId, string $email, string $purpose, int $ttlSeconds = 900): string
{
  $now = time();
  return auth_build_token([
    'type' => 'challenge',
    'purpose' => $purpose,
    'sub' => $userId,
    'email' => strtolower(trim($email)),
    'iat' => $now,
    'exp' => $now + $ttlSeconds,
  ]);
}

function auth_get_bearer_token(): ?string
{
  $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
  if (!$header && function_exists('getallheaders')) {
    $headers = getallheaders();
    $header = $headers['Authorization'] ?? $headers['authorization'] ?? null;
  }

  if (!$header || !preg_match('/^\s*Bearer\s+(.+)\s*$/i', (string) $header, $matches)) {
    return null;
  }

  return trim($matches[1]);
}

function auth_fetch_user(PDO $pdo, int $userId): ?array
{
  $stmt = $pdo->prepare(
    'SELECT id, full_name, email, avatar_url, role, seller_verified, store_name, seller_bio
     FROM users
     WHERE id = ?
     LIMIT 1'
  );
  $stmt->execute([$userId]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  if (!$user) {
    return null;
  }

  if (empty($user['avatar_url'])) {
    $user['avatar_url'] = '/public/uploads/blank-profile.png';
  }

  $user['id'] = (int) $user['id'];
  $user['seller_verified'] = filter_var($user['seller_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);
  return $user;
}

function auth_user_from_access_token(PDO $pdo): ?array
{
  $token = auth_get_bearer_token();
  if (!$token) {
    return null;
  }

  $payload = auth_decode_token($token);
  if (!$payload || ($payload['type'] ?? '') !== 'access') {
    return null;
  }

  $userId = (int) ($payload['sub'] ?? 0);
  if ($userId <= 0) {
    return null;
  }

  return auth_fetch_user($pdo, $userId);
}

function auth_require_user(PDO $pdo): array
{
  $user = auth_user_from_access_token($pdo);
  if ($user) {
    return $user;
  }

  http_response_code(401);
  echo json_encode(['error' => 'No autorizado']);
  exit;
}

function auth_parse_challenge(string $token, string $purpose): ?array
{
  $payload = auth_decode_token($token);
  if (!$payload || ($payload['type'] ?? '') !== 'challenge' || ($payload['purpose'] ?? '') !== $purpose) {
    return null;
  }

  return $payload;
}
