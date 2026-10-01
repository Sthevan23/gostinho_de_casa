G.boot((data) => {
  const id = G.qs("id") || (location.pathname.split("/").filter(Boolean).pop() || "");
  const p = (data.products || []).find((x) => x.id === id || x.slug === id);
  if (!p) {
    document.getElementById("page").innerHTML = '<p class="muted" style="padding:3rem 0;text-align:center">Item não encontrado.</p>';
    return;
  }
  document.title = p.name + " · Gostinho de Casa";
  const related = (data.products || []).filter((x) => x.categoryId === p.categoryId && x.id !== p.id).slice(0, 6);
  let qty = 1;
  let sizeId = "";
  let extraIds = [];
  let notes = "";

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
      <div class="item-sheet">
        <div class="item-cover">
          <a class="back-fab" href="/cardapio.html" aria-label="Voltar">←</a>
          <button class="back-fab fav-fab ${G.isFav(p.id) ? "on" : ""}" type="button" id="fav" style="left:auto;right:.75rem">${G.isFav(p.id) ? "♥" : "♡"}</button>
          <img src="${p.image}" alt="${G.esc(p.name)}" />
        </div>
        <div class="item-body">
          <p class="kicker">${p.category?.name || ""} ${p.promotional ? "· Promoção" : ""}</p>
          <h1>${G.esc(p.name)}</h1>
          <p class="price" style="font-size:1.2rem">${p.promotional && p.promoPrice != null ? `<span class="old">${G.formatBRL(p.price)}</span>` : ""}${G.formatBRL(currentPrice())}</p>
          <p class="muted">${G.esc(p.description || "")}</p>
          ${p.calories != null ? `<p class="muted" style="margin-top:.5rem">${p.calories} kcal</p>` : ""}
          ${p.ingredients ? `<p style="margin-top:1rem"><b>Ingredientes</b></p><p class="muted">${G.esc(p.ingredients)}</p>` : ""}
          ${(p.sizes || []).length ? `<div style="margin-top:1.1rem"><p><b>Escolha o tamanho</b></p><div class="seg" style="margin-top:.5rem">${p.sizes
            .map(
              (s) => `<button type="button" class="${sizeId === s.id ? "on" : ""}" data-size="${s.id}">${s.name} · ${G.formatBRL(s.price)}</button>`,
            )
            .join("")}</div></div>` : ""}
          ${(p.extras || []).length ? `<div style="margin-top:1.1rem"><p><b>Escolha seus adicionais</b></p><div class="addon-list">${p.extras
            .map(
              (e) => `<label class="addon"><input type="checkbox" data-ex="${e.id}" ${extraIds.includes(e.id) ? "checked" : ""} /> <span>${G.esc(e.name)}</span> <b>+ ${G.formatBRL(e.price)}</b></label>`,
            )
            .join("")}</div></div>` : ""}
          <label style="display:block;margin-top:1.1rem"><b>Alguma observação?</b>
            <textarea class="field" id="notes" rows="2" placeholder="Ex: sem cebola">${G.esc(notes)}</textarea>
          </label>
          ${
            related.length
              ? `<section class="section"><h2 class="sec-title">Peça também</h2><div class="dish-list">${related.map(G.productCard).join("")}</div></section>`
              : ""
          }
        </div>
      </div>
      <div class="item-cta">
        <div class="qty">
          <button type="button" id="minus">−</button>
          <b>${qty}</b>
          <button type="button" id="plus">+</button>
        </div>
        <button class="btn btn-leaf" id="add" ${p.stock <= 0 ? "disabled" : ""}>${p.stock <= 0 ? "Esgotado" : "Adicionar ao carrinho — " + G.formatBRL(unit * qty)}</button>
      </div>`;
    G.bindAdds(related);
    document.getElementById("fav")?.addEventListener("click", async () => {
      await G.toggleFav(p.id);
      render();
    });
    document.querySelectorAll("[data-size]").forEach((b) => {
      b.onclick = () => {
        sizeId = b.dataset.size;
        render();
      };
    });
    document.querySelectorAll("[data-ex]").forEach((b) => {
      b.onchange = () => {
        extraIds = extraIds.includes(b.dataset.ex)
          ? extraIds.filter((x) => x !== b.dataset.ex)
          : extraIds.concat(b.dataset.ex);
        render();
      };
    });
    document.getElementById("notes")?.addEventListener("input", (e) => (notes = e.target.value));
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
        notes,
      });
      location.href = "/carrinho.html";
    });
  }
  render();
});
