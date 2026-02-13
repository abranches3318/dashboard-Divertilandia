const db = firebase.firestore();
let entradasCache = [];

document.addEventListener("DOMContentLoaded", () => {
  inicializarEntradas();
});

function inicializarEntradas() {
  carregarEntradas();

  document.getElementById("filtro-categoria-entrada")
    ?.addEventListener("change", renderizarEntradas);

  document.getElementById("filtro-mes")
    ?.addEventListener("change", carregarEntradas);

  document.getElementById("filtro-ano")
    ?.addEventListener("change", carregarEntradas);

  document.getElementById("filtro-periodo")
    ?.addEventListener("change", carregarEntradas);
}

async function carregarEntradas() {

  const ano = Number(document.getElementById("filtro-ano").value);
  const mes = Number(document.getElementById("filtro-mes").value);
  const periodo = document.getElementById("filtro-periodo").value;

  entradasCache = [];

  const snapshot = await db.collection("agendamentos").get();

  snapshot.forEach(doc => {
    processarAgendamento(doc.data(), ano, mes, periodo);
  });

  renderizarEntradas();
}

function processarAgendamento(ag, ano, mes, periodo) {

  if (ag.status === "cancelado") return;

  const cliente = ag.cliente || "—";
  const evento = ag.nomeEvento || "Evento";

  const valorFinal = Number(ag.valor_final || 0);
  const entrada = Number(ag.entrada || 0);

  // =========================
  // 1️⃣ ENTRADA (SINAL / INTEGRAL)
  // =========================

  if (entrada > 0 && ag.data_entrada) {

    const dataEntrada = new Date(ag.data_entrada + "T00:00:00");

    if (estaNoPeriodo(dataEntrada, ano, mes, periodo)) {

      adicionarEntrada({
        data: dataEntrada,
        cliente,
        evento,
        categoria: entrada === valorFinal ? "integral" : "sinal",
        valor: entrada
      });

    }
  }

  // =========================
  // 2️⃣ RESTANTE (SE CONCLUÍDO)
  // =========================

  if (ag.status === "concluido" && ag.data) {

    const dataEvento = new Date(ag.data + "T00:00:00");

    if (estaNoPeriodo(dataEvento, ano, mes, periodo)) {

      const restante = Math.max(0, valorFinal - entrada);

      if (restante > 0) {
        adicionarEntrada({
          data: dataEvento,
          cliente,
          evento,
          categoria: "restante",
          valor: restante
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

  const categoriaFiltro =
    document.getElementById("filtro-categoria-entrada").value;

  const tbody =
    document.getElementById("tabela-entradas-body");

  tbody.innerHTML = "";

  let lista = [...entradasCache];

  if (categoriaFiltro !== "todas") {
    lista = lista.filter(item =>
      item.categoria === categoriaFiltro
    );
  }

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

  document.getElementById("total-entradas-filtrado")
    .innerText = `R$ ${formatarMoeda(total)}`;

  document.getElementById("total-entradas-periodo")
    .innerText = `R$ ${formatarMoeda(
      entradasCache.reduce((acc, i) => acc + i.valor, 0)
    )}`;
}

function formatarData(data) {
  return data.toLocaleDateString("pt-BR");
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarCategoria(cat) {
  const mapa = {
    sinal: "Sinal",
    integral: "Integral antecipado",
    restante: "Pagamento restante"
  };
  return mapa[cat] || cat;
}
