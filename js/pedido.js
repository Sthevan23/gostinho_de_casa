G.boot(async () => {
  const id = G.qs("id");
  const el = document.getElementById("page");
  if (!id) {
    location.replace("/pedidos.html");
    return;
  }
  const STEPS = [
    ["NEW", "Pedido recebido"],
    ["CONFIRMED", "Pedido confirmado"],
    ["PREPARING", "Em preparação"],
    ["READY", "Pedido pronto"],
    ["DELIVERING", "Saiu para entrega"],
    ["DELIVERED", "Pedido entregue"],
  ];
  const PAY = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão", CARD_DELIVERY: "Cartão na entrega", CARD_ONLINE: "Cartão online" };

  async function load() {
    try {
      const o = await G.apiGet("action=order&order=" + encodeURIComponent(id));
      const idx = STEPS.findIndex((s) => s[0] === o.status);
      const cancelled = o.status === "CANCELLED";
      el.innerHTML = `
        <div class="card card-shadow" style="max-width:36rem;margin:1.25rem auto">
          <p class="kicker">Pedido #${String(o.number).padStart(4, "0")}</p>
          <h1>${G.esc(o.statusLabel || o.status)}</h1>
          <p class="muted">${G.esc(o.statusMessage || "")}</p>
          <p class="muted">Encomenda para ${G.formatDateBR(o.scheduledDate)} · ${G.slotLabel(o.scheduledSlot)} · ${G.esc(o.eta || "")}</p>
          ${
            cancelled
              ? `<p class="err">Este pedido foi cancelado.</p>`
              : `<ol class="track">${STEPS.map((s, i) => {
                  const done = idx >= i || o.status === "DELIVERED";
                  const current = s[0] === o.status;
                  return `<li class="${done ? "done" : ""} ${current ? "now" : ""}"><span>${done ? "✓" : "○"}</span> ${s[1]}</li>`;
                }).join("")}</ol>`
          }
          <ul style="margin:1.25rem 0">${(o.items || [])
            .map(
              (i) =>
                `<li class="line"><span>${i.quantity}x ${G.esc(i.productName)}${i.size ? " " + G.esc(i.size) : ""}${i.extras ? " · " + G.esc(i.extras) : ""}</span><span>${G.formatBRL(i.unitPrice * i.quantity)}</span></li>`,
            )
            .join("")}</ul>
          <div class="line"><span>Pagamento</span><span>${PAY[o.paymentMethod] || o.paymentMethod}</span></div>
          <div class="line"><span>Entrega</span><span>${o.deliveryType === "PICKUP" ? "Retirada" : G.esc((o.address || "") + ", " + (o.addressNumber || ""))}</span></div>
          ${o.driver ? `<div class="line"><span>Entregador</span><span>${G.esc(o.driver.name)}</span></div>` : ""}
          <div class="line"><b>Total</b><b>${G.formatBRL(o.total)}</b></div>
          ${
            o.status === "DELIVERED"
              ? `<div class="review-box" id="rev">${
                  o.review
                    ? `<p>Sua avaliação: ${"★".repeat(o.review.rating || 0)}</p><p class="muted">${G.esc(o.review.comment || "")}</p>`
                    : `<p><b>Como foi o pedido?</b></p><div class="stars-pick" id="stars">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-r="${n}">☆</button>`).join("")}</div><textarea class="field" id="rcomment" rows="2" placeholder="Conte como foi"></textarea><button class="btn btn-leaf btn-sm" type="button" id="send-rev" style="margin-top:.6rem">Enviar avaliação</button>`
                }</div>`
              : ""
          }
          <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1.25rem">
            <a class="btn btn-leaf" href="/pedidos.html">Meus pedidos</a>
            <a class="btn btn-white" href="/">Voltar para o início</a>
          </div>
        </div>`;
      let rating = 5;
      document.querySelectorAll("[data-r]").forEach((b) => {
        b.onclick = () => {
          rating = Number(b.dataset.r);
          document.querySelectorAll("[data-r]").forEach((x) => (x.textContent = Number(x.dataset.r) <= rating ? "★" : "☆"));
        };
      });
      document.getElementById("send-rev")?.addEventListener("click", async () => {
        try {
          await G.apiPost({ action: "review_order", orderId: o.id, rating, comment: document.getElementById("rcomment")?.value || "" });
          G.toast("Obrigado pela avaliação!");
          load();
        } catch (e) {
          G.toast(e.message);
        }
      });
      if (!["DELIVERED", "CANCELLED"].includes(o.status)) setTimeout(load, 12000);
    } catch {
      el.innerHTML = '<p class="muted" style="text-align:center;padding:4rem 0">Não foi possível carregar este pedido.</p>';
    }
  }
  load();
});
