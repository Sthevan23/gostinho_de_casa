G.boot(async (data) => {
  const el = document.getElementById("page");
  const products = data.products || {};
  const next = G.qs("next") || "/conta.html";
  let mode = "login";
  let tab = location.hash.replace("#", "") || "perfil";
  let err = "";
  let msg = "";

  async function meFresh() {
    const u = G.getUser();
    if (!u?.token) return null;
    try {
      const out = await G.apiGet("action=me");
      G.setUser(out.customer);
      return out.customer;
    } catch {
      G.setUser(null);
      return null;
    }
  }

  function formData(id) {
    const f = document.getElementById(id);
    return Object.fromEntries(new FormData(f).entries());
  }

  async function render() {
    const me = await meFresh();
    if (!me) {
      el.innerHTML = `
        <div class="auth-card">
          <h1>${mode === "register" ? "Criar conta" : mode === "reset" ? "Recuperar senha" : "Entrar"}</h1>
          <p class="muted">Peça mais rápido com seus endereços e histórico.</p>
          ${err ? `<p class="err">${G.esc(err)}</p>` : ""}
          ${msg ? `<p class="note">${G.esc(msg)}</p>` : ""}
          <form id="auth">
            ${mode === "register" ? `<input class="field" name="name" required placeholder="Nome" />` : ""}
            <input class="field" name="login" required placeholder="${mode === "register" ? "E-mail (opcional)" : "WhatsApp ou e-mail"}" ${mode === "register" ? `style="display:none"` : ""} />
            ${mode !== "reset" ? "" : ""}
            ${mode === "register" ? `<input class="field" name="email" placeholder="E-mail" /><input class="field" name="phone" required placeholder="WhatsApp" />` : `<input class="field" name="phone" required placeholder="WhatsApp ou e-mail" />`}
            ${mode !== "reset" ? `<input class="field" name="password" type="password" required placeholder="Senha" />` : ""}
            <button class="btn btn-leaf" style="width:100%;margin-top:1rem">${mode === "register" ? "Cadastrar" : mode === "reset" ? "Enviar senha" : "Entrar"}</button>
          </form>
          <p class="muted" style="margin-top:1rem">
            ${mode === "login" ? `<a href="#" data-m="register">Criar conta</a> · <a href="#" data-m="reset">Esqueci a senha</a>` : `<a href="#" data-m="login">Já tenho conta</a>`}
          </p>
          <p class="muted" style="margin-top:.75rem">Teste: 11988880001 · senha 123456</p>
        </div>`;
      document.getElementById("auth").onsubmit = async (e) => {
        e.preventDefault();
        err = "";
        msg = "";
        const fd = formData("auth");
        try {
          if (mode === "register") {
            const out = await G.apiPost({ action: "register", name: fd.name, email: fd.email, phone: G.onlyDigits(fd.phone), password: fd.password });
            G.setUser(out.customer);
            location.href = next;
            return;
          }
          if (mode === "reset") {
            const out = await G.apiPost({ action: "reset_password", login: fd.phone || fd.login });
            msg = out.message;
            if (out.whatsappUrl) window.open(out.whatsappUrl, "_blank");
          } else {
            const out = await G.apiPost({ action: "customer_login", login: fd.phone || fd.login, password: fd.password });
            G.setUser(out.customer);
            location.href = next;
            return;
          }
        } catch (ex) {
          err = ex.message;
        }
        render();
      };
      el.querySelectorAll("[data-m]").forEach((a) => (a.onclick = (e) => (e.preventDefault(), (mode = a.dataset.m), (err = ""), render())));
      return;
    }

    const coupons = (data.coupons || []).filter((c) => c.active !== false);
    el.innerHTML = `
      <h1 style="font-size:1.3rem">Olá, ${G.esc(me.name.split(" ")[0])}</h1>
      <div class="points-pill">Você possui <b>${me.points || 0} pontos</b>. ${Number(data.settings?.loyaltyRedeemPoints || 500)} pontos = ${G.formatBRL(data.settings?.loyaltyRedeemValue || 10)}.</div>
      <div class="seg" style="margin:1rem 0">
        <button type="button" data-tab="perfil" class="${tab === "perfil" ? "on" : ""}">Perfil</button>
        <button type="button" data-tab="enderecos" class="${tab === "enderecos" ? "on" : ""}">Endereços</button>
        <button type="button" data-tab="cupons" class="${tab === "cupons" ? "on" : ""}">Cupons</button>
      </div>
      ${
        tab === "perfil"
          ? `<form class="card" id="prof">
              <div class="form-group"><label>Nome</label><input class="field" name="name" value="${G.esc(me.name)}" /></div>
              <div class="form-group"><label>Telefone</label><input class="field" name="phone" value="${G.esc(G.formatPhone(me.phone))}" /></div>
              <div class="form-group"><label>E-mail</label><input class="field" name="email" value="${G.esc(me.email || "")}" /></div>
              <div class="form-group"><label>Nova senha</label><input class="field" name="password" type="password" placeholder="Deixe em branco para manter" /></div>
              <button class="btn btn-leaf" style="margin-top:.75rem">Salvar</button>
              <button type="button" class="btn btn-white" id="out" style="margin-top:.5rem">Sair</button>
            </form>`
          : ""
      }
      ${
        tab === "enderecos"
          ? `<div>${(me.addresses || [])
              .map(
                (a) => `<div class="card" style="margin-bottom:.75rem">
                  <b>${G.esc(a.label)}</b>
                  <p class="muted">${G.esc(a.street)}, ${G.esc(a.number)} · ${G.esc(a.neighborhood)} · ${G.esc(a.city)}</p>
                  <button class="btn btn-white btn-sm" data-use="${a.id}">Usar neste pedido</button>
                  <button class="btn btn-white btn-sm" data-del="${a.id}">Excluir</button>
                </div>`,
              )
              .join("") || '<p class="muted">Nenhum endereço salvo.</p>'}
            <form class="card" id="naddr" style="margin-top:1rem">
              <h2>Novo endereço</h2>
              <div class="grid-2" style="margin-top:.75rem">
                <select class="field" name="label"><option>Casa</option><option>Trabalho</option><option>Outro</option></select>
                <input class="field" name="cep" placeholder="CEP" />
                <input class="field" name="street" required placeholder="Rua" style="grid-column:1/-1" />
                <input class="field" name="number" required placeholder="Número" />
                <input class="field" name="complement" placeholder="Complemento" />
                <input class="field" name="neighborhood" placeholder="Bairro" style="grid-column:1/-1" />
                <input class="field" name="city" placeholder="Cidade" />
                <input class="field" name="state" placeholder="UF" maxlength="2" />
                <input class="field" name="reference" placeholder="Referência" style="grid-column:1/-1" />
              </div>
              <button class="btn btn-leaf" style="margin-top:.75rem">Salvar endereço</button>
            </form>
          </div>`
          : ""
      }
      ${
        tab === "cupons"
          ? `<div class="card">${coupons.map((c) => `<div class="coupon-row"><b>${G.esc(c.code)}</b><span>${c.type === "fixed" ? G.formatBRL(c.value) : c.value + "%"} · mín. ${G.formatBRL(c.minOrder || 0)}</span></div>`).join("") || "<p class='muted'>Nenhum cupom no momento.</p>"}</div>`
          : ""
      }
      <p style="margin-top:1rem"><a class="btn btn-white" href="/pedidos.html">Meus pedidos</a> <a class="btn btn-white" href="/favoritos.html">Favoritos</a></p>
    `;
    el.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => ((tab = b.dataset.tab), history.replaceState({}, "", "#" + tab), render())));
    document.getElementById("out")?.addEventListener("click", () => {
      G.setUser(null);
      render();
    });
    document.getElementById("prof")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = formData("prof");
      try {
        const out = await G.apiPost({ action: "update_profile", ...fd, phone: G.onlyDigits(fd.phone) });
        G.setUser(out.customer);
        G.toast("Perfil atualizado");
        render();
      } catch (ex) {
        G.toast(ex.message);
      }
    });
    document.getElementById("naddr")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = formData("naddr");
      try {
        await G.apiPost({ action: "save_address", address: { ...fd, isDefault: true } });
        G.toast("Endereço salvo");
        render();
      } catch (ex) {
        G.toast(ex.message);
      }
    });
    el.querySelectorAll("[data-use]").forEach((b) => {
      b.onclick = () => {
        const a = (me.addresses || []).find((x) => x.id === b.dataset.use);
        if (a) {
          G.setAddress(a);
          G.toast("Endereço selecionado");
          location.href = "/checkout.html";
        }
      };
    });
    el.querySelectorAll("[data-del]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Excluir este endereço?")) return;
        await G.apiPost({ action: "delete_address", id: b.dataset.del });
        render();
      };
    });
  }
  render();
});
