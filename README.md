# The Daily Grind Cafe — Online Ordering (fictional)

A self-directed portfolio piece by **Khushi Khatri** (Glassboro, NJ). **The Daily Grind Cafe is a fictional cafe — not a real business, not client work.** All menu items, prices, hours and copy are invented demo content; photography is placeholder imagery from picsum.photos.

## What it is

A responsive cafe site with online ordering: home/about, a menu by category with add-to-order, a cart with quantity controls, and a checkout/order form (name, phone, pickup/delivery, time) with an order confirmation + tracking state ("received" — a live cafe would update it to "preparing" / "ready").

## Stack

- HTML5, CSS3 (custom stylesheet), vanilla JavaScript
- Bootstrap 5 via CDN
- Google Fonts: Fraunces + DM Sans
- PHP 7.4+ backend (no framework, no database — JSON files)
- Images: picsum.photos seeded URLs (placeholder only)

## Backend

| File | Purpose |
| --- | --- |
| `menu.php` | Serves the menu as JSON from `data/menu.json` |
| `order.php` | `POST` endpoint: validates items/name/phone/fulfilment (address required for delivery), checks items against the menu and computes the total server-side, appends the order to `data/orders.json` (file-locked), returns JSON with an order id (`DG-XXXXXX`) |
| `data/menu.json` | The menu (13 items across Coffee / Breakfast / Lunch / Bakery) |
| `data/orders.json` | Stored orders (starts as `[]`) |

**The PHP runs on a PHP host, not on GitHub Pages.** On static hosting or `file://`, `menu.php`/`order.php` are absent and the frontend falls back gracefully:

- Menu: falls back to the embedded data in `js/menu-data.js` (kept in sync with `data/menu.json`).
- Checkout: the form still validates, then shows a clearly labelled **demo success state** ("Demo mode — no backend connected. This order was NOT sent or stored.") with a `DEMO-XXXX` reference. It never fakes a real submission.
- Cart state lives in `localStorage`; the last order id is saved so the confirmation survives a reload.

## How to run locally

**Static demo (no PHP):**

```bash
cd cafe-ordering
python3 -m http.server 8000
# open http://localhost:8000 — menu works from the embedded fallback,
# checkout shows the demo success state.
```

**Full version (with PHP backend):**

```bash
cd cafe-ordering
php -S localhost:8000
# open http://localhost:8000 — menu loads from menu.php,
# checkout POSTs to order.php and stores orders in data/orders.json.
```

Make `data/orders.json` writable by the web server (`chmod 664 data/orders.json` or equivalent) so orders can be saved.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Home / hero / about |
| `menu.html` | Menu by category with add-to-order |
| `cart.html` | Cart + checkout form + confirmation/tracking state |
| `css/style.css` | Shared theme styles |
| `js/menu-data.js` | Embedded fallback menu data |
| `js/cart.js` | Cart (localStorage), menu loading with backend fallback |
| `js/main.js` | Scroll reveals, menu rendering, cart page + checkout logic |
| `menu.php`, `order.php` | PHP backend (see above) |
| `data/menu.json`, `data/orders.json` | Menu data / stored orders |
