db.collection("saidas")
let saidasCache = [];

document.addEventListener("DOMContentLoaded", () => {
  inicializarSaidas();
});

/* =====================================================
   INICIALIZAÇÃO
===================================================== */

function inicializarSaidas() {
  configurarModal();
  configurarFiltros();
  carregarSaidas();
}

/* =====================================================
   CONFIGURAÇÃO MODAL
===================================================== */

function configurarModal() {
  const btnNova = document.getElementById("btn-nova-saida");
  const modal = document.getElementById("modal-nova-saida");
  const fechar = document.getElementById("fechar-modal-saida");
  const naturezaSelect = document.getElementById("saida-natureza");
  const parcelamentoGroup = document.querySelector(".parcelamento-group");
  const form = document.getElementById("form-nova-saida");

  btnNova?.addEventListener("click", () => {
    modal.classList.add("ativo");
  });

  fechar?.addEventListener("click", fecharModal);

  modal?.addEventListener("click", (e) => {
    if (e.target.classList.contains("modal-overlay")) {
      fecharModal();
    }
  });

  function fecharModal() {
    modal.classList.remove("ativo");
    form.reset();
    parcelamentoGroup.style.display = "none";
  }

  naturezaSelect?.addEventListener("change", () => {
    parcelamentoGroup.style.display =
      naturezaSelect.value === "parcelada" ? "block" : "none";
  });

  form?.addEventListener("submit", salvarNovaSaida);
}

/* =====================================================
   FILTROS
===================================================== */

function configurarFiltros() {
  document.getElementById("filtro-categoria-saida")
    ?.addEventListener("change", renderizarSaidas);

  document.getElementById("filtro-natureza-saida")
    ?.addEventListener("change", renderizarSaidas);

  document.getElementById("filtro-status-saida")
    ?.addEventListener("change", renderizarSaidas);

  document.getElementById("filtro-mes")
    ?.addEventListener("change", carregarSaidas);

  document.getElementById("filtro-ano")
    ?.addEventListener("change", carregarSaidas);

  document.getElementById("filtro-periodo")
    ?.addEventListener("change", carregarSaidas);
}

/* =====================================================
   CARREGAMENTO
===================================================== */

async function carregarSaidas() {
  const snapshot = await db.collection("saidas").get();
  saidasCache = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    data.id = doc.id;
    saidasCache.push(data);
  });

  renderizarSaidas();
}

/* =====================================================
   SALVAR NOVA SAÍDA
===================================================== */

async function salvarNovaSaida(e) {
  e.preventDefault();

  const categoria = document.getElementById("saida-categoria").value;
  const natureza = document.getElementById("saida-natureza").value;
  const valor = Number(document.getElementById("saida-valor").value);
  const competencia = document.getElementById("saida-competencia").value;
  const vencimento = document.getElementById("saida-vencimento").value;
  const descricao = document.getElementById("saida-descricao").value;
  const totalParcelas = Number(document.getElementById("saida-total-parcelas").value);

  if (!categoria || !valor || !competencia || !vencimento) return;

  if (natureza === "parcelada" && totalParcelas < 2) {
    alert("Informe o total de parcelas (mínimo 2).");
    return;
  }

  if (natureza === "parcelada") {
    await gerarParcelas({
      categoria,
      valor,
      competencia,
      vencimento,
      descricao,
      totalParcelas
    });
  } else {
    await db.collection("saidas").add({
      tipo: "manual",
      categoria,
      natureza,
      valor,
      dataCompetencia: competencia,
      dataVencimento: vencimento,
      dataPagamento: null,
      status: "em_aberto",
      descricao,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  document.getElementById("modal-nova-saida").style.display = "none";
  document.getElementById("form-nova-saida").reset();

  carregarSaidas();
}

/* =====================================================
   GERAR PARCELAS
===================================================== */

async function gerarParcelas({
  categoria,
  valor,
  competencia,
  vencimento,
  descricao,
  totalParcelas
}) {
  const valorParcela = valor / totalParcelas;
  const dataBase = new Date(vencimento + "T00:00:00");

  for (let i = 1; i <= totalParcelas; i++) {
    const novaData = new Date(dataBase);
    novaData.setMonth(novaData.getMonth() + (i - 1));

    const venc = novaData.toISOString().split("T")[0];

    await db.collection("saidas").add({
      tipo: "manual",
      categoria,
      natureza: "parcelada",
      valor: Number(valorParcela.toFixed(2)),
      dataCompetencia: venc,
      dataVencimento: venc,
      dataPagamento: null,
      status: "em_aberto",
      parcelaAtual: i,
      totalParcelas,
      descricao: `${descricao} (${i}/${totalParcelas})`,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

/* =====================================================
   STATUS AUTOMÁTICO
===================================================== */

function obterStatusVisual(saida) {
  if (saida.status === "pago") return "pago";
  if (saida.status === "cancelado") return "cancelado";
  if (saida.status === "renegociado") return "renegociado";

  const hoje = new Date();
  const venc = new Date(saida.dataVencimento + "T00:00:00");

  if (saida.status === "em_aberto" && hoje > venc) {
    return "atraso";
  }

  return "em_aberto";
}

/* =====================================================
   MARCAR COMO PAGO
===================================================== */

async function marcarComoPago(id) {
  await db.collection("saidas").doc(id).update({
    status: "pago",
    dataPagamento: new Date().toISOString().split("T")[0]
  });

  carregarSaidas();
}

/* =====================================================
   RENDERIZAÇÃO
===================================================== */

function renderizarSaidas() {
  const tbody = document.getElementById("tabela-saidas-body");
  tbody.innerHTML = "";

  const categoriaFiltro = document.getElementById("filtro-categoria-saida").value;
  const naturezaFiltro = document.getElementById("filtro-natureza-saida").value;
  const statusFiltro = document.getElementById("filtro-status-saida").value;

  const ano = Number(document.getElementById("filtro-ano").value);
  const mes = Number(document.getElementById("filtro-mes").value);
  const periodo = document.getElementById("filtro-periodo").value;

  let lista = saidasCache.filter(s => {
    if (!s.dataCompetencia) return false;

    const data = new Date(s.dataCompetencia + "T00:00:00");

    if (!estaNoPeriodoSaida(data, ano, mes, periodo)) return false;
    if (categoriaFiltro !== "todas" && s.categoria !== categoriaFiltro) return false;
    if (naturezaFiltro !== "todas" && s.natureza !== naturezaFiltro) return false;

    const statusVisual = obterStatusVisual(s);
    if (statusFiltro !== "todas" && statusVisual !== statusFiltro) return false;

    return true;
  });

  lista.sort((a, b) =>
    new Date(b.dataCompetencia) - new Date(a.dataCompetencia)
  );

  let totalPeriodo = 0;
  let totalFiltrado = 0;

  saidasCache.forEach(s => {
    if (s.status === "pago") totalPeriodo += s.valor;
  });

  lista.forEach(s => {
    const statusVisual = obterStatusVisual(s);
    totalFiltrado += s.valor;

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${formatarDataSaida(s.dataCompetencia)}</td>
      <td>${formatarDataSaida(s.dataVencimento)}</td>
      <td>${s.categoria}</td>
      <td>${s.natureza}</td>
      <td class="status-${statusVisual}">
        ${formatarStatus(statusVisual)}
      </td>
      <td>R$ ${formatarMoedaSaida(s.valor)}</td>
      <td>
        ${
          statusVisual !== "pago"
            ? `<button onclick="marcarComoPago('${s.id}')">Pagar</button>`
            : "—"
        }
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("total-saidas-filtrado")
    .innerText = `R$ ${formatarMoedaSaida(totalFiltrado)}`;

  document.getElementById("total-saidas-periodo")
    .innerText = `R$ ${formatarMoedaSaida(totalPeriodo)}`;
}

/* =====================================================
   UTILITÁRIOS
===================================================== */

function estaNoPeriodoSaida(data, ano, mes, periodo) {
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

function formatarDataSaida {
  return new Date(dataStr + "T00:00:00")
    .toLocaleDateString("pt-BR");
}

function formatarMoedaSaida {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatarStatus(status) {
  const mapa = {
    em_aberto: "Em aberto",
    atraso: "Em atraso",
    pago: "Pago",
    cancelado: "Cancelado",
    renegociado: "Renegociado"
  };
  return mapa[status] || status;
}


