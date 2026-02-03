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

document.addEventListener("DOMContentLoaded", () => {
  carregarVisaoGeral();
});

function carregarVisaoGeral() {
  // valores mockados (por enquanto)
  const dados = {
    entradas: 12500,
    saidas: 4200,
    eventos: 18,
    comparativo: "+12% vs mês anterior"
  };

  const lucro = dados.entradas - dados.saidas;
  const saldo = lucro; // depois pode somar saldo acumulado

  setValor("kpi-entradas", dados.entradas);
  setValor("kpi-saidas", dados.saidas);
  setValor("kpi-lucro", lucro);
  setValor("kpi-saldo", saldo);

  document.getElementById("kpi-eventos").textContent = dados.eventos;
  document.getElementById("kpi-comparativo").textContent = dados.comparativo;
}

function setValor(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
