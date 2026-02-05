// =====================================================
// FINANCEIRO — VISÃO GERAL (SOMENTE CONSUMO DE DADOS)
// =====================================================

let graficoFinanceiro = null;
let graficoEventos = null;
let graficoGastos = null;

// =====================================================
// INIT GLOBAL
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  abrirFinanceiro("visao");
  initFiltroPeriodo();
});

// =====================================================
// VISÃO GERAL — ESTADO ZERADO
// =====================================================
function carregarVisaoGeral() {
  setValor("kpi-entradas", 0);
  setValor("kpi-saidas", 0);
  setValor("kpi-lucro", 0);
  setValor("kpi-saldo", 0);

  const eventosEl = document.getElementById("kpi-eventos");
  const comparativoEl = document.getElementById("kpi-comparativo");

  if (eventosEl) eventosEl.textContent = "0";
  if (comparativoEl) comparativoEl.textContent = "-";
}

// =====================================================
// GRÁFICOS — VAZIOS (SEM DADOS)
// =====================================================
function renderGraficosVazios() {
  destruirGraficos();

  renderGraficoFinanceiroVazio();
  renderGraficoEventosVazio();
  renderGraficoGastosVazio();
}

function renderGraficoFinanceiroVazio() {
  const ctx = document.getElementById("graficoFinanceiro");
  if (!ctx) return;

  graficoFinanceiro = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: chartOptions()
  });
}

function renderGraficoEventosVazio() {
  const ctx = document.getElementById("graficoEventos");
  if (!ctx) return;

  graficoEventos = new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: chartOptions()
  });
}

function renderGraficoGastosVazio() {
  const ctx = document.getElementById("graficoGastos");
  if (!ctx) return;

  graficoGastos = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// =====================================================
// LIMPEZA TOTAL
// =====================================================
function destruirGraficos() {
  if (graficoFinanceiro) {
    graficoFinanceiro.destroy();
    graficoFinanceiro = null;
  }

  if (graficoEventos) {
    graficoEventos.destroy();
    graficoEventos = null;
  }

  if (graficoGastos) {
    graficoGastos.destroy();
    graficoGastos = null;
  }
}

function limparKPIs() {
  [
    "kpi-entradas",
    "kpi-saidas",
    "kpi-lucro",
    "kpi-saldo",
    "kpi-eventos",
    "kpi-comparativo"
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
}

// =====================================================
// ABAS DO FINANCEIRO
// =====================================================
function abrirFinanceiro(secao) {
  // Botões
  document.querySelectorAll(".tab-btn").forEach(btn =>
    btn.classList.remove("active")
  );

  if (event?.target) {
    event.target.classList.add("active");
  }

  // Seções
  document.querySelectorAll(".catalogo-section").forEach(sec =>
    sec.classList.remove("active")
  );

  const el = document.getElementById(secao);
  if (el) el.classList.add("active");

  renderFinanceiro(secao);
}

function renderFinanceiro(secao) {
  // Sempre limpa tudo antes
  destruirGraficos();
  limparKPIs();

  switch (secao) {
    case "visao":
      carregarVisaoGeral();
      renderGraficosVazios();
      break;

    case "entradas":
    case "saidas":
    case "balanco":
    case "comparativos":
    case "relatorios":
      // propositalmente vazio
      // JS dessas seções virão depois
      break;
  }
}

// =====================================================
// FILTRO DE PERÍODO (PREPARADO)
// =====================================================
function initFiltroPeriodo() {
  const periodoSelect = document.getElementById("filtro-periodo");
  const wrapper = document.querySelector(".financeiro-periodo-wrapper");

  if (!periodoSelect || !wrapper) return;

  periodoSelect.addEventListener("focus", () => {
    wrapper.classList.add("open");
  });

  periodoSelect.addEventListener("blur", () => {
    wrapper.classList.remove("open");
  });

  periodoSelect.addEventListener("change", () => {
    // ainda não consome dados
  });
}

// =====================================================
// HELPERS
// =====================================================
function setValor(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

function chartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
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
