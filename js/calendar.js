// js/calendar.js
// FullCalendar integration + day counts + click handlers

(function () {
  // garante que FullCalendar foi carregado
  if (typeof FullCalendar === 'undefined') {
    console.error("calendar.js: FullCalendar não encontrado. Importe index.global.min.js primeiro.");
    return;
  }

  // garantias de firebase
  window.db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
  window.auth = window.auth || (firebase && firebase.auth ? firebase.auth() : null);

  // renderCalendar é a função pública usada por dashboard.js
  window.renderCalendar = function (agendamentos = []) {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
      console.warn('calendar.js: elemento #calendar não encontrado no HTML.');
      return;
    }

    // preparar mapa de contagem por data (YYYY-MM-DD)
    const counts = {};
    agendamentos.forEach(a => {
      let d;
      if (a.data && a.data.toDate) d = a.data.toDate();
      else d = a.data ? new Date(a.data) : null;
      if (!d || isNaN(d)) return;
      const iso = d.toISOString().slice(0,10);
      counts[iso] = (counts[iso] || 0) + 1;
    });

    // converter eventos
    const events = agendamentos.map(a => {
      const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return {
        id: a.id,
        title: a.cliente || (a.cliente_nome || 'Agendamento'),
        start: d,
        allDay: true,
        extendedProps: { original: a }
      };
    });

    // destruir calendário antigo
    if (window.dashboardState && window.dashboardState.calendario) {
      try { window.dashboardState.calendario.destroy(); } catch (e) { /* ignore */ }
      window.dashboardState.calendario = null;
    }

    // criar calendario
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      locale: 'pt-br',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
      },
      buttonText: {
        today: 'Hoje',
        month: 'Mês',
        week: 'Semana',
        day: 'Dia',
        list: 'Lista'
      },
      navLinks: true,
      selectable: true,
      height: 'auto',
      events,
      dateClick: function(info) {
        // clique em célula (data) -> abre novo agendamento (se função existir)
        const dateISO = info.dateStr;
        if (typeof window.novoAgendamento === 'function') {
          window.novoAgendamento(new Date(dateISO));
        } else if (typeof window.abrirAgendamentosNaData === 'function') {
          window.abrirAgendamentosNaData(dateISO);
        } else {
          // fallback: navega para seção agendamentos e preenche filtro
          const f = document.getElementById('filtroData'); if (f) f.value = dateISO;
          const pageFn = window.nav || (()=>{});
          if (pageFn) pageFn('agendamentos');
          if (typeof aplicarFiltros === 'function') aplicarFiltros();
        }
      },
      eventClick: function(info) {
        const id = info.event.id;
        if (id && typeof window.abrirAgendamento === 'function') {
          window.abrirAgendamento(id);
        } else {
          // fallback: mostrar data
          const dateStr = info.event.startStr ? info.event.startStr.slice(0,10) : '';
          if (dateStr && typeof window.abrirAgendamentosNaData === 'function') {
            window.abrirAgendamentosNaData(dateStr);
          }
        }
      },
      dayCellDidMount: function(arg) {
        // adicionar badge com contagem se > 0
        try {
          const iso = arg.date.toISOString().slice(0,10);
          const count = counts[iso] || 0;
          if (count > 0) {
            const badge = document.createElement('div');
            badge.className = 'fc-day-badge';
            badge.style.cssText = 'background:#4cafef;color:#fff;padding:2px 6px;border-radius:8px;font-size:12px;display:inline-block;margin-top:6px;';
            badge.textContent = count;
            arg.el.querySelector('.fc-daygrid-day-top')?.appendChild(badge);
          }
        } catch(e){ /* ignore */ }
      },
      eventDidMount: function(info) {
        // tooltip básico com hora / status (se houver)
        try {
          const ag = info.event.extendedProps.original || {};
          let tip = info.event.title || '';
          if (ag.horario) tip += '\nHorário: ' + ag.horario;
          if (ag.status) tip += '\nStatus: ' + ag.status;
          info.el.setAttribute('title', tip);
        } catch(e){}
      }
    });

    calendar.render();
    window.dashboardState = window.dashboardState || {};
    window.dashboardState.calendario = calendar;
  };

})();
