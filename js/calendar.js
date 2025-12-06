// ======================================
// CALENDÁRIO — DIVERTILÂNDIA DASHBOARD
// ======================================

document.addEventListener("DOMContentLoaded", () => {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  // Obter eventos do cache do dashboard
  const eventos = window.dashboardState?.agendamentosCache || [];

  // Preparar eventos para o FullCalendar
  const fcEvents = eventos.map(ev => ({
    id: ev.id,
    title: ev.item_nome || "Evento",
    start: ev.data_evento, // deve estar no formato YYYY-MM-DD
    allDay: true
  }));

  // Inicializar FullCalendar
  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    height: "auto",
    contentHeight: "auto",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek"
    },
    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia",
      list: "Lista"
    },
    events: fcEvents,
    eventClick: function(info) {
      // Ao clicar no evento, abrir página de agendamento
      window.location.href = "paginas/ver-agendamento.html?id=" + info.event.id;
    },
    dateClick: function(info) {
      // Ao clicar em uma data, abrir página de agendamentos daquele dia
      window.location.href = "paginas/ver-agendamento.html?data=" + info.dateStr;
    },
    dayMaxEventRows: true,
    displayEventTime: false,
    themeSystem: "standard"
  });

  calendar.render();
});
