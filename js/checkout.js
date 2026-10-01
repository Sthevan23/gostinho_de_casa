G.boot((data) => {
  const s = data.settings || {};
  const zones = data.zones || [];
  const cart = G.loadCart();
  const { count, subtotal } = G.cartTotals(cart.items);
  const minDate = G.minOrderDateYMD(s.minAdvanceDays || 1);
  const PAY = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão", CARD_DELIVERY: "Cartão na entrega" };
  const SLOTS = { ALMOCO: "Almoço", JANTAR: "Jantar" };

  if (!count) {
    document.getElementById("page").innerHTML = '<p class="muted" style="padding:4rem 0;text-align:center">Seu carrinho está vazio.</p>';
    return;
  }

  const form = {
    customerName: "",
    phone: "",
    deliveryType: s.deliveryEnabled === false ? "PICKUP" : "DELIVERY",
    address: "",
    addressNumber: "",
    complement: "",
    neighborhood: "",
    paymentMethod: "PIX",
    changeFor: "",
    scheduledDate: minDate,
    scheduledSlot: "ALMOCO",
  };
  let coupon = "";
  let discount = 0;
  let couponMsg = "";
  let error = "";
  let sending = false;
  let notes = cart.notes || "";

  function fee() {
    if (form.deliveryType === "PICKUP") return 0;
    return zones.find((z) => z.name === form.neighborhood)?.price || 0;
  }
  function total() {
    return Math.max(0, subtotal - discount) + fee();
  }

  async function applyCoupon() {
    couponMsg = "";
    const res = await fetch(G.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate_coupon", code: coupon, subtotal }),
    });
    const dataRes = await res.json();
    if (!res.ok) {
      discount = 0;
      couponMsg = dataRes.error;
    } else {
      discount = dataRes.discount;
      couponMsg = "Cupom " + dataRes.code + " aplicado";
    }
    render();
  }

  async function submit(e) {
    e.preventDefault();
    error = "";
    if (s.minOrderValue && subtotal < s.minOrderValue) {
      error = "Pedido mínimo: " + G.formatBRL(s.minOrderValue);
      return render();
    }
    if (!form.scheduledDate || form.scheduledDate < minDate) {
      error = "Os pedidos são por encomenda. Escolha uma data com pelo menos 1 dia de antecedência.";
      return render();
    }
    sending = true;
    render();
    const res = await fetch(G.API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create_order",
        ...form,
        phone: G.onlyDigits(form.phone),
        changeFor: form.changeFor ? Number(String(form.changeFor).replace(",", ".")) : null,
        notes,
        couponCode: discount > 0 ? coupon : "",
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          sizeId: i.sizeId,
          extraIds: (i.extras || []).map((e) => e.id),
          notes: i.notes,
        })),
      }),
    });
    const out = await res.json();
    sending = false;
    if (!res.ok) {
      error = out.error || "Não foi possível finalizar";
      return render();
    }
    G.clearCart();
    if (out.order?.id) localStorage.setItem("gostinho-last-order", out.order.id);
    if (out.whatsappUrl) window.open(out.whatsappUrl, "_blank");
    location.href = "/pedido.html?id=" + encodeURIComponent(out.order.id);
  }

  function render() {
    document.getElementById("page").innerHTML = `
      <form class="checkout" id="checkout">
        <div>
          <h1>Revisar e pagar</h1>
          <section class="card card-shadow" style="margin-top:1rem">
            <h2>Seus dados</h2>
            <div class="grid-2" style="margin-top:1rem">
              <input class="field" required name="customerName" placeholder="Nome" value="${form.customerName}" />
              <input class="field" required name="phone" placeholder="WhatsApp" value="${form.phone}" />
            </div>
          </section>
          <section class="card card-shadow" style="margin-top:1rem">
            <h2>Data da encomenda</h2>
            <p class="muted">As marmitas são feitas sob encomenda. Peça com pelo menos ${s.minAdvanceDays || 1} ${(s.minAdvanceDays || 1) === 1 ? "dia" : "dias"} de antecedência.</p>
            <div class="grid-2" style="margin-top:1rem">
              <label class="muted">Para qual dia?
                <input class="field" required type="date" name="scheduledDate" min="${minDate}" value="${form.scheduledDate}" />
              </label>
              <div>
                <span class="muted">Período</span>
                <div class="seg">${Object.entries(SLOTS)
                  .map(([k, l]) => `<button type="button" data-slot="${k}" class="${form.scheduledSlot === k ? "on" : ""}">${l}</button>`)
                  .join("")}</div>
              </div>
            </div>
          </section>
          <section class="card card-shadow" style="margin-top:1rem">
            <h2>Entrega</h2>
            <div class="seg" style="margin-top:.75rem">
              ${s.deliveryEnabled !== false ? `<button type="button" data-del="DELIVERY" class="${form.deliveryType === "DELIVERY" ? "on" : ""}">Entrega</button>` : ""}
              ${s.pickupEnabled !== false ? `<button type="button" data-del="PICKUP" class="${form.deliveryType === "PICKUP" ? "on" : ""}">Retirar no local</button>` : ""}
            </div>
            ${
              form.deliveryType === "DELIVERY"
                ? `<div class="grid-2" style="margin-top:1rem">
                    <input class="field" required name="address" placeholder="Endereço" value="${form.address}" style="grid-column:1/-1" />
                    <input class="field" required name="addressNumber" placeholder="Número" value="${form.addressNumber}" />
                    <input class="field" name="complement" placeholder="Complemento" value="${form.complement}" />
                    <select class="field" required name="neighborhood" style="grid-column:1/-1">
                      <option value="">Selecione o bairro</option>
                      ${zones.map((z) => `<option value="${z.name}" ${form.neighborhood === z.name ? "selected" : ""}>${z.name} — ${G.formatBRL(z.price)}</option>`).join("")}
                    </select>
                  </div>`
                : ""
            }
          </section>
          <section class="card card-shadow" style="margin-top:1rem">
            <h2>Pagamento</h2>
            <div class="pay" style="margin-top:.75rem">
              ${Object.entries(PAY).map(([k, l]) => `<button type="button" data-pay="${k}" class="${form.paymentMethod === k ? "on" : ""}">${l}</button>`).join("")}
            </div>
            ${form.paymentMethod === "CASH" ? `<input class="field" name="changeFor" placeholder="Troco para quanto?" value="${form.changeFor}" style="margin-top:.75rem" />` : ""}
          </section>
          <section class="card card-shadow" style="margin-top:1rem">
            <h2>Cupom</h2>
            <div style="display:flex;gap:.5rem;margin-top:.75rem">
              <input class="field" id="coupon" placeholder="Código" value="${coupon}" />
              <button type="button" class="btn btn-leaf btn-sm" id="apply">Aplicar</button>
            </div>
            ${couponMsg ? `<p class="muted">${couponMsg}</p>` : ""}
            <textarea class="field" id="notes" rows="2" placeholder="Observações" style="margin-top:.75rem">${notes}</textarea>
          </section>
        </div>
        <aside class="card card-shadow sticky">
          <h2>Resumo</h2>
          ${cart.items.map((i) => `<div class="line"><span>${i.quantity}x ${i.name}${i.sizeName ? " (" + i.sizeName + ")" : ""}</span><span>${G.formatBRL((Number(i.price) + (i.extras || []).reduce((s, e) => s + Number(e.price), 0)) * i.quantity)}</span></div>`).join("")}
          <div style="border-top:1px solid var(--sand);margin-top:1rem;padding-top:1rem">
            <div class="line"><span>Subtotal</span><span>${G.formatBRL(subtotal)}</span></div>
            ${discount > 0 ? `<div class="line" style="color:var(--leaf)"><span>Desconto</span><span>-${G.formatBRL(discount)}</span></div>` : ""}
            <div class="line"><span>Encomenda</span><span>${G.formatDateBR(form.scheduledDate)} · ${SLOTS[form.scheduledSlot]}</span></div>
            <div class="line"><span>Entrega</span><span>${form.deliveryType === "PICKUP" ? "Retirada" : G.formatBRL(fee())}</span></div>
            <div class="line"><b>Total</b><b>${G.formatBRL(total())}</b></div>
          </div>
          ${error ? `<p class="err">${error}</p>` : ""}
          <button class="btn btn-leaf" style="width:100%;margin-top:1.25rem" ${sending ? "disabled" : ""}>${sending ? "Enviando..." : "Fazer pedido · " + G.formatBRL(total())}</button>
          <p class="muted" style="text-align:center;margin-top:.75rem;font-size:.75rem">Encomenda com antecedência. Ao finalizar, o pedido vai para o WhatsApp.</p>
        </aside>
      </form>`;

    const root = document.getElementById("checkout");
    root.addEventListener("submit", submit);
    root.querySelectorAll("[name]").forEach((el) => {
      el.addEventListener("input", () => {
        if (el.name === "phone") {
          form.phone = G.formatPhone(el.value);
          el.value = form.phone;
        } else form[el.name] = el.value;
      });
      el.addEventListener("change", () => {
        form[el.name] = el.value;
        if (el.name === "neighborhood" || el.name === "scheduledDate") render();
      });
    });
    root.querySelectorAll("[data-slot]").forEach((b) => {
      b.onclick = () => {
        form.scheduledSlot = b.dataset.slot;
        render();
      };
    });
    root.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = () => {
        form.deliveryType = b.dataset.del;
        render();
      };
    });
    root.querySelectorAll("[data-pay]").forEach((b) => {
      b.onclick = () => {
        form.paymentMethod = b.dataset.pay;
        render();
      };
    });
    document.getElementById("coupon")?.addEventListener("input", (e) => (coupon = e.target.value.toUpperCase()));
    document.getElementById("apply")?.addEventListener("click", applyCoupon);
    document.getElementById("notes")?.addEventListener("input", (e) => {
      notes = e.target.value;
      G.setNotes(notes);
    });
  }
  render();
});
