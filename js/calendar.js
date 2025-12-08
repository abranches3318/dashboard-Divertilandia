// js/calendar.js
// FullCalendar integration (v6) with Firestore (compat).
// Assumptions: FullCalendar index.global.min.js is carregado antes deste script.
// Uses window.db if present, otherwise firebase.firestore().

(function () {
  const db = window.db || (firebase && firebase.firestore && firebase.firestore());
  if (!db) {
    console.error("calendar.js: Firestore não encontrado (db).");
    return;
  }

  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) {
    console.warn("calendar.js: elemento #calendar não encontrado.");
    return;
  }

  let calendar = null;

  // Converte um documento de agendamento em evento FullCalendar
  function toEvent(doc) {
    const d = doc.data ? (typeof doc.data === "function" ? doc.data() : doc) : doc;
    const id = doc.id || d.id;
    const date = d.data_evento || d.data || d.dataEvent || d.date; // formatos possíveis
    if (!date) return null;
    const horario = d.horario || d.time || "";
    const titleParts = [];
    if (d.cliente_nome || d.cliente) titleParts.push(d.cliente_nome || d.cliente);
    const item = d.pacote_nome || d.item_nome || (Array.isArray(d.itens) ? d.itens.map(i=>i.nome||i.id||i).join(", ") : (d.itens || ""));
    if (item) titleParts.push(item);
    const title = titleParts.length ? titleParts.join(" — ") : (d.item_nome || d.pacote_nome || d.cliente_nome || "Agendamento");

    let start = date;
    if (horario) {
      const hhmm = horario.length === 5 ? horario : horario.padStart(5, "0");
      start = `${date}T${hhmm}`;
    }

    return {
      id,
      title,
      start,
      allDay: !horario,
      extendedProps: { original: d }
    };
  }

  // Busca eventos do Firestore dentro do range e devolve array de eventos
  async function loadEventsInRange(start, end) {
    try {
      // buscar todos e filtrar em JS (simpler, evita problemas com formatos variados)
      const snap = await db.collection("agendamentos").get();
      const events = [];
      snap.forEach(doc => {
        const d = { id: doc.id, ...doc.data() };
        const dateStr = d.data_evento || d.data || d.date;
        if (!dateStr) return;
        const dtObj = new Date(dateStr + "T00:00:00");
        const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
        if (dtObj >= s && dtObj <= e) {
          const ev = toEvent({ id: doc.id, ...doc.data() });
          if (ev) events.push(ev);
        }
      });
      return events;
    } catch (err) {
      console.error("calendar.js: erro ao carregar eventos:", err);
      return [];
    }
  }

  async function refreshEvents() {
    if (!calendar) return;
    const view = calendar.view;
    const start = view.activeStart;
    const end = view.activeEnd;
    const evs = await loadEventsInRange(start, end);
    calendar.removeAllEventSources();
    calendar.addEventSource(evs);
  }

  function init() {
    if (typeof FullCalendar === "undefined") {
      console.error("calendar.js: FullCalendar não encontrado.");
      return;
    }

    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "pt-br",
      headerToolbar: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay"
      },
      buttonText: {
        today: "Hoje",
        month: "Mês",
        week: "Semana",
        day: "Dia",
        list: "Lista"
      },
      navLinks: true,
      selectable: true,
      height: "auto",
      dayMaxEvents: true,
      eventDisplay: "block",
      dateClick: function(info) {
        // abertura dos agendamentos filtrados na data clicada
        const dateStr = info.dateStr; // YYYY-MM-DD
        if (typeof window.abrirAgendamentosNaData === "function") {
          window.abrirAgendamentosNaData(dateStr);
        } else if (typeof window.openAgendamentosByDate === "function") {
          window.openAgendamentosByDate(dateStr);
        } else if (typeof nav === "function") {
          // fallback: set filtro e abrir
          const f = document.getElementById("filtroData") || document.getElementById("filtro-data");
          if (f) f.value = dateStr;
          nav("agendamentos");
        }
      },
      eventClick: function(info) {
        const id = info.event.id;
        if (id && typeof window.abrirAgendamento === "function") {
          window.abrirAgendamento(id);
        } else {
          // fallback: abrir agendamentos do dia
          const s = info.event.startStr ? info.event.startStr.slice(0,10) : null;
          if (s && typeof window.abrirAgendamentosNaData === "function") {
            window.abrirAgendamentosNaData(s);
          } else if (s && typeof nav === "function") {
            nav("agendamentos");
          }
        }
      },
      eventDidMount: function(info) {
        try {
          const ag = info.event.extendedProps.original || {};
          let tip = info.event.title || "";
          if (ag.horario) tip += `\nHorário: ${ag.horario}`;
          if (ag.status) tip += `\nStatus: ${ag.status}`;
          info.el.setAttribute("title", tip);
        } catch (e) {}
      },
      datesSet: function() {
        refreshEvents();
      }
    });

    calendar.render();
    refreshEvents();
    // Expor função global para recarregar
    window.recarregarCalendario = refreshEvents;
  }

  document.addEventListener("DOMContentLoaded", init);
})();
