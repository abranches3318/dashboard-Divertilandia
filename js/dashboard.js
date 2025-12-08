// ============================
// DASHBOARD.JS
// ============================

window.addEventListener("DOMContentLoaded", async () => {
  const auth = window.auth;
  const db = window.db;

  // ----------------------------
  // ESTADO GLOBAL
  // ----------------------------
  window.dashboardState = {
    agendamentos: [],
    calendario: null
  };

  // ----------------------------
  // ELEMENTOS
  // ----------------------------
  const calendarEl = document.getElementById("calendar");
  const agHojeEl = document.getElementById("ag-hoje");
  const receitaMesEl = document.getElementById("receita-mes");
  const tarefasPendentesEl = document.getElementById("tarefas-pendentes");

  // ----------------------------
  // CARREGAR AGENDAMENTOS
  // ----------------------------
  async function carregarAgendamentos() {
    try {
      const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
      const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.dashboardState.agendamentos = agendamentos;

      atualizarEstatisticas(agendamentos);
      renderizarCalendario(agendamentos);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    }
  }

  // ----------------------------
  // ESTATÍSTICAS
  // ----------------------------
  function atualizarEstatisticas(agendamentos) {
    const hoje = new Date().toDateString();
    const agHoje = agendamentos.filter(a => {
      const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return d.toDateString() === hoje;
    }).length;

    agHojeEl.textContent = agHoje;

    const receita = agendamentos.reduce((sum, a) => sum + (Number(a.valor || 0)), 0);
    receitaMesEl.textContent = `R$ ${receita.toFixed(2)}`;

    const tarefasPend = agendamentos.filter(a => a.status === "pendente").length;
    tarefasPendentesEl.textContent = tarefasPend;
  }

  // ----------------------------
  // CALENDÁRIO
  // ----------------------------
  function renderizarCalendario(agendamentos) {
    if (!calendarEl) return;

    const eventos = agendamentos.map(a => {
      const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return {
        id: a.id,
        title: a.cliente || "Sem nome",
        start: data,
        allDay: true,
        extendedProps: { status: a.status, telefone: a.telefone, valor: a.valor }
      };
    });

    if (window.dashboardState.calendario) window.dashboardState.calendario.destroy();

    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'pt-br',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      buttonText: {
        today: 'Hoje',
        month: 'Mês',
        week: 'Semana',
        day: 'Dia'
      },
      events: eventos,
      dateClick: info => {
        // Redireciona para agendamentos.html com data selecionada
        window.location.href = `agendamentos.html?data=${info.dateStr}`;
      },
      eventClick: info => {
        // Redireciona para agendamentos.html para ver agendamento específico
        window.location.href = `agendamentos.html?id=${info.event.id}`;
      },
      height: 600
    });

    calendar.render();
    window.dashboardState.calendario = calendar;
  }

  // ----------------------------
  // AUTENTICAÇÃO
  // ----------------------------
  auth.onAuthStateChanged(user => {
    const el = document.getElementById('user-name');
    if (el) el.textContent = user ? (user.displayName || user.email) : 'Usuário';
  });

  // ----------------------------
  // CARREGAR INICIAL
  // ----------------------------
  carregarAgendamentos();

});
