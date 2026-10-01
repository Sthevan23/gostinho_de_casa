G.boot((data) => {
  const s = data.settings || {};
  const products = data.products || [];
  const cats = (data.categories || []).filter((c) => c.slug !== "sobremesas");
  const params = new URLSearchParams(location.search);
  let categoria = params.get("categoria") || "";
  let q = params.get("q") || "";
  const days = s.minAdvanceDays || 1;
  const zones = data.zones || [];
  const minFee = zones.length ? Math.min(...zones.map((z) => z.price)) : 0;

  if (document.getElementById("store-hero")) {
    document.getElementById("store-hero").innerHTML = `
    <div class="store-cover"><img src="/marmitas/foto-26.jpg" alt="" /></div>
    <div class="store-info">
      <h1>Cardápio da casa</h1>
      <div class="store-meta">
        <span class="star">★ 4,8</span>
        <span>Encomenda ${days} ${days === 1 ? "dia" : "dias"}</span>
        <span>Entrega a partir de <b>${G.formatBRL(minFee)}</b></span>
      </div>
    </div>`;
  }

  const input = document.getElementById("q");
  if (q && input) input.value = q;

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

  function render() {
    document.getElementById("filters").innerHTML =
      `<button class="filter ${!categoria ? "on" : ""}" data-c="">Cardápio</button>` +
      cats
        .map((c) => `<button class="filter ${categoria === c.slug ? "on" : ""}" data-c="${c.slug}">${c.name.replace("Marmitas ", "")}</button>`)
        .join("");
    document.querySelectorAll(".filter").forEach((b) => {
      b.onclick = () => {
        categoria = b.dataset.c;
        const url = new URL(location.href);
        if (categoria) url.searchParams.set("categoria", categoria);
        else url.searchParams.delete("categoria");
        history.replaceState({}, "", url);
        render();
        if (categoria) document.getElementById("sec-" + categoria)?.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });

    const list = filtered();
    const box = document.getElementById("list");
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
  }

  if (input) {
    input.addEventListener("input", (e) => {
      q = e.target.value;
      render();
    });
  }
  render();
});
