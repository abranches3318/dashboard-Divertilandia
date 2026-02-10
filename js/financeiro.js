// =====================================================
// FINANCEIRO — VISÃO GERAL (SOMENTE CONSUMO)
// =====================================================

let graficoFinanceiro = null;
let graficoEventos = null;
let graficoGastos = null;
let mesAtualSelecionado = new Date().getMonth(); // 0–11
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
async function carregarVisaoGeral() {
  setValor("kpi-entradas", 0);
  setValor("kpi-saidas", 0);
  setValor("kpi-lucro", 0);
  setValor("kpi-saldo", 0);

  const mes = periodoAtual === "mensal" ? mesAtualSelecionado : null;

  await atualizarEntradasVisaoGeral(periodoAtual, mes);
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
  const mesWrapper = document.getElementById("filtro-mes-wrapper");
  if (!select) return;

  select.addEventListener("change", e => {
    periodoAtual = e.target.value;

    // Mostra seletor de mês só no mensal
    if (periodoAtual === "mensal") {
      mesWrapper.style.display = "flex";
    } else {
      mesWrapper.style.display = "none";
    }

    if (document.getElementById("visao")?.classList.contains("active")) {
      carregarVisaoGeral();
      renderGraficosZerados();
    }
  });

  // estado inicial
  mesWrapper.style.display = periodoAtual === "mensal" ? "flex" : "none";
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

document.getElementById("filtro-mes")?.addEventListener("change", e => {
 mesAtualSelecionado = Number(e.target.value);

  if (document.getElementById("visao")?.classList.contains("active")) {
    carregarVisaoGeral();
    renderGraficosZerados();
  }
});

function formatarDataISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function getPeriodoDatas(periodo, mesSelecionado = null) {
  const now = new Date();
  const ano = now.getFullYear();
  let inicio, fim;

  switch (periodo) {
    case "mensal":
      inicio = new Date(ano, mesSelecionado, 1);
      fim = new Date(ano, mesSelecionado + 1, 0);
      break;

    case "trimestre": {
      const t = Math.floor(now.getMonth() / 3);
      inicio = new Date(ano, t * 3, 1);
      fim = new Date(ano, t * 3 + 3, 0);
      break;
    }

    case "semestre": {
      const s = now.getMonth() < 6 ? 0 : 1;
      inicio = new Date(ano, s * 6, 1);
      fim = new Date(ano, s * 6 + 6, 0);
      break;
    }

    case "anual":
      inicio = new Date(ano, 0, 1);
      fim = new Date(ano, 11, 31);
      break;
  }

  return {
    inicio: formatarDataISO(inicio),
    fim: formatarDataISO(fim)
  };
}

async function calcularEntradas(periodo, mesSelecionado) {
  const { inicio, fim } = getPeriodoDatas(periodo, mesSelecionado);

  const snapshot = await db
    .collection("agendamentos")
    .where("status", "==", "concluido")
    .where("data", ">=", inicio)
    .where("data", "<=", fim)
    .get();

  let total = 0;

  snapshot.forEach(doc => {
    total += Number(doc.data().valor_final || 0);
  });

  return total;
}

async function atualizarEntradasVisaoGeral(periodo, mesSelecionado) {
  const total = await calcularEntradas(periodo, mesSelecionado);

document.getElementById("kpi-entradas").innerText =
  total.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}
