<?php
require_once __DIR__ . '/bootstrap.php';
app_bootstrap_http(false);
header('Content-Type: application/json; charset=utf-8');
require __DIR__ . '/../db.php';

$user = auth_user_from_access_token($pdo);
if (!$user) {
  echo json_encode([
    "logged_in" => false,
    "user" => null
  ]);
  exit;
}

echo json_encode([
  "logged_in" => true,
  "user" => [
    "id" => $user['id'] ?? null,
    "full_name" => $user['full_name'] ?? '',
    "email" => $user['email'] ?? '',
    "avatar_url" => $user['avatar_url'] ?? '/public/uploads/blank-profile.png',
    "role" => $user['role'] ?? 'customer',
    "seller_verified" => filter_var($user['seller_verified'] ?? false, FILTER_VALIDATE_BOOLEAN),
    "store_name" => $user['store_name'] ?? '',
    "seller_bio" => $user['seller_bio'] ?? ''
  ]
]);
