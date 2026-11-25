<?php
/**
 * The Daily Grind Cafe — order endpoint.
 *
 * POST order.php (JSON body):
 *   { "name": string, "phone": string, "fulfilment": "pickup"|"delivery",
 *     "time": string, "address": string (required for delivery),
 *     "notes": string, "items": [ { "id": string, "qty": int } ] }
 *
 * Validates the order against data/menu.json (unknown items and bad
 * quantities are rejected), appends it to data/orders.json, and returns
 * JSON: { "ok": true, "order_id": "DG-XXXXXX", "total": 12.34 }.
 *
 * Runs on a PHP host only — it will NOT work on GitHub Pages or file://.
 * The frontend shows a clearly labelled demo success state when this
 * endpoint is absent, and never fakes a submission.
 */

header( 'Content-Type: application/json; charset=utf-8' );

function order_error( $code, $message ) {
    http_response_code( $code );
    echo json_encode( array( 'error' => $message ) );
    exit;
}

if ( 'POST' !== $_SERVER['REQUEST_METHOD'] ) {
    order_error( 405, 'Method not allowed. POST an order as JSON.' );
}

$raw  = file_get_contents( 'php://input' );
$data = json_decode( $raw, true );

if ( ! is_array( $data ) ) {
    order_error( 400, 'Invalid JSON body.' );
}

// --- Validate customer fields ---
$name        = isset( $data['name'] ) ? trim( (string) $data['name'] ) : '';
$phone       = isset( $data['phone'] ) ? trim( (string) $data['phone'] ) : '';
$fulfilment  = isset( $data['fulfilment'] ) ? trim( (string) $data['fulfilment'] ) : '';
$time        = isset( $data['time'] ) ? trim( (string) $data['time'] ) : '';
$address     = isset( $data['address'] ) ? trim( (string) $data['address'] ) : '';
$notes       = isset( $data['notes'] ) ? trim( (string) $data['notes'] ) : '';
$items       = isset( $data['items'] ) && is_array( $data['items'] ) ? $data['items'] : array();

if ( '' === $name ) {
    order_error( 422, 'Name is required.' );
}
if ( '' === $phone || strlen( $phone ) < 7 ) {
    order_error( 422, 'A valid phone number is required.' );
}
if ( 'pickup' !== $fulfilment && 'delivery' !== $fulfilment ) {
    order_error( 422, 'Fulfilment must be "pickup" or "delivery".' );
}
if ( 'delivery' === $fulfilment && '' === $address ) {
    order_error( 422, 'A delivery address is required for delivery orders.' );
}
if ( empty( $items ) ) {
    order_error( 422, 'The order has no items.' );
}

// --- Validate items against the menu and compute the total server-side ---
$menu_file = __DIR__ . '/data/menu.json';
$menu      = json_decode( file_get_contents( $menu_file ), true );
$prices    = array();
foreach ( $menu['items'] as $item ) {
    $prices[ $item['id'] ] = (float) $item['price'];
}

$total       = 0.0;
$clean_items = array();
foreach ( $items as $line ) {
    if ( ! is_array( $line ) || ! isset( $line['id'], $line['qty'] ) ) {
        order_error( 422, 'Each order line needs an id and a quantity.' );
    }
    $id  = (string) $line['id'];
    $qty = (int) $line['qty'];
    if ( ! isset( $prices[ $id ] ) ) {
        order_error( 422, 'Unknown menu item: ' . $id );
    }
    if ( $qty < 1 || $qty > 20 ) {
        order_error( 422, 'Quantity for ' . $id . ' must be between 1 and 20.' );
    }
    $total += $prices[ $id ] * $qty;
    $clean_items[] = array( 'id' => $id, 'qty' => $qty, 'unit_price' => $prices[ $id ] );
}

// --- Store the order (append to data/orders.json, with a file lock) ---
$orders_file = __DIR__ . '/data/orders.json';
$orders      = array();
if ( is_readable( $orders_file ) ) {
    $existing = json_decode( file_get_contents( $orders_file ), true );
    if ( is_array( $existing ) ) {
        $orders = $existing;
    }
}

$order_id = 'DG-' . strtoupper( substr( bin2hex( random_bytes( 3 ) ), 0, 6 ) );
$order    = array(
    'order_id'   => $order_id,
    'created_at' => gmdate( 'c' ),
    'name'       => $name,
    'phone'      => $phone,
    'fulfilment' => $fulfilment,
    'time'       => $time,
    'address'    => $address,
    'notes'      => $notes,
    'items'      => $clean_items,
    'total'      => round( $total, 2 ),
    'status'     => 'received',
);
$orders[] = $order;

$fp = fopen( $orders_file, 'c+' );
if ( false === $fp ) {
    order_error( 500, 'Could not save the order.' );
}
flock( $fp, LOCK_EX );
ftruncate( $fp, 0 );
fwrite( $fp, json_encode( $orders, JSON_PRETTY_PRINT ) );
flock( $fp, LOCK_UN );
fclose( $fp );

http_response_code( 201 );
echo json_encode( array(
    'ok'       => true,
    'order_id' => $order_id,
    'total'    => round( $total, 2 ),
    'status'   => 'received',
) );
