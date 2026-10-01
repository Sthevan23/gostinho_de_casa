G.boot(async (data) => {
  const s = data.settings || {};
  const zones = data.zones || [];
  const cart = G.loadCart();
  const { count, subtotal } = G.cartTotals(cart.items);
  const minDate = G.minOrderDateYMD(s.minAdvanceDays || 1);
  const freeMin = Number(s.freeDeliveryMin || 80);
  const PAY = {
    PIX: "Pix",
    CASH: "Dinheiro",
    CARD_DELIVERY: "Cartão na entrega",
    CARD_ONLINE: "Cartão online",
  };
  const SLOTS = { ALMOCO: "Almoço", JANTAR: "Jantar" };
  const user = G.getUser();
  const saved = G.getAddress() || {};

  if (!count) {
    document.getElementById("page").innerHTML = '<p class="muted" style="padding:4rem 0;text-align:center">Seu carrinho está vazio.</p>';
    return;
  }

  if (user?.token) {
    try {
      const me = await G.apiGet("action=me");
      if (me.customer) G.setUser(me.customer);
    } catch (_) {}
  }
  const me = G.getUser();

  const form = {
    customerName: me?.name || "",
    phone: G.formatPhone(me?.phone || ""),
    deliveryType: s.deliveryEnabled === false ? "PICKUP" : "DELIVERY",
    cep: saved.cep || "",
    address: saved.street || saved.address || "",
    addressNumber: saved.number || saved.addressNumber || "",
    complement: saved.complement || "",
    neighborhood: saved.neighborhood || "",
    city: saved.city || "",
    state: saved.state || "SP",
    reference: saved.reference || "",
    addressLabel: saved.label || "Casa",
    paymentMethod: "PIX",
    changeFor: "",
    scheduledDate: minDate,
    scheduledSlot: "ALMOCO",
    saveAddress: true,
  };
  let coupon = "";
  let discount = 0;
  let couponMsg = "";
  let error = "";
  let sending = false;
  let notes = cart.notes || "";
  let step = 1;
  let redeemLoyalty = false;
  let done = null;
  const loyaltyNeed = Number(s.loyaltyRedeemPoints || 500);
  const loyaltyVal = Number(s.loyaltyRedeemValue || 10);

  function fee() {
    if (form.deliveryType === "PICKUP") return 0;
    if (subtotal >= freeMin) return 0;
    if ((s.deliveryMode || "neighborhood") === "fixed") return Number(s.fixedDeliveryFee || 8);
    return zones.find((z) => z.name === form.neighborhood)?.price || 0;
  }
  function loyaltyOff() {
    return redeemLoyalty && me && me.points >= loyaltyNeed ? loyaltyVal : 0;
  }
  function total() {
    return Math.max(0, subtotal - discount - loyaltyOff()) + fee();
  }

  async function viaCep() {
    const cep = G.onlyDigits(form.cep);
    if (cep.length !== 8) return;
    try {
      const res = await fetch("https://viacep.com.br/ws/" + cep + "/json/");
      const j = await res.json();
      if (j.erro) return;
      form.address = j.logradouro || form.address;
      form.neighborhood = j.bairro || form.neighborhood;
      form.city = j.localidade || form.city;
      form.state = j.uf || form.state;
      const match = zones.find((z) => (j.bairro || "").toLowerCase().includes(z.name.toLowerCase()) || z.name.toLowerCase().includes((j.bairro || "").toLowerCase()));
      if (match) form.neighborhood = match.name;
      render();
    } catch (_) {}
  }

  async function applyCoupon() {
    couponMsg = "";
    try {
      const dataRes = await G.apiPost({ action: "validate_coupon", code: coupon, subtotal });
      discount = dataRes.discount;
      couponMsg = "Cupom " + dataRes.code + " aplicado";
    } catch (e) {
      discount = 0;
      couponMsg = e.message;
    }
    render();
  }

  function pickAddress(a) {
    form.cep = a.cep || "";
    form.address = a.street || "";
    form.addressNumber = a.number || "";
    form.complement = a.complement || "";
    form.neighborhood = a.neighborhood || "";
    form.city = a.city || "";
    form.state = a.state || "SP";
    form.reference = a.reference || "";
    form.addressLabel = a.label || "Casa";
    G.setAddress(a);
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
    try {
      const out = await G.apiPost({
        action: "create_order",
        ...form,
        phone: G.onlyDigits(form.phone),
        changeFor: form.changeFor ? Number(String(form.changeFor).replace(",", ".")) : null,
        notes,
        couponCode: discount > 0 ? coupon : "",
        redeemLoyalty,
        items: cart.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          sizeId: i.sizeId,
          extraIds: (i.extras || []).map((e) => e.id),
          notes: i.notes,
        })),
      });
      if (form.saveAddress && form.deliveryType === "DELIVERY") {
        G.setAddress({
          label: form.addressLabel,
          cep: form.cep,
          street: form.address,
          number: form.addressNumber,
          complement: form.complement,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          reference: form.reference,
        });
        if (me?.token) {
          G.apiPost({
            action: "save_address",
            address: {
              label: form.addressLabel,
              cep: form.cep,
              street: form.address,
              number: form.addressNumber,
              complement: form.complement,
              neighborhood: form.neighborhood,
              city: form.city,
              state: form.state,
              reference: form.reference,
              isDefault: true,
            },
          }).catch(() => {});
        }
      }
      G.clearCart();
      if (out.order?.id) localStorage.setItem("gostinho-last-order", out.order.id);
      if (out.whatsappUrl) window.open(out.whatsappUrl, "_blank");
      done = out;
      step = 4;
    } catch (err) {
      error = err.message || "Não foi possível finalizar";
    }
    sending = false;
    render();
  }

  function render() {
    const pixKey = s.pixKey || s.whatsapp || "";
    if (step === 4 && done?.order) {
      const o = done.order;
      document.getElementById("page").innerHTML = `
        <div class="card card-shadow confirm-box">
          <p class="kicker">Tudo certo</p>
          <h1>Pedido realizado! 🎉</h1>
          <p class="order-n">#${String(o.number).padStart(4, "0")}</p>
          <p class="muted">Encomenda para ${G.formatDateBR(o.scheduledDate)} · ${SLOTS[o.scheduledSlot] || "Almoço"}</p>
          <p class="muted">Previsão: ${o.eta || "40 a 70 min após o preparo"}</p>
          <ul style="text-align:left;margin:1.25rem 0">${(o.items || [])
            .map((i) => `<li class="line"><span>${i.quantity}x ${G.esc(i.productName)}</span><span>${G.formatBRL(i.unitPrice * i.quantity)}</span></li>`)
            .join("")}</ul>
          <div class="line"><span>Pagamento</span><span>${PAY[o.paymentMethod] || o.paymentMethod}</span></div>
          <div class="line"><span>Endereço</span><span>${o.deliveryType === "PICKUP" ? "Retirada" : G.esc((o.address || "") + ", " + (o.addressNumber || ""))}</span></div>
          <div class="line"><b>Total</b><b>${G.formatBRL(o.total)}</b></div>
          ${
            o.paymentMethod === "PIX"
              ? `<div class="pix-box"><p>Pague com Pix</p><b>${G.esc(pixKey)}</b><p class="muted">A chave também vai no WhatsApp do pedido.</p></div>`
              : ""
          }
          <a class="btn btn-leaf" style="width:100%;margin-top:1.25rem" href="/pedido.html?id=${encodeURIComponent(o.id)}">Acompanhar pedido</a>
          <a class="btn btn-white" style="width:100%;margin-top:.6rem" href="/">Voltar para o início</a>
        </div>`;
      return;
    }

    document.getElementById("page").innerHTML = `
      <form class="checkout" id="checkout">
        <div>
          <div class="steps">
            <button type="button" class="${step === 1 ? "on" : ""}" data-step="1">1. Endereço</button>
            <button type="button" class="${step === 2 ? "on" : ""}" data-step="2">2. Pagamento</button>
            <button type="button" class="${step === 3 ? "on" : ""}" data-step="3">3. Revisar</button>
          </div>
          ${
            step === 1
              ? `<section class="card card-shadow" style="margin-top:1rem">
            <h2>Seus dados</h2>
            <div class="grid-2" style="margin-top:1rem">
              <input class="field" required name="customerName" placeholder="Nome" value="${G.esc(form.customerName)}" />
              <input class="field" required name="phone" placeholder="WhatsApp" value="${G.esc(form.phone)}" />
            </div>
            ${
              !me
                ? `<p class="muted" style="margin-top:.75rem">Já tem conta? <a href="/conta.html?next=/checkout.html"><b>Entrar</b></a> para usar endereços salvos.</p>`
                : (me.addresses || []).length
                  ? `<div class="addr-picks">${me.addresses
                      .map(
                        (a) =>
                          `<button type="button" class="addr-pick ${form.address === a.street && form.addressNumber === a.number ? "on" : ""}" data-aid="${a.id}"><b>${G.esc(a.label)}</b><span>${G.esc(a.street)}, ${G.esc(a.number)} · ${G.esc(a.neighborhood)}</span></button>`,
                      )
                      .join("")}</div>`
                  : ""
            }
            <h2 style="margin-top:1.25rem">Entrega</h2>
            <div class="seg" style="margin-top:.75rem">
              ${s.deliveryEnabled !== false ? `<button type="button" data-del="DELIVERY" class="${form.deliveryType === "DELIVERY" ? "on" : ""}">Entrega</button>` : ""}
              ${s.pickupEnabled !== false ? `<button type="button" data-del="PICKUP" class="${form.deliveryType === "PICKUP" ? "on" : ""}">Retirar no local</button>` : ""}
            </div>
            ${
              form.deliveryType === "DELIVERY"
                ? `<div class="grid-2" style="margin-top:1rem">
                    <input class="field" name="cep" placeholder="CEP" value="${G.esc(form.cep)}" />
                    <select class="field" name="addressLabel">
                      ${["Casa", "Trabalho", "Outro"].map((l) => `<option ${form.addressLabel === l ? "selected" : ""}>${l}</option>`).join("")}
                    </select>
                    <input class="field" required name="address" placeholder="Rua" value="${G.esc(form.address)}" style="grid-column:1/-1" />
                    <input class="field" required name="addressNumber" placeholder="Número" value="${G.esc(form.addressNumber)}" />
                    <input class="field" name="complement" placeholder="Complemento" value="${G.esc(form.complement)}" />
                    <select class="field" required name="neighborhood" style="grid-column:1/-1">
                      <option value="">Selecione o bairro</option>
                      ${zones.map((z) => `<option value="${G.esc(z.name)}" ${form.neighborhood === z.name ? "selected" : ""}>${G.esc(z.name)} — ${G.formatBRL(z.price)}</option>`).join("")}
                    </select>
                    <input class="field" name="city" placeholder="Cidade" value="${G.esc(form.city)}" />
                    <input class="field" name="state" placeholder="UF" maxlength="2" value="${G.esc(form.state)}" />
                    <input class="field" name="reference" placeholder="Ponto de referência" value="${G.esc(form.reference)}" style="grid-column:1/-1" />
                    <label class="check" style="grid-column:1/-1"><input type="checkbox" name="saveAddress" ${form.saveAddress ? "checked" : ""} /> Salvar este endereço</label>
                  </div>`
                : `<p class="muted" style="margin-top:.75rem">Retirada em ${G.esc(s.address || "nosso ponto")}</p>`
            }
            <h2 style="margin-top:1.25rem">Data da encomenda</h2>
            <p class="muted">Peça com pelo menos ${s.minAdvanceDays || 1} ${(s.minAdvanceDays || 1) === 1 ? "dia" : "dias"} de antecedência.</p>
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
            <button type="button" class="btn btn-leaf" style="width:100%;margin-top:1.25rem" data-next="2">Continuar</button>
          </section>`
              : ""
          }
          ${
            step === 2
              ? `<section class="card card-shadow" style="margin-top:1rem">
            <h2>Pagamento</h2>
            <div class="pay" style="margin-top:.75rem">
              ${Object.entries(PAY).map(([k, l]) => `<button type="button" data-pay="${k}" class="${form.paymentMethod === k ? "on" : ""}">${l}</button>`).join("")}
            </div>
            ${form.paymentMethod === "CASH" ? `<label style="display:block;margin-top:.9rem"><b>Precisa de troco?</b><input class="field" name="changeFor" placeholder="Troco para R$ ______" value="${G.esc(form.changeFor)}" style="margin-top:.4rem" /></label>` : ""}
            ${form.paymentMethod === "PIX" ? `<div class="pix-box"><p>Pague com Pix na confirmação</p><b>${G.esc(pixKey)}</b><p class="muted">QR Code da maquininha entra quando a integração estiver disponível.</p></div>` : ""}
            ${form.paymentMethod === "CARD_ONLINE" ? `<p class="note" style="margin-top:.9rem">O cartão online será confirmado pelo WhatsApp. Você também pode pagar na entrega.</p>` : ""}
            <h2 style="margin-top:1.25rem">Cupom</h2>
            <div style="display:flex;gap:.5rem;margin-top:.75rem">
              <input class="field" id="coupon" placeholder="GOSTINHO10" value="${G.esc(coupon)}" />
              <button type="button" class="btn btn-leaf btn-sm" id="apply">Aplicar</button>
            </div>
            ${couponMsg ? `<p class="muted">${G.esc(couponMsg)}</p>` : ""}
            ${
              me && s.loyaltyEnabled !== false
                ? `<label class="check" style="margin-top:1rem"><input type="checkbox" id="loyal" ${redeemLoyalty ? "checked" : ""} ${me.points >= loyaltyNeed ? "" : "disabled"} /> Usar ${loyaltyNeed} pontos (${G.formatBRL(loyaltyVal)}) — você tem ${me.points} pontos</label>`
                : ""
            }
            <textarea class="field" id="notes" rows="2" placeholder="Observações" style="margin-top:.75rem">${G.esc(notes)}</textarea>
            <div style="display:flex;gap:.5rem;margin-top:1.25rem">
              <button type="button" class="btn btn-white" data-step="1">Voltar</button>
              <button type="button" class="btn btn-leaf" style="flex:1" data-next="3">Revisar pedido</button>
            </div>
          </section>`
              : ""
          }
          ${
            step === 3
              ? `<section class="card card-shadow" style="margin-top:1rem">
            <h2>Confirme seu pedido</h2>
            ${cart.items.map((i) => `<div class="line"><span>${i.quantity}x ${G.esc(i.name)}</span><span>${G.formatBRL((Number(i.price) + (i.extras || []).reduce((s, e) => s + Number(e.price), 0)) * i.quantity)}</span></div>`).join("")}
            <p class="muted" style="margin-top:1rem">${form.deliveryType === "PICKUP" ? "Retirada no local" : G.esc(form.address + ", " + form.addressNumber + " · " + form.neighborhood)}</p>
            <p class="muted">${G.formatDateBR(form.scheduledDate)} · ${SLOTS[form.scheduledSlot]} · ${PAY[form.paymentMethod]}</p>
            ${error ? `<p class="err">${G.esc(error)}</p>` : ""}
            <div style="display:flex;gap:.5rem;margin-top:1.25rem">
              <button type="button" class="btn btn-white" data-step="2">Voltar</button>
              <button class="btn btn-leaf" style="flex:1" ${sending ? "disabled" : ""}>${sending ? "Enviando..." : "Finalizar · " + G.formatBRL(total())}</button>
            </div>
          </section>`
              : ""
          }
        </div>
        <aside class="card card-shadow sticky">
          <h2>Resumo</h2>
          ${cart.items.map((i) => `<div class="line"><span>${i.quantity}x ${G.esc(i.name)}</span><span>${G.formatBRL((Number(i.price) + (i.extras || []).reduce((s, e) => s + Number(e.price), 0)) * i.quantity)}</span></div>`).join("")}
          <div style="border-top:1px solid var(--sand);margin-top:1rem;padding-top:1rem">
            <div class="line"><span>Subtotal</span><span>${G.formatBRL(subtotal)}</span></div>
            ${discount > 0 ? `<div class="line" style="color:var(--leaf)"><span>Cupom</span><span>-${G.formatBRL(discount)}</span></div>` : ""}
            ${loyaltyOff() > 0 ? `<div class="line" style="color:var(--leaf)"><span>Pontos</span><span>-${G.formatBRL(loyaltyOff())}</span></div>` : ""}
            <div class="line"><span>Entrega</span><span>${form.deliveryType === "PICKUP" ? "Retirada" : fee() === 0 ? "Grátis" : G.formatBRL(fee())}</span></div>
            <div class="line"><b>Total</b><b>${G.formatBRL(total())}</b></div>
          </div>
        </aside>
      </form>`;

    const root = document.getElementById("checkout");
    root.addEventListener("submit", submit);
    root.querySelectorAll("[name]").forEach((el) => {
      el.addEventListener("input", () => {
        if (el.type === "checkbox") form[el.name] = el.checked;
        else if (el.name === "phone") {
          form.phone = G.formatPhone(el.value);
          el.value = form.phone;
        } else form[el.name] = el.value;
      });
      el.addEventListener("change", () => {
        if (el.type === "checkbox") form[el.name] = el.checked;
        else form[el.name] = el.value;
        if (el.name === "cep") viaCep();
        if (el.name === "neighborhood" || el.name === "scheduledDate") render();
      });
    });
    root.querySelectorAll("[data-slot]").forEach((b) => (b.onclick = () => ((form.scheduledSlot = b.dataset.slot), render())));
    root.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => ((form.deliveryType = b.dataset.del), render())));
    root.querySelectorAll("[data-pay]").forEach((b) => (b.onclick = () => ((form.paymentMethod = b.dataset.pay), render())));
    root.querySelectorAll("[data-step]").forEach((b) => (b.onclick = () => ((step = Number(b.dataset.step)), render())));
    root.querySelectorAll("[data-next]").forEach((b) => (b.onclick = () => ((step = Number(b.dataset.next)), render())));
    root.querySelectorAll("[data-aid]").forEach((b) => {
      b.onclick = () => {
        const a = (me?.addresses || []).find((x) => x.id === b.dataset.aid);
        if (a) pickAddress(a);
      };
    });
    document.getElementById("coupon")?.addEventListener("input", (e) => (coupon = e.target.value.toUpperCase()));
    document.getElementById("apply")?.addEventListener("click", applyCoupon);
    document.getElementById("notes")?.addEventListener("input", (e) => {
      notes = e.target.value;
      G.setNotes(notes);
    });
    document.getElementById("loyal")?.addEventListener("change", (e) => {
      redeemLoyalty = e.target.checked;
      render();
    });
  }
  render();
});
