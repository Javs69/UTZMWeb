<?php

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = $requestUri ? rawurldecode($requestUri) : '/';
$root = __DIR__;
$frontendRoot = $root . '/app';
$rootReal = realpath($root) ?: $root;
$frontendRootReal = realpath($frontendRoot) ?: $frontendRoot;

if ($path === false || $path === '') {
  $path = '/';
}

function normalize_path_prefix(string $value): string
{
  return rtrim(str_replace('\\', '/', $value), '/');
}

function path_is_within(string $path, string $base): bool
{
  $normalizedPath = normalize_path_prefix($path);
  $normalizedBase = normalize_path_prefix($base);
  return $normalizedPath === $normalizedBase || str_starts_with($normalizedPath, $normalizedBase . '/');
}

if (str_starts_with($path, '/backend/') || str_starts_with($path, '/public/')) {
  $target = realpath($root . $path);
  if ($target !== false && path_is_within($target, $rootReal)) {
    return false;
  }

  http_response_code(404);
  echo 'Not Found';
  return true;
}

if (str_starts_with($path, '/assets/')) {
  $assetPath = realpath($frontendRoot . $path);
  if ($assetPath !== false && is_file($assetPath) && path_is_within($assetPath, $frontendRootReal)) {
    $mime = mime_content_type($assetPath) ?: 'application/octet-stream';
    header('Content-Type: ' . $mime);
    readfile($assetPath);
    return true;
  }
}

$frontendIndex = $frontendRoot . '/index.html';
if (is_file($frontendIndex)) {
  header('Content-Type: text/html; charset=UTF-8');
  readfile($frontendIndex);
  return true;
}

http_response_code(404);
echo 'Frontend not built';
return true;
