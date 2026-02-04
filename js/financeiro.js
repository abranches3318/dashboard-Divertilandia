// =====================================================
// VISÃO GERAL — GRÁFICOS + KPIs (DADOS FAKE)
// =====================================================

// -----------------------------------------------------
// VARIÁVEIS GLOBAIS DOS GRÁFICOS
// -----------------------------------------------------
let graficoFinanceiro = null;
let graficoEventos = null;
let graficoGastos = null;

// -----------------------------------------------------
// INIT ÚNICO
// -----------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  carregarVisaoGeral();
  renderGraficosFake("mensal");
  initFiltroPeriodo();
});

// =====================================================
// GRÁFICOS FAKE
// =====================================================

// -------------------------------
// GRÁFICO PRINCIPAL (LINHA)
// -------------------------------
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
          tension: 0.35,
          fill: true
        },
        {
          label: "Saídas",
          data: [8000, 9000, 11000, 10000, 13000, 14000],
          borderColor: "#e74c3c",
          backgroundColor: "rgba(231,76,60,.15)",
          tension: 0.35,
          fill: true
        },
        {
          label: "Saldo",
          data: [4000, 6000, 7000, 6000, 7000, 8000],
          borderColor: "#4cafef",
          backgroundColor: "rgba(76,175,239,.15)",
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: chartOptions(true)
  });
}

// -------------------------------
// GRÁFICO EVENTOS (LINHA)
// -------------------------------
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
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: chartOptions(false)
  });
}

// -------------------------------
// GRÁFICO GASTOS (DOUGHNUT)
// -------------------------------
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
      datasets: [
        {
          data: [35, 25, 20, 20],
          backgroundColor: [
            "#f6ad55",
            "#63b3ed",
            "#fc8181",
            "#a0aec0"
          ]
        }
      ]
    },
    options: {
      responsive: true,
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
// DISPATCHER DOS GRÁFICOS
// -------------------------------
function renderGraficosFake(periodo) {
  renderGraficoFinanceiroFake(periodo);
  renderGraficoEventosFake();
  renderGraficoGastosFake();
}

// =====================================================
// KPIs — VISÃO GERAL (FAKE)
// =====================================================
function carregarVisaoGeral() {
  const dados = {
    entradas: 12500,
    saidas: 4200,
    eventos: 18,
    comparativo: "+12% vs mês anterior"
  };

  const lucro = dados.entradas - dados.saidas;
  const saldo = lucro;

  setValor("kpi-entradas", dados.entradas);
  setValor("kpi-saidas", dados.saidas);
  setValor("kpi-lucro", lucro);
  setValor("kpi-saldo", saldo);

  const eventosEl = document.getElementById("kpi-eventos");
  const comparativoEl = document.getElementById("kpi-comparativo");

  if (eventosEl) eventosEl.textContent = dados.eventos;
  if (comparativoEl) comparativoEl.textContent = dados.comparativo;
}

function setValor(id, valor) {
  const el = document.getElementById(id);
  if (!el) return;

  el.textContent = valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// =====================================================
// ABAS DO FINANCEIRO
// =====================================================
function abrirFinanceiro(secao) {
  document.querySelectorAll(".tab-btn").forEach(btn =>
    btn.classList.remove("active")
  );

  if (event?.target) {
    event.target.classList.add("active");
  }

  document.querySelectorAll(".catalogo-section").forEach(sec =>
    sec.classList.remove("active")
  );

  const el = document.getElementById(secao);
  if (el) el.classList.add("active");

  renderFinanceiro(secao);
}

function renderFinanceiro(secao) {
  switch (secao) {
    case "visao":
      carregarVisaoGeral();
      renderGraficosFake("mensal");
      break;
    case "entradas":
      if (typeof renderEntradas === "function") renderEntradas();
      break;
    case "saidas":
      if (typeof renderSaidas === "function") renderSaidas();
      break;
    case "balanco":
      if (typeof renderBalanco === "function") renderBalanco();
      break;
    case "comparativos":
      if (typeof renderComparativos === "function") renderComparativos();
      break;
    case "relatorios":
      if (typeof renderRelatorios === "function") renderRelatorios();
      break;
  }
}

// =====================================================
// FILTRO DE PERÍODO (DROPDOWN)
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

  periodoSelect.addEventListener("change", e => {
    renderGraficosFake(e.target.value);
  });
}

// =====================================================
// OPÇÕES PADRÃO DOS GRÁFICOS
// =====================================================
function chartOptions(temFill) {
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
