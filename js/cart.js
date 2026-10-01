G.boot(() => {
  function render() {
    const cart = G.loadCart();
    const { count, subtotal } = G.cartTotals(cart.items);
    const el = document.getElementById("page");
    if (!count) {
      el.innerHTML = `<div style="text-align:center;padding:4rem 0"><p class="muted">Seu carrinho está vazio.</p><a class="btn btn-leaf" style="margin-top:1rem" href="/cardapio.html">Ver cardápio</a></div>`;
      return;
    }
    el.innerHTML = `
      <h1>Carrinho</h1>
      ${cart.items
        .map(
          (i) => `<div class="cart-item card-shadow">
            <img src="${i.image || "/logo.png"}" alt="" />
            <div style="flex:1">
              <b>${i.name}</b>
              <p class="muted" style="font-size:.8rem">${i.sizeName || ""} ${(i.extras || []).map((e) => e.name).join(", ")}</p>
              <div class="qty" style="margin-top:.5rem">
                <button data-q="${i.lineId}|${i.quantity - 1}">−</button>
                <span>${i.quantity}</span>
                <button data-q="${i.lineId}|${i.quantity + 1}">+</button>
              </div>
            </div>
            <div>
              <p class="price">${G.formatBRL((Number(i.price) + (i.extras || []).reduce((s, e) => s + Number(e.price), 0)) * i.quantity)}</p>
              <button data-q="${i.lineId}|0" class="muted" style="font-size:.75rem">remover</button>
            </div>
          </div>`,
        )
        .join("")}
      <div class="card card-shadow" style="margin-top:1rem">
        <div class="line"><span>Subtotal</span><b>${G.formatBRL(subtotal)}</b></div>
        <textarea class="field" id="notes" rows="2" placeholder="Observações">${cart.notes || ""}</textarea>
        <a class="btn btn-leaf" style="width:100%;margin-top:1rem" href="/checkout.html">Finalizar encomenda</a>
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
