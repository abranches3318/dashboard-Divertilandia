// ============================
// CALENDÁRIO - calendar.js
// ============================

// Garantir compatibilidade com Firebase
const db = window.db;

// Função global para renderizar o calendário
window.renderCalendar = function(agendamentos = []) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) {
    console.error("Elemento #calendar não encontrado no HTML.");
    return;
  }

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
      // Ao clicar em um evento, abrir detalhes
      if (info.event.id) {
        window.abrirAgendamento(info.event.id);
      }
    }
  });

  calendar.render();

  // Salvar instância para possíveis atualizações
  window.dashboardState.calendario = calendar;
};
