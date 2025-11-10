/* ==========================================================
   LOGIN / REGISTER (MODALES)
========================================================== */
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const profileBtn   = document.getElementById("profileBtn");
const profileLabel = document.getElementById("profileLabel");
const avatarImg    = document.getElementById("avatarImg");
const profileMenu  = document.getElementById("profileMenu");
const cartBtn      = document.getElementById("cartBtn");
const cartMenu     = document.getElementById("cartMenu");

const GUEST_AVATAR = "https://i.pravatar.cc/40?u=guest";

let SESSION = { logged_in: false, user: null };

async function refreshSessionUI() {
  try {
    const res = await fetch("/backend/session.php", { credentials: "include" });
    SESSION = await res.json();
  } catch (_) {
    SESSION = { logged_in: false, user: null };
  }

  if (!SESSION.logged_in) {
    profileLabel.textContent = "Iniciar sesión";
    avatarImg.src = GUEST_AVATAR;
    profileBtn.setAttribute("aria-expanded", "false");
    profileMenu?.classList.remove("open");
    // Mostrar "Ingresar" y ocultar "Salir"/"Vender" en el menú
    const _linksOut = Array.from(profileMenu?.querySelectorAll("a") || []);
    const _loginItemOut = _linksOut.find(a => a.textContent?.trim().toLowerCase().includes("ingresar"))?.closest("li");
    const _logoutItemOut = _linksOut.find(a => a.textContent?.trim().toLowerCase().includes("salir"))?.closest("li");
    const _sellItemOut = _linksOut.find(a => a.textContent?.trim().toLowerCase().includes("vender"))?.closest("li");
    if (_loginItemOut) _loginItemOut.hidden = false;
    if (_logoutItemOut) _logoutItemOut.hidden = true;
    if (_sellItemOut) _sellItemOut.hidden = true;
  } else {
    const name = SESSION.user?.full_name || SESSION.user?.email || "Cuenta";
    profileLabel.textContent = name;
    const avatar = SESSION.user?.avatar_url || `https://i.pravatar.cc/40?u=${encodeURIComponent(SESSION.user.email || SESSION.user.id)}`;
    avatarImg.src = avatar;
    // Ocultar "Ingresar" y mostrar "Salir"/"Vender" en el menú
    const _linksIn = Array.from(profileMenu?.querySelectorAll("a") || []);
    const _loginItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("ingresar"))?.closest("li");
    const _logoutItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("salir"))?.closest("li");
    const _sellItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("vender"))?.closest("li");
    if (_loginItemIn) _loginItemIn.hidden = true;
    if (_logoutItemIn) _logoutItemIn.hidden = false;
    if (_sellItemIn) _sellItemIn.hidden = false;
  }
}




// Click en el botón de perfil
profileBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  if (!SESSION.logged_in) {
    // abrir login modal
    document.getElementById("loginModal")?.classList.remove("hidden");
  } else {
    // toggle del menú de perfil existente
    profileMenu?.classList.toggle("open");
    const isOpen = profileMenu?.classList.contains("open");
    profileBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
});

// Cierra el menú al hacer click fuera
document.addEventListener("click", (e) => {
  if (!profileMenu) return;
  if (!profileMenu.contains(e.target) && !profileBtn.contains(e.target)) {
    profileMenu.classList.remove("open");
    profileBtn.setAttribute("aria-expanded", "false");
  }
});


// Cart: toggle dropdown y cierre externo
function renderCartMenu() {
  if (!cartMenu) return;
  if (CART.length === 0) {
    cartMenu.innerHTML = '<div class="cart-empty">No hay productos en el carrito</div>';
    return;
  }
  const currency = (cents)=> (cents/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'});
  const itemsHtml = CART.map(it => {
    const lineTotal = it.qty * it.price_cents;
    return `
      <div class="cart-item">
        <div class="cart-line">
          <span class="cart-name">${it.name}</span>
          <span class="cart-qty">x${it.qty}</span>
        </div>
        <div class="cart-price">${currency(lineTotal)}</div>
      </div>
    `;
  }).join('');
  const totalCents = CART.reduce((sum,it)=> sum + it.qty*it.price_cents, 0);
  const totalHtml = `
    <div class="cart-total">
      <span>Total</span>
      <strong>${currency(totalCents)}</strong>
    </div>
    <button id="payBtn" class="btn btn-pay">Pagar</button>
  `;
  cartMenu.innerHTML = `<div class="cart-list">${itemsHtml}</div>${totalHtml}`;
  const pay = cartMenu.querySelector('#payBtn');
  pay?.addEventListener('click', async (e) => {
    e.preventDefault();
    await comprar();
    renderCartMenu();
  });
}
cartBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  renderCartMenu();
  cartMenu?.classList.toggle("open");
  const isOpen = cartMenu?.classList.contains("open");
  cartBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

document.addEventListener("click", (e) => {
  if (!cartMenu || !cartBtn) return;
  if (!cartMenu.contains(e.target) && !cartBtn.contains(e.target)) {
    cartMenu.classList.remove("open");
    cartBtn.setAttribute("aria-expanded", "false");
  }
});
// Refresca al cargar
refreshSessionUI();

// (Eliminado handler duplicado que abría siempre el modal de login)

// Abrir Register desde Login
document.getElementById("openRegister")?.addEventListener("click", (e) => {
  e.preventDefault();
  loginModal.classList.add("hidden");
  registerModal.classList.remove("hidden");
});

// Abrir Login desde Register
document.getElementById("openLogin")?.addEventListener("click", (e) => {
  e.preventDefault();
  registerModal.classList.add("hidden");
  loginModal.classList.remove("hidden");
});

// ===== Cerrar modales (versión robusta, sin delegación global) =====
function closeModals() {
  loginModal.classList.add("hidden");
  registerModal.classList.add("hidden");
}

// Cerrar con botón X (listeners directos para evitar stopPropagation)
document.querySelectorAll("[data-close]").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    closeModals();
  });
});

// Cerrar al hacer clic en el overlay (pero no dentro del cuadro)
loginModal?.addEventListener("click", (e) => {
  if (e.target === loginModal) closeModals();
});
registerModal?.addEventListener("click", (e) => {
  if (e.target === registerModal) closeModals();
});

// Evitar que el clic dentro del cuadro burbujee al overlay
document.querySelectorAll(".modal-content").forEach((box) => {
  box.addEventListener("click", (e) => {
    // Permitimos que el botón [data-close] funcione
    if (e.target.matches("[data-close]")) return;
    e.stopPropagation();
  });
});

// Cerrar con tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModals();
});

// ===== Registro/Login (fetch) =====
document.getElementById("registerSubmit")?.addEventListener("click", async () => {
  const full_name = document.getElementById("regName").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPass").value;

  const res = await fetch("/backend/register.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ full_name, email, password }),
  });
  const data = await res.json();
  if (data.error) return alert(data.error);

  alert("Cuenta creada ✅ Bienvenido " + data.user.full_name);
  await refreshSessionUI();
  closeModals();
});

document.getElementById("loginSubmit")?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPass").value;

  const res = await fetch("/backend/login.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) return alert(data.error);

  alert("Bienvenido " + data.user.full_name + " 👋");
  await refreshSessionUI();
  closeModals();

// Configurar enlaces del menú de perfil (Ingresar/Salir)
});

document.addEventListener("DOMContentLoaded", () => {
  // Si viene ?login=1 en la URL, abrir el modal de login (página principal)
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("login") === "1") {
      document.getElementById("loginModal")?.classList.remove("hidden");
    }
  } catch (_) {}
  const links = Array.from(profileMenu?.querySelectorAll("a") || []);
  const logoutLink = links.find(a => a.textContent?.trim().toLowerCase().includes("salir"));
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      try { await fetch("/backend/logout.php", { credentials: "include" }); } catch (_) {}
      await refreshSessionUI();
      profileMenu?.classList.remove("open");
      profileBtn?.setAttribute("aria-expanded", "false");
      document.getElementById("loginModal")?.classList.remove("hidden");
    });
  }
  const loginLink = links.find(a => a.textContent?.trim().toLowerCase().includes("ingresar"));
  if (loginLink) {
    loginLink.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("loginModal")?.classList.remove("hidden");
    });
  }
});

/* ==========================================================
   PRODUCTOS Y CARRITO
========================================================== */
const CART = []; // { product_id, name, price_cents, qty, seller_id }

async function loadProducts() {
  const res = await fetch("/backend/get_products.php");
  const products = await res.json();

  const mitad = Math.ceil(products.length / 2);
  renderProducts("ofertas-list", products.slice(0, mitad));
  renderProducts("recomendados-list", products.slice(mitad));
}

function updateCartBadge() {
  const badge = document.getElementById("cartBadge");
  const total = CART.reduce((sum, item) => sum + item.qty, 0);

  if (total > 0) {
    badge.textContent = total;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}


function renderProducts(containerId, items) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  items.forEach((p) => {
    const price = (p.price_cents / 100).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });
    const card = document.createElement("article");
    card.className = "card";

    card.innerHTML = `
      <a href="/producto.html?id=${p.id}" class="card-media">
        <img src="${p.image || "https://picsum.photos/seed/" + p.id + "/600/400"}" alt="${p.name}">
      </a>
      <div class="card-body">
        <h3 class="card-title"><a href="/producto.html?id=${p.id}" class="link" style="text-decoration:none; color:inherit">${p.name}</a></h3>
        <div class="price"><span class="now">${price}</span></div>
        <button class="btn btn-add"
          data-add-to-cart
          data-product-id="${p.id}"
          data-title="${p.name}"
          data-price="${p.price_cents}"
          data-seller-id="${p.seller_id}">
          Agregar al carrito
        </button>
      </div>
    `;

    container.appendChild(card);
  });
}

loadProducts();
try { updateCartBadge(); } catch(_) {}

// Agregar al carrito
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-to-cart]");
  if (!btn) return;

  const item = {
    product_id: Number(btn.dataset.productId),
    name: btn.dataset.title,
    price_cents: Number(btn.dataset.price),
    seller_id: Number(btn.dataset.sellerId),
    qty: 1,
  };

  const existing = CART.find((i) => i.product_id === item.product_id);
  if (existing) existing.qty++;
  else CART.push(item);

  btn.textContent = "Agregado ✓";
  setTimeout(() => (btn.textContent = "Agregar al carrito"), 1000);
  try { updateCartBadge(); renderCartMenu(); } catch(_) {}
});

/* ==========================================================
   COMPRAR (CREAR ORDEN + GUARDAR PAGO)
========================================================== */
async function comprar() {
  if (CART.length === 0) return;

  const buyer_id = 2; // luego sustituir por sesión

  const porVendedor = {};
  CART.forEach((i) => {
    if (!porVendedor[i.seller_id]) porVendedor[i.seller_id] = [];
    porVendedor[i.seller_id].push({ product_id: i.product_id, qty: i.qty });
  });

  for (const [seller_id, items] of Object.entries(porVendedor)) {
    const res = await fetch("/backend/create_order.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer_id, seller_id: Number(seller_id), items }),
    });
    const order = await res.json();
    if (order.error) return alert(order.error);

    await fetch("/backend/pay_order.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: order.order_id,
        payment_method_id: 1,
        amount_cents: order.total_cents,
      }),
    });
  }

  alert("Compra realizada"); CART.length = 0; try { updateCartBadge(); renderCartMenu(); } catch(_) {}
}

// Icono del carrito ejecuta la compra (demo)
// cart icon handler moved to cartBtn listener





