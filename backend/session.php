<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

$defaultAvatar = "/public/uploads/blank-profile.png";

if (!isset($_SESSION['user'])) {
  echo json_encode([
    "logged_in" => false,
    "user" => null
  ]);
  exit;
}

$avatar = $_SESSION['user']['avatar_url'] ?? null;

echo json_encode([
  "logged_in" => true,
  "user" => [
    "id" => $_SESSION['user']['id'],
    "full_name" => $_SESSION['user']['full_name'] ?? '',
    "email" => $_SESSION['user']['email'] ?? '',
    "avatar_url" => $avatar ?: $defaultAvatar
  ]
]);
