// ======================================
// CALENDÁRIO — DIVERTILÂNDIA DASHBOARD (FullCalendar)
// ======================================

// Guarda a instância do calendário
window.fcInstance = null;

// Função principal para renderizar o calendário
window.renderCalendar = function(eventos) {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  // Transformar eventos do Firestore em formato FullCalendar
  const fcEvents = eventos.map(ev => ({
    id: ev.id,
    title: ev.item_nome || "Evento",
    start: ev.data_evento, // YYYY-MM-DD
    extendedProps: {
      cliente: ev.cliente_nome || "",
      endereco: ev.endereco || "",
      monitores: ev.monitores || []
    }
  }));

  // Destruir calendário anterior, se existir
  if (window.fcInstance) {
    window.fcInstance.destroy();
  }

  // Criar nova instância do FullCalendar
  window.fcInstance = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth', // Visão mensal
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek' // alterna entre mês e semana
    },
    navLinks: true,      // permite clicar em datas para navegar
    editable: false,     // não permitir drag/drop por enquanto
    selectable: true,    // permite seleção de datas
    dayMaxEvents: true,  // mostra "+x" se muitos eventos
    events: fcEvents,
    height: 500,
    eventClick: function(info) {
      const id = info.event.id;
      if (id) {
        window.abrirAgendamento(id); // abre página de detalhes
      }
    },
    dateClick: function(info) {
      // opcional: abrir lista do dia ao clicar na data vazia
      const dateISO = info.dateStr;
      window.abrirListaDoDia(dateISO);
    }
  });

  // Renderiza o calendário
  window.fcInstance.render();
};

// Função de abertura de agendamento (já existente no dashboard.js)
window.abrirAgendamento = function(id) {
  if (!id) return;
  window.location.href = `paginas/ver-agendamento.html?id=${id}`;
};

// Função de abrir lista do dia (opcional)
window.abrirListaDoDia = function(dataISO) {
  window.location.href = `paginas/ver-agendamento.html?data=${dataISO}`;
};
