/ ============================
// DASHBOARD.JS COMPLETO
// ============================

// Firebase compat
const auth = window.auth;
const db = window.db;

// ============================
// ESTADOS GLOBAIS
// ============================
window.dashboardState = window.dashboardState || {
  agendamentos: [],
  calendario: null,
  pacotes: [
    { nome: "Pacote Básico", valor: 100 },
    { nome: "Pacote Premium", valor: 200 },
    { nome: "Pacote Deluxe", valor: 350 }
  ]
};

// ============================
// ELEMENTOS
// ============================
const listaAgendamentosEl = document.getElementById("listaAgendamentos");
const btnFiltrar = document.getElementById("btnFiltrarAgendamentos");
const btnNovo = document.getElementById("btnNovoAgendamento");

const filtroData = document.getElementById("filtroData");
const filtroCliente = document.getElementById("filtroCliente");
const filtroTelefone = document.getElementById("filtroTelefone");
const filtroStatus = document.getElementById("filtroStatus");

// ============================
// FUNÇÃO: CARREGAR AGENDAMENTOS
// ============================
async function carregarAgendamentos() {
  try {
    const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
    const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.dashboardState.agendamentos = agendamentos;
    renderizarTabela(agendamentos);
    renderCalendar(agendamentos);
  } catch (err) {
    console.error("Erro ao carregar agendamentos:", err);
  }
}

// ============================
// FUNÇÃO: RENDERIZAR TABELA
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
      <td>${data.toLocaleDateString()} ${data.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</td>
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
// FUNÇÃO: FILTRAR AGENDAMENTOS
// ============================
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

// ============================
// FUNÇÃO: NOVO AGENDAMENTO (MODAL)
// ============================
async function novoAgendamento(dia) {
  const pacotesOptions = window.dashboardState.pacotes.map(p => `<option value="${p.nome}" data-valor="${p.valor}">${p.nome} - R$ ${p.valor}</option>`).join("");
  
  const { value: formValues } = await Swal.fire({
    title: dia ? `Novo Agendamento - ${dia.toLocaleDateString()}` : 'Novo Agendamento',
    html: `
      <input id="swal-cliente" class="swal2-input" placeholder="Nome do Cliente">
      <input id="swal-telefone" class="swal2-input" placeholder="Telefone">
      <select id="swal-pacote" class="swal2-input">
        <option value="">Selecione um pacote</option>
        ${pacotesOptions}
      </select>
      <input id="swal-endereco" class="swal2-input" placeholder="Endereço">
      <input id="swal-pagamento" type="number" class="swal2-input" placeholder="Pagamento de entrada">
      <textarea id="swal-observacao" class="swal2-textarea" placeholder="Observações"></textarea>
      <input id="swal-data" type="datetime-local" class="swal2-input" value="${dia ? dia.toISOString().slice(0,16) : ''}">
    `,
    focusConfirm: false,
    showCancelButton: true,
    preConfirm: () => {
      return {
        cliente: document.getElementById('swal-cliente')?.value,
        telefone: document.getElementById('swal-telefone')?.value,
        pacote: document.getElementById('swal-pacote')?.value,
        endereco: document.getElementById('swal-endereco')?.value,
        pagamento: parseFloat(document.getElementById('swal-pagamento')?.value || 0),
        observacao: document.getElementById('swal-observacao')?.value,
        data: new Date(document.getElementById('swal-data')?.value),
      };
    }
  });

  if (formValues) {
    // Valor do pacote
    const pacoteSelecionado = window.dashboardState.pacotes.find(p => p.nome === formValues.pacote);
    const valor = pacoteSelecionado ? pacoteSelecionado.valor : 0;

    // Salvar no Firebase
    try {
      const docRef = await db.collection("agendamentos").add({
        cliente: formValues.cliente,
        telefone: formValues.telefone,
        pacote: formValues.pacote,
        endereco: formValues.endereco,
        pagamento: formValues.pagamento,
        observacao: formValues.observacao,
        valor,
        status: "pendente",
        data: formValues.data
      });
      Swal.fire("Sucesso", "Agendamento criado com sucesso!", "success");
      carregarAgendamentos();
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Não foi possível criar o agendamento.", "error");
    }
  }
}

// ============================
// FUNÇÃO: ABRIR AGENDAMENTO EXISTENTE
// ============================
async function abrirAgendamento(id) {
  const ag = window.dashboardState.agendamentos.find(a => a.id === id);
  if (!ag) return;

  Swal.fire({
    title: `Agendamento - ${ag.cliente}`,
    html: `
      <p><b>Cliente:</b> ${ag.cliente}</p>
      <p><b>Telefone:</b> ${ag.telefone}</p>
      <p><b>Pacote:</b> ${ag.pacote}</p>
      <p><b>Endereço:</b> ${ag.endereco}</p>
      <p><b>Pagamento:</b> R$ ${ag.pagamento || 0}</p>
      <p><b>Observações:</b> ${ag.observacao || ''}</p>
      <p><b>Data:</b> ${(ag.data?.toDate ? ag.data.toDate() : new Date(ag.data)).toLocaleString()}</p>
      <p><b>Status:</b> ${ag.status}</p>
    `,
    showCancelButton: true,
    confirmButtonText: 'Fechar'
  });
}

// ============================
// FUNÇÃO: RENDER CALENDÁRIO
// ============================
function renderCalendar(agendamentos = []) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  // Limpar calendário antigo
  if (window.dashboardState.calendario) {
    window.dashboardState.calendario.destroy();
  }

  const eventos = agendamentos.map(a => {
    const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    return {
      id: a.id,
      title: a.cliente || "Sem nome",
      start: data,
      allDay: true
    };
  });

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    headerToolbar: false,
    dayMaxEvents: true,
    events: eventos,
    dateClick: function(info) {
      const dia = new Date(info.dateStr);
      novoAgendamento(dia);
    },
    eventClick: function(info) {
      if (info.event.id) abrirAgendamento(info.event.id);
    },
    dayCellDidMount: function(info) {
      // Mostrar número de agendamentos no dia
      const count = agendamentos.filter(a => {
        const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        return d.toDateString() === info.date.toDateString();
      }).length;
      if (count > 0) {
        const badge = document.createElement('div');
        badge.textContent = count;
        badge.style.cssText = "position:absolute;top:2px;right:2px;background:#ff5050;color:white;font-size:12px;padding:2px 5px;border-radius:50%";
        info.el.style.position = 'relative';
        info.el.appendChild(badge);
      }
    }
  });

  calendar.render();
  window.dashboardState.calendario = calendar;
}

// ============================
// EVENTOS
// ============================
if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);
if (btnNovo) btnNovo.addEventListener("click", () => novoAgendamento());

// Atualiza nome do usuário
auth?.onAuthStateChanged(user => {
  if (user) {
    const el = document.getElementById('user-name');
    if (el) el.textContent = user.displayName || user.email;
  }
});

// Carrega agendamentos e calendário ao iniciar
window.addEventListener("DOMContentLoaded", carregarAgendamentos);
