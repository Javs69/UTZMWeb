<?php

$requestUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$path = $requestUri ? rawurldecode($requestUri) : '/';
$root = __DIR__;
$frontendRoot = $root . '/app';

if ($path === false || $path === '') {
  $path = '/';
}

if (str_starts_with($path, '/backend/') || str_starts_with($path, '/public/')) {
  $target = realpath($root . $path);
  if ($target !== false && str_starts_with($target, $root . DIRECTORY_SEPARATOR)) {
    return false;
  }

  http_response_code(404);
  echo 'Not Found';
  return true;
}

if (str_starts_with($path, '/assets/')) {
  $assetPath = realpath($frontendRoot . $path);
  if ($assetPath !== false && str_starts_with($assetPath, $frontendRoot . DIRECTORY_SEPARATOR)) {
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
