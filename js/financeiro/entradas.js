const db = firebase.firestore();

let entradasCache = [];

document.addEventListener("DOMContentLoaded", () => {
  inicializarEntradas();
});

function inicializarEntradas() {
  carregarEntradas();

  document.getElementById("filtro-categoria-entrada")
    .addEventListener("change", renderizarEntradas);

  document.getElementById("filtro-mes")
    .addEventListener("change", carregarEntradas);

  document.getElementById("filtro-ano")
    .addEventListener("change", carregarEntradas);

  document.getElementById("filtro-periodo")
    .addEventListener("change", carregarEntradas);
}

async function carregarEntradas() {
  const ano = parseInt(document.getElementById("filtro-ano").value);
  const mes = parseInt(document.getElementById("filtro-mes").value);
  const periodo = document.getElementById("filtro-periodo").value;

  const snapshot = await db.collection("agendamentos").get();

  entradasCache = [];

  snapshot.forEach(doc => {
    const ag = doc.data();

    processarAgendamento(ag, ano, mes, periodo);
  });

  renderizarEntradas();
}

function processarAgendamento(ag, ano, mes, periodo) {
  const status = ag.status || "";
  const valorFinal = Number(ag.valorFinal || 0);
  const entrada = Number(ag.entrada || 0);
  const frete = Number(ag.frete || 0);

  const dataEvento = ag.data?.toDate ? ag.data.toDate() : null;
  const dataPagamentoEntrada = ag.dataPagamentoEntrada?.toDate
    ? ag.dataPagamentoEntrada.toDate()
    : null;

  const cliente = ag.cliente || "—";
  const evento = ag.nomeEvento || "Evento";

  // =============================
  // 1️⃣ SINAL OU INTEGRAL
  // =============================
  if (status === "confirmado" && entrada > 0 && dataPagamentoEntrada) {

    if (estaNoPeriodo(dataPagamentoEntrada, ano, mes, periodo)) {

      if (entrada === valorFinal) {
        adicionarEntrada({
          data: dataPagamentoEntrada,
          cliente,
          evento,
          categoria: "integral",
          valor: entrada
        });
      } else {
        adicionarEntrada({
          data: dataPagamentoEntrada,
          cliente,
          evento,
          categoria: "sinal",
          valor: entrada
        });
      }
    }
  }

  // =============================
  // 2️⃣ PAGAMENTO FINAL (CONCLUÍDO)
  // =============================
  if (status === "concluido" && dataEvento) {

    if (estaNoPeriodo(dataEvento, ano, mes, periodo)) {

      if (entrada === 0) {
        adicionarEntrada({
          data: dataEvento,
          cliente,
          evento,
          categoria: "pagamento_agendamento",
          valor: valorFinal
        });
      } else if (entrada < valorFinal) {
        adicionarEntrada({
          data: dataEvento,
          cliente,
          evento,
          categoria: "restante",
          valor: valorFinal - entrada
        });
      }

      // =============================
      // 3️⃣ FRETE
      // =============================
      if (frete > 0) {
        adicionarEntrada({
          data: dataEvento,
          cliente,
          evento,
          categoria: "frete",
          valor: frete
        });
      }
    }
  }
}

function adicionarEntrada(item) {
  entradasCache.push(item);
}

function estaNoPeriodo(data, ano, mes, periodo) {
  if (!data) return false;

  const anoData = data.getFullYear();
  const mesData = data.getMonth();

  if (periodo === "mensal") {
    return anoData === ano && mesData === mes;
  }

  if (periodo === "anual") {
    return anoData === ano;
  }

  return false;
}

function renderizarEntradas() {
  const categoriaFiltro = document.getElementById("filtro-categoria-entrada").value;
  const tbody = document.getElementById("tabela-entradas-body");

  tbody.innerHTML = "";

  let lista = [...entradasCache];

  // FILTRO CATEGORIA
  if (categoriaFiltro !== "todas") {
    lista = lista.filter(item => item.categoria === categoriaFiltro);
  }

  // ORDENAÇÃO - MAIS RECENTE PRIMEIRO
  lista.sort((a, b) => b.data - a.data);

  let total = 0;

  lista.forEach(item => {
    total += item.valor;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${formatarData(item.data)}</td>
      <td>${item.cliente}</td>
      <td>${item.evento}</td>
      <td>${formatarCategoria(item.categoria)}</td>
      <td>R$ ${formatarMoeda(item.valor)}</td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("total-entradas-filtrado").innerText =
    `R$ ${formatarMoeda(total)}`;

  document.getElementById("total-entradas-periodo").innerText =
    `R$ ${formatarMoeda(calcularTotalPeriodo())}`;
}

function calcularTotalPeriodo() {
  return entradasCache.reduce((acc, item) => acc + item.valor, 0);
}

function formatarData(data) {
  return data.toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
  return valor.toFixed(2).replace(".", ",");
}

function formatarCategoria(cat) {
  const mapa = {
    sinal: "Sinal",
    integral: "Integral antecipado",
    pagamento_agendamento: "Pagamento agendamento",
    restante: "Pagamento restante",
    frete: "Frete"
  };

  return mapa[cat] || cat;
}
