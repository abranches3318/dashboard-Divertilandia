// ======================================
// CALENDÁRIO — DIVERTILÂNDIA DASHBOARD (FullCalendar)
// ======================================

window.fcInstance = null;

window.renderCalendar = function(eventos) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  const fcEvents = eventos.map(ev => ({
    id: ev.id,
    title: ev.item_nome || "Evento",
    start: ev.data_evento,
    extendedProps: {
      cliente: ev.cliente_nome || "",
      endereco: ev.endereco || "",
      monitores: ev.monitores || []
    }
  }));

  if (window.fcInstance) {
    window.fcInstance.destroy();
  }

  window.fcInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek'
    },
    locale: 'pt-br',       // português
    themeSystem: 'standard', // calendário branco
    navLinks: true,
    editable: false,
    selectable: true,
    dayMaxEvents: true,
    events: fcEvents,
    height: 'auto',
    eventClick: function(info) {
      const id = info.event.id;
      if (id) {
        window.abrirAgendamento(id); 
      }
    },
    dateClick: function(info) {
      const dateISO = info.dateStr;
      // vai para página de agendamentos do dia
      window.location.href = `paginas/ver-agendamento.html?data=${dateISO}`;
    }
  });

  window.fcInstance.render();
};

window.abrirAgendamento = function(id) {
  if (!id) return;
  window.location.href = `paginas/ver-agendamento.html?id=${id}`;
};

window.abrirListaDoDia = function(dataISO) {
  window.location.href = `paginas/ver-agendamento.html?data=${dataISO}`;
};
