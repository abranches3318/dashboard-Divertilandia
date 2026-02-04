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

const periodoSelect = document.querySelector(".financeiro-periodo");
const wrapper = document.querySelector(".financeiro-periodo-wrapper");

periodoSelect.addEventListener("focus", () => {
  wrapper.classList.add("open");
});

periodoSelect.addEventListener("blur", () => {
  wrapper.classList.remove("open");
});


// ===============================
// GRÁFICOS FAKE — VISÃO GERAL
// ===============================

let graficoPrincipal;
let graficoEventos;
let graficoGastos;

document.addEventListener("DOMContentLoaded", () => {
  renderGraficosFake();
});

function renderGraficosFake() {

  // -------------------------------
  // GRÁFICO PRINCIPAL (LINHA)
  // -------------------------------
  const ctxPrincipal = document
    .getElementById("graficoFinanceiroPrincipal")
    .getContext("2d");

  graficoPrincipal = new Chart(ctxPrincipal, {
    type: "line",
    data: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      datasets: [
        {
          label: "Entradas",
          data: [12000, 15000, 13000, 17000, 16000, 18000],
          borderColor: "#2ecc71",
          tension: 0.4
        },
        {
          label: "Saídas",
          data: [5000, 7000, 6200, 8000, 7500, 8200],
          borderColor: "#e74c3c",
          tension: 0.4
        },
        {
          label: "Saldo",
          data: [7000, 8000, 6800, 9000, 8500, 9800],
          borderColor: "#4cafef",
          tension: 0.4
        }
      ]
    },
    options: chartOptions()
  });

  // -------------------------------
  // GRÁFICO EVENTOS (LINHA)
  // -------------------------------
  const ctxEventos = document
    .getElementById("graficoEventos")
    .getContext("2d");

  graficoEventos = new Chart(ctxEventos, {
    type: "line",
    data: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      datasets: [
        {
          label: "Eventos",
          data: [8, 12, 10, 14, 16, 18],
          borderColor: "#f1c40f",
          tension: 0.4
        }
      ]
    },
    options: chartOptions()
  });

  // -------------------------------
  // GRÁFICO GASTOS (PIZZA)
  // -------------------------------
  const ctxGastos = document
    .getElementById("graficoGastos")
    .getContext("2d");

  graficoGastos = new Chart(ctxGastos, {
    type: "doughnut",
    data: {
      labels: ["Funcionários", "Manutenção", "Transporte", "Outros"],
      datasets: [
        {
          data: [40, 25, 20, 15],
          backgroundColor: [
            "#e74c3c",
            "#4cafef",
            "#f1c40f",
            "#9b59b6"
          ]
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#ccc" }
        }
      }
    }
  });
}

// -------------------------------
// OPÇÕES PADRÃO (REUTILIZÁVEL)
// -------------------------------
function chartOptions() {
  return {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: "#ccc" }
      }
    },
    scales: {
      x: {
        ticks: { color: "#aaa" },
        grid: { color: "#222" }
      },
      y: {
        ticks: { color: "#aaa" },
        grid: { color: "#222" }
      }
    }
  };
}
