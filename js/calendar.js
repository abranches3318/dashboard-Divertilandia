// js/calendar.js
// FullCalendar v6.1.4 (index.global.min.js)
// Integração com Firestore e com agendamentos.js
// Requer: firebase compat (firestore), FullCalendar index.global

(function () {
  // segurança: verificar elementos
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) {
    console.warn("calendar.js: elemento #calendar não encontrado.");
    return;
  }

  // referência Firestore
  const db = firebase.firestore();
  const agendamentosRef = db.collection("agendamentos");

  // instância do FullCalendar
  let calendar = null;

  // util: converte agendamento -> evento FullCalendar
  function agendamentoToEvent(ag) {
    // suportar campos antigos/novos
    const date = ag.data_evento || ag.data || ag.dataEvent || null; // YYYY-MM-DD
    const horario = ag.horario || ag.time || null; // "HH:MM"
    const titleParts = [];

    if (ag.cliente_nome || ag.cliente) titleParts.push(ag.cliente_nome || ag.cliente);
    const item = ag.pacote_nome || ag.item_nome || (ag.itens ? (Array.isArray(ag.itens) ? ag.itens.map(i => i.id || i.nome || i).join(", ") : ag.itens) : "");
    if (item) titleParts.push(item);

    const title = titleParts.length ? titleParts.join(" — ") : (ag.item_nome || ag.pacote_nome || ag.cliente_nome || "Agendamento");

    // montar start datetime
    let start = date;
    if (!start) return null;
    if (horario && horario.length >= 4) {
      // FullCalendar aceita "YYYY-MM-DDThh:mm:ss" ou "YYYY-MM-DDThh:mm"
      // garantir formato HH:MM
      const hhmm = horario.length === 5 ? horario : horario.padStart(5, "0");
      start = `${date}T${hhmm}`;
    }

    return {
      id: ag.id || ag._id || null,
      title,
      start,
      allDay: !horario, // se não houver horário, tratar como allDay
      extendedProps: {
        original: ag
      }
    };
  }

  // carregar eventos para um range (start,end: Date)
  async function carregarEventosRange(startDate, endDate) {
    try {
      // Firestore: buscar por data_evento ou data no range
      // As datas no Firestore podem ser strings "YYYY-MM-DD" ou Timestamps.
      // Faremos uma query ampla e filtraremos em JS.
      const snap = await agendamentosRef.get();
      const eventos = [];
      snap.forEach(doc => {
        const ag = { id: doc.id, ...doc.data() };
        // normalizar data string
        const dt = ag.data_evento || ag.data;
        if (!dt) return;

        // comparar se dt está entre startDate e endDate (inclusive)
        // startDate and endDate são Date — comparar YYYY-MM-DD
        const dtObj = new Date(dt + "T00:00:00");
        // zero time for safe compare
        const s = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const e = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        if (dtObj >= s && dtObj <= e) {
          const ev = agendamentoToEvent(ag);
          if (ev) eventos.push(ev);
        }
      });
      return eventos;
    } catch (err) {
      console.error("calendar.js: erro ao carregar eventos:", err);
      return [];
    }
  }

  // atualiza eventSource do calendário
  async function refreshCalendarEvents() {
    if (!calendar) return;
    const view = calendar.view;
    const start = view.activeStart;
    const end = view.activeEnd;

    const eventos = await carregarEventosRange(start, end);

    // remove todas as sources e adiciona os eventos
    calendar.removeAllEventSources();
    calendar.addEventSource(eventos);
  }

  // função externa chamada por agendamentos.js (onSnapshot)
  // lista: array de agendamentos (docs data already)
  window.updateCalendarCounts = function (lista) {
    // transformar lista em eventos e atualizar
    if (!calendar) return;

    const eventos = [];
    (lista || []).forEach(ag => {
      // normalizar id
      const a = Object.assign({}, ag);
      if (!a.id && a._id) a.id = a._id;
      const ev = agendamentoToEvent(a);
      if (ev) eventos.push(ev);
    });

    calendar.removeAllEventSources();
    calendar.addEventSource(eventos);
  };

  // função pública que o calendário deve chamar para abrir agendamentos
  // (mantida para compatibilidade: abrirAgendamentosNaData na agendamentos.js)
  window.abrirAgendamentosNaData = window.abrirAgendamentosNaData || function (dateISO) {
    if (typeof window.openAgendamentosByDate === "function") {
      window.openAgendamentosByDate(dateISO);
      return;
    }
    if (typeof window.abrirAgendamentosNaData === "function") {
      // se já existir, evita sobrescrever
      return;
    }
  };

  // inicializa o FullCalendar
  function initCalendar() {
    // garantir o namespace FullCalendar
    if (typeof FullCalendar === "undefined") {
      console.error("calendar.js: FullCalendar não encontrado (index.global.min.js não carregado).");
      return;
    }

    // criar instancia
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: "dayGridMonth",
      locale: "pt-br",
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
      navLinks: true,
      selectable: true,
      height: "auto",
      dayMaxEvents: true,
      eventDisplay: "block",
      // clique numa data
      dateClick: function (info) {
        // info.dateStr -> 'YYYY-MM-DD'
        // abrir a seção de agendamentos já filtrada
        if (typeof window.openAgendamentosByDate === "function") {
          window.openAgendamentosByDate(info.dateStr);
        } else if (typeof window.abrirAgendamentosNaData === "function") {
          window.abrirAgendamentosNaData(info.dateStr);
        } else {
          // fallback: set filtro e mostrar seção se existirem elementos
          const f = document.getElementById("filtroData") || document.getElementById("filtro-data");
          if (f) f.value = info.dateStr;
          if (typeof nav === "function") nav("agendamentos");
        }
      },
      // clique em evento -> abrir detalhes (se existir função)
      eventClick: function (info) {
        const ev = info.event;
        const id = ev.id;
        if (id && typeof window.abrirAgendamento === "function") {
          window.abrirAgendamento(id);
        } else {
          // se não houver função, abrir seção agendamentos para a data
          const startStr = ev.startStr ? ev.startStr.slice(0, 10) : null;
          if (startStr) {
            if (typeof window.openAgendamentosByDate === "function") {
              window.openAgendamentosByDate(startStr);
            } else if (typeof nav === "function") {
              nav("agendamentos");
            }
          }
        }
      },
      // custom render: tooltip com informações
      eventDidMount: function (info) {
        // criar tooltip simples com title + horário (se aplicavel)
        try {
          const ag = info.event.extendedProps.original || {};
          let tip = info.event.title || "";
          if (ag.horario) tip += `\nHorário: ${ag.horario}`;
          if (ag.status) tip += `\nStatus: ${ag.status}`;
          info.el.setAttribute("title", tip);
        } catch (e) { /* ignore */ }
      },
      // quando mudar view (navegar), recarregar eventos do range
      datesSet: function (arg) {
        // arg.view.activeStart / activeEnd
        refreshCalendarEvents();
      }
    });

    calendar.render();

    // carregamento inicial de eventos
    refreshCalendarEvents();
  }

  // iniciar
  document.addEventListener("DOMContentLoaded", initCalendar);
})();
