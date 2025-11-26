<?php
$host = "dpg-d4jk3hngi27c739p6p40-a.oregon-postgres.render.com";
$port = "5432";
$dbname = "utzmweb";
$user = "utzmweb_user";
$pass = "Pyxpes0xRMHfiHjjxQbCXqosJP3s7Vn2";
$sslmode = "require"; // Render requiere TLS

try {
  $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode", $user, $pass);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
  echo json_encode(["error" => "Error de conexion: " . $e->getMessage()]);
  exit;
}
