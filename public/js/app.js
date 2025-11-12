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
const IS_VENDER = typeof location !== 'undefined' && /\/vender\.html$/i.test(location.pathname || '');
const CART_STORAGE_KEY = 'CART';

// Año en el footer
try { document.getElementById('year') && (document.getElementById('year').textContent = String(new Date().getFullYear())); } catch(_) {}

let SESSION = { logged_in: false, user: null };
let ALL_PRODUCTS = [];
const CART = []; // { product_id, name, price_cents, qty, seller_id }

function loadCartFromStorage(){
  try{
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)){
      CART.splice(0, CART.length, ...arr);
    }
  }catch(_){ }
}
function saveCartToStorage(){
  try{ localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(CART)); }catch(_){ }
}

// ====== Buscador (con sinónimos básicos tipo "mini IA") ======
const searchInput = document.getElementById('searchInput');
const searchSuggest = document.getElementById('searchSuggest');
const searchForm = document.querySelector('form.search');

function normalize(t){
  try { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); } catch(_) { return (t||'').toLowerCase(); }
}

const SYNONYMS = {
  'celular': ['telefono','teléfono','smartphone','iphone','android','samsung','xiaomi','huawei','pixel','galaxy'],
  'telefono': ['celular','smartphone','iphone','android','samsung','xiaomi','huawei','pixel','galaxy'],
  'smartphone': ['celular','telefono','iphone','android','samsung','xiaomi','huawei','pixel','galaxy'],
  'laptop': ['computadora','portatil','portátil','notebook','macbook','pc'],
  'computadora': ['laptop','portatil','notebook','pc','mac'],
  'ropa': ['camisa','playera','pantalon','pantalón','jeans','blusa','vestido','sueter','suéter','abrigo','short','falda','remera'],
  'zapatos': ['tenis','sneakers','botas','sandalias'],
  'electrodomestico': ['electrodoméstico','refrigerador','licuadora','microondas','lavadora','secadora','aspiradora','horno'],
  'juguete': ['juguetes','lego','muñeca','muneca','figura','rompecabezas','juego','playstation','xbox','nintendo','switch'],
  'salud': ['cubrebocas','mascarilla','termometro','termómetro','medico','médico','equipo'],
  'vehiculo': ['vehículo','auto','coche','carro','moto','motocicleta','llanta','rin'],
  'papeleria': ['papelería','libreta','cuaderno','pluma','boligrafo','bolígrafo','marcador','lapiz','lápiz','hojas','papel','folder']
};

function expandQuery(q){
  const base = normalize(q).split(/\s+/).filter(Boolean);
  const out = new Set(base);
  base.forEach(tok => {
    const syn = SYNONYMS[tok] || SYNONYMS[tok.replace(/s$/,'')] || [];
    syn.forEach(s => out.add(normalize(s)));
  });
  return Array.from(out);
}

function scoreProduct(p, terms){
  const hay = normalize(`${p.name || ''}`);
  let score = 0;
  for (const t of terms){
    if (!t) continue;
    if (hay.includes(t)) score += 2;
  }
  return score;
}

function searchProducts(query){
  const terms = expandQuery(query);
  const results = ALL_PRODUCTS.map(p => ({ p, s: scoreProduct(p, terms) }))
    .filter(x => x.s > 0)
    .sort((a,b) => b.s - a.s)
    .map(x => x.p);
  return results;
}

function ensureResultsSection(){
  let sec = document.getElementById('search-results-section');
  if (sec) return sec;
  const main = document.querySelector('main.container') || document.querySelector('main');
  if (!main) return null;
  sec = document.createElement('section');
  sec.className = 'strip';
  sec.id = 'search-results-section';
  sec.innerHTML = '<div class="strip-head"><h2 id="ttl-search">Resultados</h2><a href="#" class="link" id="clearSearch">Limpiar</a></div><div class="grid" id="search-results"></div>';
  main.prepend(sec);
  sec.querySelector('#clearSearch')?.addEventListener('click', (e)=>{
    e.preventDefault();
    searchInput.value = '';
    sec.remove();
    document.getElementById('searchSuggest')?.replaceChildren();
    const s1 = document.getElementById('ofertas-list')?.closest('.strip');
    const s2 = document.getElementById('recomendados-list')?.closest('.strip');
    s1 && (s1.hidden = false);
    s2 && (s2.hidden = false);
    const hero = document.querySelector('.hero');
    hero && (hero.hidden = false);
  });
  return sec;
}

function renderSearchResults(items){
  const sec = ensureResultsSection();
  if (!sec) return;
  const grid = sec.querySelector('#search-results');
  grid.innerHTML = '';
  if (!items.length){
    grid.innerHTML = '<div>No se encontraron productos.</div>';
  } else {
    renderProducts('search-results', items);
  }
  const s1 = document.getElementById('ofertas-list')?.closest('.strip');
  const s2 = document.getElementById('recomendados-list')?.closest('.strip');
  s1 && (s1.hidden = true);
  s2 && (s2.hidden = true);
  const hero = document.querySelector('.hero');
  hero && (hero.hidden = true);
}

function renderSuggestions(list){
  if (!searchSuggest) return;
  searchSuggest.innerHTML = '';
  if (!list.length){ searchSuggest.style.display = 'none'; return; }
  list.slice(0,6).forEach(p => {
    const li = document.createElement('li');
    li.textContent = p.name;
    li.addEventListener('click', () => {
      searchInput.value = p.name;
      searchSuggest.style.display = 'none';
      renderSearchResults(searchProducts(p.name));
    });
    searchSuggest.appendChild(li);
  });
  searchSuggest.style.display = 'block';
}

// ====== Categorías: filtrar productos al hacer clic ======
function categoryQueryFromText(txt){
  const t = normalize(txt || '');
  if (t.includes('electrodom')) return 'electrodomestico refrigerador microondas lavadora licuadora tv audio';
  if (t.includes('papeler')) return 'papeleria libreta cuaderno lapiz boligrafo pluma papel marcador';
  if (t.includes('veh')) return 'vehiculo auto coche carro moto motocicleta llanta';
  if (t.includes('moda')) return 'ropa zapatos camisa pantalon vestido blusa tenis';
  if (t.includes('juego') || t.includes('juguet')) return 'juguete juguetes lego figura muñeca juego';
  if (t.includes('salud') || t.includes('médico') || t.includes('medico')) return 'salud equipo medico cubrebocas termometro mascarilla';
  if (t.includes('electr')) return 'celular smartphone laptop computadora tv audio';
  return t;
}

function wireCategoryFilters(){
  const catNav = document.getElementById('catNav');
  if (!catNav) return;
  // Links simples
  catNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const q = categoryQueryFromText(a.textContent || '');
      const rs = searchProducts(q);
      renderSearchResults(rs);
      if (searchInput) searchInput.value = (a.textContent || '').trim();
    });
  });
  // Botón de categoría destacada (Electrónica)
  catNav.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const q = categoryQueryFromText(btn.textContent || '');
      const rs = searchProducts(q);
      renderSearchResults(rs);
      if (searchInput) searchInput.value = (btn.textContent || '').trim();
    });
  });
}

async function refreshSessionUI() {
  try {
    const res = await fetch("/backend/session.php", { credentials: "include" });
    SESSION = await res.json();
  } catch (_) {
    SESSION = { logged_in: false, user: null };
  }

  if (!SESSION.logged_in) {
    profileLabel.textContent = "Iniciar sesi\u00F3n";
    avatarImg.src = GUEST_AVATAR;
    profileBtn.setAttribute("aria-expanded", "false");
    profileMenu?.classList.remove("open");
    // Mostrar "Ingresar" y ocultar "Salir"/"Vender" en el men\u00FAº
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
    // Ocultar "Ingresar" y mostrar "Salir"/"Vender" en el men\u00FAº
    const _linksIn = Array.from(profileMenu?.querySelectorAll("a") || []);
    const _loginItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("ingresar"))?.closest("li");
    const _logoutItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("salir"))?.closest("li");
    const _sellItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("vender"))?.closest("li");
    if (_loginItemIn) _loginItemIn.hidden = true;
    if (_logoutItemIn) _logoutItemIn.hidden = IS_VENDER ? true : false;
    if (_sellItemIn) _sellItemIn.hidden = false;
  }
}




// Click en el botÃ³n de perfil
profileBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  if (!SESSION.logged_in) {
    // abrir login modal
    document.getElementById("loginModal")?.classList.remove("hidden");
  } else {
    // toggle del men\u00FAº de perfil existente
    profileMenu?.classList.toggle("open");
    const isOpen = profileMenu?.classList.contains("open");
    profileBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }
});

// Cierra el men\u00FAº al hacer click fuera
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
      <div class="cart-item" data-pid="${it.product_id}">
        <div class="cart-line" style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
          <span class="cart-name" style="flex:1 1 auto;">${it.name}</span>
          <div class="qty-controls" style="display:flex;align-items:center;gap:6px;">
            <button class="qty-btn cart-minus" aria-label="Disminuir" title="-" style="width:28px;height:28px;border:none;border-radius:6px;background:#f3f4f6;cursor:pointer">-</button>
            <input type="number" class="cart-qty-input" min="1" max="99" value="${it.qty}" style="width:56px;text-align:center;" aria-label="Cantidad"/>
            <button class="qty-btn cart-plus" aria-label="Aumentar" title="+" style="width:28px;height:28px;border:none;border-radius:6px;background:#f3f4f6;cursor:pointer">+</button>
          </div>
          <button class="cart-remove" aria-label="Eliminar" title="Eliminar" style="background:none;border:none;color:#d84e4e;font-weight:700;font-size:18px;cursor:pointer">&times;</button>
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
    <a href="/pagar.html" id="payBtn" class="btn btn-pay">Pagar</a>
  `;
  cartMenu.innerHTML = `<div class="cart-list">${itemsHtml}</div>${totalHtml}`;
}

// Delegación de eventos: cantidad y eliminar
cartMenu?.addEventListener('input', (e) => {
  const input = e.target?.closest?.('.cart-qty-input');
  if (!input) return;
  const wrap = input.closest('.cart-item');
  const pid = Number(wrap?.dataset.pid);
  const item = CART.find(i => i.product_id === pid);
  if (!item) return;
  let q = parseInt(input.value, 10);
  if (!q || q < 1) q = 1;
  if (q > 99) q = 99;
  item.qty = q;
  try { saveCartToStorage(); updateCartBadge(); } catch(_) {}
  renderCartMenu();
});

cartMenu?.addEventListener('click', (e) => {
  const minus = e.target?.closest?.('.cart-minus');
  const plus  = e.target?.closest?.('.cart-plus');
  const remove= e.target?.closest?.('.cart-remove');
  if (!minus && !plus && !remove) return;
  e.preventDefault();
  const wrap = e.target.closest('.cart-item');
  const pid = Number(wrap?.dataset.pid);
  const item = CART.find(i => i.product_id === pid);
  if (!item && !remove) return;
  if (minus && item) item.qty = Math.max(1, item.qty - 1);
  if (plus && item)  item.qty = Math.min(99, item.qty + 1);
  if (remove) {
    const idx = CART.findIndex(i => i.product_id === pid);
    if (idx >= 0) CART.splice(idx, 1);
  }
  try { saveCartToStorage(); updateCartBadge(); } catch(_) {}
  renderCartMenu();
});
// Guard: Pay requires login
cartMenu?.addEventListener('click', (e) => {
  const pay = e.target?.closest?.('#payBtn');
  if (!pay) return;
  if (!SESSION.logged_in) {
    e.preventDefault();
    try { cartMenu?.classList.remove('open'); cartBtn?.setAttribute('aria-expanded','false'); } catch(_) {}
    document.getElementById('loginModal')?.classList.remove('hidden');
  }
});
cartBtn?.addEventListener("click", (e) => {
  // Si el click viene desde dentro del menú, no togglear ni cerrar
  if (cartMenu && cartMenu.contains(e.target)) {
    // Permitir navegación en enlaces internos (ej. Pagar)
    try { saveCartToStorage(); } catch (_) {}
    return;
  }
  e.preventDefault();
  renderCartMenu();
  cartMenu?.classList.toggle("open");
  const isOpen = cartMenu?.classList.contains("open");
  cartBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
});

// Evitar que los clics/inputs dentro del menú burbujeen al botón del carrito
cartMenu?.addEventListener('click', (e) => { e.stopPropagation(); });
cartMenu?.addEventListener('input', (e) => { e.stopPropagation(); });

// Cerrar el carrito al hacer clic fuera (los clics dentro del menú no cuentan)
document.addEventListener("click", (e) => {
  if (!cartMenu || !cartBtn) return;
  // Si el clic fue dentro del menú o sobre el botón del carrito, no cerrar
  if (cartMenu.contains(e.target) || cartBtn.contains(e.target)) return;
  cartMenu.classList.remove("open");
  cartBtn.setAttribute("aria-expanded", "false");
});

// Cerrar carrito con tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    cartMenu?.classList.remove("open");
    cartBtn?.setAttribute("aria-expanded", "false");
  }
});
// Garantiza que el enlace "Ingresar" abra el modal incluso si DOMContentLoaded ya pasÃ³ (pÃ¡ginas internas)
(function ensureLoginLinkWired(){
  try {
    const links = Array.from(profileMenu?.querySelectorAll("a") || []);
    const loginLink = links.find(a => a.textContent?.trim().toLowerCase().includes("ingresar"));
    if (loginLink && !loginLink._wired) {
      loginLink._wired = true;
      loginLink.addEventListener("click", (e) => {
        e.preventDefault();
        document.getElementById("loginModal")?.classList.remove("hidden");
      });
    }
  } catch (_) {}
})();

// Abre login modal si ?login=1 estÃ¡ en la URL (para redirecciones desde pÃ¡ginas protegidas)
(function ensureLoginParam(){
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("login") === "1") {
      document.getElementById("loginModal")?.classList.remove("hidden");
    }
  } catch (_) {}
})();
// Refresca al cargar
refreshSessionUI();

// (Eliminado handler duplicado que abrÃ­a siempre el modal de login)

// Abrir Register desde Login (soporta múltiples enlaces con el mismo id)
Array.from(document.querySelectorAll('#openRegister')).forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    loginModal.classList.add("hidden");
    registerModal.classList.remove("hidden");
  });
});

// Abrir Login desde Register (soporta múltiples enlaces con el mismo id)
Array.from(document.querySelectorAll('#openLogin')).forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
  });
});

// ===== Cerrar modales (versiÃ³n robusta, sin delegaciÃ³n global) =====
function closeModals() {
  loginModal.classList.add("hidden");
  registerModal.classList.add("hidden");
}

// Cerrar con botÃ³n X (listeners directos para evitar stopPropagation)
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
    // Permitimos que el botÃ³n [data-close] funcione
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

  alert("Cuenta creada con \u00E9xito. Bienvenido, " + (data.user.full_name || data.user.email || ""));
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

  alert("Bienvenido, " + (data.user.full_name || data.user.email || ""));
  await refreshSessionUI();
  closeModals();

// Configurar enlaces del men\u00FAº de perfil (Ingresar/Salir)
});

document.addEventListener("DOMContentLoaded", () => {
  // Si viene ?login=1 en la URL, abrir el modal de login (pÃ¡gina principal)
  try {
    const params = new URLSearchParams(location.search);
    if (params.get("login") === "1") {
      document.getElementById("loginModal")?.classList.remove("hidden");
    }
  } catch (_) {}
  const links = Array.from(profileMenu?.querySelectorAll("a") || []);
  const logoutLink = links.find(a => a.textContent?.trim().toLowerCase().includes("salir"));
  if (logoutLink) {
    if (IS_VENDER) {
      // En la pantalla de vender, deshabilitar logout para evitar errores
      logoutLink.addEventListener("click", (e) => {
        e.preventDefault();
        profileMenu?.classList.remove("open");
        profileBtn?.setAttribute("aria-expanded", "false");
      });
      // También ocultamos el item si es posible
      logoutLink.closest('li')?.setAttribute('hidden','true');
    } else {
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        try { await fetch("/backend/logout.php", { credentials: "include" }); } catch (_) {}
        await refreshSessionUI();
        profileMenu?.classList.remove("open");
        profileBtn?.setAttribute("aria-expanded", "false");
        document.getElementById("loginModal")?.classList.remove("hidden");
      });
    }
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
// removed duplicate CART declaration

async function loadProducts() {
  const res = await fetch("/backend/get_products.php");
  const products = await res.json();
  ALL_PRODUCTS = products || [];

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

// Inicializa carrito desde localStorage antes de pintar UI
try { loadCartFromStorage(); } catch(_) {}
loadProducts();
try { updateCartBadge(); } catch(_) {}

// Agregar al carrito (requiere sesión iniciada)
document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-to-cart]");
  if (!btn) return;

  // Bloquear si no hay sesión iniciada
  if (!SESSION || !SESSION.logged_in) {
    e.preventDefault();
    // Mostrar modal de login si existe en la página
    try { document.getElementById("loginModal")?.classList.remove("hidden"); } catch(_) {}
    // Fallback: redirigir para mostrar el login si la página no tiene el modal
    try {
      if (!document.getElementById("loginModal")) {
        const url = new URL(location.href);
        if (!url.searchParams.get('login')) {
          url.searchParams.set('login','1');
          location.href = url.toString();
        }
      }
    } catch (_) {}
    return;
  }

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

  btn.textContent = "Agregado \u2713";
  setTimeout(() => (btn.textContent = "Agregar al carrito"), 1000);
  try { saveCartToStorage(); updateCartBadge(); renderCartMenu(); } catch(_) {}
});

// Wire up search events
if (searchInput && searchForm){
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim();
    if (q.length < 2){ searchSuggest && (searchSuggest.style.display='none'); return; }
    const rs = searchProducts(q).slice(0,6);
    renderSuggestions(rs);
  });
  searchInput.addEventListener('blur', () => setTimeout(()=>{ if (searchSuggest) searchSuggest.style.display='none'; }, 150));
  // Click en la lupa: renderiza resultados inmediatamente
  const searchBtn = searchForm.querySelector('button[type="submit"]');
  if (searchBtn){
    searchBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const q = searchInput.value.trim();
      if (!q) return;
      const rs = searchProducts(q);
      renderSearchResults(rs);
    });
  }
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchInput.value.trim();
    if (!q) return;
    const rs = searchProducts(q);
    renderSearchResults(rs);
  });
}

// Inicializar filtros por categoría en todas las páginas con barra de categorías
try { wireCategoryFilters(); } catch(_) {}

/* ==========================================================
   COMPRAR (CREAR ORDEN + GUARDAR PAGO)
========================================================== */
async function comprar() {
  if (CART.length === 0) return;

  const buyer_id = 2; // luego sustituir por sesiÃ³n

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

  alert("Compra realizada"); CART.length = 0; try { saveCartToStorage(); updateCartBadge(); renderCartMenu(); } catch(_) {}
}

// Icono del carrito ejecuta la compra (demo)
// cart icon handler moved to cartBtn listener














