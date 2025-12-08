// ============================
// DASHBOARD.JS - CALENDÁRIO INTERATIVO
// ============================

// Firebase compat
const db = window.db;

// Elemento do calendário
const calendarEl = document.getElementById("calendar");

// Estado global do calendário
window.dashboardState = window.dashboardState || {
  calendario: null,
  agendamentosCache: []
};

// Função para carregar agendamentos para o calendário
async function carregarAgendamentosCalendario() {
  try {
    const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
    const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.dashboardState.agendamentosCache = agendamentos;
    renderizarCalendario(agendamentos);
  } catch (err) {
    console.error("Erro ao carregar agendamentos para o calendário:", err);
    Swal.fire('Erro', 'Não foi possível carregar agendamentos para o calendário', 'error');
  }
}

// Função para renderizar o calendário
function renderizarCalendario(agendamentos) {
  if (!calendarEl) return;

  // Mapear agendamentos para FullCalendar
  const eventos = agendamentos.map(a => {
    const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    return {
      id: a.id,
      title: a.cliente || "Sem nome",
      start: data,
      allDay: true,
      extendedProps: {
        status: a.status || "",
        telefone: a.telefone || "",
        valor: a.valor || 0
      }
    };
  });

  // Destruir calendário antigo
  if (window.dashboardState.calendario) {
    window.dashboardState.calendario.destroy();
  }

  // Criar calendário
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    locale: 'pt-br',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay'
    },
    events: eventos,
    eventClick: info => {
      // Abrir agendamento existente
      if (info.event.id) window.abrirAgendamento(info.event.id);
    },
    dateClick: info => {
      // Criar novo agendamento no dia clicado
      if (window.novoAgendamento) {
        window.novoAgendamento(new Date(info.date));
      }
    },
    eventDidMount: info => {
      // Adicionar badge com contagem se houver mais de 1 agendamento no mesmo dia
      const dateStr = info.event.start.toISOString().slice(0, 10);
      const count = agendamentos.filter(a => {
        const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        return d.toISOString().slice(0,10) === dateStr;
      }).length;
      if (count > 1) {
        info.el.innerHTML += `<span class="fc-badge">${count}</span>`;
      }
    },
    height: 600
  });

  calendar.render();
  window.dashboardState.calendario = calendar;
}

// Atualizar calendário ao mudar para a seção dashboard
window.addEventListener("DOMContentLoaded", () => {
  const observer = new MutationObserver(() => {
    const dashboardSection = document.getElementById("pagina-dashboard");
    if (dashboardSection && dashboardSection.classList.contains("ativa")) {
      if (window.dashboardState.agendamentosCache) {
        renderizarCalendario(window.dashboardState.agendamentosCache);
      }
    }
  });

  const dashEl = document.getElementById("pagina-dashboard");
  if (dashEl) {
    observer.observe(dashEl, { attributes: true, attributeFilter: ['class'] });
  }

  // Carregar inicialmente
  carregarAgendamentosCalendario();
});
