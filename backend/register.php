<?php
require __DIR__ . '/../db.php';
session_start();
header('Content-Type: application/json; charset=utf-8');

$data = json_decode(file_get_contents("php://input"), true);
$full_name = trim($data["full_name"] ?? "");
$email = trim($data["email"] ?? "");
$password = $data["password"] ?? "";

if (!$full_name || !$email || !$password) {
  echo json_encode(["error" => "Completa todos los campos"]);
  exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
  echo json_encode(["error" => "Ingresa un correo válido (ejemplo@dominio)"]);
  exit;
}

$hash = password_hash($password, PASSWORD_BCRYPT);
$defaultAvatar = "/public/uploads/blank-profile.png";

try {
  $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash, avatar_url) VALUES (?,?,?,?) RETURNING id, full_name, email, avatar_url");
  $stmt->execute([$full_name, $email, $hash, $defaultAvatar]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  $_SESSION["user"] = $user;

  echo json_encode(["success" => true, "user" => $user]);
} catch (Exception $e) {
  echo json_encode(["error" => "Este correo ya está registrado"]);
}

