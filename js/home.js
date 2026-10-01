G.boot((data) => {
  const s = data.settings || {};
  const cats = (data.categories || []).filter((c) => c.slug !== "sobremesas");
  const featured = (data.products || []).filter((p) => p.featured).slice(0, 8);
  const promos = data.promotions || [];
  const reviews = data.reviews || [];
  const zones = data.zones || [];

  document.getElementById("hero-name").textContent = s.companyName || "Gostinho de Casa";
  document.getElementById("hero-slogan").textContent = s.slogan || "";
  document.getElementById("cats").innerHTML = cats
    .map(
      (c) => `<a class="cat-card card-shadow" href="/cardapio.html?categoria=${encodeURIComponent(c.slug)}">
        ${c.image ? `<img src="${c.image}" alt="" />` : ""}
        <p>${c.name}</p>
      </a>`,
    )
    .join("");
  document.getElementById("featured").innerHTML = featured.map(G.productCard).join("");
  G.bindAdds(featured);
  document.getElementById("promos").innerHTML = promos
    .map(
      (p) => `<a class="promo card-shadow" href="/cardapio.html">
        ${p.image ? `<img src="${p.image}" alt="" />` : ""}
        <div class="pad"><h3>${p.name}</h3><p>${p.description || ""}</p>
        ${p.value ? `<p class="price" style="color:var(--gold);margin-top:.75rem">${p.type === "percent" ? p.value + "% off" : G.formatBRL(p.value)}</p>` : ""}</div>
      </a>`,
    )
    .join("");
  document.getElementById("reviews").innerHTML = reviews
    .map(
      (r) => `<blockquote class="review card-shadow">
        <div class="stars">${"★".repeat(r.rating || 0)}</div>
        <q>${r.comment || ""}</q>
        <b>${r.name || ""}</b>
      </blockquote>`,
    )
    .join("");
  document.getElementById("addr").textContent = s.address || "";
  document.getElementById("hours").textContent = s.hours || "";
  document.getElementById("advance").textContent = `Trabalhamos com encomenda: peça com pelo menos ${s.minAdvanceDays || 1} ${(s.minAdvanceDays || 1) === 1 ? "dia" : "dias"} de antecedência.`;
  document.getElementById("zones").innerHTML = zones
    .map((z) => `<li class="zone"><span>${z.name}</span><b>${G.formatBRL(z.price)}</b></li>`)
    .join("");
});
