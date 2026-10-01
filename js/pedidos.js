G.boot(async (data) => {
  const el = document.getElementById("page");
  const last = localStorage.getItem("gostinho-last-order");
  if (last) {
    location.replace("/pedido.html?id=" + encodeURIComponent(last));
    return;
  }
  el.innerHTML = `<div class="empty-bag"><p class="muted">Você ainda não fez um pedido</p><a class="btn btn-leaf" href="/#cardapio">Ver cardápio</a></div>`;
});
