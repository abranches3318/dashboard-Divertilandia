db.collection("saidas")
let saidasCache = [];

window.saidaEditando = null;

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


function parseMoedaBR(valorStr) {
  if (!valorStr) return 0;

  return Number(
    valorStr
      .toString()
      .replace(/[^\d,.-]/g, "") // remove tudo exceto números, vírgula, ponto
      .replace(/\./g, "")       // remove milhar
      .replace(",", ".")        // decimal BR → JS
  ) || 0;
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
  const grupoVencimento = document.getElementById("grupo-vencimento");

naturezaSelect?.addEventListener("change", () => {

  // Parcelamento
  parcelamentoGroup.style.display =
    naturezaSelect.value === "parcelada" ? "block" : "none";

  // Pontual sem vencimento
  grupoVencimento.style.display =
    naturezaSelect.value === "pontual" ? "none" : "block";
});

btnNova?.addEventListener("click", () => {
  window.saidaEditando = null;

  document.getElementById("titulo-modal-saida").innerText = "Nova Saída";

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





/* =====================================
   FUNÇÃO FECHAR MODAL
===================================== */
function fecharModalSaida() {
  const modal = document.getElementById("modal-nova-saida");
  const form = document.getElementById("form-nova-saida");
  const parcelamentoGroup = document.querySelector(".parcelamento-group");

  modal.classList.remove("ativo");
  form.reset();
  parcelamentoGroup.style.display = "none";
  window.saidaEditando = null;
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

    // Migração automática (dados antigos)
    if (!data.dataVencimento && data.dataCompetencia) {
      data.dataVencimento = data.dataCompetencia;
    }

    saidasCache.push({
      id: doc.id,
      ...data
    });
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



  if (isNaN(valor) || valor <= 0) {
  Swal.fire({
    icon: "warning",
    title: "Valor inválido",
    text: "Informe um valor válido."
  });
  return;
}

const vencimento = document.getElementById("saida-vencimento").value;
const descricao = document.getElementById("saida-descricao").value;
const totalParcelas = Number(document.getElementById("saida-total-parcelas").value);

const inicioParcelamento =
  document.getElementById("saida-inicio-parcelamento").value || vencimento;

  if (!categoria || !valor) {
  Swal.fire({
    icon: "warning",
    title: "Campos obrigatórios",
    text: "Preencha categoria, valor e competência."
  });
  return;
}

if (natureza !== "pontual" && !vencimento) {
  Swal.fire({
    icon: "warning",
    title: "Vencimento obrigatório",
    text: "Informe a data de vencimento."
  });
  return;
}

  if (natureza === "parcelada" && totalParcelas < 2) {
  Swal.fire({
    icon: "warning",
    title: "Parcelamento inválido",
    text: "Informe pelo menos 2 parcelas."
  });
  return;
}

  /* ===============================
     MODO EDIÇÃO
  =============================== */
  if (window.saidaEditando) {

    await db.collection("saidas")
      .doc(window.saidaEditando)
      .update({
        categoria,
        natureza,
        valor,
        dataCompetencia: competencia,
        dataVencimento: vencimento,
        descricao
      });

    fecharModalSaida();
    carregarSaidas();
    return;
  }

  /* ===============================
     NOVO REGISTRO
  =============================== */

 if (natureza === "parcelada") {

  await gerarParcelas({
  categoria,
  valor,
  competencia,
  vencimento,
  descricao,
  totalParcelas,
  inicioParcelamento
});

}  else if (natureza === "fixa") {

  const grupoFixa = Date.now().toString(); // identifica a série

  for (let i = 0; i < 3; i++) {

    const competenciaMes = adicionarMeses(competencia, i);
    const vencimentoMes = adicionarMeses(vencimento, i);

    await db.collection("saidas").add({
      tipo: "fixa",
      grupoFixa,
      categoria,
      natureza,
      valor,
      dataCompetencia: competenciaMes,
      dataVencimento: vencimentoMes,
      dataPagamento: null,
      status: "em_aberto",
      descricao,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
} else {

const hoje = new Date();
hoje.setHours(0,0,0,0);

const dataBase = new Date(
  (natureza === "pontual" ? competencia : vencimento) + "T00:00:00"
);

let status = "em_aberto";
let dataPagamento = null;

// Se já passou, considera pago automaticamente
if (dataBase < hoje) {
  status = "pago";
  dataPagamento = dataBase.toISOString().split("T")[0];
}

await db.collection("saidas").add({
  tipo: "manual",
  categoria,
  natureza,
  valor,
  dataVencimento: natureza === "pontual" ? vencimento : vencimento,
  dataPagamento,
  status,
  descricao,
  criadoEm: firebase.firestore.FieldValue.serverTimestamp()
});

}

  fecharModalSaida();
  carregarSaidas();
  Swal.fire({
  icon: "success",
  title: "Saída salva",
  timer: 1200,
  showConfirmButton: false
});
}

window.editarSaida = function (id) {
  const saida = saidasCache.find(s => s.id === id);
  if (!saida) return;

  window.saidaEditando = id;
  document.getElementById("titulo-modal-saida").innerText = "Editar Saída";

  document.getElementById("saida-categoria").value = saida.categoria;
  document.getElementById("saida-natureza").value = saida.natureza;

  // FORMATA CORRETAMENTE
  document.getElementById("saida-valor").value =
    Number(saida.valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  document.getElementById("saida-competencia").value = saida.dataCompetencia;
  document.getElementById("saida-vencimento").value = saida.dataVencimento;
  document.getElementById("saida-descricao").value = saida.descricao;

  document.getElementById("modal-nova-saida").classList.add("ativo");
};

async function excluirSaida(id) {
  const saida = saidasCache.find(s => s.id === id);
  if (!saida) return;

  const confirmacao = await Swal.fire({
    title: "Excluir saída?",
    text: saida.grupoId
      ? "Todas as ocorrências desta despesa serão removidas."
      : "Essa ação não pode ser desfeita.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Excluir",
    cancelButtonText: "Cancelar",
    reverseButtons: true
  });

  if (!confirmacao.isConfirmed) return;

  try {
    // Se não for recorrente
    if (!saida.grupoId) {
      await db.collection("saidas").doc(id).delete();
    } else {
      // Excluir grupo inteiro
      const snapshot = await db.collection("saidas")
        .where("grupoId", "==", saida.grupoId)
        .get();

      const batch = db.batch();

      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    }

    Swal.fire({
      icon: "success",
      title: "Saída excluída",
      timer: 1200,
      showConfirmButton: false
    });

    carregarSaidas();

  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Erro ao excluir",
      text: error.message
    });
  }
}


async function suspenderSaida(id) {
  await db.collection("saidas").doc(id).update({
    status: "cancelado"
  });

  carregarSaidas();
}

/* =====================================================
   GERAR PARCELAS
===================================================== */

async function gerarParcelas({
  categoria,
  valor,
  descricao,
  totalParcelas,
  inicioParcelamento
}) {

  // Corrige valor vindo de campo com máscara (1.658,00 → 1658.00)
  if (typeof valor === "string") {
    valor = valor.replace(/\./g, "").replace(",", ".");
  }

  valor = Number(valor);
  totalParcelas = Number(totalParcelas);

  if (isNaN(valor) || valor <= 0 || totalParcelas <= 0) {
    Swal.fire({
      icon: "error",
      title: "Erro no parcelamento",
      text: "Valor ou número de parcelas inválido."
    });
    return;
  }

  const dataBase = new Date(inicioParcelamento + "T00:00:00");
  const grupoId = "parc_" + Date.now();

  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  for (let i = 1; i <= totalParcelas; i++) {

    const novaData = new Date(dataBase);
    novaData.setMonth(novaData.getMonth() + (i - 1));

    const venc = novaData.toISOString().split("T")[0];

    // Status automático
    const dataParcela = new Date(venc + "T00:00:00");

    let status = "em_aberto";
    let dataPagamento = null;

    if (dataParcela < hoje) {
      status = "pago";
      dataPagamento = venc;
    }

    await db.collection("saidas").add({
      tipo: "parcelada",
      grupoId,
      categoria,
      natureza: "parcelada",
      valor, // valor da parcela (não divide)
      dataVencimento: venc,
      dataPagamento,
      status,
      parcelaAtual: i,
      totalParcelas,
      descricao: descricao
        ? `${descricao} (${i}/${totalParcelas})`
        : `Parcela ${i}/${totalParcelas}`,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  Swal.fire({
    icon: "success",
    title: "Parcelamento criado",
    text: `${totalParcelas} parcelas geradas com sucesso.`,
    timer: 1500,
    showConfirmButton: false
  });
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
  const saida = saidasCache.find(s => s.id === id);
  if (!saida) return;

  const hoje = new Date().toISOString().split("T")[0];

  const { value: dataPagamento } = await Swal.fire({
    title: "Confirmar pagamento",
    html: `
      <p><strong>${saida.descricao || saida.categoria}</strong></p>
      <p>Valor: R$ ${formatarMoedaSaida(saida.valor)}</p>
      <input type="date" id="data-pagamento" class="swal2-input" value="${hoje}">
    `,
    showCancelButton: true,
    confirmButtonText: "Confirmar",
    cancelButtonText: "Cancelar",
    focusConfirm: false,
    preConfirm: () => {
      const data = document.getElementById("data-pagamento").value;
      if (!data) {
        Swal.showValidationMessage("Informe a data do pagamento");
        return false;
      }
      return data;
    }
  });

  if (!dataPagamento) return;

  try {
    await db.collection("saidas").doc(id).update({
      status: "pago",
      dataPagamento: dataPagamento
    });

    Swal.fire({
      icon: "success",
      title: "Pagamento registrado",
      timer: 1200,
      showConfirmButton: false
    });

    carregarSaidas();

  } catch (error) {
    Swal.fire({
      icon: "error",
      title: "Erro ao registrar pagamento",
      text: error.message
    });
  }
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
    if (!s.dataVencimento) return false;

    const data = new Date(s.dataVencimento + "T00:00:00");

    if (!estaNoPeriodoSaida(data, ano, mes, periodo)) return false;
    if (categoriaFiltro !== "todas" && s.categoria !== categoriaFiltro) return false;
    if (naturezaFiltro !== "todas" && s.natureza !== naturezaFiltro) return false;

    const statusVisual = obterStatusVisual(s);
    if (statusFiltro !== "todas" && statusVisual !== statusFiltro) return false;

    return true;
  });

  // Ordenação correta
  lista.sort((a, b) => {
    const dataA = a.dataVencimento
      ? new Date(a.dataVencimento + "T00:00:00").getTime()
      : 0;

    const dataB = b.dataVencimento
      ? new Date(b.dataVencimento + "T00:00:00").getTime()
      : 0;

    return dataB - dataA;
  });

  let totalPeriodo = 0;
  let totalFiltrado = 0;

  lista.forEach(s => {
    const statusVisual = obterStatusVisual(s);
    totalFiltrado += Number(s.valor || 0);

    if (statusVisual === "pago") {
      totalPeriodo += Number(s.valor || 0);
    }

    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${formatarDataSaida(s.dataVencimento)}</td>
      <td>${formatarDataSaida(s.dataPagamento)}</td>
      <td>${s.categoria}</td>
      <td>${s.descricao || "—"}</td>
      <td>${s.natureza}</td>
      <td class="status-${statusVisual}">
        ${formatarStatus(statusVisual)}
      </td>
      <td>R$ ${formatarMoedaSaida(s.valor)}</td>
      <td class="col-acao">
        ${gerarMenuAcoesSaida(s, statusVisual)}
      </td>
    `;

    tbody.appendChild(tr);
  });

  document.getElementById("total-saidas-filtrado")
    .innerText = `R$ ${formatarMoedaSaida(totalFiltrado)}`;

  document.getElementById("total-saidas-periodo")
    .innerText = `R$ ${formatarMoedaSaida(totalPeriodo)}`;
}

function gerarMenuAcoesSaida(saida, statusVisual) {
  return `
    <div class="menu-acoes-wrapper">
      <button class="menu-acoes-btn"  data-id="${saida.id}">
        ⋮
      </button>

      <div class="menu-acoes-dropdown" id="menu-${saida.id}">
        <button onclick="editarSaida('${saida.id}')">Editar</button>
        ${
          statusVisual !== "pago"
            ? `<button onclick="marcarComoPago('${saida.id}')">Marcar como pago</button>`
            : ""
        }
        <button onclick="suspenderSaida('${saida.id}')">Suspender</button>
        <button class="danger" onclick="excluirSaida('${saida.id}')">Excluir</button>
      </div>
    </div>
  `;
}

document.addEventListener("click", function (e) {
  const btn = e.target.closest(".menu-acoes-btn");

  // Clique no botão ⋮
  if (btn) {
    e.stopPropagation();

    const id = btn.dataset.id;

    document.querySelectorAll(".menu-acoes-dropdown")
      .forEach(menu => menu.style.display = "none");

    const menu = document.getElementById(`menu-${id}`);
    if (menu) menu.style.display = "block";

    return;
  }

  // Clique dentro do dropdown → não fechar
  if (e.target.closest(".menu-acoes-dropdown")) {
    return;
  }

  // Clique fora → fecha tudo
  document.querySelectorAll(".menu-acoes-dropdown")
    .forEach(menu => menu.style.display = "none");
})

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


function formatarDataSaida(dataStr) {
  if (!dataStr) return "—";
  return new Date(dataStr + "T00:00:00")
    .toLocaleDateString("pt-BR");
}

function formatarMoedaSaida(valor) {
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

function adicionarMeses(dataString, meses) {
  const data = new Date(dataString + "T00:00:00");
  data.setMonth(data.getMonth() + meses);

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

async function renovarFixasAutomaticamente() {

  const snapshot = await db.collection("saidas")
    .where("tipo", "==", "fixa")
    .get();

  const grupos = {};

  snapshot.forEach(doc => {
    const data = doc.data();
    if (!data.grupoFixa) return;

    if (!grupos[data.grupoFixa]) {
      grupos[data.grupoFixa] = [];
    }

    grupos[data.grupoFixa].push(data);
  });

  for (const grupoId in grupos) {

    const fixas = grupos[grupoId];

    fixas.sort((a, b) =>
      new Date(a.dataVencimento) - new Date(b.dataVencimento)
    );

    const ultima = fixas[fixas.length - 1];
    let dataNova = new Date(ultima.dataVencimento + "T00:00:00");

    const limite = new Date();
    limite.setMonth(limite.getMonth() + 3);
    limite.setDate(1);

    while (dataNova < limite) {

      dataNova.setMonth(dataNova.getMonth() + 1);

      const vencimentoNovo = dataNova.toISOString().split("T")[0];

      await db.collection("saidas").add({
        ...ultima,
        dataVencimento: vencimentoNovo,
        dataPagamento: null,
        status: "em_aberto",
        criadoEm: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
  }
}

async function gerarFixas({
  categoria,
  valor,
  descricao,
  vencimento,
  meses = 12
}) {

  // Corrige máscara
  if (typeof valor === "string") {
    valor = valor.replace(/\./g, "").replace(",", ".");
  }

  valor = Number(valor);

  if (isNaN(valor) || valor <= 0) {
    Swal.fire({
      icon: "error",
      title: "Erro",
      text: "Valor inválido."
    });
    return;
  }

  const grupoFixa = "fixa_" + Date.now();

  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  for (let i = 0; i < meses; i++) {

    const data = new Date(vencimento + "T00:00:00");
    data.setMonth(data.getMonth() + i);

    const venc = data.toISOString().split("T")[0];

    let status = "em_aberto";
    let dataPagamento = null;

    if (data < hoje) {
      status = "pago";
      dataPagamento = venc;
    }

    await db.collection("saidas").add({
      tipo: "fixa",
      grupoFixa,
      categoria,
      natureza: "fixa",
      valor,
      dataVencimento: venc,
      dataPagamento,
      status,
      descricao,
      criadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  Swal.fire({
    icon: "success",
    title: "Conta fixa criada",
    text: `${meses} meses gerados.`,
    timer: 1500,
    showConfirmButton: false
  });
}
