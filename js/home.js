G.boot((data) => {
  const s = (data && data.settings) || {};
  const products = (data && data.products) || [];
  const cats = ((data && data.categories) || []).filter((c) => c.slug !== "sobremesas");
  const reviews = (data && data.reviews) || [];
  const zones = (data && data.zones) || [];
  const days = s.minAdvanceDays || 1;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  let categoria = params.get("categoria") || "";
  let q = params.get("q") || "";

  function catSlug(p) {
    return p.category?.slug || cats.find((c) => c.id === p.categoryId)?.slug || "";
  }

  function filtered() {
    const nq = q
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return products.filter((p) => {
      if (categoria && catSlug(p) !== categoria) return false;
      if (!nq) return true;
      const blob = `${p.name} ${p.description} ${p.ingredients || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return blob.includes(nq);
    });
  }

  function syncUrl() {
    const url = new URL(location.href);
    if (categoria) url.searchParams.set("categoria", categoria);
    else url.searchParams.delete("categoria");
    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");
    url.hash = "cardapio";
    history.replaceState({}, "", url);
  }

  function scrollMenu() {
    $("cardapio")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if ($("cover")) {
    $("cover").innerHTML = `
      <img src="/marmitas/foto-12.jpg" alt="" />
      <div class="pad">
        <h1>Marmita feita hoje, para o seu amanhã.</h1>
        <p>Encomende com 1 dia de antecedência e receba no almoço ou jantar.</p>
        <a class="btn btn-leaf js-to-menu" href="#cardapio" style="background:#fff;color:var(--leaf-dark);width:fit-content">Ver o cardápio</a>
      </div>`;
  }
  if ($("deliver")) {
    $("deliver").innerHTML = `
      <div>
        <b>${G.esc(G.getAddress()?.street || s.address || "Escolher endereço")}</b>
        <span>Entrega e retirada · ${s.hours || ""}</span>
      </div>
      <a class="btn btn-sm btn-white" href="/conta.html#enderecos">Alterar</a>`;
  }

  function renderCats() {
    if (!$("cats")) return;
    $("cats").innerHTML =
      `<button type="button" class="cat-circle ${!categoria ? "on" : ""}" data-c="">
        <img src="/logo.png" alt="" />
        <p>Tudo</p>
      </button>` +
      cats
        .map(
          (c) => `<button type="button" class="cat-circle ${categoria === c.slug ? "on" : ""}" data-c="${c.slug}">
        <img src="${c.image || "/logo.png"}" alt="" />
        <p>${(c.name || "").replace("Marmitas ", "")}</p>
      </button>`,
        )
        .join("");
    $("cats").querySelectorAll("[data-c]").forEach((b) => {
      b.addEventListener("click", () => {
        categoria = b.dataset.c || "";
        syncUrl();
        renderMenu();
        scrollMenu();
      });
    });
  }

  function renderMenu() {
    const box = $("list");
    if (!box) return;
    const list = filtered();
    if (!list.length) {
      box.innerHTML = '<p class="muted" style="padding:2rem 0;text-align:center">Nenhum item encontrado.</p>';
      return;
    }
    if (q || categoria) {
      box.innerHTML = `<div class="dish-list">${list.map(G.productCard).join("")}</div>`;
    } else {
      box.innerHTML = cats
        .map((c) => {
          const items = list.filter((p) => catSlug(p) === c.slug);
          if (!items.length) return "";
          return `<section class="menu-sec" id="sec-${c.slug}">
            <h2>${c.name}</h2>
            <div class="dish-list">${items.map(G.productCard).join("")}</div>
          </section>`;
        })
        .join("");
    }
    G.bindAdds(list);
    renderCats();
  }

  const input = $("q");
  if (input) {
    input.value = q;
    input.addEventListener("input", (e) => {
      q = e.target.value;
      syncUrl();
      renderMenu();
    });
  }

  document.querySelectorAll(".js-to-menu").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      location.hash = "cardapio";
      scrollMenu();
    });
  });

  if ($("reviews")) {
    $("reviews").innerHTML = reviews
      .map(
        (r) => `<blockquote class="review">
        <div class="stars">${"★".repeat(r.rating || 0)}</div>
        <q>${r.comment || ""}</q>
        <b>${r.name || ""}</b>
      </blockquote>`,
      )
      .join("");
  }
  if ($("addr")) $("addr").textContent = s.address || "";
  if ($("hours")) $("hours").textContent = s.hours || "";
  if ($("advance")) {
    $("advance").textContent = `Peça com pelo menos ${days} ${days === 1 ? "dia" : "dias"} de antecedência.`;
  }
  if ($("zones")) {
    $("zones").innerHTML = zones
      .map((z) => `<li class="zone"><span>${z.name}</span><b>${G.formatBRL(z.price)}</b></li>`)
      .join("");
  }

  renderMenu();

  if (location.hash === "#cardapio" || params.get("categoria") || params.get("q")) {
    setTimeout(scrollMenu, 80);
  }
});
