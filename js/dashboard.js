// ============================
// DASHBOARD.JS - CALENDÁRIO
// ============================

window.addEventListener("DOMContentLoaded", async () => {
  // ----------------------------
  // FIREBASE COMPAT
  // ----------------------------
  const auth = window.auth;
  const db = window.db;

  if (!auth || !db) {
    console.error("Firebase não inicializado corretamente.");
    return;
  }

  // ----------------------------
  // ELEMENTOS
  // ----------------------------
  const calendarEl = document.getElementById("calendar");
  const agHojeEl = document.getElementById("ag-hoje");

  // ----------------------------
  // ESTADO GLOBAL
  // ----------------------------
  window.dashboardState = {
    agendamentos: [],
    calendario: null
  };

  // ----------------------------
  // FUNÇÕES
  // ----------------------------

  // Carrega agendamentos do Firestore
  async function carregarAgendamentos() {
    try {
      const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
      const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.dashboardState.agendamentos = agendamentos;

      atualizarResumo(agendamentos);
      renderizarCalendario(agendamentos);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    }
  }

  // Atualiza cards resumo
  function atualizarResumo(agendamentos) {
    const hoje = new Date().toDateString();
    const agHoje = agendamentos.filter(a => {
      const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return d.toDateString() === hoje;
    }).length;
    if (agHojeEl) agHojeEl.textContent = agHoje;
  }

  // Renderiza calendário FullCalendar
  function renderizarCalendario(agendamentos) {
    if (!calendarEl) return;

    const eventos = agendamentos.map(a => {
      const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return {
        id: a.id,
        title: a.cliente || "Sem nome",
        start: data,
        allDay: true,
        extendedProps: {
          status: a.status,
          telefone: a.telefone,
          valor: a.valor
        }
      };
    });

    // Destrói calendário antigo
    if (window.dashboardState.calendario) {
      window.dashboardState.calendario.destroy();
    }

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
        // Abrir página de novo agendamento passando a data
        const dataISO = info.dateStr;
        window.location.href = 'agendamentos.html?data=' + dataISO;
      },
      eventClick: info => {
        // Abrir página de edição/visualização do agendamento
        const id = info.event.id;
        window.location.href = `agendamentos.html?id=${id}`;
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
    if (!user) window.location.href = '../index.html';
  });

  // ----------------------------
  // INICIALIZAÇÃO
  // ----------------------------
  carregarAgendamentos();

});
