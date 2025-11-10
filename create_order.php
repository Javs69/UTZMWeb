<?php
require "db.php";

$data = json_decode(file_get_contents("php://input"), true);
$buyer_id = $data["buyer_id"];
$seller_id = $data["seller_id"];
$items = $data["items"]; // [{product_id, qty}]

$pdo->beginTransaction();

try {
    // Calcular total
    $total = 0;
    foreach ($items as $it){
        $stmt = $pdo->prepare("SELECT price_cents, name FROM products WHERE id=?");
        $stmt->execute([$it["product_id"]]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);
        $total += $p["price_cents"] * $it["qty"];
    }

    // Crear orden
    $stmt = $pdo->prepare("
      INSERT INTO orders (buyer_id, seller_id, status, total_cents)
      VALUES (?, ?, 'pending', ?)
      RETURNING id
    ");
    $stmt->execute([$buyer_id, $seller_id, $total]);
    $order_id = $stmt->fetchColumn();

    // Items
    foreach ($items as $it){
        $stmt = $pdo->prepare("SELECT name, price_cents FROM products WHERE id=?");
        $stmt->execute([$it["product_id"]]);
        $p = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("
          INSERT INTO order_items (order_id, product_id, name, price_cents, qty)
          VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$order_id, $it["product_id"], $p["name"], $p["price_cents"], $it["qty"]]);
    }

    $pdo->commit();
    echo json_encode(["order_id" => $order_id, "total_cents" => $total]);

} catch(Exception $e) {
    $pdo->rollBack();
    echo json_encode(["error" => $e->getMessage()]);
}
