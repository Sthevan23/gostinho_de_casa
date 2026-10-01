G.boot(async (data) => {
  const el = document.getElementById("page");
  const products = data.products || [];
  const me = G.getUser();
  if (!me?.token) {
    el.innerHTML = `<div class="empty-bag"><p class="muted">Entre para ver seus pedidos</p><a class="btn btn-leaf" href="/conta.html?next=/pedidos.html">Entrar</a></div>`;
    return;
  }
  let orders = [];
  try {
    const out = await G.apiGet("action=my_orders");
    orders = out.orders || [];
  } catch (e) {
    el.innerHTML = `<p class="err">${G.esc(e.message)}</p>`;
    return;
  }
  if (!orders.length) {
    const last = localStorage.getItem("gostinho-last-order");
    el.innerHTML = `<div class="empty-bag"><p class="muted">Você ainda não fez um pedido</p>${last ? `<a class="btn btn-white" href="/pedido.html?id=${encodeURIComponent(last)}">Ver último pedido</a>` : ""}<a class="btn btn-leaf" href="/#cardapio">Ver cardápio</a></div>`;
    return;
  }
  el.innerHTML = `<h1 style="font-size:1.25rem;margin:.5rem 0 1rem">Meus pedidos</h1>${orders
    .map(
      (o) => `<article class="card" style="margin-bottom:.75rem">
        <div class="line"><b>#${String(o.number).padStart(4, "0")}</b><span>${G.esc(o.statusLabel || o.status)}</span></div>
        <p class="muted">${G.formatDateBR(o.scheduledDate)} · ${G.slotLabel(o.scheduledSlot)} · ${G.formatBRL(o.total)}</p>
        <p class="muted">${(o.items || []).map((i) => i.quantity + "x " + i.productName).join(" · ")}</p>
        <div style="display:flex;gap:.5rem;margin-top:.75rem;flex-wrap:wrap">
          <a class="btn btn-leaf btn-sm" href="/pedido.html?id=${encodeURIComponent(o.id)}">Acompanhar</a>
          <button class="btn btn-white btn-sm" data-rep="${o.id}">Pedir novamente</button>
        </div>
      </article>`,
    )
    .join("")}`;
  el.querySelectorAll("[data-rep]").forEach((b) => {
    b.onclick = () => {
      const o = orders.find((x) => x.id === b.dataset.rep);
      if (!o) return;
      (o.items || []).forEach((i) => {
        const p = products.find((x) => x.id === i.productId);
        G.addItem({
          productId: i.productId || p?.id,
          name: i.productName,
          image: p?.image || "/logo.png",
          price: i.unitPrice,
          quantity: i.quantity,
          extras: [],
          notes: i.notes || "",
        });
      });
      location.href = "/carrinho.html";
    };
  });
});
