<?php
require "db.php";
session_start();

$data = json_decode(file_get_contents("php://input"), true);
$full_name = $data["full_name"] ?? "";
$email = $data["email"] ?? "";
$password = $data["password"] ?? "";

// Validaciones básicas
if (!$full_name || !$email || !$password) {
  echo json_encode(["error" => "Completa todos los campos"]);
  exit;
}

// Hashear contraseña (nunca guardes texto plano)
$hash = password_hash($password, PASSWORD_BCRYPT);

// Insertar usuario
try {
  $stmt = $pdo->prepare("INSERT INTO users (full_name, email, password_hash) VALUES (?,?,?) RETURNING id, full_name, email");
  $stmt->execute([$full_name, $email, $hash]);
  $user = $stmt->fetch(PDO::FETCH_ASSOC);

  // Crear sesión
  $_SESSION["user"] = $user;

  echo json_encode(["success" => true, "user" => $user]);

} catch (Exception $e) {
  echo json_encode(["error" => "Este correo ya está registrado"]);
}
