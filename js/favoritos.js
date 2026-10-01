G.boot((data) => {
  const el = document.getElementById("page");
  const products = data.products || [];
  const ids = G.favIds();
  const list = products.filter((p) => ids.includes(p.id));
  if (!G.getUser()?.token) {
    el.innerHTML = `<div class="empty-bag"><p class="muted">Entre para guardar seus pratos favoritos</p><a class="btn btn-leaf" href="/conta.html?next=/favoritos.html">Entrar</a></div>`;
    return;
  }
  if (!list.length) {
    el.innerHTML = `<div class="empty-bag"><p class="muted">Você ainda não favoritou nenhum prato</p><a class="btn btn-leaf" href="/#cardapio">Ver cardápio</a></div>`;
    return;
  }
  el.innerHTML = `<h1 style="font-size:1.25rem;margin:.5rem 0 1rem">Meus favoritos</h1><div class="dish-list">${list.map(G.productCard).join("")}</div>`;
  G.bindAdds(list);
});
