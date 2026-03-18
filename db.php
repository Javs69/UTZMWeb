<?php
function load_env_file(string $path): void
{
  if (!is_file($path)) {
    return;
  }

  $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
  if ($lines === false) {
    return;
  }

  foreach ($lines as $line) {
    $trimmed = trim($line);
    if ($trimmed === '' || str_starts_with($trimmed, '#')) {
      continue;
    }

    $parts = explode('=', $trimmed, 2);
    if (count($parts) !== 2) {
      continue;
    }

    $key = trim($parts[0]);
    $value = trim($parts[1]);
    $value = trim($value, "\"'");

    $_ENV[$key] = $value;
    $_SERVER[$key] = $value;
    putenv($key . '=' . $value);
  }
}

function env_value(string $key): ?string
{
  $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
  return ($value === false || $value === '') ? null : $value;
}

load_env_file(__DIR__ . '/.env');

$host = env_value('DB_HOST');
$port = env_value('DB_PORT');
$dbname = env_value('DB_NAME');
$user = env_value('DB_USER') ?? env_value('USER');
$pass = env_value('DB_PASSWORD') ?? env_value('PASSWORD');

if (!$host || !$port || !$dbname || !$user || $pass === null) {
  echo json_encode(["error" => "Faltan variables de entorno para la conexion a la base de datos"]);
  exit;
}

try {
  $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $pass);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
  echo json_encode(["error" => "Error de conexion: " . $e->getMessage()]);
  exit;
}
