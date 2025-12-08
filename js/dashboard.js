// ============================
// DASHBOARD.JS
// ============================

// Firebase compat
window.db = window.db || firebase.firestore();
window.auth = window.auth || firebase.auth();

// ============================
// ESTADO GLOBAL
// ============================
window.dashboardState = window.dashboardState || {
  agendamentos: [],
  calendario: null,
  agendamentosCache: []
};

// ============================
// NAVEGAÇÃO ENTRE SEÇÕES
// ============================
function nav(secao) {
  document.querySelectorAll(".pagina").forEach(p => p.classList.remove("ativa"));
  const target = document.getElementById("pagina-" + secao);
  if (target) target.classList.add("ativa");

  document.querySelectorAll(".sidebar ul li").forEach(li => li.classList.remove("active"));
  const li = Array.from(document.querySelectorAll(".sidebar ul li")).find(li => li.getAttribute("onclick")?.includes(secao));
  if (li) li.classList.add("active");

  // Atualiza título
  const titulo = document.getElementById("titulo-pagina");
  if (titulo) titulo.textContent = li?.textContent || "Dashboard";

  // Atualiza calendário se entrar na dashboard
  if (secao === "dashboard" && window.renderCalendar) {
    window.renderCalendar(window.dashboardState.agendamentosCache);
  }
}
window.nav = nav;

// ============================
// CARREGAR AGENDAMENTOS
// ============================
async function carregarAgendamentos() {
  try {
    const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
    const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.dashboardState.agendamentos = agendamentos;
    window.dashboardState.agendamentosCache = agendamentos;
    renderizarTabela(agendamentos);
    if (window.renderCalendar) window.renderCalendar(agendamentos);
  } catch (err) {
    console.error("Erro ao carregar agendamentos:", err);
  }
}

// ============================
// RENDERIZAR TABELA AGENDAMENTOS
// ============================
const listaAgendamentosEl = document.getElementById("listaAgendamentos");
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
      if (id) abrirAgendamento(id);
    });
  });
}

// ============================
// FILTROS
// ============================
const btnFiltrar = document.getElementById("btnFiltrarAgendamentos");
const filtroData = document.getElementById("filtroData");
const filtroCliente = document.getElementById("filtroCliente");
const filtroTelefone = document.getElementById("filtroTelefone");
const filtroStatus = document.getElementById("filtroStatus");

function aplicarFiltros() {
  let agendamentos = [...window.dashboardState.agendamentos];

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

if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);

// ============================
// NOVO AGENDAMENTO
// ============================
const btnNovo = document.getElementById("btnNovoAgendamento");
function novoAgendamento() {
  Swal.fire({
    title: 'Novo Agendamento',
    html: `
      <input id="swal-cliente" class="swal2-input" placeholder="Cliente">
      <input id="swal-telefone" class="swal2-input" placeholder="Telefone">
      <input id="swal-valor" type="number" class="swal2-input" placeholder="Valor">
      <input id="swal-data" type="date" class="swal2-input">
    `,
    focusConfirm: false,
    preConfirm: () => {
      const cliente = document.getElementById("swal-cliente")?.value;
      const telefone = document.getElementById("swal-telefone")?.value;
      const valor = parseFloat(document.getElementById("swal-valor")?.value || 0);
      const data = document.getElementById("swal-data")?.value;
      if (!cliente || !data) {
        Swal.showValidationMessage("Cliente e data são obrigatórios");
        return false;
      }
      return { cliente, telefone, valor, data };
    }
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        const dataObj = new Date(result.value.data);
        const doc = await db.collection("agendamentos").add({
          cliente: result.value.cliente,
          telefone: result.value.telefone,
          valor: result.value.valor,
          data: firebase.firestore.Timestamp.fromDate(dataObj),
          status: "pendente"
        });
        Swal.fire("Sucesso", "Agendamento criado!", "success");
        carregarAgendamentos();
      } catch (err) {
        console.error(err);
        Swal.fire("Erro", "Não foi possível criar agendamento", "error");
      }
    }
  });
}
if (btnNovo) btnNovo.addEventListener("click", novoAgendamento);

// ============================
// ABRIR AGENDAMENTO
// ============================
window.abrirAgendamento = function(id) {
  const a = window.dashboardState.agendamentos.find(a => a.id === id);
  if (!a) return;
  Swal.fire({
    title: `Agendamento: ${a.cliente || ""}`,
    html: `
      <p>Telefone: ${a.telefone || ""}</p>
      <p>Data: ${a.data?.toDate ? a.data.toDate().toLocaleString() : new Date(a.data)}</p>
      <p>Status: ${a.status || ""}</p>
      <p>Valor: R$ ${Number(a.valor || 0).toFixed(2)}</p>
    `
  });
};

// ============================
// CALENDÁRIO INTERATIVO
// ============================
window.renderCalendar = function(agendamentos = []) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  const eventos = agendamentos.map(a => {
    const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    return {
      id: a.id,
      title: a.cliente || "Sem nome",
      start: data,
      allDay: true
    };
  });

  if (window.dashboardState.calendario) {
    window.dashboardState.calendario.destroy();
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    headerToolbar: false, // remove today/month/week/day
    events: eventos,
    eventClick: function(info) {
      if (info.event.id) window.abrirAgendamento(info.event.id);
    },
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    height: 'auto'
  });

  calendar.render();
  window.dashboardState.calendario = calendar;
};

// ============================
// INICIALIZAÇÃO
// ============================
window.addEventListener("DOMContentLoaded", () => {
  carregarAgendamentos();
});
