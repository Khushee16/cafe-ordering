<?php
/**
 * The Daily Grind Cafe — menu endpoint.
 *
 * GET menu.php  →  serves the menu as JSON from data/menu.json.
 *
 * Runs on a PHP host only (it will NOT work on GitHub Pages or file://).
 * The frontend falls back to the embedded data in js/menu-data.js when
 * this endpoint is unavailable.
 */

header( 'Content-Type: application/json; charset=utf-8' );
header( 'Cache-Control: no-cache' );

$menu_file = __DIR__ . '/data/menu.json';

if ( ! is_readable( $menu_file ) ) {
    http_response_code( 500 );
    echo json_encode( array( 'error' => 'Menu data unavailable.' ) );
    exit;
}

$menu = json_decode( file_get_contents( $menu_file ), true );

if ( ! is_array( $menu ) || empty( $menu['items'] ) ) {
    http_response_code( 500 );
    echo json_encode( array( 'error' => 'Menu data is invalid.' ) );
    exit;
}

echo json_encode( $menu );
