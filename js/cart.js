G.boot((data) => {
  const s = data.settings || {};
  const zones = data.zones || [];
  const freeMin = Number(s.freeDeliveryMin || 80);

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
    const addr = G.getAddress();
    const feeGuess = addr?.neighborhood ? zones.find((z) => z.name === addr.neighborhood)?.price || 0 : Math.min(...zones.map((z) => z.price), 0);
    const fee = subtotal >= freeMin ? 0 : feeGuess;
    el.innerHTML = `
      <h1 style="font-size:1.25rem;margin:.5rem 0 1rem">Seu pedido</h1>
      <div class="bag-list">
      ${cart.items
        .map(
          (i) => `<div class="cart-item">
            <img src="${i.image || "/logo.png"}" alt="" />
            <div style="flex:1;min-width:0">
              <b>${G.esc(i.name)}</b>
              <p class="muted" style="font-size:.8rem;margin:.2rem 0">${i.sizeName || ""} ${(i.extras || []).map((e) => e.name).join(", ")} ${i.notes ? "· " + G.esc(i.notes) : ""}</p>
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
        <div class="line"><span>Taxa de entrega</span><span>${fee === 0 && subtotal >= freeMin ? "Grátis" : G.formatBRL(fee)}</span></div>
        <div class="line"><span>Desconto</span><span>—</span></div>
        <div class="line"><b>Total</b><b>${G.formatBRL(subtotal + fee)}</b></div>
        ${subtotal < freeMin ? `<p class="note" style="margin-top:.75rem">Faltam ${G.formatBRL(freeMin - subtotal)} para entrega grátis.</p>` : `<p class="note" style="margin-top:.75rem">Entrega grátis neste pedido.</p>`}
        <textarea class="field" id="notes" rows="2" placeholder="Alguma observação? Ex: sem cebola">${cart.notes || ""}</textarea>
        <a class="btn btn-leaf" style="width:100%;margin-top:1rem" href="/checkout.html">Continuar pedido</a>
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
