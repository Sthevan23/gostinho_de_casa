G.boot((data) => {
  const s = (data && data.settings) || {};
  const cats = ((data && data.categories) || []).filter((c) => c.slug !== "sobremesas");
  const featured = ((data && data.products) || []).filter((p) => p.featured).slice(0, 8);
  const promos = (data && data.promotions) || [];
  const reviews = (data && data.reviews) || [];
  const zones = (data && data.zones) || [];
  const days = s.minAdvanceDays || 1;
  const $ = (id) => document.getElementById(id);

  if ($("promos")) {
    $("promos").innerHTML = promos
      .map(
        (p) => `<a class="banner" href="/cardapio.html">
        ${p.image ? `<img src="${p.image}" alt="" />` : ""}
        <div class="pad"><h3>${p.name}</h3><p>${p.description || ""}</p></div>
      </a>`,
      )
      .join("");
  }
  if ($("cats")) {
    $("cats").innerHTML = cats
      .map(
        (c) => `<a class="cat-circle" href="/cardapio.html?categoria=${encodeURIComponent(c.slug)}">
        <img src="${c.image || "/logo.png"}" alt="" />
        <p>${(c.name || "").replace("Marmitas ", "")}</p>
      </a>`,
      )
      .join("");
  }
  if ($("store-card")) {
    $("store-card").innerHTML = `
    <img src="${s.logo || "/logo.png"}" alt="" />
    <div>
      <h3>${s.companyName || "Gostinho de Casa"}</h3>
      <p>★ 4,8 · Marmitas · Encomenda ${days} ${days === 1 ? "dia" : "dias"}</p>
      <p>Entrega a partir de ${zones.length ? G.formatBRL(Math.min.apply(null, zones.map((z) => z.price))) : "R$ 0"} · ${s.hours || ""}</p>
    </div>`;
  }
  if ($("featured")) {
    $("featured").innerHTML = featured.map(G.productCard).join("");
    G.bindAdds(featured);
  }
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
});
