G.boot(async () => {
  const id = G.qs("id");
  const el = document.getElementById("page");
  if (!id) {
    el.innerHTML = '<p class="muted">Pedido não encontrado.</p>';
    return;
  }
  try {
    const res = await fetch(G.API + "?action=order&order=" + encodeURIComponent(id), { cache: "no-store" });
    const o = await res.json();
    if (!res.ok) throw new Error(o.error);
    const STATUS = {
      NEW: "Novo pedido",
      CONFIRMED: "Confirmado",
      PREPARING: "Em preparo",
      DELIVERING: "Saiu para entrega",
      DELIVERED: "Entregue",
      CANCELLED: "Cancelado",
    };
    el.innerHTML = `
      <div class="card card-shadow" style="max-width:32rem;margin:2rem auto;text-align:center">
        <p class="kicker">Pedido #${String(o.number).padStart(3, "0")}</p>
        <h1>${STATUS[o.status] || o.status}</h1>
        <p class="muted">Encomenda para ${G.formatDateBR(o.scheduledDate)} · ${G.slotLabel(o.scheduledSlot)}</p>
        <ul style="text-align:left;margin:1.5rem 0">${(o.items || [])
          .map(
            (i) =>
              `<li class="line"><span>${i.quantity}x ${i.productName}${i.size ? " " + i.size : ""}</span><span>${G.formatBRL(i.unitPrice * i.quantity)}</span></li>`,
          )
          .join("")}</ul>
        <div class="line"><b>Total</b><b>${G.formatBRL(o.total)}</b></div>
        <a class="btn btn-leaf" style="margin-top:1.5rem" href="/cardapio.html">Fazer outro pedido</a>
      </div>`;
  } catch {
    el.innerHTML = '<p class="muted" style="text-align:center;padding:4rem 0">Não foi possível carregar este pedido.</p>';
  }
});
