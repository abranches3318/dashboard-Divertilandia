// =====================================================
// FINANCEIRO — VISÃO GERAL (SOMENTE CONSUMO)
// =====================================================

let graficoFinanceiro = null;
let graficoEventos = null;
let graficoGastos = null;
let mesAtualSelecionado = new Date().getMonth(); 
let periodoAtual = "mensal";
let anoAtualSelecionado = new Date().getFullYear();

// =====================================================
// INIT GLOBAL
// =====================================================
document.addEventListener("DOMContentLoaded", () => {
  initFiltroPeriodo();

  const selectMes = document.getElementById("filtro-mes");
  if (selectMes) {
    selectMes.value = mesAtualSelecionado;
  }

  const selectAno = document.getElementById("filtro-ano");
if (selectAno) {
  const anoAtual = new Date().getFullYear();

  for (let a = anoAtual - 2; a <= anoAtual + 1; a++) {
    const option = document.createElement("option");
    option.value = a;
    option.textContent = a;
    selectAno.appendChild(option);
  }

  selectAno.value = anoAtualSelecionado;
}

  abrirFinanceiro("visao");
});

document.getElementById("filtro-ano")?.addEventListener("change", e => {
  anoAtualSelecionado = Number(e.target.value);

  if (document.getElementById("visao")?.classList.contains("active")) {
    carregarVisaoGeral();
    renderGraficosFinanceiros();
  }
});
// =====================================================
// VISÃO GERAL — ESTADO ZERO
// =====================================================
async function carregarVisaoGeral() {

  if (!window.saidasCache) {
    await carregarSaidasCache();
  }

  setValor("kpi-entradas", 0);
  setValor("kpi-saidas", 0);
  setValor("kpi-contas-pagar", 0);
  setValor("kpi-saldo", 0);

  const mes = periodoAtual === "mensal" ? mesAtualSelecionado : null;

  const totalEntradas = await calcularEntradasComEntrada(periodoAtual, mes);
  setValor("kpi-entradas", totalEntradas);

  const totalSaidas = await calcularSaidasPagas(periodoAtual, mes);
  setValor("kpi-saidas", totalSaidas);

  const contasAPagar = calcularContasAPagar(periodoAtual, mes);
  setValor("kpi-contas-pagar", contasAPagar);

  const resultado = totalEntradas - totalSaidas;
  setValor("kpi-saldo", resultado);

  await atualizarAgendamentosVisaoGeral(periodoAtual, mes);
  await atualizarProjecaoVisaoGeral(periodoAtual, mes);
}

// =====================================================
// GRÁFICOS — SEMPRE EXISTENTES (ZERO REAL)
// =====================================================
async function renderGraficosFinanceiros() {
  destruirGraficos();

  let labels;
  let entradas = [];
  let saidas = [];
  let saldo = [];

  if (periodoAtual === "mensal") {
    // =========================
    // PERÍODO MENSAL (dias)
    // =========================
    const ano = anoAtualSelecionado;
    const mes = mesAtualSelecionado;

    const diasNoMes = new Date(ano, mes + 1, 0).getDate();
    labels = Array.from({ length: diasNoMes }, (_, i) => i + 1);

    entradas = Array(diasNoMes).fill(0);
    saidas = Array(diasNoMes).fill(0);
    saldo = Array(diasNoMes).fill(0);

    // ENTRADAS
    const { inicio, fim } = getPeriodoDatas("mensal", mes);

    const snapshot = await db
      .collection("agendamentos")
      .where("data", ">=", inicio)
      .where("data", "<=", fim)
      .get();

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status === "cancelado") return;

      const data = new Date(d.data + "T00:00:00");
      const dia = data.getDate() - 1;

      entradas[dia] += Number(d.valor_final || 0);
    });

    // SAÍDAS
    if (!window.saidasCache) await carregarSaidasCache();

    window.saidasCache.forEach(s => {
      if (s.status !== "pago") return;

      const base = s.dataPagamento || s.vencimento;
      if (!base) return;

      const data = new Date(base + "T00:00:00");

      if (
        data.getFullYear() === ano &&
        data.getMonth() === mes
      ) {
        const dia = data.getDate() - 1;
        saidas[dia] += Number(s.valor || 0);
      }
    });

    for (let i = 0; i < diasNoMes; i++) {
      saldo[i] = entradas[i] - saidas[i];
    }

  } else {
    // =========================
    // PERÍODO ANUAL (meses)
    // =========================
    labels = getLabelsPorPeriodo("mensal");

    const dados = await gerarDadosFinanceirosAno();
    entradas = dados.entradasMes;
    saidas = dados.saidasMes;
    saldo = dados.saldoMes;
  }

  // =========================
  // RENDER
  // =========================
  graficoFinanceiro = new Chart(
    document.getElementById("graficoFinanceiro"),
    {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Entradas",
            data: entradas,
            borderColor: "#2ecc71",
            tension: 0.35
          },
          {
            label: "Saídas",
            data: saidas,
            borderColor: "#e74c3c",
            tension: 0.35
          },
          {
            label: "Saldo",
            data: saldo,
            borderColor: "#4cafef",
            tension: 0.35
          }
        ]
      },
      options: chartOptions()
    }
  );

  // Render dos outros gráficos
  renderGraficoEventos();
  renderGraficoGastos();
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
renderGraficosFinanceiros();
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
      renderGraficosFinanceiros();
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
    renderGraficosFinanceiros();
  }
});

function formatarDataISO(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function getPeriodoDatas(periodo, mesSelecionado = null) {
  const ano = anoAtualSelecionado;
  const now = new Date();

  let inicio, fim;

  switch (periodo) {
    case "mensal":
      inicio = new Date(ano, mesSelecionado, 1);
      fim = new Date(ano, mesSelecionado + 1, 0);
      break;

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
  const ano = anoAtualSelecionado;
  const now = new Date();

  const inicio = new Date(
    ano,
    now.getMonth(),
    now.getDate() + 1
  );

  let fim;

  switch (periodo) {
    case "mensal":
      fim = new Date(ano, mesSelecionado + 1, 0);
      break;

    case "anual":
      fim = new Date(ano, 11, 31);
      break;
  }

  return {
    inicio: formatarDataISO(inicio),
    fim: formatarDataISO(fim)
  };
}

async function calcularProjecaoReal(periodo, mesSelecionado) {
  const ano = anoAtualSelecionado;
  const now = new Date();

  let inicio, fim;

  if (periodo === "mensal") {

    // 🔹 Se o ano selecionado for menor que o atual → zero
    if (ano < now.getFullYear()) return 0;

    // 🔹 Se for o ano atual
    if (ano === now.getFullYear()) {

      // Mês passado → zero
      if (mesSelecionado < now.getMonth()) return 0;

      // Mês atual → amanhã até final do mês
      if (mesSelecionado === now.getMonth()) {
        inicio = new Date(ano, mesSelecionado, now.getDate() + 1);
      } else {
        // Mês futuro → mês inteiro
        inicio = new Date(ano, mesSelecionado, 1);
      }

    } else {
      // Ano futuro → mês inteiro
      inicio = new Date(ano, mesSelecionado, 1);
    }

    fim = new Date(ano, mesSelecionado + 1, 0);

  } else {
    // 🔹 PROJEÇÃO ANUAL (continua acumulada até dezembro)
    inicio = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1
    );

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
  const ano = anoAtualSelecionado;
  const now = new Date();

  let inicioPeriodo, fimPeriodo;

  if (periodo === "mensal") {
    inicioPeriodo = new Date(ano, mesSelecionado, 1, 0, 0, 0, 0);
    fimPeriodo = new Date(ano, mesSelecionado + 1, 0, 23, 59, 59, 999);
  } else {
    inicioPeriodo = new Date(ano, 0, 1, 0, 0, 0, 0);
    fimPeriodo = new Date(ano, 11, 31, 23, 59, 59, 999);
  }

  const fimBusca = new Date(ano + 1, 11, 31);

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
  if (d.entrada > 0 && d.data_entrada) {
    const dataEntrada = new Date(d.data_entrada + "T00:00:00");

    if (dataEntrada >= inicioPeriodo && dataEntrada <= fimPeriodo) {
      total += Number(d.entrada);
    }
  }

  // 🔹 CONCLUÍDOS NO PERÍODO (RESTANTE)
  if (d.status === "concluido" && d.data) {
    const dataEvento = new Date(d.data + "T00:00:00");

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

async function calcularSaidasPagas(periodo, mesSelecionado) {
  if (!window.saidasCache) return 0;

  const { inicio, fim } = getPeriodoDatas(periodo, mesSelecionado);

  const dataInicio = new Date(inicio + "T00:00:00");
  const dataFim = new Date(fim + "T23:59:59");

  let total = 0;

  window.saidasCache.forEach(s => {
    if (s.status !== "pago") return;

    // prioridade: dataPagamento
    const dataBase = s.dataPagamento || s.data_pagamento || s.vencimento;
    if (!dataBase) return;

    const data = new Date(dataBase + "T00:00:00");

    if (data >= dataInicio && data <= dataFim) {
      total += Number(s.valor || 0);
    }
  });

  return total;
}

function calcularContasAPagar(periodo, mesSelecionado) {
  if (!window.saidasCache) return 0;

  const { inicio, fim } = getPeriodoDatas(periodo, mesSelecionado);

  const dataInicio = new Date(inicio + "T00:00:00");
  const dataFim = new Date(fim + "T23:59:59");

  let total = 0;

  window.saidasCache.forEach(s => {
    // Apenas contas não pagas
    if (s.status !== "em_aberto" && s.status !== "atrasado") return;

    const dataBase = s.vencimento || s.dataVencimento;
    if (!dataBase) return;

    const data = new Date(dataBase + "T00:00:00");

    // 🔹 SOMENTE dentro do período selecionado
    if (data >= dataInicio && data <= dataFim) {
      total += Number(s.valor || 0);
    }
  });

  return total;
}

// =====================================================
// CACHE DE SAÍDAS (GLOBAL)
// =====================================================
async function carregarSaidasCache() {
  const snapshot = await db.collection("saidas").get();

  window.saidasCache = [];

  snapshot.forEach(doc => {
    window.saidasCache.push({
      id: doc.id,
      ...doc.data()
    });
  });
}

async function gerarDadosFinanceirosAno() {
  const entradasMes = Array(12).fill(0);
  const saidasMes = Array(12).fill(0);
  const saldoMes = Array(12).fill(0);

  const ano = anoAtualSelecionado;

  // =========================
  // ENTRADAS (agendamentos)
  // =========================
  const inicio = `${ano}-01-01`;
  const fim = `${ano}-12-31`;

  const snapshot = await db
    .collection("agendamentos")
    .where("data", ">=", inicio)
    .where("data", "<=", fim)
    .get();

  snapshot.forEach(doc => {
    const d = doc.data();
    if (d.status === "cancelado") return;

    const dataEvento = new Date(d.data + "T00:00:00");
    const mes = dataEvento.getMonth();

    const valorTotal = Number(d.valor_final || 0);
    entradasMes[mes] += valorTotal;
  });

  // =========================
  // SAÍDAS (cache)
  // =========================
  if (!window.saidasCache) {
    await carregarSaidasCache();
  }

  window.saidasCache.forEach(s => {
    if (s.status !== "pago") return;

    const dataBase = s.dataPagamento || s.data_pagamento || s.vencimento;
    if (!dataBase) return;

    const data = new Date(dataBase + "T00:00:00");
    if (data.getFullYear() !== ano) return;

    const mes = data.getMonth();
    saidasMes[mes] += Number(s.valor || 0);
  });

  // =========================
  // SALDO
  // =========================
  for (let i = 0; i < 12; i++) {
    saldoMes[i] = entradasMes[i] - saidasMes[i];
  }

  return {
    entradasMes,
    saidasMes,
    saldoMes
  };
}

async function renderGraficoEventos() {
  if (graficoEventos) graficoEventos.destroy();

  let labels;
  let dados;

  if (periodoAtual === "mensal") {
    const ano = anoAtualSelecionado;
    const mes = mesAtualSelecionado;
    const dias = new Date(ano, mes + 1, 0).getDate();

    labels = Array.from({ length: dias }, (_, i) => i + 1);
    dados = Array(dias).fill(0);

    const { inicio, fim } = getPeriodoDatas("mensal", mes);

    const snapshot = await db
      .collection("agendamentos")
      .where("data", ">=", inicio)
      .where("data", "<=", fim)
      .get();

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status === "cancelado") return;

      const dia = new Date(d.data).getDate() - 1;
      dados[dia]++;
    });

  } else {
    labels = getLabelsPorPeriodo("mensal");
    dados = Array(12).fill(0);

    const ano = anoAtualSelecionado;
    const inicio = `${ano}-01-01`;
    const fim = `${ano}-12-31`;

    const snapshot = await db
      .collection("agendamentos")
      .where("data", ">=", inicio)
      .where("data", "<=", fim)
      .get();

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status === "cancelado") return;

      const mes = new Date(d.data).getMonth();
      dados[mes]++;
    });
  }

  graficoEventos = new Chart(
    document.getElementById("graficoEventos"),
    {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Eventos",
          data: dados,
          borderColor: "#b794f4",
          tension: 0.35
        }]
      },
      options: chartOptions()
    }
  );
}

async function renderGraficoEventos() {
  if (graficoEventos) graficoEventos.destroy();

  let labels;
  let dados;

  if (periodoAtual === "mensal") {
    const ano = anoAtualSelecionado;
    const mes = mesAtualSelecionado;
    const dias = new Date(ano, mes + 1, 0).getDate();

    labels = Array.from({ length: dias }, (_, i) => i + 1);
    dados = Array(dias).fill(0);

    const { inicio, fim } = getPeriodoDatas("mensal", mes);

    const snapshot = await db
      .collection("agendamentos")
      .where("data", ">=", inicio)
      .where("data", "<=", fim)
      .get();

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status === "cancelado") return;

      const dia = new Date(d.data).getDate() - 1;
      dados[dia]++;
    });

  } else {
    labels = getLabelsPorPeriodo("mensal");
    dados = Array(12).fill(0);

    const ano = anoAtualSelecionado;
    const inicio = `${ano}-01-01`;
    const fim = `${ano}-12-31`;

    const snapshot = await db
      .collection("agendamentos")
      .where("data", ">=", inicio)
      .where("data", "<=", fim)
      .get();

    snapshot.forEach(doc => {
      const d = doc.data();
      if (d.status === "cancelado") return;

      const mes = new Date(d.data).getMonth();
      dados[mes]++;
    });
  }

  graficoEventos = new Chart(
    document.getElementById("graficoEventos"),
    {
      type: "line",
      data: {
        labels,
        datasets: [{
          label: "Eventos",
          data: dados,
          borderColor: "#b794f4",
          tension: 0.35
        }]
      },
      options: chartOptions()
    }
  );
}

