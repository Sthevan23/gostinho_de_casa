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
    return `<article class="product-card card-shadow">
      <a href="${href}" class="thumb">
        <img src="${p.image || "/logo.png"}" alt="${p.name}" />
        ${p.promotional ? '<span class="tag">Promoção</span>' : ""}
      </a>
      <div class="body">
        <h3>${p.name}</h3>
        <p class="desc">${p.description || ""}</p>
        ${p.calories != null ? `<p class="kcal">${p.calories} kcal</p>` : ""}
        <div class="row">
          <div>
            ${p.promotional && p.promoPrice != null ? `<p class="old">${formatBRL(p.price)}</p>` : ""}
            <p class="price">${formatBRL(price)}</p>
          </div>
          ${
            needs
              ? `<a class="add" href="${href}" aria-label="Ver produto">+</a>`
              : `<button class="add js-add" data-id="${p.id}" aria-label="Adicionar">+</button>`
          }
        </div>
      </div>
    </article>`;
  }

  function bindAdds(products) {
    document.querySelectorAll(".js-add").forEach((btn) => {
      btn.addEventListener("click", () => {
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
        setTimeout(() => (btn.textContent = "+"), 900);
      });
    });
  }

  function renderChrome() {
    const data = catalog;
    if (!data) return;
    const s = data.settings || {};
    const cart = loadCart();
    const { count, subtotal } = cartTotals(cart.items);
    const days = s.minAdvanceDays || 1;
    const header = document.getElementById("site-header");
    if (header) {
      header.innerHTML = `
        <p class="topbar">Pedidos por encomenda · peça com pelo menos ${days} ${days === 1 ? "dia" : "dias"} de antecedência</p>
        <div class="nav">
          <a class="brand" href="/">
            <img src="${s.logo || "/logo.png"}" alt="" />
            <div>
              <strong>${s.companyName || "Gostinho de Casa"}</strong>
              <small>marmitas artesanais</small>
            </div>
          </a>
          <nav class="nav-links">
            <a href="/">Início</a>
            <a href="/cardapio.html">Cardápio</a>
            <a href="/carrinho.html">Carrinho</a>
          </nav>
          <div style="display:flex;gap:.5rem;align-items:center">
            <a class="icon-btn card-shadow" href="/carrinho.html" aria-label="Carrinho">
              <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/><path d="M6 6 5 3H2"/></svg>
              ${count ? `<span class="badge">${count}</span>` : ""}
            </a>
            <button class="icon-btn card-shadow menu-toggle" type="button" aria-label="Menu">☰</button>
          </div>
        </div>
        <div class="menu-overlay" id="menu">
          <aside class="menu-panel" onclick="event.stopPropagation()">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
              <b>Menu</b>
              <button type="button" id="menu-close">✕</button>
            </div>
            <a href="/">Início</a>
            <a href="/cardapio.html">Cardápio</a>
            <a href="/carrinho.html">Carrinho</a>
            <a href="/admin/login.html" class="muted">Área administrativa</a>
            ${count ? `<a class="btn btn-leaf" href="/carrinho.html" style="margin-top:2rem">${count} itens · ${formatBRL(subtotal)}</a>` : ""}
          </aside>
        </div>`;
      const overlay = header.querySelector("#menu");
      header.querySelector(".menu-toggle")?.addEventListener("click", () => overlay.classList.add("open"));
      header.querySelector("#menu-close")?.addEventListener("click", () => overlay.classList.remove("open"));
      overlay?.addEventListener("click", () => overlay.classList.remove("open"));
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
          </div>
          <div>
            <p><b>Contato</b></p>
            <p><a class="muted" href="${waHref(s.whatsapp || "")}">WhatsApp</a></p>
            ${s.instagram ? `<p><a class="muted" href="${s.instagram}" target="_blank" rel="noreferrer">Instagram</a></p>` : ""}
            <p><a class="muted" href="/admin/login.html" style="font-size:.75rem">Painel administrativo</a></p>
          </div>
        </div>
        <div class="copy">© ${new Date().getFullYear()} ${s.companyName || "Gostinho de Casa"}. Comida de verdade, feita com carinho.</div>`;
    }
    const wa = document.getElementById("wa-btn");
    if (wa && s.whatsapp) wa.href = waHref(s.whatsapp);
    const bar = document.getElementById("cartbar");
    if (bar) {
      if (count > 0) {
        bar.classList.add("show");
        bar.innerHTML = `<span>${count} ${count === 1 ? "item" : "itens"}</span><span>${formatBRL(subtotal)} · Ver carrinho</span>`;
      } else bar.classList.remove("show");
    }
    if (s.primaryColor) document.documentElement.style.setProperty("--leaf", s.primaryColor);
    if (s.backgroundColor) document.documentElement.style.setProperty("--cream", s.backgroundColor);
  }

  async function boot(pageFn) {
    window.addEventListener("scroll", () => {
      document.querySelector("header.site")?.classList.toggle("scrolled", window.scrollY > 8);
    });
    await loadCatalog();
    renderChrome();
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
