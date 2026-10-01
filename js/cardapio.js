G.boot((data) => {
  const products = data.products || [];
  const cats = data.categories || [];
  const params = new URLSearchParams(location.search);
  let categoria = params.get("categoria") || "";
  let q = "";

  function filtered() {
    const nq = q
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    return products.filter((p) => {
      if (categoria && (p.category?.slug || "") !== categoria) return false;
      if (!nq) return true;
      const blob = `${p.name} ${p.description} ${p.ingredients || ""}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return blob.includes(nq);
    });
  }

  function render() {
    document.getElementById("filters").innerHTML =
      `<button class="filter ${!categoria ? "on" : ""}" data-c="">Tudo</button>` +
      cats
        .map((c) => `<button class="filter ${categoria === c.slug ? "on" : ""}" data-c="${c.slug}">${c.name}</button>`)
        .join("");
    document.querySelectorAll(".filter").forEach((b) => {
      b.onclick = () => {
        categoria = b.dataset.c;
        const url = new URL(location.href);
        if (categoria) url.searchParams.set("categoria", categoria);
        else url.searchParams.delete("categoria");
        history.replaceState({}, "", url);
        render();
      };
    });
    const list = filtered();
    document.getElementById("list").innerHTML = list.length
      ? list.map(G.productCard).join("")
      : '<p class="muted">Nenhum prato encontrado.</p>';
    G.bindAdds(list);
  }

  document.getElementById("q").addEventListener("input", (e) => {
    q = e.target.value;
    render();
  });
  render();
});
