(() => {
  if (sessionStorage.getItem("admin_logged") !== "true") {
    location.replace("login.html");
    return;
  }

  const API = "/api/data.php";
  const pass = () => sessionStorage.getItem("gostinho_admin_pass") || "";
  const TITLES = {
    dashboard: "Dashboard",
    pedidos: "Pedidos",
    produtos: "Produtos",
    estoque: "Estoque",
    categorias: "Categorias",
    promocoes: "Promoções",
    cupons: "Cupons",
    entregas: "Entregas",
    financeiro: "Financeiro",
    config: "Configurações",
  };
  const STATUS = [
    ["NEW", "Novo", "#2563eb"],
    ["CONFIRMED", "Confirmado", "#7c3aed"],
    ["PREPARING", "Preparo", "#d97706"],
    ["DELIVERING", "Entrega", "#0891b2"],
    ["DELIVERED", "Entregue", "#16a34a"],
    ["CANCELLED", "Cancelado", "#dc2626"],
  ];
  const PAY = { PIX: "Pix", CASH: "Dinheiro", CARD: "Cartão", CARD_DELIVERY: "Cartão na entrega" };

  let DATA = { orders: [], products: [], categories: [], coupons: [], zones: [], promotions: [], extras: [], finance: [], settings: {} };

  function brl(v) {
    return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2200);
  }
  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }
  function todayYMD() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  }

  async function api(body) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Password": pass() },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.status === 401) {
      sessionStorage.clear();
      location.replace("login.html");
      throw new Error("Sessão expirada");
    }
    if (!res.ok) throw new Error(data.error || "Erro");
    return data;
  }

  async function reload() {
    const res = await fetch(API + "?full=1", { headers: { "X-Admin-Password": pass() }, cache: "no-store" });
    if (res.status === 401) {
      location.replace("login.html");
      return;
    }
    DATA = await res.json();
    renderAll();
  }

  function openModal(html) {
    document.getElementById("modal").innerHTML = html;
    document.getElementById("modal-bg").classList.add("open");
  }
  function closeModal() {
    document.getElementById("modal-bg").classList.remove("open");
  }
  document.getElementById("modal-bg").addEventListener("click", (e) => {
    if (e.target.id === "modal-bg") closeModal();
  });

  function go(page) {
    document.querySelectorAll(".admin-page").forEach((p) => p.classList.toggle("active", p.id === "page-" + page));
    document.querySelectorAll(".sidebar__link[data-page]").forEach((a) => a.classList.toggle("active", a.dataset.page === page));
    document.getElementById("page-title").textContent = TITLES[page] || page;
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("backdrop").classList.remove("open");
  }

  function renderAll() {
    document.getElementById("admin-email").textContent = sessionStorage.getItem("gostinho_admin_email") || DATA.settings?.adminEmail || "";
    const orders = DATA.orders || [];
    const news = orders.filter((o) => o.status === "NEW").length;
    const badge = document.getElementById("badge-new");
    badge.hidden = news === 0;
    badge.textContent = news;
    const low = (DATA.products || []).filter((p) => p.active && p.stock <= 5).length;
    const bs = document.getElementById("badge-stock");
    bs.hidden = low === 0;
    bs.textContent = low;
    renderDash();
    renderOrders();
    renderProducts();
    renderStock();
    renderCats();
    renderPromos();
    renderCoupons();
    renderZones();
    renderFinance();
    renderConfig();
  }

  function renderDash() {
    const orders = DATA.orders || [];
    const today = todayYMD();
    const ofToday = orders.filter((o) => (o.createdAt || "").slice(0, 10) === today || (o.scheduledDate || "") === today);
    const open = orders.filter((o) => !["DELIVERED", "CANCELLED"].includes(o.status)).length;
    const sales = ofToday.filter((o) => o.status !== "CANCELLED").reduce((s, o) => s + Number(o.total), 0);
    document.getElementById("stat-new").textContent = orders.filter((o) => o.status === "NEW").length;
    document.getElementById("stat-open").textContent = open;
    document.getElementById("stat-today").textContent = brl(sales);
    document.getElementById("stat-prods").textContent = (DATA.products || []).filter((p) => p.active).length;
    const last = orders.slice(0, 8);
    document.getElementById("dash-orders").innerHTML = last.length
      ? `<table class="data"><thead><tr><th>#</th><th>Cliente</th><th>Encomenda</th><th>Total</th><th>Status</th></tr></thead><tbody>${last
          .map(
            (o) =>
              `<tr><td>${String(o.number).padStart(3, "0")}</td><td>${esc(o.customerName)}</td><td>${esc(o.scheduledDate)} ${o.scheduledSlot === "JANTAR" ? "Jantar" : "Almoço"}</td><td>${brl(o.total)}</td><td>${STATUS.find((s) => s[0] === o.status)?.[1] || o.status}</td></tr>`,
          )
          .join("")}</tbody></table>`
      : '<p style="color:var(--muted)">Nenhum pedido ainda.</p>';
  }

  function renderOrders() {
    const q = (document.getElementById("order-q")?.value || "").toLowerCase();
    const list = (DATA.orders || []).filter((o) => {
      if (!q) return true;
      return `${o.number} ${o.customerName} ${o.phone}`.toLowerCase().includes(q);
    });
    document.getElementById("kanban").innerHTML = STATUS.map(([key, label]) => {
      const col = list.filter((o) => o.status === key);
      return `<div class="kanban__col"><h3>${label} <span>${col.length}</span></h3>${col
        .map(
          (o) => `<div class="ticket" data-open="${o.id}">
            <b>#${String(o.number).padStart(3, "0")} · ${esc(o.customerName)}</b>
            ${esc(o.scheduledDate)} · ${o.scheduledSlot === "JANTAR" ? "Jantar" : "Almoço"}<br/>
            ${brl(o.total)}
            <select data-ord="${o.id}" onclick="event.stopPropagation()">${STATUS.map(
              ([sk, sl]) => `<option value="${sk}" ${sk === o.status ? "selected" : ""}>${sl}</option>`,
            ).join("")}</select>
            <button type="button" class="btn btn-ghost btn-sm" data-print="${o.id}" onclick="event.stopPropagation()">Imprimir</button>
          </div>`,
        )
        .join("")}</div>`;
    }).join("");
    document.querySelectorAll("[data-ord]").forEach((sel) => {
      sel.onchange = async () => {
        await api({ action: "update_order", id: sel.dataset.ord, status: sel.value });
        toast("Status atualizado");
        await reload();
      };
    });
    document.querySelectorAll("[data-print]").forEach((btn) => (btn.onclick = () => printOrder(btn.dataset.print)));
    document.querySelectorAll("[data-open]").forEach((el) => (el.onclick = () => showOrder(el.dataset.open)));
  }

  function showOrder(id) {
    const o = (DATA.orders || []).find((x) => x.id === id);
    if (!o) return;
    const addr =
      o.deliveryType === "PICKUP"
        ? "Retirada no local"
        : `${o.address}, ${o.addressNumber}${o.complement ? " - " + o.complement : ""} · ${o.neighborhood || ""}`;
    openModal(`<h2>Pedido #${String(o.number).padStart(3, "0")}</h2>
      <p><b>${esc(o.customerName)}</b> · ${esc(o.phone)}</p>
      <p style="color:var(--muted);margin:.5rem 0">${esc(o.scheduledDate)} · ${o.scheduledSlot === "JANTAR" ? "Jantar" : "Almoço"}</p>
      <p>${esc(addr)}</p>
      <p>Pagamento: ${PAY[o.paymentMethod] || o.paymentMethod}</p>
      <ul style="margin:12px 0;padding-left:18px">${(o.items || [])
        .map((i) => `<li>${i.quantity}x ${esc(i.productName)} ${esc(i.size || "")} ${esc(i.extras || "")} — ${brl(i.unitPrice * i.quantity)}</li>`)
        .join("")}</ul>
      ${o.notes ? `<p><b>Obs:</b> ${esc(o.notes)}</p>` : ""}
      <p style="margin-top:8px"><b>Total ${brl(o.total)}</b></p>
      <div class="modal__actions">
        <button class="btn btn-ghost" type="button" id="m-close">Fechar</button>
        <button class="btn btn-primary" type="button" id="m-print">Imprimir</button>
      </div>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("m-print").onclick = () => printOrder(id);
  }

  function printOrder(id) {
    const o = (DATA.orders || []).find((x) => x.id === id);
    if (!o) return;
    const w = window.open("", "print");
    w.document.write(`<!DOCTYPE html><title>Pedido ${o.number}</title>
      <pre style="font:13px 'Courier New',monospace;width:280px;white-space:pre-wrap">
GOSTINHO DE CASA
------------------------------
Pedido #${String(o.number).padStart(3, "0")}
${o.customerName}
${o.phone}
Encomenda: ${o.scheduledDate} ${o.scheduledSlot === "JANTAR" ? "Jantar" : "Almoço"}
${o.deliveryType === "PICKUP" ? "RETIRADA" : o.address + ", " + o.addressNumber + "\\n" + (o.neighborhood || "")}
------------------------------
${(o.items || []).map((i) => `${i.quantity}x ${i.productName}${i.size ? " " + i.size : ""}\\n   ${brl(i.unitPrice * i.quantity)}`).join("\\n")}
------------------------------
Subtotal ${brl(o.subtotal)}
${o.discount ? "Desconto -" + brl(o.discount) + "\\n" : ""}Entrega ${o.deliveryType === "PICKUP" ? "0" : brl(o.deliveryFee)}
TOTAL ${brl(o.total)}
Pagamento: ${PAY[o.paymentMethod] || o.paymentMethod}
${o.notes ? "Obs: " + o.notes : ""}
      </pre><script>onload=()=>{print();close()}<\/script>`);
    api({ action: "update_order", id, status: o.status, printed: true }).catch(() => {});
  }

  function renderProducts() {
    const cats = Object.fromEntries((DATA.categories || []).map((c) => [c.id, c.name]));
    document.getElementById("tbl-products").innerHTML = `<thead><tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th></th><th></th></tr></thead><tbody>${(DATA.products || [])
      .map(
        (p) => `<tr>
          <td><img class="thumb" src="${esc(p.image || "/logo.png")}" alt="" /></td>
          <td><b>${esc(p.name)}</b><br/><span class="badge ${p.active ? "badge-on" : "badge-off"}">${p.active ? "Ativo" : "Off"}</span> ${p.promotional ? '<span class="badge badge-promo">Promo</span>' : ""}</td>
          <td>${esc(cats[p.categoryId] || "")}</td>
          <td>${p.promotional && p.promoPrice != null ? brl(p.promoPrice) : brl(p.price)}</td>
          <td><button class="btn-icon edit" data-ed="${p.id}"><i class="fas fa-pen"></i></button></td>
          <td><button class="btn-icon delete" data-del="${p.id}"><i class="fas fa-trash"></i></button></td>
        </tr>`,
      )
      .join("")}</tbody>`;
    document.querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => editProduct(b.dataset.ed)));
    document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => delProduct(b.dataset.del)));
  }

  function editProduct(id) {
    const p = id ? (DATA.products || []).find((x) => x.id === id) : null;
    const extraIds = p?.extraIds || [];
    openModal(`<h2>${p ? "Editar produto" : "Novo produto"}</h2>
      <form id="fp">
        <div class="form-group"><label>Nome</label><input name="name" required value="${esc(p?.name || "")}" /></div>
        <div class="form-group"><label>Descrição</label><textarea name="description" rows="2">${esc(p?.description || "")}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Preço</label><input name="price" type="number" step="0.01" required value="${p?.price ?? 0}" /></div>
          <div class="form-group"><label>Estoque</label><input name="stock" type="number" value="${p?.stock ?? 40}" /></div>
        </div>
        <div class="form-group"><label>Categoria</label><select name="categoryId">${(DATA.categories || [])
          .map((c) => `<option value="${c.id}" ${c.id === p?.categoryId ? "selected" : ""}>${esc(c.name)}</option>`)
          .join("")}</select></div>
        <div class="form-group"><label>Foto (URL)</label><input name="image" value="${esc(p?.image || "")}" /></div>
        <div class="form-group"><label>Enviar foto</label><input type="file" id="photo" accept="image/*" /></div>
        <div class="form-group"><label>Ingredientes</label><input name="ingredients" value="${esc(p?.ingredients || "")}" /></div>
        <label class="check"><input type="checkbox" name="featured" ${p?.featured ? "checked" : ""} /> Destaque na home</label>
        <label class="check"><input type="checkbox" name="promotional" ${p?.promotional ? "checked" : ""} /> Promoção</label>
        <div class="form-group"><label>Preço promo</label><input name="promoPrice" type="number" step="0.01" value="${p?.promoPrice ?? ""}" /></div>
        <label class="check"><input type="checkbox" name="active" ${p?.active !== false ? "checked" : ""} /> Ativo no cardápio</label>
        <p style="margin:10px 0 6px;font-size:.85rem;font-weight:600">Adicionais deste prato</p>
        ${(DATA.extras || [])
          .map(
            (e) =>
              `<label class="check"><input type="checkbox" name="ex" value="${e.id}" ${extraIds.includes(e.id) ? "checked" : ""} /> ${esc(e.name)} (${brl(e.price)})</label>`,
          )
          .join("")}
        <div class="modal__actions">
          <button class="btn btn-ghost" type="button" id="m-close">Cancelar</button>
          <button class="btn btn-primary" type="submit">Salvar</button>
        </div>
      </form>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("photo").onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload.php", { method: "POST", headers: { "X-Admin-Password": pass() }, body: fd });
      const out = await res.json();
      if (out.url) document.querySelector("#fp [name=image]").value = out.url;
      else toast(out.error || "Falha no upload");
    };
    document.getElementById("fp").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const extraIdsNew = [...ev.target.querySelectorAll("[name=ex]:checked")].map((i) => i.value);
      const name = String(fd.get("name"));
      const slug = name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      await api({
        action: "save_product",
        product: {
          ...(p || {}),
          name,
          slug: p?.slug || slug,
          description: fd.get("description"),
          price: Number(fd.get("price")),
          stock: Number(fd.get("stock")),
          categoryId: fd.get("categoryId"),
          image: fd.get("image"),
          ingredients: fd.get("ingredients"),
          featured: ev.target.featured.checked,
          promotional: ev.target.promotional.checked,
          promoPrice: fd.get("promoPrice") === "" ? null : Number(fd.get("promoPrice")),
          active: ev.target.active.checked,
          extraIds: extraIdsNew,
          sizes: p?.sizes || [],
        },
      });
      closeModal();
      toast("Produto salvo");
      await reload();
    };
  }

  async function delProduct(id) {
    if (!confirm("Excluir este produto?")) return;
    await api({ action: "delete_product", id });
    toast("Produto excluído");
    await reload();
  }

  function renderStock() {
    document.getElementById("tbl-stock").innerHTML = `<thead><tr><th>Produto</th><th>Estoque</th><th>Alerta</th></tr></thead><tbody>${(DATA.products || [])
      .map(
        (p) =>
          `<tr><td>${esc(p.name)}</td><td><input type="number" value="${p.stock}" data-st="${p.id}" style="width:5.5rem;padding:6px 8px;border-radius:8px;border:1px solid #eee" /></td><td class="${p.stock <= 5 ? "low" : ""}">${p.stock <= 5 ? "Baixo" : "OK"}</td></tr>`,
      )
      .join("")}</tbody>`;
    document.querySelectorAll("[data-st]").forEach((inp) => {
      inp.onchange = async () => {
        await api({ action: "update_stock", id: inp.dataset.st, stock: Number(inp.value) });
        toast("Estoque atualizado");
        await reload();
      };
    });
  }

  function renderCats() {
    document.getElementById("cats-list").innerHTML = (DATA.categories || [])
      .map(
        (c) => `<form class="card" data-cat="${c.id}" style="margin-bottom:10px;display:grid;gap:8px">
          <div class="form-row">
            <div class="form-group" style="margin:0"><label>Nome</label><input name="name" value="${esc(c.name)}" /></div>
            <div class="form-group" style="margin:0"><label>Slug</label><input name="slug" value="${esc(c.slug)}" /></div>
          </div>
          <div class="form-group" style="margin:0"><label>Imagem</label><input name="image" value="${esc(c.image || "")}" /></div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" type="submit">Salvar</button>
            <button class="btn btn-danger btn-sm" type="button" data-delc="${c.id}">Excluir</button>
          </div>
        </form>`,
      )
      .join("");
    document.querySelectorAll("[data-cat]").forEach((f) => {
      f.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        const cur = DATA.categories.find((c) => c.id === f.dataset.cat);
        await api({ action: "save_category", category: { ...cur, name: fd.get("name"), slug: fd.get("slug"), image: fd.get("image") } });
        toast("Categoria salva");
        await reload();
      };
    });
    document.querySelectorAll("[data-delc]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Excluir categoria?")) return;
        await api({ action: "delete_category", id: b.dataset.delc });
        await reload();
      };
    });
  }

  function renderPromos() {
    document.getElementById("promos-list").innerHTML = (DATA.promotions || [])
      .map(
        (p) => `<form class="card" data-pr="${p.id}" style="margin-bottom:10px;display:grid;gap:8px">
          <input name="name" value="${esc(p.name)}" placeholder="Nome" />
          <textarea name="description">${esc(p.description || "")}</textarea>
          <input name="image" value="${esc(p.image || "")}" placeholder="URL da imagem" />
          <input name="value" type="number" step="0.01" value="${p.value || 0}" />
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-sm" type="submit">Salvar</button>
            <button class="btn btn-danger btn-sm" type="button" data-delp="${p.id}">Excluir</button>
          </div>
        </form>`,
      )
      .join("") || "<p>Nenhuma promoção.</p>";
    document.querySelectorAll("[data-pr]").forEach((f) => {
      f.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        const cur = DATA.promotions.find((p) => p.id === f.dataset.pr);
        await api({
          action: "save_promotion",
          promotion: { ...cur, name: fd.get("name"), description: fd.get("description"), image: fd.get("image"), value: Number(fd.get("value")), active: true },
        });
        toast("Promoção salva");
        await reload();
      };
    });
    document.querySelectorAll("[data-delp]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Excluir promoção?")) return;
        await api({ action: "delete_promotion", id: b.dataset.delp });
        await reload();
      };
    });
  }

  function renderCoupons() {
    document.getElementById("tbl-coupons").innerHTML = `<thead><tr><th>Código</th><th>Tipo</th><th>Valor</th><th>Mínimo</th><th></th></tr></thead><tbody>${(DATA.coupons || [])
      .map(
        (c) =>
          `<tr><td><b>${esc(c.code)}</b></td><td>${c.type === "fixed" ? "Valor" : "%"}</td><td>${c.type === "fixed" ? brl(c.value) : c.value + "%"}</td><td>${brl(c.minOrder)}</td><td><button class="btn-icon delete" data-dc="${c.id}"><i class="fas fa-trash"></i></button></td></tr>`,
      )
      .join("")}</tbody>`;
    document.querySelectorAll("[data-dc]").forEach((b) => {
      b.onclick = async () => {
        if (!confirm("Excluir cupom?")) return;
        await api({ action: "delete_coupon", id: b.dataset.dc });
        await reload();
      };
    });
  }

  function renderZones() {
    document.getElementById("zones-list").innerHTML = (DATA.zones || [])
      .map(
        (z) => `<form class="card" data-z="${z.id}" style="display:flex;gap:8px;align-items:end;margin-bottom:8px;flex-wrap:wrap">
          <div class="form-group" style="margin:0;flex:1"><label>Bairro</label><input name="name" value="${esc(z.name)}" /></div>
          <div class="form-group" style="margin:0;width:8rem"><label>Taxa</label><input name="price" type="number" step="0.01" value="${z.price}" /></div>
          <button class="btn btn-primary btn-sm" type="submit">Salvar</button>
          <button class="btn btn-danger btn-sm" type="button" data-dz="${z.id}">Excluir</button>
        </form>`,
      )
      .join("");
    document.querySelectorAll("[data-z]").forEach((f) => {
      f.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        const cur = DATA.zones.find((z) => z.id === f.dataset.z);
        await api({ action: "save_zone", zone: { ...cur, name: fd.get("name"), price: Number(fd.get("price")), active: true } });
        toast("Bairro salvo");
        await reload();
      };
    });
    document.querySelectorAll("[data-dz]").forEach((b) => {
      b.onclick = async () => {
        await api({ action: "delete_zone", id: b.dataset.dz });
        await reload();
      };
    });
    document.getElementById("extras-list").innerHTML = (DATA.extras || [])
      .map(
        (e) => `<form class="card" data-ex="${e.id}" style="display:flex;gap:8px;align-items:end;margin-bottom:8px;flex-wrap:wrap">
          <div class="form-group" style="margin:0;flex:1"><label>Adicional</label><input name="name" value="${esc(e.name)}" /></div>
          <div class="form-group" style="margin:0;width:8rem"><label>Preço</label><input name="price" type="number" step="0.01" value="${e.price}" /></div>
          <button class="btn btn-primary btn-sm" type="submit">Salvar</button>
          <button class="btn btn-danger btn-sm" type="button" data-de="${e.id}">Excluir</button>
        </form>`,
      )
      .join("");
    document.querySelectorAll("[data-ex]").forEach((f) => {
      f.onsubmit = async (e) => {
        e.preventDefault();
        const fd = new FormData(f);
        const cur = DATA.extras.find((x) => x.id === f.dataset.ex);
        await api({ action: "save_extra", extra: { ...cur, name: fd.get("name"), price: Number(fd.get("price")), active: true } });
        toast("Adicional salvo");
        await reload();
      };
    });
    document.querySelectorAll("[data-de]").forEach((b) => {
      b.onclick = async () => {
        await api({ action: "delete_extra", id: b.dataset.de });
        await reload();
      };
    });
  }

  function renderFinance() {
    const orders = (DATA.orders || []).filter((o) => o.status === "DELIVERED");
    const incomeOrders = orders.reduce((s, o) => s + Number(o.total), 0);
    const extras = DATA.finance || [];
    const incomeMan = extras.filter((f) => f.type === "income").reduce((s, f) => s + Number(f.amount), 0);
    const expense = extras.filter((f) => f.type === "expense").reduce((s, f) => s + Number(f.amount), 0);
    const income = incomeOrders + incomeMan;
    document.getElementById("fin-stats").innerHTML = `
      <div class="stat-card"><div class="stat-card__icon" style="background:#e8f5e9;color:#2d6a4f"><i class="fas fa-arrow-up"></i></div><div><span class="stat-card__label">Receitas</span><strong class="stat-card__value">${brl(income)}</strong></div></div>
      <div class="stat-card"><div class="stat-card__icon" style="background:#ffebee;color:#dc2626"><i class="fas fa-arrow-down"></i></div><div><span class="stat-card__label">Despesas</span><strong class="stat-card__value">${brl(expense)}</strong></div></div>
      <div class="stat-card"><div class="stat-card__icon" style="background:#fff8e1;color:#c4a574"><i class="fas fa-balance-scale"></i></div><div><span class="stat-card__label">Saldo</span><strong class="stat-card__value">${brl(income - expense)}</strong></div></div>
      <div class="stat-card"><div class="stat-card__icon" style="background:#e3f2fd;color:#2563eb"><i class="fas fa-receipt"></i></div><div><span class="stat-card__label">Pedidos entregues</span><strong class="stat-card__value">${orders.length}</strong></div></div>`;
    const rows = [
      ...orders.map((o) => ({
        date: (o.createdAt || "").slice(0, 10),
        type: "Pedido #" + String(o.number).padStart(3, "0"),
        amount: o.total,
        kind: "income",
        id: null,
      })),
      ...extras.map((f) => ({ date: f.date, type: f.description, amount: f.amount, kind: f.type, id: f.id })),
    ].sort((a, b) => String(b.date).localeCompare(String(a.date)));
    document.getElementById("tbl-finance").innerHTML = `<thead><tr><th>Data</th><th>Descrição</th><th>Valor</th><th></th></tr></thead><tbody>${rows
      .map(
        (r) =>
          `<tr><td>${esc(r.date)}</td><td>${esc(r.type)}</td><td style="color:${r.kind === "expense" ? "var(--danger)" : "var(--leaf)"}">${r.kind === "expense" ? "-" : "+"}${brl(r.amount)}</td><td>${r.id ? `<button class="btn-icon delete" data-df="${r.id}"><i class="fas fa-trash"></i></button>` : ""}</td></tr>`,
      )
      .join("")}</tbody>`;
    document.querySelectorAll("[data-df]").forEach((b) => {
      b.onclick = async () => {
        await api({ action: "delete_finance", id: b.dataset.df });
        await reload();
      };
    });
  }

  function renderConfig() {
    const s = DATA.settings || {};
    document.getElementById("form-config").innerHTML = `
      <h2 style="margin-bottom:12px">Dados da loja</h2>
      <div class="form-group"><label>Nome</label><input name="companyName" value="${esc(s.companyName || "")}" /></div>
      <div class="form-group"><label>Slogan</label><input name="slogan" value="${esc(s.slogan || "")}" /></div>
      <div class="form-row">
        <div class="form-group"><label>WhatsApp</label><input name="whatsapp" value="${esc(s.whatsapp || "")}" /></div>
        <div class="form-group"><label>Instagram</label><input name="instagram" value="${esc(s.instagram || "")}" /></div>
      </div>
      <div class="form-group"><label>Endereço</label><input name="address" value="${esc(s.address || "")}" /></div>
      <div class="form-group"><label>Horário</label><input name="hours" value="${esc(s.hours || "")}" /></div>
      <div class="form-row">
        <div class="form-group"><label>Dias de antecedência</label><input name="minAdvanceDays" type="number" min="1" value="${s.minAdvanceDays || 1}" /></div>
        <div class="form-group"><label>Pedido mínimo (R$)</label><input name="minOrderValue" type="number" step="0.01" value="${s.minOrderValue || 0}" /></div>
      </div>
      <label class="check"><input type="checkbox" name="deliveryEnabled" ${s.deliveryEnabled !== false ? "checked" : ""} /> Entrega</label>
      <label class="check"><input type="checkbox" name="pickupEnabled" ${s.pickupEnabled !== false ? "checked" : ""} /> Retirada</label>
      <h3 style="margin:18px 0 8px">Acesso</h3>
      <div class="form-group"><label>E-mail admin</label><input name="adminEmail" value="${esc(s.adminEmail || "")}" /></div>
      <div class="form-group"><label>Nova senha (deixe em branco para manter)</label><input name="adminPassword" type="password" autocomplete="new-password" /></div>
      <button class="btn btn-primary" type="submit">Salvar configurações</button>`;
  }

  document.getElementById("form-config").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const settings = Object.fromEntries(fd.entries());
    settings.minAdvanceDays = Number(settings.minAdvanceDays);
    settings.minOrderValue = Number(settings.minOrderValue);
    settings.deliveryEnabled = e.target.deliveryEnabled.checked;
    settings.pickupEnabled = e.target.pickupEnabled.checked;
    if (!settings.adminPassword) delete settings.adminPassword;
    await api({ action: "save_settings", settings });
    if (settings.adminPassword) sessionStorage.setItem("gostinho_admin_pass", settings.adminPassword);
    if (settings.adminEmail) sessionStorage.setItem("gostinho_admin_email", settings.adminEmail);
    toast("Configurações salvas");
    await reload();
  });

  document.querySelectorAll(".sidebar__link[data-page]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      go(a.dataset.page);
    });
  });
  document.getElementById("menu-btn").onclick = () => {
    document.getElementById("sidebar").classList.add("open");
    document.getElementById("backdrop").classList.add("open");
  };
  document.getElementById("backdrop").onclick = () => {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("backdrop").classList.remove("open");
  };
  document.getElementById("logout").onclick = (e) => {
    e.preventDefault();
    sessionStorage.clear();
    location.href = "login.html";
  };
  document.getElementById("reload").onclick = reload;
  document.getElementById("order-q").addEventListener("input", renderOrders);
  document.getElementById("new-product").onclick = () => editProduct(null);
  document.getElementById("new-cat").onclick = () => {
    openModal(`<h2>Nova categoria</h2><form id="fc">
      <div class="form-group"><label>Nome</label><input name="name" required /></div>
      <div class="form-group"><label>Slug</label><input name="slug" placeholder="ex: fitness" /></div>
      <div class="modal__actions"><button class="btn btn-ghost" type="button" id="m-close">Cancelar</button><button class="btn btn-primary">Criar</button></div></form>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("fc").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const name = String(fd.get("name"));
      const slug =
        String(fd.get("slug") || name)
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") || "cat";
      await api({ action: "save_category", category: { name, slug, image: "", active: true, sortOrder: 99 } });
      closeModal();
      await reload();
    };
  };
  document.getElementById("new-promo").onclick = () => {
    openModal(`<h2>Nova promoção</h2><form id="fpr">
      <div class="form-group"><label>Nome</label><input name="name" required /></div>
      <div class="form-group"><label>Texto</label><textarea name="description"></textarea></div>
      <div class="form-group"><label>Imagem</label><input name="image" /></div>
      <div class="form-group"><label>Valor</label><input name="value" type="number" step="0.01" value="0" /></div>
      <div class="modal__actions"><button class="btn btn-ghost" type="button" id="m-close">Cancelar</button><button class="btn btn-primary">Criar</button></div></form>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("fpr").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      await api({
        action: "save_promotion",
        promotion: { name: fd.get("name"), description: fd.get("description"), image: fd.get("image"), value: Number(fd.get("value")), type: "product", active: true },
      });
      closeModal();
      await reload();
    };
  };
  document.getElementById("new-coupon").onclick = () => {
    openModal(`<h2>Novo cupom</h2><form id="fcu">
      <div class="form-group"><label>Código</label><input name="code" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Tipo</label><select name="type"><option value="percent">%</option><option value="fixed">Valor fixo</option></select></div>
        <div class="form-group"><label>Valor</label><input name="value" type="number" step="0.01" required /></div>
      </div>
      <div class="form-group"><label>Pedido mínimo</label><input name="minOrder" type="number" step="0.01" value="0" /></div>
      <div class="modal__actions"><button class="btn btn-ghost" type="button" id="m-close">Cancelar</button><button class="btn btn-primary">Criar</button></div></form>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("fcu").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      await api({
        action: "save_coupon",
        coupon: { code: fd.get("code"), type: fd.get("type"), value: Number(fd.get("value")), minOrder: Number(fd.get("minOrder") || 0), active: true },
      });
      closeModal();
      await reload();
    };
  };
  document.getElementById("new-zone").onclick = () => {
    openModal(`<h2>Novo bairro</h2><form id="fz">
      <div class="form-group"><label>Nome</label><input name="name" required /></div>
      <div class="form-group"><label>Taxa</label><input name="price" type="number" step="0.01" required /></div>
      <div class="modal__actions"><button class="btn btn-ghost" type="button" id="m-close">Cancelar</button><button class="btn btn-primary">Criar</button></div></form>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("fz").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      await api({ action: "save_zone", zone: { name: fd.get("name"), price: Number(fd.get("price")), active: true } });
      closeModal();
      await reload();
    };
  };
  document.getElementById("new-extra").onclick = () => {
    openModal(`<h2>Novo adicional</h2><form id="fe">
      <div class="form-group"><label>Nome</label><input name="name" required /></div>
      <div class="form-group"><label>Preço</label><input name="price" type="number" step="0.01" required /></div>
      <div class="modal__actions"><button class="btn btn-ghost" type="button" id="m-close">Cancelar</button><button class="btn btn-primary">Criar</button></div></form>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("fe").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      await api({ action: "save_extra", extra: { name: fd.get("name"), price: Number(fd.get("price")), active: true } });
      closeModal();
      await reload();
    };
  };
  document.getElementById("new-fin").onclick = () => {
    openModal(`<h2>Lançamento</h2><form id="ff">
      <div class="form-group"><label>Tipo</label><select name="type"><option value="expense">Despesa</option><option value="income">Receita extra</option></select></div>
      <div class="form-group"><label>Descrição</label><input name="description" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Valor</label><input name="amount" type="number" step="0.01" required /></div>
        <div class="form-group"><label>Data</label><input name="date" type="date" value="${todayYMD()}" /></div>
      </div>
      <div class="modal__actions"><button class="btn btn-ghost" type="button" id="m-close">Cancelar</button><button class="btn btn-primary">Salvar</button></div></form>`);
    document.getElementById("m-close").onclick = closeModal;
    document.getElementById("ff").onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      await api({
        action: "save_finance",
        entry: { type: fd.get("type"), description: fd.get("description"), amount: Number(fd.get("amount")), date: fd.get("date") },
      });
      closeModal();
      await reload();
    };
  };

  reload().catch((err) => {
    document.getElementById("page-dashboard").innerHTML = `<div class="card"><p>${esc(err.message)}</p><p style="margin-top:8px;color:var(--muted)">O painel precisa do PHP (Hostinger). No PC, rode <code>php -S localhost:8080</code>.</p></div>`;
  });
})();
