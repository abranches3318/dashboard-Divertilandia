// =====================================================
// FINANCEIRO — VISÃO GERAL (SOMENTE CONSUMO)
// =====================================================

let graficoFinanceiro = null;
let graficoEventos = null;
let graficoGastos = null;
let mesAtualSelecionado = new Date().getMonth(); 
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

  const elAg = document.getElementById("kpi-agendamentos");
  if (elAg) elAg.textContent = "0";

  const elProj = document.getElementById("kpi-projecao");
  if (elProj) elProj.textContent = "R$ 0,00";

  const mes = periodoAtual === "mensal" ? mesAtualSelecionado : null;

  await atualizarEntradasVisaoGeral(periodoAtual, mes);
  await atualizarAgendamentosVisaoGeral(periodoAtual, mes);
  await atualizarProjecaoVisaoGeral(periodoAtual, mes);
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
    "kpi-projecao"
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
     projecao: 4,
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

  if (secao === "projecao") {
  carregarProjecao();
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

    case "anual":
      inicio = new Date(ano, 0, 1);
      fim = now; // 👈 ATÉ HOJE
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

async function atualizarEntradasVisaoGeral(periodo, mes) {
  const total = await calcularEntradasComEntrada(periodo, mes);
  setValor("kpi-entradas", total);
}

async function calcularAgendamentos(periodo, mesSelecionado) {
  const { inicio, fim } = getPeriodoDatas(periodo, mesSelecionado);

  const snapshot = await db
    .collection("agendamentos")
    .where("data", ">=", inicio)
    .where("data", "<=", fim)
    .get();

  let total = 0;

  snapshot.forEach(doc => {
    if (doc.data().status !== "cancelado") total++;
  });

  return total;
}

async function atualizarAgendamentosVisaoGeral(periodo, mesSelecionado) {
  const total = await calcularAgendamentos(periodo, mesSelecionado);

  const el = document.getElementById("kpi-agendamentos");
  if (el) el.textContent = total;
}

function getPeriodoProjecao(periodo, mesSelecionado = null) {
  const now = new Date();
  const ano = now.getFullYear();

  // amanhã
  const inicio = new Date(ano, now.getMonth(), now.getDate() + 1);

  let fim;

  switch (periodo) {
    case "mensal":
      fim = new Date(ano, mesSelecionado + 1, 0); // último dia do mês
      break;

    case "anual":
      fim = new Date(ano, 11, 31); // 31/12
      break;
  }

  return {
    inicio: formatarDataISO(inicio),
    fim: formatarDataISO(fim)
  };
}

async function calcularProjecaoReal(periodo, mesSelecionado) {
  const now = new Date();
  const ano = now.getFullYear();

  const inicio = new Date(
    ano,
    now.getMonth(),
    now.getDate() + 1
  );

  let fim;

  if (periodo === "mensal") {
    fim = new Date(ano, mesSelecionado + 1, 0);
  } else {
    fim = new Date(ano, 11, 31);
  }

  const { inicio: iniISO, fim: fimISO } =
    getIntervaloDatasISO(inicio, fim);

  const snapshot = await db
    .collection("agendamentos")
    .where("data", ">=", iniISO)
    .where("data", "<=", fimISO)
    .get();

  let total = 0;

  snapshot.forEach(doc => {
    const d = doc.data();

    if (d.status === "cancelado") return;

    const restante = Math.max(
      0,
      Number(d.valor_final || 0) - Number(d.entrada || 0)
    );

    total += restante;
  });

  return total;
}

async function atualizarProjecaoVisaoGeral(periodo, mes) {
  const total = await calcularProjecaoReal(periodo, mes);

  document.getElementById("kpi-projecao").textContent =
    total.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
}

function getIntervaloDatasISO(inicioDate, fimDate) {
  return {
    inicio: formatarDataISO(inicioDate),
    fim: formatarDataISO(fimDate)
  };
}

async function calcularEntradasComEntrada(periodo, mesSelecionado) {
  const now = new Date();
  const ano = now.getFullYear();

  let inicioPeriodo, fimPeriodo;

if (periodo === "mensal") {
  inicioPeriodo = new Date(ano, mesSelecionado, 1, 0, 0, 0, 0);
  fimPeriodo = new Date(ano, mesSelecionado + 1, 0, 23, 59, 59, 999);
} else {
  inicioPeriodo = new Date(ano, 0, 1, 0, 0, 0, 0);
  fimPeriodo = new Date();
}

  // busca ampla: até 365 dias à frente
  const fimBusca = new Date(now);
  fimBusca.setDate(fimBusca.getDate() + 365);

  const { inicio, fim } = getIntervaloDatasISO(
    new Date(ano, 0, 1),
    fimBusca
  );

  const snapshot = await db
    .collection("agendamentos")
    .where("data", ">=", inicio)
    .where("data", "<=", fim)
    .get();

  let total = 0;

  snapshot.forEach(doc => {
    const d = doc.data();

    if (d.status === "cancelado") return;

    // 🔹 ENTRADAS PAGAS
  if (d.entrada > 0 && d.entrada_paga_em) {
  const dataEntrada = d.entrada_paga_em.toDate();

  if (dataEntrada >= inicioPeriodo && dataEntrada <= fimPeriodo) {
    total += Number(d.entrada);
  }
}

    // 🔹 CONCLUÍDOS NO PERÍODO (RESTANTE)
    if (d.status === "concluido") {
      const dataEvento = new Date(d.data);

      if (dataEvento >= inicioPeriodo && dataEvento <= fimPeriodo) {
        const restante = Math.max(
          0,
          Number(d.valor_final || 0) - Number(d.entrada || 0)
        );

        total += restante;
      }
    }
  });

  return total;
}
