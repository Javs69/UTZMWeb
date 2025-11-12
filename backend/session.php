<?php
session_start();
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['user'])) {
  echo json_encode([
    "logged_in" => false,
    "user" => null
  ]);
  exit;
}

echo json_encode([
  "logged_in" => true,
  "user" => [
    "id" => $_SESSION['user']['id'],
    "full_name" => $_SESSION['user']['full_name'] ?? '',
    "email" => $_SESSION['user']['email'] ?? '',
    "avatar_url" => $_SESSION['user']['avatar_url'] ?? null
  ]
]);
