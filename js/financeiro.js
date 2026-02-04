// js/financeiro/financeiro.js

let graficoFinanceiro = null;
let graficoEventos = null;
let graficoGastos = null;

document.addEventListener("DOMContentLoaded", () => {
  renderGraficosFake("mensal");
});

function renderGraficoFinanceiroFake(periodo) {
  const ctx = document.getElementById("graficoFinanceiro");
  if (!ctx) return;

  if (graficoFinanceiro) {
    graficoFinanceiro.destroy();
  }

  graficoFinanceiro = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      datasets: [
        {
          label: "Entradas",
          data: [12000, 15000, 18000, 16000, 20000, 22000],
          borderColor: "#2ecc71",
          backgroundColor: "rgba(46,204,113,.15)",
          tension: 0.35
        },
        {
          label: "Saídas",
          data: [8000, 9000, 11000, 10000, 13000, 14000],
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231,76,60,.15)",
          tension: 0.35
        },
        {
          label: "Saldo",
          data: [4000, 6000, 7000, 6000, 7000, 8000],
          borderColor: "#4cafef",
          backgroundColor: "rgba(76,175,239,.15)",
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: "#ccc" }
        }
      },
      scales: {
        x: { ticks: { color: "#aaa" } },
        y: { ticks: { color: "#aaa" } }
      }
    }
  });
}

function renderGraficoEventosFake() {
  const ctx = document.getElementById("graficoEventos");
  if (!ctx) return;

  if (graficoEventos) {
    graficoEventos.destroy();
  }

  graficoEventos = new Chart(ctx, {
    type: "line",
    data: {
      labels: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"],
      datasets: [
        {
          label: "Eventos",
          data: [8, 12, 10, 15, 18, 20],
          borderColor: "#b794f4",
          backgroundColor: "rgba(183,148,244,.2)",
          tension: 0.35
        }
      ]
    },
    options: {
      plugins: {
        legend: { labels: { color: "#ccc" } }
      },
      scales: {
        x: { ticks: { color: "#aaa" } },
        y: { ticks: { color: "#aaa" } }
      }
    }
  });
}

function renderGraficoGastosFake() {
  const ctx = document.getElementById("graficoGastos");
  if (!ctx) return;

  if (graficoGastos) {
    graficoGastos.destroy();
  }

  graficoGastos = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Monitores", "Manutenção", "Marketing", "Outros"],
      datasets: [{
        data: [35, 25, 20, 20],
        backgroundColor: [
          "#f6ad55",
          "#63b3ed",
          "#fc8181",
          "#a0aec0"
        ]
      }]
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

function renderGraficosFake(periodo) {
  renderGraficoFinanceiroFake(periodo);
  renderGraficoEventosFake();
  renderGraficoGastosFake();
}

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
