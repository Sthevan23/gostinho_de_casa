const G = (() => {
  const CART_KEY = "gostinho-cart";
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

  async function loadCatalog(force) {
    if (catalog && !force) return catalog;
    if (catalogPromise && !force) return catalogPromise;
    catalogPromise = (async () => {
      try {
        const res = await fetch(API + "?t=" + Date.now(), { cache: "no-store" });
        if (res.ok) {
          catalog = await res.json();
          return catalog;
        }
      } catch {}
      const res = await fetch("/catalog.json?t=" + Date.now(), { cache: "no-store" });
      catalog = await res.json();
      return catalog;
    })();
    return catalogPromise;
  }

  function waHref(phone) {
    const d = onlyDigits(phone);
    const withC = d.startsWith("55") ? d : "55" + d;
    return "https://wa.me/" + withC;
  }

  function productCard(p) {
    const price = priceOf(p);
    const needs = (p.sizes && p.sizes.length) || (p.extras && p.extras.length);
    const href = "/produto.html?id=" + encodeURIComponent(p.slug || p.id);
    const add = needs
      ? `<a class="add" href="${href}" aria-label="Ver produto">+</a>`
      : `<button class="add js-add" type="button" data-id="${p.id}" aria-label="Adicionar">+</button>`;
    return `<article class="dish">
      <a class="dish-info" href="${href}">
        <h3>${p.name}</h3>
        <p class="desc">${p.description || ""}</p>
        ${p.calories != null ? `<p class="kcal">${p.calories} kcal</p>` : ""}
        <p class="price">${p.promotional && p.promoPrice != null ? `<span class="old">${formatBRL(p.price)}</span>` : ""}${formatBRL(price)}</p>
      </a>
      <div class="dish-media">
        <a href="${href}"><img src="${p.image || "/logo.png"}" alt="" /></a>
        ${p.promotional ? '<span class="tag">Promo</span>' : ""}
        ${p.stock <= 0 ? "" : add}
      </div>
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
  }

  function pageKind() {
    const p = (location.pathname || "/").toLowerCase();
    if (p.includes("produto")) return "item";
    if (p.includes("cardapio")) return "cardapio";
    if (p.includes("carrinho") || p.includes("checkout")) return "sacola";
    if (p.includes("pedido")) return "pedidos";
    return "inicio";
  }

  function renderChrome() {
    const data = catalog;
    if (!data) return;
    const s = data.settings || {};
    const cart = loadCart();
    const { count, subtotal } = cartTotals(cart.items);
    const days = s.minAdvanceDays || 1;
    const kind = pageKind();
    const addr = s.address || "Escolher endereço";
    const header = document.getElementById("site-header");
    if (header) {
      header.innerHTML = `
        <div class="ifood-top">
          <a class="addr" href="/cardapio.html">
            <small>Entregar em</small>
            <strong>${addr} <span>▾</span></strong>
          </a>
          <a class="icon-btn" href="/carrinho.html" aria-label="Sacola">
            <svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7h15l-1.4 8H8L6 7z"/><path d="M6 7 5 4H2"/><circle cx="9" cy="18.5" r="1.2"/><circle cx="16.5" cy="18.5" r="1.2"/></svg>
            ${count ? `<span class="badge">${count}</span>` : ""}
          </a>
        </div>
        <div class="header-search">
          <a class="search-pill" href="/cardapio.html">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="8" r="6"/><path d="m16 16-3.5-3.5"/></svg>
            <span>Buscar no ${s.companyName || "Gostinho de Casa"}</span>
          </a>
        </div>`;
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
            <p><a class="muted" href="${waHref(s.whatsapp || "")}">WhatsApp</a></p>
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
    const pedidosHref = lastOrder ? "/pedido.html?id=" + encodeURIComponent(lastOrder) : "/pedido.html";
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
    if (wa && s.whatsapp) wa.href = waHref(s.whatsapp);
    const bar = document.getElementById("cartbar");
    if (bar) {
      if (count > 0 && kind !== "sacola") {
        bar.classList.add("show");
        bar.innerHTML = `<span class="bag"><span class="count">${count}</span> ver sacola</span><span>${formatBRL(subtotal)}</span>`;
      } else bar.classList.remove("show");
    }
  }

  async function boot(pageFn) {
    window.addEventListener("scroll", () => {
      document.querySelector("header.site")?.classList.toggle("scrolled", window.scrollY > 8);
    });
    await loadCatalog();
    renderChrome();
    document.body.dataset.page = pageKind();
    if (pageFn) await pageFn(catalog);
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
    loadCart,
    saveCart,
    cartTotals,
    addItem,
    updateQty,
    clearCart,
    setNotes,
    loadCatalog,
    productCard,
    bindAdds,
    boot,
    waHref,
  };
})();
