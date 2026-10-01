G.boot(() => {
  function render() {
    const cart = G.loadCart();
    const { count, subtotal } = G.cartTotals(cart.items);
    const el = document.getElementById("page");
    if (!count) {
      el.innerHTML = `<div class="empty-bag">
        <p class="muted">Sua sacola está vazia</p>
        <a class="btn btn-leaf" href="/cardapio.html">Ver cardápio</a>
      </div>`;
      return;
    }
    el.innerHTML = `
      <h1 style="font-size:1.25rem;margin:.5rem 0 1rem">Sacola</h1>
      <div class="dish-list">
      ${cart.items
        .map(
          (i) => `<div class="cart-item">
            <img src="${i.image || "/logo.png"}" alt="" />
            <div style="flex:1;min-width:0">
              <b>${i.name}</b>
              <p class="muted" style="font-size:.8rem;margin:.2rem 0">${i.sizeName || ""} ${(i.extras || []).map((e) => e.name).join(", ")}</p>
              <div class="qty" style="margin-top:.4rem;width:fit-content">
                <button data-q="${i.lineId}|${i.quantity - 1}">−</button>
                <span>${i.quantity}</span>
                <button data-q="${i.lineId}|${i.quantity + 1}">+</button>
              </div>
            </div>
            <div style="text-align:right">
              <p class="price">${G.formatBRL((Number(i.price) + (i.extras || []).reduce((s, e) => s + Number(e.price), 0)) * i.quantity)}</p>
              <button data-q="${i.lineId}|0" class="muted" style="font-size:.75rem;margin-top:.35rem">remover</button>
            </div>
          </div>`,
        )
        .join("")}
      </div>
      <div class="card" style="margin-top:1rem">
        <div class="line"><span>Subtotal</span><b>${G.formatBRL(subtotal)}</b></div>
        <textarea class="field" id="notes" rows="2" placeholder="Alguma observação? Ex: sem cebola">${cart.notes || ""}</textarea>
        <a class="btn btn-leaf" style="width:100%;margin-top:1rem" href="/checkout.html">Continuar</a>
      </div>`;
    el.querySelectorAll("[data-q]").forEach((b) => {
      b.onclick = () => {
        const [id, n] = b.dataset.q.split("|");
        G.updateQty(id, Number(n));
        render();
      };
    });
    document.getElementById("notes")?.addEventListener("input", (e) => G.setNotes(e.target.value));
  }
  render();
});
