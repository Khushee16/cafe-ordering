// The Daily Grind Cafe — scroll reveals + menu rendering + cart page logic.
document.addEventListener('DOMContentLoaded', function () {
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var live = document.getElementById('cart-live');
  function announce(msg) { if (live) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); } }

  // Reveal-on-scroll; instant when reduced motion or IO unsupported.
  var revealEls = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  // ---- Menu page ----
  var grid = document.getElementById('menu-grid');
  if (grid) {
    var status = document.getElementById('menu-status');
    var activeCat = 'All';
    Grind.loadMenu().then(function (menu) {
      if (!menu || !Array.isArray(menu.items) || !menu.items.length) throw new Error('empty menu');
      var cats = document.getElementById('menu-cats');
      ['All'].concat(menu.categories).forEach(function (cat) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'cat-btn me-2 mb-2' + (cat === 'All' ? ' active' : '');
        b.textContent = cat;
        b.setAttribute('aria-pressed', cat === 'All' ? 'true' : 'false');
        b.addEventListener('click', function () {
          activeCat = cat;
          cats.querySelectorAll('.cat-btn').forEach(function (x) { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false'); });
          b.classList.add('active'); b.setAttribute('aria-pressed', 'true');
          render();
        });
        cats.appendChild(b);
      });
      function render() {
        grid.innerHTML = '';
        var items = menu.items.filter(function (it) { return activeCat === 'All' || it.category === activeCat; });
        if (!items.length) {
          grid.innerHTML = '<div class="col-12"><div class="empty-state"><span class="empty-icon" aria-hidden="true">☕</span><p class="mb-1"><strong>Nothing here yet.</strong></p><p class="mb-0">No items in this category right now — try another one.</p></div></div>';
          if (status) status.textContent = 'No items in ' + activeCat + '.';
          return;
        }
        items.forEach(function (it, idx) {
          var col = document.createElement('div');
          col.className = 'col-md-6 col-lg-4 menu-item';
          if (!reducedMotion) col.style.animationDelay = Math.min(idx * 60, 420) + 'ms';
          col.innerHTML =
            '<div class="card h-100"><img src="' + it.image + '" class="card-img-top" alt="Photo of ' + it.name + '" loading="lazy" decoding="async">' +
            '<div class="card-body d-flex flex-column"><div class="d-flex justify-content-between align-items-start">' +
            '<h3 class="h5 mb-1">' + it.name + '</h3><span class="price">' + Grind.money(it.price) + '</span></div>' +
            '<p class="text-muted small">' + it.category + '</p><p class="text-muted">' + it.description + '</p>' +
            '<button type="button" class="btn btn-terra btn-sm mt-auto align-self-start" data-add="' + it.id + '" aria-label="Add ' + it.name + ' to your order, ' + Grind.money(it.price) + '">Add to Order +</button></div></div>';
          grid.appendChild(col);
        });
        if (status) status.textContent = items.length + (items.length === 1 ? ' item' : ' items') + ' shown' + (activeCat === 'All' ? '.' : ' in ' + activeCat + '.');
        grid.querySelectorAll('[data-add]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var id = btn.getAttribute('data-add');
            var item = menu.items.find(function (i) { return i.id === id; });
            var c = Grind.readCart(); c[id] = (c[id] || 0) + 1;
            Grind.writeCart(c); Grind.updateBadges(true);
            announce((item ? item.name : 'Item') + ' added to your order. ' + Grind.cartCount() + ' item(s) in your order.');
            btn.textContent = 'Added ✓'; btn.classList.add('added');
            setTimeout(function () { btn.textContent = 'Add to Order +'; btn.classList.remove('added'); }, 1200);
          });
        });
      }
      render();
    }).catch(function () {
      grid.innerHTML = '<div class="col-12"><div class="empty-state"><span class="empty-icon" aria-hidden="true">☕</span><p class="mb-1"><strong>The menu could not be loaded.</strong></p><p class="mb-0">Please refresh the page to try again.</p></div></div>';
      if (status) status.textContent = 'The menu could not be loaded.';
    });
  }

  // ---- Cart page ----
  var cartList = document.getElementById('cart-list');
  if (cartList) {
    Grind.loadMenu().then(function (menu) {
      var totalEl = document.getElementById('cart-total');
      function renderCart(focusId) {
        var cart = Grind.readCart();
        cartList.innerHTML = '';
        var ids = Object.keys(cart);
        if (!ids.length) {
          cartList.innerHTML = '<div class="empty-state"><span class="empty-icon" aria-hidden="true">🧺</span><p class="mb-1"><strong>Your order is empty.</strong></p><p class="mb-3">Add something tasty from the menu and it will show up here.</p><a class="btn btn-terra btn-sm" href="menu.html">Browse the Menu</a></div>';
          totalEl.textContent = Grind.money(0);
          document.getElementById('checkout-form').classList.add('d-none');
          return;
        }
        document.getElementById('checkout-form').classList.remove('d-none');
        ids.forEach(function (id) {
          var it = menu.items.find(function (i) { return i.id === id; });
          if (!it) return;
          var row = document.createElement('div');
          row.className = 'cart-row d-flex justify-content-between align-items-center border-bottom py-3';
          row.innerHTML =
            '<div><strong>' + it.name + '</strong><br><span class="text-muted small">' + Grind.money(it.price) + ' each</span></div>' +
            '<div class="d-flex align-items-center gap-2">' +
            '<button type="button" class="qty-btn" data-dec="' + id + '" aria-label="Remove one ' + it.name + '">−</button>' +
            '<span class="qty-val" aria-label="Quantity of ' + it.name + ': ' + cart[id] + '">' + cart[id] + '</span>' +
            '<button type="button" class="qty-btn" data-inc="' + id + '" aria-label="Add one more ' + it.name + '">+</button>' +
            '<span class="ms-2 fw-bold">' + Grind.money(it.price * cart[id]) + '</span></div>';
          cartList.appendChild(row);
        });
        totalEl.textContent = Grind.money(Grind.cartTotal(menu));
        if (!reducedMotion) { totalEl.classList.remove('tick'); void totalEl.offsetWidth; totalEl.classList.add('tick'); setTimeout(function () { totalEl.classList.remove('tick'); }, 220); }
        cartList.querySelectorAll('[data-inc]').forEach(function (b) { b.addEventListener('click', function () { var c = Grind.readCart(); c[b.getAttribute('data-inc')]++; Grind.writeCart(c); Grind.updateBadges(true); renderCart('inc-' + b.getAttribute('data-inc')); }); });
        cartList.querySelectorAll('[data-dec]').forEach(function (b) { b.addEventListener('click', function () { var c = Grind.readCart(); var id = b.getAttribute('data-dec'); c[id]--; var removed = c[id] <= 0; if (removed) delete c[id]; Grind.writeCart(c); Grind.updateBadges(true); renderCart(removed ? null : 'dec-' + id); if (removed) announce('Item removed from your order.'); }); });
        // Restore focus to the control just used so keyboard users don't lose their place.
        if (focusId) {
          var kind = focusId.split('-')[0], fid = focusId.slice(kind.length + 1);
          var target = cartList.querySelector('[data-' + kind + '="' + fid + '"]');
          if (target) target.focus();
        }
      }
      renderCart();

      // Fulfilment toggle: address only for delivery.
      var fulfil = document.getElementById('co-fulfilment');
      var addrWrap = document.getElementById('address-wrap');
      var addrInput = document.getElementById('co-address');
      fulfil.addEventListener('change', function () {
        var isDelivery = fulfil.value === 'delivery';
        addrWrap.classList.toggle('d-none', !isDelivery);
        addrInput.required = isDelivery;
        if (isDelivery) addrInput.focus();
      });

      // Checkout submit.
      var form = document.getElementById('checkout-form');
      var submitBtn = document.getElementById('place-order-btn');
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!form.checkValidity()) {
          form.classList.add('was-validated');
          var firstBad = form.querySelector(':invalid');
          if (firstBad) firstBad.focus();
          return;
        }
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Placing order…'; }
        var cart = Grind.readCart();
        var items = Object.keys(cart).map(function (id) { return { id: id, qty: cart[id] }; });
        var payload = {
          name: document.getElementById('co-name').value.trim(),
          phone: document.getElementById('co-phone').value.trim(),
          fulfilment: fulfil.value,
          time: document.getElementById('co-time').value,
          address: document.getElementById('co-address').value.trim(),
          notes: document.getElementById('co-notes').value.trim(),
          items: items
        };
        fetch('order.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
        .then(function (res) {
          if (res.ok && res.data.order_id) {
            showConfirmation(res.data, false);
          } else if (res.data && res.data.error) {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Place Order'; }
            alert('Order could not be placed: ' + res.data.error);
          } else {
            showConfirmation(null, true); // backend unreachable/invalid -> demo state
          }
        })
        .catch(function () { showConfirmation(null, true); });

        function showConfirmation(order, demo) {
          var conf = document.getElementById('order-confirmation');
          var ref = order ? order.order_id : ('DEMO-' + String(Math.floor(1000 + Math.random() * 9000)));
          document.getElementById('order-ref').textContent = ref;
          document.getElementById('order-total').textContent = Grind.money(Grind.cartTotal(menu));
          document.getElementById('order-fulfilment').textContent = payload.fulfilment === 'delivery' ? 'Delivery' : 'Pickup';
          document.getElementById('order-time').textContent = payload.time || 'ASAP';
          document.getElementById('order-status').textContent = demo
            ? 'Demo mode — no backend connected. This order was NOT sent or stored.'
            : 'Order received! We are preparing it now.';
          document.getElementById('order-demo-note').classList.toggle('d-none', !demo);
          // Track the order id so the confirmation survives a reload.
          try { localStorage.setItem(Grind.ORDER_KEY, JSON.stringify({ order_id: ref, demo: demo, total: Grind.cartTotal(menu), fulfilment: payload.fulfilment, time: payload.time })); } catch (e) {}
          Grind.writeCart({}); Grind.updateBadges();
          form.classList.add('d-none');
          document.getElementById('cart-section').classList.add('d-none');
          conf.classList.remove('d-none');
          conf.focus();
          conf.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
        }
      });
    });
  }
});
