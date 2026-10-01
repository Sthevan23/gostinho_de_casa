G.boot((data) => {
  const id = G.qs("id");
  const p = (data.products || []).find((x) => x.id === id || x.slug === id);
  if (!p) {
    document.getElementById("page").innerHTML = '<p class="muted">Produto não encontrado.</p>';
    return;
  }
  document.title = p.name + " · Gostinho de Casa";
  const related = (data.products || []).filter((x) => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 4);
  let qty = 1;
  let sizeId = "";
  let extraIds = [];

  function currentPrice() {
    if (sizeId) {
      const s = (p.sizes || []).find((x) => x.id === sizeId);
      if (s) return Number(s.price);
    }
    return G.priceOf(p);
  }

  function render() {
    const extrasSum = (p.extras || [])
      .filter((e) => extraIds.includes(e.id))
      .reduce((s, e) => s + Number(e.price), 0);
    const unit = currentPrice() + extrasSum;
    document.getElementById("page").innerHTML = `
      <a href="/cardapio.html" class="muted">← Voltar ao cardápio</a>
      <div class="product-page">
        <div class="photo card-shadow"><img src="${p.image}" alt="${p.name}" /></div>
        <div>
          <p class="kicker">${p.category?.name || ""}</p>
          <h1>${p.name}</h1>
          <p class="lead muted">${p.description || ""}</p>
          ${p.ingredients ? `<p style="margin-top:1rem"><b>Ingredientes: </b><span class="muted">${p.ingredients}</span></p>` : ""}
          ${(p.sizes || []).length ? `<div style="margin-top:1rem"><p class="muted">Tamanho</p><div class="seg">${p.sizes
            .map(
              (s) => `<button type="button" class="${sizeId === s.id ? "on" : ""}" data-size="${s.id}">${s.name} · ${G.formatBRL(s.price)}</button>`,
            )
            .join("")}</div></div>` : ""}
          ${(p.extras || []).length ? `<div style="margin-top:1rem"><p class="muted">Adicionais</p><div class="seg">${p.extras
            .map(
              (e) => `<button type="button" class="${extraIds.includes(e.id) ? "on" : ""}" data-ex="${e.id}">${e.name} + ${G.formatBRL(e.price)}</button>`,
            )
            .join("")}</div></div>` : ""}
          <div class="row" style="margin-top:1.5rem;display:flex;align-items:center;justify-content:space-between;gap:1rem">
            <div class="qty">
              <button type="button" id="minus">−</button>
              <b>${qty}</b>
              <button type="button" id="plus">+</button>
            </div>
            <p class="price" style="font-size:1.25rem">${G.formatBRL(unit * qty)}</p>
          </div>
          <button class="btn btn-leaf" style="width:100%;margin-top:1rem" id="add" ${p.stock <= 0 ? "disabled" : ""}>${p.stock <= 0 ? "Esgotado" : "Adicionar ao carrinho"}</button>
        </div>
      </div>
      ${
        related.length
          ? `<section class="section"><h2>Você também pode gostar</h2><div class="grid-cards">${related.map(G.productCard).join("")}</div></section>`
          : ""
      }`;
    G.bindAdds(related);
    document.querySelectorAll("[data-size]").forEach((b) => {
      b.onclick = () => {
        sizeId = b.dataset.size;
        render();
      };
    });
    document.querySelectorAll("[data-ex]").forEach((b) => {
      b.onclick = () => {
        extraIds = extraIds.includes(b.dataset.ex)
          ? extraIds.filter((x) => x !== b.dataset.ex)
          : extraIds.concat(b.dataset.ex);
        render();
      };
    });
    document.getElementById("minus")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      render();
    });
    document.getElementById("plus")?.addEventListener("click", () => {
      qty += 1;
      render();
    });
    document.getElementById("add")?.addEventListener("click", () => {
      const size = (p.sizes || []).find((x) => x.id === sizeId);
      const extras = (p.extras || []).filter((e) => extraIds.includes(e.id));
      G.addItem({
        productId: p.id,
        name: p.name,
        image: p.image,
        price: currentPrice(),
        quantity: qty,
        sizeId: sizeId || undefined,
        sizeName: size?.name,
        extras,
      });
      location.href = "/carrinho.html";
    });
  }
  render();
});
