// =====================================================
// FINANCEIRO — VISÃO GERAL (SOMENTE CONSUMO)
// =====================================================

let graficoFinanceiro = null;
let graficoEventos = null;
let graficoGastos = null;

let periodoAtual = "mensal";

// =====================================================
// INIT GLOBAL
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  abrirFinanceiro("visao");
  initFiltroPeriodo();
});

// =====================================================
// VISÃO GERAL — ESTADO ZERO
// =====================================================
function carregarVisaoGeral() {
  setValor("kpi-entradas", 0);
  setValor("kpi-saidas", 0);
  setValor("kpi-lucro", 0);
  setValor("kpi-saldo", 0);

  const eventosEl = document.getElementById("kpi-eventos");
  const comparativoEl = document.getElementById("kpi-comparativo");

  if (eventosEl) eventosEl.textContent = "0";
  if (comparativoEl) comparativoEl.textContent = `Período: ${periodoAtual}`;
}

// =====================================================
// GRÁFICOS — SEMPRE EXISTENTES (ZERO REAL)
// =====================================================
function renderGraficosZerados() {
  destruirGraficos();

  const labelsPadrao = getLabelsPorPeriodo(periodoAtual);

  graficoFinanceiro = new Chart(
    document.getElementById("graficoFinanceiro"),
    {
      type: "line",
      data: {
        labels: labelsPadrao,
        datasets: [
          datasetZero("Entradas", "#2ecc71"),
          datasetZero("Saídas", "#e74c3c"),
          datasetZero("Saldo", "#4cafef")
        ]
      },
      options: chartOptions()
    }
  );

  graficoEventos = new Chart(
    document.getElementById("graficoEventos"),
    {
      type: "line",
      data: {
        labels: labelsPadrao,
        datasets: [datasetZero("Eventos", "#b794f4")]
      },
      options: chartOptions()
    }
  );

  graficoGastos = new Chart(
    document.getElementById("graficoGastos"),
    {
      type: "doughnut",
      data: {
        labels: ["Sem dados"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["#333"]
          }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } }
      }
    }
  );
}

// =====================================================
// LIMPEZA TOTAL
// =====================================================
function destruirGraficos() {
  [graficoFinanceiro, graficoEventos, graficoGastos].forEach(g => {
    if (g) g.destroy();
  });

  graficoFinanceiro = null;
  graficoEventos = null;
  graficoGastos = null;
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
// ABAS
// =====================================================
function abrirFinanceiro(secao) {

  // Botões do Financeiro (escopo correto)
  const botoes = document.querySelectorAll(".financeiro-tabs .tab-btn");
  botoes.forEach(b => b.classList.remove("active"));

  // Ativa o botão correspondente à seção
  const mapa = {
    visao: 0,
    entradas: 1,
    saidas: 2,
    balanco: 3,
    comparativos: 4,
    relatorios: 5
  };

  const index = mapa[secao];
  if (botoes[index]) botoes[index].classList.add("active");

  // Seções do Financeiro
  document
    .querySelectorAll("main.financeiro section")
    .forEach(s => s.classList.remove("active"));

  const ativa = document.getElementById(secao);
  if (ativa) ativa.classList.add("active");

  renderFinanceiro(secao);
}

function renderFinanceiro(secao) {

  // Só a Visão Geral usa KPIs e gráficos
  if (secao === "visao") {
    destruirGraficos();
    limparKPIs();

    carregarVisaoGeral();
    renderGraficosZerados();
    return;
  }

  // Outras seções NÃO mexem na visão geral
  if (secao === "entradas") {
    carregarEntradas();
    return;
  }

  if (secao === "saidas") {
    carregarSaidas();
    return;
  }

  if (secao === "relatorios") {
    carregarRelatorios();
    return;
  }
}

// =====================================================
// FILTRO DE PERÍODO (ESTADO GLOBAL)
// =====================================================
function initFiltroPeriodo() {
  const select = document.getElementById("filtro-periodo");
  if (!select) return;

  select.addEventListener("change", e => {
    periodoAtual = e.target.value;

    if (document.getElementById("visao")?.classList.contains("active")) {
      carregarVisaoGeral();
      renderGraficosZerados();
    }
  });
}

// =====================================================
// HELPERS
// =====================================================
function datasetZero(label, color) {
  return {
    label,
    data: Array(12).fill(0),
    borderColor: color,
    backgroundColor: "rgba(0,0,0,0)",
    tension: 0.35
  };
}

function getLabelsPorPeriodo(periodo) {
  switch (periodo) {
    case "trimestral":
      return ["T1", "T2", "T3", "T4"];
    case "semestral":
      return ["S1", "S2"];
    case "anual":
      return ["Ano"];
    default:
      return ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  }
}

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
      legend: { labels: { color: "#ccc" } }
    },
    scales: {
      x: { ticks: { color: "#aaa" }, grid: { color: "#222" } },
      y: { ticks: { color: "#aaa" }, grid: { color: "#222" } }
    }
  };
}
