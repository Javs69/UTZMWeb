<?php
require_once __DIR__ . '/../env.php';

function app_allowed_origins(): array
{
  $raw = env_value('APP_FRONTEND_ORIGINS') ?? env_value('APP_FRONTEND_ORIGIN') ?? '';
  if ($raw === '') {
    return [];
  }

  $parts = preg_split('/[\s,]+/', $raw) ?: [];
  $origins = [];

  foreach ($parts as $part) {
    $origin = rtrim(trim($part), '/');
    if ($origin !== '') {
      $origins[] = $origin;
    }
  }

  return array_values(array_unique($origins));
}

function app_request_origin(): string
{
  return rtrim(trim((string) ($_SERVER['HTTP_ORIGIN'] ?? '')), '/');
}

function app_apply_cors(): void
{
  if (PHP_SAPI === 'cli') {
    return;
  }

  $origin = app_request_origin();
  if ($origin === '') {
    return;
  }

  $allowedOrigins = app_allowed_origins();
  if (!$allowedOrigins || !in_array($origin, $allowedOrigins, true)) {
    return;
  }

  header('Access-Control-Allow-Origin: ' . $origin);
  header('Access-Control-Allow-Credentials: true');
  header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
  header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
  header('Vary: Origin', false);
}

function app_is_secure_request(): bool
{
  $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
  $forwardedProto = strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
  $requestScheme = strtolower((string) ($_SERVER['REQUEST_SCHEME'] ?? ''));

  return $https === 'on'
    || $https === '1'
    || $forwardedProto === 'https'
    || $requestScheme === 'https';
}

function app_start_session(): void
{
  if (PHP_SAPI === 'cli' || session_status() === PHP_SESSION_ACTIVE) {
    return;
  }

  $sameSite = env_value('SESSION_COOKIE_SAMESITE') ?? (app_allowed_origins() ? 'None' : 'Lax');
  $secureOverride = env_value('SESSION_COOKIE_SECURE');
  $secure = $secureOverride !== null
    ? filter_var($secureOverride, FILTER_VALIDATE_BOOLEAN)
    : ($sameSite === 'None' ? true : app_is_secure_request());

  $cookieParams = [
    'lifetime' => 0,
    'path' => '/',
    'secure' => $secure,
    'httponly' => true,
    'samesite' => $sameSite,
  ];

  $domain = env_value('SESSION_COOKIE_DOMAIN');
  if ($domain) {
    $cookieParams['domain'] = $domain;
  }

  session_name(env_value('SESSION_COOKIE_NAME') ?? 'UTZMSESSID');
  session_set_cookie_params($cookieParams);
  ini_set('session.use_strict_mode', '1');
  session_start();
}

function app_bootstrap_http(bool $withSession = false): void
{
  app_apply_cors();

  if (PHP_SAPI !== 'cli' && strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')) === 'OPTIONS') {
    http_response_code(204);
    exit;
  }

  if ($withSession) {
    app_start_session();
  }
}
