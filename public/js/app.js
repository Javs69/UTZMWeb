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
const actionsNav   = typeof document !== 'undefined' ? document.querySelector('.actions') : null;
const loginErrorBox = document.getElementById("loginError");
const registerErrorBox = document.getElementById("registerError");

const GUEST_AVATAR = "/public/uploads/blank-profile.png";
const IS_VENDER = typeof location !== 'undefined' && /\/vender\.html$/i.test(location.pathname || '');
const CART_STORAGE_KEY = 'CART';
const FAV_STORAGE_KEY = 'FAVS';
const USER_KEY = 'USER_ID';
const GUEST_ID = 'GUEST';

// Año en el footer
try { document.getElementById('year') && (document.getElementById('year').textContent = String(new Date().getFullYear())); } catch(_) {}

let SESSION = { logged_in: false, user: null };
let ALL_PRODUCTS = [];
const CART = []; // { product_id, name, price_cents, qty, seller_id }
const FAVS = []; // { product_id, name, price_cents, image }
const THEME_KEY = 'THEME';
let messagesNavLink = null;
let ordersNavLink = null;
let favBtn = null;
let favMenu = null;
const isFavorite = (id)=> FAVS.some(f => Number(f.product_id) === Number(id));
let CART_LOADED = false;
let FAV_LOADED = false;
const CATEGORY_IDS = {
  electronica: 1,
  papeleria: 2,
  vehiculos: 3,
  electrodomesticos: 4,
  moda: 5,
  juegos: 6,
  salud: 7
};
const getSessionUserId = () => (SESSION?.user?.id != null ? String(SESSION.user.id) : '');
function getStoredUserId(){
  try { return localStorage.getItem(USER_KEY) || ''; } catch(_) { return ''; }
}
function resolveUserForStorage(){
  const sessionUser = getSessionUserId();
  if (sessionUser) return sessionUser;
  const stored = getStoredUserId();
  return stored || GUEST_ID;
}

function readStoreMap(key){
  try{
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)){
      return { [GUEST_ID]: parsed };
    }
    if (parsed && typeof parsed === 'object') return parsed;
  }catch(_){}
  return {};
}
function writeStoreMap(key, map){
  try{
    localStorage.setItem(key, JSON.stringify(map || {}));
  }catch(_){}
}

function setModalMessage(box, message = '', variant = 'error'){
  if (!box) return;
  box.textContent = message || '';
  box.classList.remove('is-error','is-success');
  if (!message){
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  box.classList.add(variant === 'success' ? 'is-success' : 'is-error');
}

function resetAuthMessages(){
  setModalMessage(loginErrorBox);
  setModalMessage(registerErrorBox);
}

function loadCartFromStorage(){
  try{
    const map = readStoreMap(CART_STORAGE_KEY);
    const currentUser = getSessionUserId() || getStoredUserId() || GUEST_ID;
    let arr = Array.isArray(map[currentUser]) ? map[currentUser] : [];
    if (!arr.length && currentUser !== GUEST_ID && Array.isArray(map[GUEST_ID]) && map[GUEST_ID].length){
      // Migra datos guardados como invitado hacia el usuario actual
      arr = map[GUEST_ID];
      map[currentUser] = arr;
      map[GUEST_ID] = [];
      writeStoreMap(CART_STORAGE_KEY, map);
    }
    CART.splice(0, CART.length, ...arr);
    localStorage.setItem(USER_KEY, currentUser);
  }catch(_){ }
  CART_LOADED = true;
}
function saveCartToStorage(items){
  try{
    const currentUser = resolveUserForStorage();
    const map = readStoreMap(CART_STORAGE_KEY);
    map[currentUser] = Array.isArray(items) ? items : CART;
    localStorage.setItem(USER_KEY, currentUser);
    writeStoreMap(CART_STORAGE_KEY, map);
  }catch(_){ }
}

function loadFavsFromStorage(){
  try{
    const map = readStoreMap(FAV_STORAGE_KEY);
    const currentUser = getSessionUserId() || getStoredUserId() || GUEST_ID;
    let arr = Array.isArray(map[currentUser]) ? map[currentUser] : [];
    if (!arr.length && currentUser !== GUEST_ID && Array.isArray(map[GUEST_ID]) && map[GUEST_ID].length){
      // Migra favoritos de invitado al usuario actual
      arr = map[GUEST_ID];
      map[currentUser] = arr;
      map[GUEST_ID] = [];
      writeStoreMap(FAV_STORAGE_KEY, map);
    }
    FAVS.splice(0, FAVS.length, ...arr);
    localStorage.setItem(USER_KEY, currentUser);
  }catch(_){}
  FAV_LOADED = true;
}
function saveFavsToStorage(items){
  try{
    const currentUser = resolveUserForStorage();
    const map = readStoreMap(FAV_STORAGE_KEY);
    map[currentUser] = Array.isArray(items) ? items : FAVS;
    localStorage.setItem(USER_KEY, currentUser);
    writeStoreMap(FAV_STORAGE_KEY, map);
  }catch(_){}
}


function migrateGuestDataToUser(){
  const uid = getSessionUserId();
  if (!uid || uid === GUEST_ID) return;
  // Carrito
  try{
    const cartMap = readStoreMap(CART_STORAGE_KEY);
    if (Array.isArray(cartMap[GUEST_ID]) && cartMap[GUEST_ID].length){
      cartMap[uid] = Array.isArray(cartMap[uid]) && cartMap[uid].length ? cartMap[uid] : cartMap[GUEST_ID];
      cartMap[GUEST_ID] = [];
      writeStoreMap(CART_STORAGE_KEY, cartMap);
    }
  }catch(_){ }
  // Favoritos
  try{
    const favMap = readStoreMap(FAV_STORAGE_KEY);
    if (Array.isArray(favMap[GUEST_ID]) && favMap[GUEST_ID].length){
      favMap[uid] = Array.isArray(favMap[uid]) && favMap[uid].length ? favMap[uid] : favMap[GUEST_ID];
      favMap[GUEST_ID] = [];
      writeStoreMap(FAV_STORAGE_KEY, favMap);
    }
  }catch(_){ }
}

function resetLocalDataForGuest(){
  try{
    const cartMap = readStoreMap(CART_STORAGE_KEY);
    cartMap[GUEST_ID] = [];
    writeStoreMap(CART_STORAGE_KEY, cartMap);
    const favMap = readStoreMap(FAV_STORAGE_KEY);
    favMap[GUEST_ID] = [];
    writeStoreMap(FAV_STORAGE_KEY, favMap);
  }catch(_){}
  CART.splice(0, CART.length);
  FAVS.splice(0, FAVS.length);
  try { updateCartBadge(); renderCartMenu(); renderFavMenu(); } catch(_){}
}

function ensureMessagesLinkEl(){
  if (messagesNavLink || !actionsNav) return messagesNavLink;
  messagesNavLink = document.createElement('a');
  messagesNavLink.href = '/mensajes.html';
  messagesNavLink.className = 'link';
  messagesNavLink.id = 'messagesNavLink';
  messagesNavLink.textContent = 'Mensajes';
  messagesNavLink.style.display = 'none';
  return messagesNavLink;
}

function ensureFavoritesWidget(){
  if (!actionsNav) return;
  if (favBtn && favMenu) return;
  const wrap = document.createElement('div');
  wrap.className = 'icon-btn';
  wrap.id = 'favBtn';
  wrap.setAttribute('role','button');
  wrap.setAttribute('aria-label','Favoritos');
  wrap.setAttribute('tabindex','0');
  wrap.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.35-7-10a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 5.65-7 10-7 10s-1 .65-2 0Z"/></svg>
    <span id="favBadge" class="badge hidden"></span>
    <div id="favMenu" class="cart-menu" role="menu" aria-label="Favoritos">
      <div class="cart-empty">No tienes favoritos</div>
    </div>
  `;
  favBtn = wrap;
  favMenu = wrap.querySelector('#favMenu');
  const cart = actionsNav.querySelector('#cartBtn');
  if (cart){
    actionsNav.insertBefore(wrap, cart);
  } else {
    actionsNav.appendChild(wrap);
  }
}

function renderFavMenu(){
  ensureFavoritesWidget();
  if (!favMenu) return;
  if (!FAVS.length){
    favMenu.innerHTML = '<div class="cart-empty">No tienes favoritos</div>';
    const badge = document.getElementById('favBadge');
    badge?.classList.add('hidden');
    return;
  }
  const badge = document.getElementById('favBadge');
  if (badge){
    badge.textContent = String(FAVS.length);
    badge.classList.remove('hidden');
  }
  favMenu.innerHTML = `
    <div class="cart-list">
      ${FAVS.map(f => `
        <div class="cart-item" data-favid="${f.product_id}">
          <div class="cart-line" style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
            <a href="/producto.html?id=${f.product_id}" class="cart-name" style="flex:1 1 auto;">${f.name}</a>
            <button class="cart-remove" data-remove-fav="${f.product_id}" aria-label="Quitar favorito" title="Quitar" style="background:none;border:none;color:#d84e4e;font-weight:700;font-size:18px;cursor:pointer">&times;</button>
          </div>
          <div class="cart-price">${(f.price_cents/100).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function syncFavButtons(pid){
  const buttons = document.querySelectorAll('[data-fav-toggle]');
  buttons.forEach(btn => {
    const isThis = Number(btn.dataset.productId) === Number(pid);
    const active = isFavorite(btn.dataset.productId);
    btn.classList.toggle('is-active', active);
    btn.textContent = active ? '♥' : '♡';
  });
}
function mountMessagesLink(){
  const link = ensureMessagesLinkEl();
  if (!link || !actionsNav) return;
  link.style.display = 'inline-block';
  if (!link.isConnected){
    const profile = actionsNav.querySelector('.profile');
    const cart = actionsNav.querySelector('#cartBtn');
    const orders = actionsNav.querySelector('#ordersNavLink');
    const fav = actionsNav.querySelector('#favBtn');
    if (orders && orders.isConnected){
      actionsNav.insertBefore(link, orders);
    } else if (fav && fav.isConnected){
      actionsNav.insertBefore(link, fav);
    } else if (cart) {
      actionsNav.insertBefore(link, cart);
    } else if (profile) {
      actionsNav.insertBefore(link, profile);
    } else {
      actionsNav.appendChild(link);
    }
  }
}
function unmountMessagesLink(){
  if (messagesNavLink){
    messagesNavLink.style.display = 'none';
    try { messagesNavLink.remove(); } catch(_) {}
  }
}

function ensureOrdersLinkEl(){
  if (ordersNavLink || !actionsNav) return ordersNavLink;
  ordersNavLink = document.createElement('a');
  ordersNavLink.href = '/pedidos.html';
  ordersNavLink.className = 'link';
  ordersNavLink.id = 'ordersNavLink';
  ordersNavLink.textContent = 'Pedidos';
  return ordersNavLink;
}
function mountOrdersLink(){
  const link = ensureOrdersLinkEl();
  if (!link || !actionsNav) return;
  link.style.display = 'inline-block';
  if (!link.isConnected){
    const profile = actionsNav.querySelector('.profile');
    const cart = actionsNav.querySelector('#cartBtn');
    const msgs = ensureMessagesLinkEl();
    if (msgs && msgs.isConnected){
      actionsNav.insertBefore(link, msgs.nextSibling);
    } else if (document.getElementById('favBtn')) {
      actionsNav.insertBefore(link, document.getElementById('favBtn'));
    } else if (cart) {
      actionsNav.insertBefore(link, cart);
    } else if (profile) {
      actionsNav.insertBefore(link, profile);
    } else {
      actionsNav.appendChild(link);
    }
  }
}
function unmountOrdersLink(){
  if (ordersNavLink){
    ordersNavLink.style.display = 'none';
    try { ordersNavLink.remove(); } catch(_) {}
  }
}

function applyTheme(v){
  const t = (v === 'dark') ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
  try{ localStorage.setItem(THEME_KEY, t); }catch(_){}
  const toggler = document.getElementById('themeToggle');
  if (toggler){
    toggler.dataset.theme = t;
    toggler.querySelector('.theme-toggle__label').textContent = t === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }
}
function ensureThemeToggle(){
  if (!actionsNav) return;
  if (document.getElementById('themeToggle')) return;
  const btn = document.createElement('button');
  btn.id = 'themeToggle';
  btn.className = 'theme-toggle';
  btn.type = 'button';
  btn.innerHTML = '<span class="theme-toggle__label">Modo oscuro</span><span class="theme-toggle__knob" aria-hidden="true"></span>';
  const saved = (()=>{ try { return localStorage.getItem(THEME_KEY); } catch(_) { return null; }})();
  applyTheme(saved || 'light');
  btn.addEventListener('click', () => {
    const next = (document.documentElement.dataset.theme === 'dark') ? 'light' : 'dark';
    applyTheme(next);
  });
  actionsNav.appendChild(btn);
}

// ====== Buscador (con sinónimos básicos tipo "mini IA") ======
const searchInput = document.getElementById('searchInput');
const searchSuggest = document.getElementById('searchSuggest');
const searchForm = document.querySelector('form.search');
const isHomePage = () => {
  const path = (location.pathname || '').replace(/\/+$/, '');
  return path === '' || path === '/' || path.endsWith('/index.html');
};

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
  'papeleria': ['papelería','libreta','cuaderno','pluma','boligrafo','bolígrafo','marcador','lapiz','lápiz','hojas','papel','folder'],
  'tv': ['televisor','pantalla','monitor','smart tv','smarttv'],
  'audio': ['bocina','bocinas','parlante','parlantes','audifono','audifonos','auricular','auriculares','headset','microfono','microfonos','sonido','bafle'],
  'consola': ['playstation','ps5','ps4','xbox','nintendo','switch','gamepad','joystick'],
  'monitor': ['pantalla','display','televisor'],
  'impresora': ['printer','multifuncional'],
  'tablet': ['ipad','galaxy tab'],
  'router': ['modem','wifi','inalambrico'],
  'teclado': ['keyboard','mecanico','mouse','raton'],
  'camara': ['camera','fotografia','foto','webcam','gopro','drone','dron']
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

async function fetchProducts(opts = {}){
  const { query = '', categoryId = null } = opts;
  try{
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (categoryId) params.set('category', String(categoryId));
    const url = params.toString() ? `/backend/get_products.php?${params}` : '/backend/get_products.php';
    const res = await fetch(url);
    const products = await res.json();
    if (!query && !categoryId) ALL_PRODUCTS = products || [];
    return Array.isArray(products) ? products : [];
  }catch(_){
    return [];
  }
}

async function renderResultsForQuery(query, opts = {}){
  const q = (query || '').trim();
  const rawCat = opts.categoryId;
  const hasCategory = rawCat !== undefined && rawCat !== null && rawCat !== '';
  const categoryId = hasCategory ? Number(rawCat) : null;

  if (!ALL_PRODUCTS.length){
    try { await fetchProducts(); } catch(_){}
  }

  let rs = q ? searchProducts(q) : [...ALL_PRODUCTS];
  if (categoryId){
    rs = rs.filter(p => Number(p.category_id) === Number(categoryId));
    if (!rs.length){
      try{
        const apiRs = await fetchProducts({ query: q, categoryId });
        if (Array.isArray(apiRs) && apiRs.length) rs = apiRs;
      }catch(_){}
    }
  }

  renderSearchResults(rs);
  if (searchInput && q) searchInput.value = q;
  try{
    const url = new URL(location.href);
    if (q) url.searchParams.set('q', q); else url.searchParams.delete('q');
    if (categoryId) url.searchParams.set('category', categoryId); else url.searchParams.delete('category');
    history.replaceState({}, '', url.toString());
  }catch(_){}
}

function goToSearchPage(query, opts = {}){
  const q = (query || '').trim();
  const rawCat = opts.categoryId;
  const hasCategory = rawCat !== undefined && rawCat !== null && rawCat !== '';
  const categoryId = hasCategory ? Number(rawCat) : null;
  if (!q && !categoryId) return;
  if (searchSuggest) searchSuggest.style.display = 'none';
  if (isHomePage()){
    renderResultsForQuery(q, { categoryId });
    return;
  }
  const url = new URL('index.html', location.href);
  if (q) url.searchParams.set('q', q);
  if (categoryId) url.searchParams.set('category', categoryId);
  location.href = url.toString();
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
    try{
      const url = new URL(location.href);
      url.searchParams.delete('q');
      url.searchParams.delete('category');
      history.replaceState({}, '', url.toString());
    }catch(_){}
  });
  return sec;
}

function renderSearchResults(items){
  const sec = ensureResultsSection();
  if (!sec) return;
  const grid = sec.querySelector('#search-results');
  grid.innerHTML = '';
  grid.className = 'carousel-host';
  if (!items.length){
    grid.innerHTML = '<div>No se encontraron productos.</div>';
  } else {
    const win = document.createElement('div');
    win.className = 'carousel-window';
    const track = document.createElement('div');
    track.className = 'carousel-track';
    items.forEach(p => {
      const price = (p.price_cents / 100).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN",
      });
      const favActive = isFavorite(p.id);
      const card = document.createElement('article');
      card.className = 'card card--uniform card--carousel';
      card.innerHTML = `
        <div class="card-top">
          <button class="btn-fav${favActive ? ' is-active' : ''}" data-fav-toggle
            data-product-id="${p.id}"
            data-title="${p.name}"
            data-price="${p.price_cents}"
            aria-label="Agregar a favoritos">${favActive ? '♥' : '♡'}</button>
        </div>
        <a href="/producto.html?id=${p.id}" class="card-media">
          <img src="${p.image || "https://picsum.photos/seed/" + p.id + "/600/400"}" alt="${p.name}">
        </a>
        <div class="card-body">
          <h3 class="card-title"><a href="/producto.html?id=${p.id}" class="link" style="text-decoration:none; color:inherit">${p.name}</a></h3>
          <div class="price"><span class="now">${price}</span></div>
        </div>
        <div class="card-actions">
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
      track.appendChild(card);
    });
    win.appendChild(track);
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    const prev = document.createElement('button');
    prev.className = 'carousel-btn prev';
    prev.type = 'button';
    prev.innerHTML = '‹';
    const next = document.createElement('button');
    next.className = 'carousel-btn next';
    next.type = 'button';
    next.innerHTML = '›';
    controls.appendChild(prev);
    controls.appendChild(next);
    grid.appendChild(win);
    grid.appendChild(controls);
    const scrollBy = () => Math.max(win.clientWidth * 0.9, 280);
    prev.addEventListener('click', () => {
      win.scrollBy({ left: -scrollBy(), behavior: 'smooth' });
    });
    next.addEventListener('click', () => {
      win.scrollBy({ left: scrollBy(), behavior: 'smooth' });
    });
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
      goToSearchPage(p.name);
    });
    searchSuggest.appendChild(li);
  });
  searchSuggest.style.display = 'block';
}

// ====== Categorías: filtrar productos al hacer clic ======
function categoryFilterFromText(txt){
  const t = normalize(txt || '');
  if (t.includes('electrodom')) return { categoryId: CATEGORY_IDS.electrodomesticos, query: '' };
  if (t.includes('papeler')) return { categoryId: CATEGORY_IDS.papeleria, query: '' };
  if (t.includes('veh')) return { categoryId: CATEGORY_IDS.vehiculos, query: '' };
  if (t.includes('moda')) return { categoryId: CATEGORY_IDS.moda, query: '' };
  if (t.includes('electr')) return { categoryId: CATEGORY_IDS.electronica, query: '' };
  if (t.includes('juego') || t.includes('juguet')) return { categoryId: CATEGORY_IDS.juegos, query: '' };
  if (t.includes('salud') || t.includes('m\u00e9dico') || t.includes('medico')) return { categoryId: CATEGORY_IDS.salud, query: '' };
  return { categoryId: 0, query: t };
}

function wireCategoryFilters(){
  const catNav = document.getElementById('catNav');
  if (!catNav) return;
  // Links simples
  catNav.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const { categoryId, query } = categoryFilterFromText(a.textContent || '');
      const qText = Number(categoryId) > 0 ? '' : (query || (a.textContent || '').trim());
      goToSearchPage(qText, { categoryId });
    });
  });
  // Botón de categoría destacada (Electrónica)
  catNav.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const { categoryId, query } = categoryFilterFromText(btn.textContent || '');
      const qText = Number(categoryId) > 0 ? '' : (query || (btn.textContent || '').trim());
      goToSearchPage(qText, { categoryId });
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

  if (SESSION.logged_in) {
    migrateGuestDataToUser();
    try {
      const uid = getSessionUserId();
      if (uid) localStorage.setItem(USER_KEY, uid);
    } catch(_){}
  }

  mountMessagesLink();
  mountOrdersLink();
  ensureFavoritesWidget();

  if (!SESSION.logged_in) {
    profileLabel.textContent = "Iniciar sesión";
    avatarImg.src = GUEST_AVATAR;
    profileBtn.setAttribute("aria-expanded", "false");
    profileMenu?.classList.remove("open");
    const _linksOut = Array.from(profileMenu?.querySelectorAll("a") || []);
    const _loginItemOut = _linksOut.find(a => a.textContent?.trim().toLowerCase().includes("ingresar"))?.closest("li");
    const _logoutItemOut = _linksOut.find(a => a.hasAttribute('data-logout') || a.textContent?.trim().toLowerCase().includes("cerrar") || a.textContent?.trim().toLowerCase().includes("salir"))?.closest("li");
    const _sellItemOut = _linksOut.find(a => a.textContent?.trim().toLowerCase().includes("vender"))?.closest("li");
    if (_loginItemOut) _loginItemOut.hidden = false;
    if (_logoutItemOut) _logoutItemOut.hidden = true;
    if (_sellItemOut) _sellItemOut.hidden = true;
    return;
  }

  const name = SESSION.user?.full_name || SESSION.user?.email || "Cuenta";
  profileLabel.textContent = name;
  const avatar = SESSION.user?.avatar_url || GUEST_AVATAR;
  avatarImg.src = avatar;
  const _linksIn = Array.from(profileMenu?.querySelectorAll("a") || []);
  const _loginItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("ingresar"))?.closest("li");
  const _logoutItemIn = _linksIn.find(a => a.hasAttribute('data-logout') || a.textContent?.trim().toLowerCase().includes("cerrar") || a.textContent?.trim().toLowerCase().includes("salir"))?.closest("li");
  const _sellItemIn = _linksIn.find(a => a.textContent?.trim().toLowerCase().includes("vender"))?.closest("li");
  if (_loginItemIn) _loginItemIn.hidden = true;
  if (_logoutItemIn) _logoutItemIn.hidden = IS_VENDER ? true : false;
  if (_sellItemIn) _sellItemIn.hidden = false;

  ensureMessagesFeatureVisibility();
  mountOrdersLink();
  ensureFavoritesWidget();

  CART_LOADED = false;
  FAV_LOADED = false;
  loadCartFromStorage();
  loadFavsFromStorage();
  updateCartBadge();
  renderCartMenu();
  renderFavMenu();
}// Click en el botÃ³n de perfil
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

// Favoritos: toggle
document.addEventListener('click', (e) => {
  const favToggle = e.target.closest('[data-fav-toggle]');
  if (!favToggle) return;
  const pid = Number(favToggle.dataset.productId);
  const existing = FAVS.find(f => f.product_id === pid);
  if (existing){
    const idx = FAVS.indexOf(existing);
    if (idx >= 0) FAVS.splice(idx,1);
  } else {
    FAVS.push({
      product_id: pid,
      name: favToggle.dataset.title,
      price_cents: Number(favToggle.dataset.price) || 0
    });
  }
  try{ saveFavsToStorage(); renderFavMenu(); }catch(_){}
  syncFavButtons(pid);
});

// Toggle menú favoritos
document.addEventListener('click', (e) => {
  if (!favBtn || !favMenu) return;
  if (favBtn.contains(e.target)){
    favMenu.classList.toggle('open');
  } else if (!favMenu.contains(e.target)){
    favMenu.classList.remove('open');
  }
});

favMenu?.addEventListener('click', (e)=>{
  const rm = e.target.closest('[data-remove-fav]');
  if (!rm) return;
  const pid = Number(rm.dataset.removeFav);
  const idx = FAVS.findIndex(f => f.product_id === pid);
  if (idx >= 0){
    FAVS.splice(idx,1);
    try{ saveFavsToStorage(); renderFavMenu(); }catch(_){}
  }
});

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
// Tema
ensureThemeToggle();
// Refresca al cargar
refreshSessionUI();

// (Eliminado handler duplicado que abrÃ­a siempre el modal de login)

// Abrir Register desde Login (soporta múltiples enlaces con el mismo id)
Array.from(document.querySelectorAll('#openRegister')).forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    if (!loginModal || !registerModal) return;
    loginModal.classList.add("hidden");
    registerModal.classList.remove("hidden");
    resetAuthMessages();
  });
});

// Abrir Login desde Register (soporta múltiples enlaces con el mismo id)
Array.from(document.querySelectorAll('#openLogin')).forEach((el) => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    if (!registerModal || !loginModal) return;
    registerModal.classList.add("hidden");
    loginModal.classList.remove("hidden");
    resetAuthMessages();
  });
});

// ===== Cerrar modales (versiÃ³n robusta, sin delegaciÃ³n global) =====
function closeModals() {
  if (loginModal) loginModal.classList.add("hidden");
  if (registerModal) registerModal.classList.add("hidden");
  resetAuthMessages();
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
  setModalMessage(registerErrorBox);

  try {
    const res = await fetch("/backend/register.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ full_name, email, password }),
    });

    let data = {};
    try { data = await res.json(); } catch (_) { data = {}; }

    if (!res.ok || data.error) {
      setModalMessage(registerErrorBox, data.error || "No se pudo crear la cuenta. Intenta de nuevo.", "error");
      return;
    }

    const user = data.user || {};
    const name = user.full_name || user.email || full_name || email || "";
    setModalMessage(registerErrorBox, "Cuenta creada con \u00E9xito. Bienvenido, " + name, "success");

    try { await refreshSessionUI(); } catch (_) {}
    setTimeout(() => {
      closeModals();
      setModalMessage(registerErrorBox);
    }, 900);
  } catch (_) {
    setModalMessage(registerErrorBox, "No se pudo crear la cuenta. Intenta de nuevo.", "error");
  }
});

document.getElementById("loginSubmit")?.addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPass").value;
  setModalMessage(loginErrorBox);

  try {
    const res = await fetch("/backend/login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    let data = {};
    try { data = await res.json(); } catch(_) { data = {}; }

    // Si backend marca error o la respuesta no fue ok
    if (!res.ok || data.error || data.success === false) {
      setModalMessage(loginErrorBox, data.error || "Credenciales incorrectas", "error");
      return;
    }

    // Éxito: mostrar bienvenida y refrescar sesión en segundo plano
    const name = data.user?.full_name || data.user?.email || "";
    setModalMessage(loginErrorBox, "Bienvenido, " + name, "success");
    try { await refreshSessionUI(); } catch(_){}
    setTimeout(() => {
      closeModals();
      setModalMessage(loginErrorBox);
    }, 700);
  } catch (_) {
    setModalMessage(loginErrorBox, "Credenciales incorrectas", "error");
  }

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
  const logoutLink = links.find(a => a.hasAttribute('data-logout') || a.textContent?.trim().toLowerCase().includes("cerrar") || a.textContent?.trim().toLowerCase().includes("salir"));
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
          try { saveCartToStorage(); saveFavsToStorage(); } catch(_){}
          try { await fetch("/backend/logout.php", { credentials: "include" }); } catch (_) {}
          resetLocalDataForGuest();
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
  const products = await fetchProducts();
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
    card.className = "card card--uniform";
    const favActive = isFavorite(p.id);

    card.innerHTML = `
      <div class="card-top">
        <button class="btn-fav${favActive ? ' is-active' : ''}" data-fav-toggle
          data-product-id="${p.id}"
          data-title="${p.name}"
          data-price="${p.price_cents}"
          aria-label="Agregar a favoritos">${favActive ? '♥' : '♡'}</button>
      </div>
      <a href="/producto.html?id=${p.id}" class="card-media">
        <img src="${p.image || "https://picsum.photos/seed/" + p.id + "/600/400"}" alt="${p.name}">
      </a>
      <div class="card-body">
        <h3 class="card-title"><a href="/producto.html?id=${p.id}" class="link" style="text-decoration:none; color:inherit">${p.name}</a></h3>
        <div class="price"><span class="now">${price}</span></div>
      </div>
      <div class="card-actions">
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
try { loadFavsFromStorage(); } catch(_) {}
loadProducts();
try { updateCartBadge(); } catch(_) {}
try { renderFavMenu(); } catch(_) {}

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
      goToSearchPage(searchInput.value);
    });
  }
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    goToSearchPage(searchInput.value);
  });
}

if (searchInput && isHomePage()){
  const params = (()=>{ try { return new URLSearchParams(location.search); } catch(_){ return null; }})();
  const initialQuery = params ? (params.get('q') || '') : '';
  const initialCategory = params ? params.get('category') : null;
  if (initialQuery || initialCategory) renderResultsForQuery(initialQuery, { categoryId: initialCategory });
}

// Inicializar filtros por categoría en todas las páginas con barra de categorías
try { wireCategoryFilters(); } catch(_) {}

/* ==========================================================
   COMPRAR (CREAR ORDEN + GUARDAR PAGO)
========================================================== */
async function comprar(paymentMeta) {
  if (CART.length === 0) throw new Error('CART_EMPTY');
  if (!SESSION?.logged_in) throw new Error('NO_SESSION');
  const buyer_id = SESSION.user?.id;
  if (!buyer_id) throw new Error('NO_SESSION');

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
    if (order.error) throw new Error(order.error);

    const payPayload = {
      order_id: order.order_id,
      amount_cents: order.total_cents,
      payment_method_id: paymentMeta?.payment_method_id || 0,
      payment_method_type: paymentMeta?.type || 'card',
      payment_method_label: paymentMeta?.label || null,
      payment_method_last4: paymentMeta?.last4 || null,
      cvv: paymentMeta?.cvv || null,
    };
    const payRes = await fetch("/backend/pay_order.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payPayload),
    });
    const payData = await payRes.json();
    if (!payRes.ok || payData.error) throw new Error(payData.error || 'No se pudo registrar el pago');
  }

  alert("Compra realizada"); CART.length = 0; try { saveCartToStorage(); updateCartBadge(); renderCartMenu(); } catch(_) {}
}

// Icono del carrito ejecuta la compra (demo)
// cart icon handler moved to cartBtn listener




















