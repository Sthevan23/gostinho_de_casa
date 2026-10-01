G.boot((data) => {
  const s = (data && data.settings) || {};
  const products = (data && data.products) || [];
  const cats = ((data && data.categories) || []).filter((c) => c.slug !== "sobremesas");
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const reviews = (data && data.reviews) || [];
  const zones = (data && data.zones) || [];
  const days = s.minAdvanceDays || 1;
  const $ = (id) => document.getElementById(id);

  if ($("cover")) {
    $("cover").innerHTML = `
      <img src="/marmitas/foto-12.jpg" alt="" />
      <div class="pad">
        <h1>Marmita feita hoje, para o seu amanhã.</h1>
        <p>Encomende com 1 dia de antecedência e receba no almoço ou jantar.</p>
        <a class="btn btn-leaf" href="/cardapio.html" style="background:#fff;color:var(--leaf-dark);width:fit-content">Ver o cardápio</a>
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
