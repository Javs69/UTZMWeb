<?php
require __DIR__ . '/../db.php';
session_start();

$data = json_decode(file_get_contents("php://input"), true);
$full_name = $data["full_name"] ?? "";
$email = $data["email"] ?? "";
$password = $data["password"] ?? "";

if (!$full_name || !$email || !$password) {
  echo json_encode(["error" => "Completa todos los campos"]);
  exit;
}

$hash = password_hash($password, PASSWORD_BCRYPT);

try {
  // si quieres asignar un avatar por defecto, usa NULL y luego lo suben
  $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, avatar_url) VALUES (?,?,?,NULL) RETURNING id, full_name, email, avatar_url");
  $stmt->execute([$full_name, $email, $hash]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  $_SESSION["user"] = $user;

  echo json_encode(["success" => true, "user" => $user]);
} catch (Exception $e) {
  echo json_encode(["error" => "Este correo ya está registrado"]);
}
