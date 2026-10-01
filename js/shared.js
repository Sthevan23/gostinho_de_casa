const G = (() => {
  const CART_KEY = "gostinho-cart";
  const USER_KEY = "gostinho-user";
  const ADDR_KEY = "gostinho-address";
  const API = (() => {
    const path = location.pathname || "/";
    if (path.includes("/admin/")) return path.replace(/\/admin\/.*$/, "/api/data.php");
    if (path.endsWith("/")) return path + "api/data.php";
    return path.replace(/\/[^/]*$/, "/api/data.php");
  })();

  let catalog = null;
  let catalogPromise = null;

  function formatBRL(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function onlyDigits(v) {
    return String(v || "").replace(/\D/g, "");
  }
  function formatPhone(value) {
    const d = onlyDigits(value).slice(0, 11);
    if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").trim();
    return d.replace(/(\d{2})(\d{5})(\d{0,4})/, "($1) $2-$3").trim();
  }
  function todayYMD() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }
  function addDaysYMD(ymd, days) {
    const [y, m, d] = ymd.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d + days));
    return date.toISOString().slice(0, 10);
  }
  function minOrderDateYMD(advance = 1) {
    return addDaysYMD(todayYMD(), Math.max(1, advance));
  }
  function formatDateBR(ymd) {
    if (!ymd) return "";
    const [y, m, d] = String(ymd).slice(0, 10).split("-");
    return `${d}/${m}/${y}`;
  }
  function slotLabel(s) {
    return s === "JANTAR" ? "Jantar" : "Almoço";
  }
  function priceOf(p) {
    if (p.promotional && p.promoPrice != null) return Number(p.promoPrice);
    return Number(p.price);
  }
  function qs(name) {
    return new URLSearchParams(location.search).get(name) || "";
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function loadCart() {
    try {
      const raw = localStorage.getItem(CART_KEY);
      const data = raw ? JSON.parse(raw) : { items: [], notes: "" };
      return { items: data.items || [], notes: data.notes || "" };
    } catch {
      return { items: [], notes: "" };
    }
  }
  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderChrome();
  }
  function cartTotals(items) {
    const count = items.reduce((s, i) => s + i.quantity, 0);
    const subtotal = items.reduce((s, i) => {
      const extras = (i.extras || []).reduce((e, x) => e + Number(x.price), 0);
      return s + (Number(i.price) + extras) * i.quantity;
    }, 0);
    return { count, subtotal };
  }
  function lineKey(item) {
    const extras = (item.extras || []).map((e) => e.id).sort().join(",");
    return `${item.productId}|${item.sizeId || ""}|${extras}|${item.notes || ""}`;
  }
  function addItem(item) {
    const cart = loadCart();
    const key = lineKey(item);
    const existing = cart.items.find((i) => lineKey(i) === key);
    if (existing) existing.quantity += item.quantity;
    else cart.items.push({ ...item, lineId: crypto.randomUUID() });
    saveCart(cart);
    toast("Adicionado à sacola");
  }
  function updateQty(lineId, qty) {
    const cart = loadCart();
    if (qty <= 0) cart.items = cart.items.filter((i) => i.lineId !== lineId);
    else cart.items = cart.items.map((i) => (i.lineId === lineId ? { ...i, quantity: qty } : i));
    saveCart(cart);
  }
  function clearCart() {
    saveCart({ items: [], notes: "" });
  }
  function setNotes(notes) {
    const cart = loadCart();
    cart.notes = notes;
    saveCart(cart);
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  }
  function setUser(user) {
    if (!user) localStorage.removeItem(USER_KEY);
    else localStorage.setItem(USER_KEY, JSON.stringify(user));
    renderChrome();
  }
  function getAddress() {
    try {
      return JSON.parse(localStorage.getItem(ADDR_KEY) || "null");
    } catch {
      return null;
    }
  }
  function setAddress(addr) {
    if (!addr) localStorage.removeItem(ADDR_KEY);
    else localStorage.setItem(ADDR_KEY, JSON.stringify(addr));
    renderChrome();
  }
  function favIds() {
    return getUser()?.favorites || JSON.parse(localStorage.getItem("gostinho-favs") || "[]");
  }
  function isFav(id) {
    return favIds().includes(id);
  }

  function toast(msg) {
    let el = document.getElementById("toast-pop");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast-pop";
      el.className = "toast-pop";
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }

  async function apiPost(body) {
    const headers = { "Content-Type": "application/json" };
    const user = getUser();
    if (user?.token) headers["X-Customer-Token"] = user.token;
    const res = await fetch(API, { method: "POST", headers, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Não foi possível concluir");
    return data;
  }
  async function apiGet(params) {
    const headers = {};
    const user = getUser();
    if (user?.token) headers["X-Customer-Token"] = user.token;
    const res = await fetch(API + "?" + params, { cache: "no-store", headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Erro");
    return data;
  }

  async function refreshUser() {
    const user = getUser();
    if (!user?.token) return null;
    try {
      const data = await apiGet("action=me");
      if (data.customer) {
        setUser(data.customer);
        return data.customer;
      }
    } catch {
      setUser(null);
    }
    return null;
  }

  async function toggleFav(productId) {
    const user = getUser();
    if (!user?.token) {
      toast("Entre na sua conta para favoritar");
      location.href = "/conta.html?next=" + encodeURIComponent(location.pathname + location.search);
      return false;
    }
    const out = await apiPost({ action: "toggle_favorite", productId });
    const next = { ...user, favorites: out.favorited ? [...favIds().filter((x) => x !== productId), productId] : favIds().filter((x) => x !== productId) };
    setUser(next);
    toast(out.favorited ? "Salvo nos favoritos" : "Removido dos favoritos");
    return out.favorited;
  }

  async function loadCatalog(force) {
    if (catalog && !force) return catalog;
    if (force) catalogPromise = null;
    if (catalogPromise && !force) return catalogPromise;
    catalogPromise = (async () => {
      if (!catalog && window.GOSTINHO_CATALOG && Array.isArray(window.GOSTINHO_CATALOG.products)) {
        catalog = window.GOSTINHO_CATALOG;
      }
      const tryUrl = async (url, ms) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), ms);
        try {
          const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
          if (!res.ok) return null;
          const data = await res.json();
          if (data && Array.isArray(data.products)) return data;
        } catch (_) {
        } finally {
          clearTimeout(timer);
        }
        return null;
      };
      const fresh =
        (await tryUrl("catalog.json?t=" + Date.now(), 4000)) ||
        (await tryUrl("/catalog.json?t=" + Date.now(), 4000)) ||
        (await tryUrl(API + "?t=" + Date.now(), 4000));
      if (fresh) catalog = fresh;
      if (!catalog) {
        catalog = {
          settings: { companyName: "Gostinho de Casa" },
          categories: [],
          products: [],
          promotions: [],
          reviews: [],
          zones: [],
        };
      }
      return catalog;
    })();
    return catalogPromise;
  }

  function waHref(phone, text) {
    const d = onlyDigits(phone);
    const withC = d.startsWith("55") ? d : "55" + d;
    return "https://wa.me/" + withC + (text ? "?text=" + encodeURIComponent(text) : "");
  }

  function productHref(p) {
    return "/produto/" + encodeURIComponent(p.slug || p.id);
  }

  function productCard(p) {
    const price = priceOf(p);
    const needs = (p.sizes && p.sizes.length) || (p.extras && p.extras.length);
    const href = productHref(p);
    const add = needs
      ? `<a class="add" href="${href}" aria-label="Ver produto">+</a>`
      : `<button class="add js-add" type="button" data-id="${p.id}" aria-label="Adicionar">+</button>`;
    return `<article class="dish">
      <div class="dish-media">
        <a href="${href}"><img src="${p.image || "/logo.png"}" alt="${esc(p.name)}" loading="lazy" /></a>
        ${p.promotional ? '<span class="tag">Promo</span>' : ""}
        ${p.stock <= 0 ? "" : add}
      </div>
      <a class="dish-info" href="${href}">
        <h3>${esc(p.name)}</h3>
        <p class="price">${p.promotional && p.promoPrice != null ? `<span class="old">${formatBRL(p.price)}</span>` : ""}${formatBRL(price)}</p>
      </a>
    </article>`;
  }

  function bindAdds(products) {
    document.querySelectorAll(".js-add").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const p = products.find((x) => x.id === btn.dataset.id);
        if (!p || p.stock <= 0) return;
        addItem({
          productId: p.id,
          name: p.name,
          image: p.image,
          price: priceOf(p),
          quantity: 1,
          extras: [],
        });
        btn.textContent = "✓";
        setTimeout(() => (btn.textContent = "+"), 700);
      });
    });
    document.querySelectorAll("[data-fav]").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await toggleFav(btn.dataset.fav);
        btn.classList.toggle("on");
        btn.textContent = btn.classList.contains("on") ? "♥" : "♡";
      });
    });
  }

  function pageKind() {
    const p = (location.pathname || "/").toLowerCase();
    if (p.includes("produto")) return "item";
    if (p.includes("cardapio") || p.includes("marmitas") || p.includes("promocoes") || p.includes("buscar")) return "cardapio";
    if (p.includes("carrinho") || p.includes("checkout")) return "sacola";
    if (p.includes("pedido")) return "pedidos";
    if (p.includes("favorit") || p.includes("conta")) return "pedidos";
    return "inicio";
  }

  function addressLabel() {
    const a = getAddress();
    if (a && (a.street || a.address)) {
      return `${a.street || a.address}${a.number || a.addressNumber ? ", " + (a.number || a.addressNumber) : ""}`;
    }
    const s = (catalog && catalog.settings) || {};
    return s.address || "Escolher endereço";
  }

  function renderChrome() {
    const data = catalog || { settings: {} };
    const s = data.settings || {};
    const cart = loadCart();
    const { count, subtotal } = cartTotals(cart.items);
    const days = s.minAdvanceDays || 1;
    const kind = pageKind();
    const header = document.getElementById("site-header");
    if (header) {
      header.innerHTML = `
        <div class="brand-bar">
          <a class="brand-lockup" href="/">
            <img src="${s.logo || "/logo.png"}" alt="" />
            <span>
              <strong>${esc(s.companyName || "Gostinho de Casa")}</strong>
              <small>Marmitas sob encomenda</small>
            </span>
          </a>
          <a class="icon-btn" href="/conta.html" aria-label="Conta">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><circle cx="10" cy="7" r="3"/><path d="M4 17c1.2-2.5 3.4-3.8 6-3.8S14.8 14.5 16 17"/></svg>
          </a>
          <a class="icon-btn" href="/carrinho.html" aria-label="Sacola">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7h15l-1.4 8H8L6 7z"/><path d="M6 7 5 4H2"/><circle cx="9" cy="18.5" r="1.2"/><circle cx="16.5" cy="18.5" r="1.2"/></svg>
            ${count ? `<span class="badge">${count}</span>` : ""}
          </a>
        </div>
        ${
          kind === "inicio"
            ? `<div class="header-search">
          <a class="search-pill" href="/cardapio.html">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="m16 16-3.5-3.5"/></svg>
            <span>Buscar marmitas, combos...</span>
          </a>
        </div>`
            : ""
        }`;
    }
    const footer = document.getElementById("site-footer");
    if (footer) {
      footer.innerHTML = `
        <div class="footer-grid">
          <div>
            <div class="brand"><img src="${s.logo || "/logo.png"}" alt="" /><strong>${s.companyName || ""}</strong></div>
            <p class="muted">${s.slogan || ""}</p>
          </div>
          <div>
            <p><b>Funcionamento</b></p>
            <p class="muted">${s.hours || ""}</p>
            <p class="muted">${s.address || ""}</p>
            <p class="muted">Encomenda com ${days} ${days === 1 ? "dia" : "dias"} de antecedência</p>
          </div>
          <div>
            <p><b>Contato</b></p>
            <p><a class="muted" href="${waHref(s.whatsapp || "", "Olá! Quero pedir no Gostinho de Casa.")}">Falar pelo WhatsApp</a></p>
            ${s.instagram ? `<p><a class="muted" href="${s.instagram}" target="_blank" rel="noreferrer">Instagram</a></p>` : ""}
            <p><a class="muted" href="/admin/login.html" style="font-size:.75rem">Painel administrativo</a></p>
          </div>
        </div>
        <div class="copy">© ${new Date().getFullYear()} ${s.companyName || "Gostinho de Casa"}</div>`;
    }
    let tab = document.getElementById("tabbar");
    if (!tab) {
      tab = document.createElement("nav");
      tab.id = "tabbar";
      tab.className = "tabbar";
      document.body.appendChild(tab);
    }
    const lastOrder = localStorage.getItem("gostinho-last-order") || "";
    const pedidosHref = lastOrder ? "/pedido.html?id=" + encodeURIComponent(lastOrder) : "/pedidos.html";
    tab.innerHTML = `
      <a class="${kind === "inicio" ? "on" : ""}" href="/">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z"/></svg>
        Início
      </a>
      <a class="${kind === "cardapio" || kind === "item" ? "on" : ""}" href="/cardapio.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 6h16M4 12h16M4 18h10"/></svg>
        Cardápio
      </a>
      <a class="${kind === "pedidos" ? "on" : ""}" href="${pedidosHref}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
        Pedidos
      </a>
      <a class="${kind === "sacola" ? "on" : ""}" href="/carrinho.html">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7h15l-1.4 8H8L6 7z"/><path d="M6 7 5 4H2"/></svg>
        Sacola
      </a>`;
    const wa = document.getElementById("wa-btn");
    if (wa && s.whatsapp) {
      wa.href = waHref(s.whatsapp, "Olá! Quero pedir no Gostinho de Casa.");
      wa.classList.add("show");
    }
    const bar = document.getElementById("cartbar");
    if (bar) {
      if (count > 0 && kind !== "sacola" && kind !== "item") {
        bar.classList.add("show");
        bar.innerHTML = `<span class="bag"><span class="count">${count}</span> Pedido</span><span>${formatBRL(subtotal)}</span>`;
      } else bar.classList.remove("show");
    }
  }

  async function boot(pageFn) {
    window.addEventListener("scroll", () => {
      document.querySelector("header.site")?.classList.toggle("scrolled", window.scrollY > 8);
    });
    document.body.dataset.page = pageKind();
    if (window.GOSTINHO_CATALOG && Array.isArray(window.GOSTINHO_CATALOG.products)) {
      catalog = window.GOSTINHO_CATALOG;
      renderChrome();
    }
    try {
      await loadCatalog(true);
    } catch (err) {
      console.error(err);
    }
    renderChrome();
    document.body.dataset.page = pageKind();
    refreshUser().catch(() => {});
    try {
      if (pageFn) await pageFn(catalog);
    } catch (err) {
      console.error(err);
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }

  return {
    API,
    formatBRL,
    formatPhone,
    onlyDigits,
    minOrderDateYMD,
    formatDateBR,
    slotLabel,
    priceOf,
    qs,
    esc,
    loadCart,
    saveCart,
    cartTotals,
    addItem,
    updateQty,
    clearCart,
    setNotes,
    loadCatalog,
    productCard,
    productHref,
    bindAdds,
    boot,
    waHref,
    toast,
    apiPost,
    apiGet,
    getUser,
    setUser,
    getAddress,
    setAddress,
    refreshUser,
    toggleFav,
    isFav,
    favIds,
  };
})();
