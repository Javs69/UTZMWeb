<?php

function ensure_marketplace_product_schema(PDO $pdo): void
{
  static $ensured = false;
  if ($ensured) {
    return;
  }

  $pdo->exec("
    ALTER TABLE public.products
      ADD COLUMN IF NOT EXISTS status text,
      ADD COLUMN IF NOT EXISTS condition_code text,
      ADD COLUMN IF NOT EXISTS pickup_location text,
      ADD COLUMN IF NOT EXISTS is_featured boolean,
      ADD COLUMN IF NOT EXISTS updated_at timestamp without time zone DEFAULT NOW() NOT NULL
  ");

  $pdo->exec("UPDATE public.products SET status = 'active' WHERE status IS NULL OR BTRIM(status) = ''");
  $pdo->exec("UPDATE public.products SET condition_code = 'good' WHERE condition_code IS NULL OR BTRIM(condition_code) = ''");
  $pdo->exec("UPDATE public.products SET is_featured = false WHERE is_featured IS NULL");
  $pdo->exec("UPDATE public.products SET pickup_location = NULL WHERE pickup_location IS NOT NULL AND BTRIM(pickup_location) = ''");

  $pdo->exec("ALTER TABLE public.products ALTER COLUMN status SET DEFAULT 'active'");
  $pdo->exec("ALTER TABLE public.products ALTER COLUMN status SET NOT NULL");
  $pdo->exec("ALTER TABLE public.products ALTER COLUMN condition_code SET DEFAULT 'good'");
  $pdo->exec("ALTER TABLE public.products ALTER COLUMN condition_code SET NOT NULL");
  $pdo->exec("ALTER TABLE public.products ALTER COLUMN is_featured SET DEFAULT false");
  $pdo->exec("ALTER TABLE public.products ALTER COLUMN is_featured SET NOT NULL");

  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_products_status_created ON public.products (status, created_at DESC)");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_products_featured_created ON public.products (is_featured, created_at DESC)");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_products_condition ON public.products (condition_code)");
  $pdo->exec("CREATE INDEX IF NOT EXISTS idx_products_pickup_location ON public.products (pickup_location)");

  $ensured = true;
}

function normalize_product_status(string $value, string $fallback = 'active'): string
{
  $status = strtolower(trim($value));
  return in_array($status, ['active', 'paused', 'deleted'], true) ? $status : $fallback;
}

function normalize_product_condition(string $value, string $fallback = 'good'): string
{
  $condition = strtolower(trim($value));
  return in_array($condition, ['new', 'like_new', 'good', 'fair'], true) ? $condition : $fallback;
}

function normalize_product_location(?string $value): ?string
{
  $location = trim((string) $value);
  if ($location === '') {
    return null;
  }

  return function_exists('mb_substr') ? mb_substr($location, 0, 120) : substr($location, 0, 120);
}

function build_pagination_payload(int $page, int $pageSize, int $total): array
{
  $totalPages = $total > 0 ? (int) ceil($total / $pageSize) : 0;

  return [
    'page' => $page,
    'page_size' => $pageSize,
    'total' => $total,
    'total_pages' => $totalPages,
    'has_prev' => $page > 1 && $totalPages > 0,
    'has_next' => $totalPages > 0 && $page < $totalPages,
  ];
}
