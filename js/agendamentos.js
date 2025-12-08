// ============================
// AGENDAMENTOS.JS
// ============================

window.addEventListener("DOMContentLoaded", () => {

  const db = window.db;
  const auth = window.auth;

  const listaAgendamentosEl = document.getElementById("listaAgendamentos");
  const btnFiltrar = document.getElementById("btnFiltrarAgendamentos");
  const btnNovo = document.getElementById("btnNovoAgendamento");

  const filtroData = document.getElementById("filtroData");
  const filtroCliente = document.getElementById("filtroCliente");
  const filtroTelefone = document.getElementById("filtroTelefone");
  const filtroStatus = document.getElementById("filtroStatus");

  // Estado global
  window.agendamentosState = window.agendamentosState || { todos: [] };
  window.dashboardState = window.dashboardState || { agendamentosCache: [], calendario: null };

  // ============================
  // CARREGAR AGENDAMENTOS
  // ============================
  async function carregarAgendamentos() {
    try {
      const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
      const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.agendamentosState.todos = agendamentos;
      window.dashboardState.agendamentosCache = agendamentos;
      renderizarTabela(agendamentos);
      renderCalendar(agendamentos);
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
        <td><button class="btn-secundario btn-ver" data-id="${a.id}">Ver</button></td>
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
    renderCalendar(agendamentos);
  }

  // ============================
  // NOVO AGENDAMENTO
  // ============================
  function novoAgendamento() {
    Swal.fire({
      title: 'Novo Agendamento',
      html: `
        <input type="text" id="swal-cliente" class="swal2-input" placeholder="Nome do cliente">
        <input type="text" id="swal-telefone" class="swal2-input" placeholder="Telefone">
        <input type="date" id="swal-data" class="swal2-input">
        <input type="number" id="swal-valor" class="swal2-input" placeholder="Valor">
      `,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      preConfirm: () => {
        return {
          cliente: document.getElementById('swal-cliente')?.value,
          telefone: document.getElementById('swal-telefone')?.value,
          data: document.getElementById('swal-data')?.value,
          valor: Number(document.getElementById('swal-valor')?.value || 0),
          status: 'pendente'
        };
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const docRef = await db.collection("agendamentos").add({
            ...result.value,
            data: new Date(result.value.data)
          });
          Swal.fire('Sucesso', 'Agendamento criado!', 'success');
          carregarAgendamentos();
        } catch (err) {
          Swal.fire('Erro', 'Não foi possível criar o agendamento.', 'error');
          console.error(err);
        }
      }
    });
  }

  // ============================
  // CALENDÁRIO
  // ============================
  function renderCalendar(agendamentos = []) {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    // Limpar calendário anterior
    if (window.dashboardState.calendario) window.dashboardState.calendario.destroy();

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
      headerToolbar: false, // remove today/month/week/day
      events: eventos,
      eventClick: function(info) {
        if (info.event.id) abrirAgendamento(info.event.id);
      },
      height: 'auto',
      contentHeight: 'auto'
    });

    calendar.render();
    window.dashboardState.calendario = calendar;
  }

  // ============================
  // ABRIR AGENDAMENTO (simples)
  // ============================
  window.abrirAgendamento = function(id) {
    const ag = window.agendamentosState.todos.find(a => a.id === id);
    if (!ag) return;
    Swal.fire({
      title: `Agendamento: ${ag.cliente || ''}`,
      html: `
        <p><b>Telefone:</b> ${ag.telefone || ''}</p>
        <p><b>Data:</b> ${ag.data?.toDate ? ag.data.toDate().toLocaleDateString() : new Date(ag.data).toLocaleDateString()}</p>
        <p><b>Status:</b> ${ag.status}</p>
        <p><b>Valor:</b> R$ ${Number(ag.valor || 0).toFixed(2)}</p>
      `
    });
  }

  // ============================
  // EVENTOS
  // ============================
  if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);
  if (btnNovo) btnNovo.addEventListener("click", novoAgendamento);

  // Inicializar
  carregarAgendamentos();

});
