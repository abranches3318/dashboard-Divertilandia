// ============================
// AGENDAMENTOS.JS
// ============================

// Firebase compat
const db = window.db;
const auth = window.auth;

// Elementos
const listaAgendamentosEl = document.getElementById("listaAgendamentos");
const btnFiltrar = document.getElementById("btnFiltrarAgendamentos");
const btnNovo = document.getElementById("btnNovoAgendamento");

const filtroData = document.getElementById("filtroData");
const filtroCliente = document.getElementById("filtroCliente");
const filtroTelefone = document.getElementById("filtroTelefone");
const filtroStatus = document.getElementById("filtroStatus");

// ============================
// ESTADO GLOBAL AGENDAMENTOS
// ============================
window.agendamentosState = window.agendamentosState || {
  todos: []
};

// ============================
// CARREGAR AGENDAMENTOS
// ============================
async function carregarAgendamentos() {
  try {
    const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
    const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.agendamentosState.todos = agendamentos;
    renderizarTabela(agendamentos);
  } catch (err) {
    console.error("Erro ao carregar agendamentos:", err);
  }
}

// ============================
// RENDERIZAR TABELA
// ============================
function renderizarTabela(agendamentos) {
  if (!listaAgendamentosEl) return;
  listaAgendamentosEl.innerHTML = "";

  if (agendamentos.length === 0) {
    listaAgendamentosEl.innerHTML = `<tr><td colspan="6" style="text-align:center">Nenhum agendamento encontrado</td></tr>`;
    return;
  }

  agendamentos.forEach(a => {
    const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${data.toLocaleDateString()}</td>
      <td>${a.cliente || ""}</td>
      <td>${a.telefone || ""}</td>
      <td>${a.status || ""}</td>
      <td>R$ ${Number(a.valor || 0).toFixed(2)}</td>
      <td>
        <button class="btn-secundario btn-ver" data-id="${a.id}">Ver</button>
      </td>
    `;
    listaAgendamentosEl.appendChild(linha);
  });

  // Eventos dos botões "Ver"
  listaAgendamentosEl.querySelectorAll(".btn-ver").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (id) window.abrirAgendamento(id);
    });
  });
}

// ============================
// FILTRAR
// ============================
function aplicarFiltros() {
  let agendamentos = [...window.agendamentosState.todos];

  if (filtroData?.value) {
    const dataFiltro = new Date(filtroData.value);
    agendamentos = agendamentos.filter(a => {
      const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return d.toDateString() === dataFiltro.toDateString();
    });
  }

  if (filtroCliente?.value) {
    const nome = filtroCliente.value.toLowerCase();
    agendamentos = agendamentos.filter(a => (a.cliente || "").toLowerCase().includes(nome));
  }

  if (filtroTelefone?.value) {
    const tel = filtroTelefone.value.replace(/\D/g, "");
    agendamentos = agendamentos.filter(a => (a.telefone || "").replace(/\D/g, "").includes(tel));
  }

  if (filtroStatus?.value) {
    agendamentos = agendamentos.filter(a => (a.status || "") === filtroStatus.value);
  }

  renderizarTabela(agendamentos);
}

// ============================
// NOVO AGENDAMENTO
// ============================
function novoAgendamento() {
  Swal.fire({
    icon: 'info',
    title: 'Função em desenvolvimento',
    text: 'Criar novo agendamento ainda não foi implementado.'
  });
}

// ============================
// EVENTOS
// ============================
if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);
if (btnNovo) btnNovo.addEventListener("click", novoAgendamento);

// ============================
// INICIALIZAÇÃO
// ============================
window.addEventListener("DOMContentLoaded", carregarAgendamentos);
