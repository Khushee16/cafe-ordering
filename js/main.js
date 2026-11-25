// The Daily Grind Cafe — scroll reveals + menu rendering + cart page logic.
document.addEventListener('DOMContentLoaded', function () {
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });

  // ---- Menu page ----
  var grid = document.getElementById('menu-grid');
  if (grid) {
    var activeCat = 'All';
    Grind.loadMenu().then(function (menu) {
      var cats = document.getElementById('menu-cats');
      ['All'].concat(menu.categories).forEach(function (cat) {
        var b = document.createElement('button');
        b.className = 'cat-btn me-2 mb-2' + (cat === 'All' ? ' active' : '');
        b.textContent = cat;
        b.addEventListener('click', function () {
          activeCat = cat;
          cats.querySelectorAll('.cat-btn').forEach(function (x) { x.classList.remove('active'); });
          b.classList.add('active');
          render();
        });
        cats.appendChild(b);
      });
      function render() {
        grid.innerHTML = '';
        menu.items.filter(function (it) { return activeCat === 'All' || it.category === activeCat; }).forEach(function (it) {
          var col = document.createElement('div');
          col.className = 'col-md-6 col-lg-4';
          col.innerHTML =
            '<div class="card h-100"><img src="' + it.image + '" class="card-img-top" alt="' + it.name + '">' +
            '<div class="card-body d-flex flex-column"><div class="d-flex justify-content-between align-items-start">' +
            '<h3 class="h5 mb-1">' + it.name + '</h3><span class="price">' + Grind.money(it.price) + '</span></div>' +
            '<p class="text-muted small">' + it.category + '</p><p class="text-muted">' + it.description + '</p>' +
            '<button class="btn btn-terra btn-sm mt-auto align-self-start" data-add="' + it.id + '">Add to Order +</button></div></div>';
          grid.appendChild(col);
        });
        grid.querySelectorAll('[data-add]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            var c = Grind.readCart(); c[btn.getAttribute('data-add')] = (c[btn.getAttribute('data-add')] || 0) + 1;
            Grind.writeCart(c); Grind.updateBadges();
            btn.textContent = 'Added ✓'; setTimeout(function () { btn.textContent = 'Add to Order +'; }, 1200);
          });
        });
      }
      render();
    });
  }

  // ---- Cart page ----
  var cartList = document.getElementById('cart-list');
  if (cartList) {
    Grind.loadMenu().then(function (menu) {
      var cart = Grind.readCart();
      var totalEl = document.getElementById('cart-total');
      function renderCart() {
        cart = Grind.readCart();
        cartList.innerHTML = '';
        var ids = Object.keys(cart);
        if (!ids.length) {
          cartList.innerHTML = '<p class="text-muted">Your cart is empty. <a href="menu.html">Browse the menu</a> to add something tasty.</p>';
          totalEl.textContent = Grind.money(0);
          document.getElementById('checkout-form').classList.add('d-none');
          return;
        }
        ids.forEach(function (id) {
          var it = menu.items.find(function (i) { return i.id === id; });
          if (!it) return;
          var row = document.createElement('div');
          row.className = 'd-flex justify-content-between align-items-center border-bottom py-3';
          row.innerHTML =
            '<div><strong>' + it.name + '</strong><br><span class="text-muted small">' + Grind.money(it.price) + ' each</span></div>' +
            '<div class="d-flex align-items-center gap-2">' +
            '<button class="qty-btn" data-dec="' + id + '" aria-label="Decrease">−</button><span>' + cart[id] + '</span>' +
            '<button class="qty-btn" data-inc="' + id + '" aria-label="Increase">+</button>' +
            '<span class="ms-2 fw-bold">' + Grind.money(it.price * cart[id]) + '</span></div>';
          cartList.appendChild(row);
        });
        totalEl.textContent = Grind.money(Grind.cartTotal(menu));
        cartList.querySelectorAll('[data-inc]').forEach(function (b) { b.addEventListener('click', function () { var c = Grind.readCart(); c[b.getAttribute('data-inc')]++; Grind.writeCart(c); Grind.updateBadges(); renderCart(); }); });
        cartList.querySelectorAll('[data-dec]').forEach(function (b) { b.addEventListener('click', function () { var c = Grind.readCart(); var id = b.getAttribute('data-dec'); c[id]--; if (c[id] <= 0) delete c[id]; Grind.writeCart(c); Grind.updateBadges(); renderCart(); }); });
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
      });

      // Checkout submit.
      var form = document.getElementById('checkout-form');
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
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
          conf.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });
    });
  }
});
