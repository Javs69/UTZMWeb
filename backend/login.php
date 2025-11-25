<?php
require __DIR__ . '/../db.php';
session_start();

$defaultAvatar = "/public/uploads/blank-profile.png";
$data = json_decode(file_get_contents("php://input"), true);
$email = $data["email"] ?? "";
$password = $data["password"] ?? "";

$stmt = $pdo->prepare("SELECT id, full_name, email, password_hash, avatar_url FROM users WHERE email=?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$user || !password_verify($password, $user["password_hash"])) {
  echo json_encode(["error" => "Credenciales incorrectas"]);
  exit;
}

if (empty($user["avatar_url"])) {
  $user["avatar_url"] = $defaultAvatar;
}

unset($user["password_hash"]);
$_SESSION["user"] = $user;

header('Content-Type: application/json; charset=utf-8');
echo json_encode(["success" => true, "user" => $user]);
