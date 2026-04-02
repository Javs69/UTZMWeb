<?php

function notifications_are_available(PDO $pdo): bool
{
  static $available = null;

  if ($available !== null) {
    return $available;
  }

  try {
    $stmt = $pdo->query("SELECT to_regclass('public.notifications') IS NOT NULL");
    $available = (bool) $stmt->fetchColumn();
  } catch (Throwable $error) {
    $available = false;
  }

  return $available;
}

function notifications_insert(PDO $pdo, int $userId, string $type, string $title, string $body, ?string $href = null, array $meta = []): void
{
  if ($userId <= 0 || !notifications_are_available($pdo)) {
    return;
  }

  $stmt = $pdo->prepare(
    'INSERT INTO notifications (user_id, type, title, body, href, meta) VALUES (:user_id, :type, :title, :body, :href, CAST(:meta AS jsonb))'
  );
  $stmt->execute([
    ':user_id' => $userId,
    ':type' => trim($type) !== '' ? $type : 'general',
    ':title' => trim($title) !== '' ? $title : 'Nueva notificacion',
    ':body' => trim($body),
    ':href' => $href ?: null,
    ':meta' => json_encode($meta, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
  ]);
}

function notifications_insert_many(PDO $pdo, array $userIds, string $type, string $title, string $body, ?string $href = null, array $meta = []): void
{
  $uniqueIds = array_values(array_unique(array_map('intval', $userIds)));
  foreach ($uniqueIds as $userId) {
    notifications_insert($pdo, $userId, $type, $title, $body, $href, $meta);
  }
}

function notifications_insert_for_staff(PDO $pdo, string $type, string $title, string $body, ?string $href = null, array $meta = [], array $excludeUserIds = []): void
{
  if (!notifications_are_available($pdo)) {
    return;
  }

  $excludeLookup = array_flip(array_map('intval', $excludeUserIds));
  $stmt = $pdo->query("SELECT id FROM users WHERE role IN ('support', 'admin')");
  $ids = [];

  foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $userId) {
    $parsedId = (int) $userId;
    if ($parsedId > 0 && !isset($excludeLookup[$parsedId])) {
      $ids[] = $parsedId;
    }
  }

  notifications_insert_many($pdo, $ids, $type, $title, $body, $href, $meta);
}
