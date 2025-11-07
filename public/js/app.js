/* ==========================================================
   LOGIN / REGISTER (MODALES)
========================================================== */
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");
const profileBtn = document.getElementById("profileBtn");

// Abrir login desde "Mi cuenta"
profileBtn?.addEventListener("click", () => {
  loginModal.classList.remove("hidden");
});

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
    body: JSON.stringify({ full_name, email, password }),
  });
  const data = await res.json();
  if (data.error) return alert(data.error);

  alert("Cuenta creada ✅ Bienvenido " + data.user.full_name);
  closeModals();
});

document.getElementById("loginSubmit")?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPass").value;

  const res = await fetch("/backend/login.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (data.error) return alert(data.error);

  alert("Bienvenido " + data.user.full_name + " 👋");
  closeModals();
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
      <a href="#" class="card-media">
        <img src="${p.image || "https://picsum.photos/seed/" + p.id + "/600/400"}" alt="${p.name}">
      </a>
      <div class="card-body">
        <h3 class="card-title">${p.name}</h3>
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
});

/* ==========================================================
   COMPRAR (CREAR ORDEN + GUARDAR PAGO)
========================================================== */
async function comprar() {
  if (CART.length === 0) return alert("Tu carrito está vacío");

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

  alert("✅ Compra realizada");
}

// Icono del carrito ejecuta la compra (demo)
document.querySelector(".icon-btn")?.addEventListener("click", comprar);
