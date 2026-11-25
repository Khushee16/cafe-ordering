/* The Daily Grind Cafe — cart stored in localStorage.
   Menu is loaded from menu.php when available, otherwise from the
   embedded fallback in js/menu-data.js. */
(function () {
  var CART_KEY = 'daily-grind-cart-v1';
  var ORDER_KEY = 'daily-grind-last-order-v1';

  function readCart() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || {}; } catch (e) { return {}; } }
  function writeCart(c) { localStorage.setItem(CART_KEY, JSON.stringify(c)); }
  function cartCount() { var c = readCart(), n = 0; Object.keys(c).forEach(function (k) { n += c[k]; }); return n; }
  function cartTotal(menu) { var c = readCart(), t = 0; Object.keys(c).forEach(function (id) { var it = menu.items.find(function (i) { return i.id === id; }); if (it) t += it.price * c[id]; }); return t; }

  function updateBadges(bump) {
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = cartCount();
      var link = el.closest('a');
      if (link) link.setAttribute('aria-label', 'Your order, ' + cartCount() + ' item(s)');
      if (bump) { el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump'); }
    });
  }

  function loadMenu() {
    // Try the PHP backend first; fall back to embedded data on static hosting.
    return fetch('menu.php').then(function (r) { if (!r.ok) throw new Error('no backend'); return r.json(); })
      .catch(function () { return window.DAILY_GRIND_MENU; });
  }

  function money(n) { return '$' + n.toFixed(2); }

  window.Grind = {
    readCart: readCart, writeCart: writeCart, cartCount: cartCount, cartTotal: cartTotal,
    updateBadges: updateBadges, loadMenu: loadMenu, money: money, CART_KEY: CART_KEY, ORDER_KEY: ORDER_KEY
  };
  document.addEventListener('DOMContentLoaded', updateBadges);
})();
