// js/financeiro/financeiro.js

function abrirFinanceiro(secao) {
  // controla botões
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  event.target.classList.add("active");

  // controla seções
  document.querySelectorAll(".catalogo-section").forEach(sec => {
    sec.classList.remove("active");
  });

  const el = document.getElementById(secao);
  if (el) {
    el.classList.add("active");
    renderFinanceiro(secao);
  }
}

// dispatcher central
function renderFinanceiro(secao) {
  switch (secao) {
    case "visao":
      renderVisaoGeral();
      break;
    case "entradas":
      renderEntradas();
      break;
    case "saidas":
      renderSaidas();
      break;
    case "balanco":
      renderBalanco();
      break;
    case "comparativos":
      renderComparativos();
      break;
    case "relatorios":
      renderRelatorios();
      break;
  }
}

// render inicial
document.addEventListener("DOMContentLoaded", () => {
  renderVisaoGeral();
});
