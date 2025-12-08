// ============================
// CALENDARIO.JS CORRIGIDO
// ============================

// Garantir que o estado do dashboard exista
window.dashboardState = window.dashboardState || { calendario: null, agendamentosCache: [] };

// Função global para renderizar o calendário
window.renderCalendar = function(agendamentos = []) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) {
    console.error("Elemento #calendar não encontrado no HTML.");
    return;
  }

  // Garantir que só renderize se a seção dashboard estiver ativa
  const dashboardSection = document.getElementById("pagina-dashboard");
  if (!dashboardSection || !dashboardSection.classList.contains("ativa")) return;

  // Converter agendamentos do Firestore para formato FullCalendar
  const eventos = agendamentos.map(a => {
    const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    return {
      id: a.id,
      title: a.cliente || "Sem nome",
      start: data,
      allDay: true,
      extendedProps: {
        telefone: a.telefone || "",
        status: a.status || "",
        valor: a.valor || 0
      }
    };
  });

  // Limpar calendário anterior, se houver
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
    eventClick: function(info) {
      if (info.event.id) {
        window.abrirAgendamento(info.event.id);
      }
    },
    height: 'auto',
    contentHeight: 'auto'
  });

  calendar.render();

  // Salvar instância para possíveis atualizações
  window.dashboardState.calendario = calendar;
};

// ============================
// CARREGA AGENDAMENTOS NO CALENDÁRIO
// ============================
async function atualizarCalendario() {
  try {
    const snap = await window.db.collection("agendamentos").orderBy("data", "asc").get();
    const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.dashboardState.agendamentosCache = agendamentos;
    window.renderCalendar(agendamentos);
  } catch (err) {
    console.error("Erro ao carregar agendamentos para o calendário:", err);
  }
}

// Atualiza ao abrir a dashboard
window.addEventListener("DOMContentLoaded", () => {
  const dashboardSection = document.getElementById("pagina-dashboard");
  if (!dashboardSection) return;

  const observer = new MutationObserver(() => {
    if (dashboardSection.classList.contains("ativa")) {
      atualizarCalendario();
    }
  });

  observer.observe(dashboardSection, { attributes: true, attributeFilter: ['class'] });
});
