<?php
$host = "localhost";
$port = "5432";
$dbname = "UTZMWeb";
$user = "postgres";
$pass = "200612";

try {
  $pdo = new PDO("pgsql:host=$host;port=$port;dbname=$dbname", $user, $pass);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
  echo json_encode(["error" => "Error de conexión: " . $e->getMessage()]);
  exit;
}
