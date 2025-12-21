// ============================
// CATÁLOGO — CONTROLE DE ABAS
// ============================

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tab-btn");
  const content = document.getElementById("catalogo-content");

  function ativarAba(tab) {
    tabs.forEach(b => b.classList.remove("active"));
    tab.classList.add("active");

    const tipo = tab.dataset.tab;
    content.innerHTML = "";

    if (tipo === "itens") {
      carregarItens();
    } else if (tipo === "pacotes") {
      carregarPacotes();
    } else if (tipo === "promocoes") {
      carregarPromocoes();
    }
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => ativarAba(tab));
  });

  // inicial
  carregarItens();
});

