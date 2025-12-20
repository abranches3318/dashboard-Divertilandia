// js/calendar.js — versão definitiva compatível com agendamentos.js

let calendar;

// ===========================
// HELPERS
// ===========================
function statusColor(status) {
  switch ((status || "").toLowerCase()) {
    case "confirmado": return "#4cafef";
    case "pendente": return "#e6b800";
    case "cancelado": return "#d32f2f";
    case "concluido":
    case "finalizado": return "#2e7d32";
    default: return "#777";
  }
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

// ===========================
// BUSCAR AGENDAMENTOS E AGRUPAR
// ===========================
async function carregarEventosCalendario() {
  if (!window.db) return [];

  const snap = await db.collection("agendamentos").get();
  const mapa = {};

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;

    if (!mapa[a.data]) {
      mapa[a.data] = {
        total: 0,
        status: {}
      };
    }

    mapa[a.data].total++;
    const st = (a.status || "pendente").toLowerCase();
    mapa[a.data].status[st] = (mapa[a.data].status[st] || 0) + 1;
  });

  // um evento por dia (renderiza número)
  return Object.keys(mapa).map(data => ({
    id: data,
    start: data,
    allDay: true,
    title: String(mapa[data].total),
    extendedProps: {
      date: data,
      resumo: mapa[data]
    }
  }));
}

// ===========================
// MODAL LISTA DO DIA
// ===========================
async function abrirDia(dataStr) {
  if (!db) return;

  const snap = await db.collection("agendamentos")
    .where("data", "==", dataStr)
    .orderBy("horario", "asc")
    .get();

  // dia sem agendamento
  if (snap.empty) {
    const res = await Swal.fire({
      icon: "info",
      title: "Nenhum agendamento",
      text: "Deseja criar um novo agendamento?",
      showCancelButton: true,
      confirmButtonText: "Criar novo",
      cancelButtonText: "Fechar",
      customClass: { popup: "swal-high-z" }
    });

    if (res.isConfirmed) {
      if (window.agendamentosModule && window.agendamentosModule.openModalNew) {
        window.agendamentosModule.openModalNew(new Date(dataStr + "T00:00:00"));
      } else {
        Swal.fire({
          icon: "error",
          title: "Erro",
          text: "Módulo de agendamentos não carregado.",
          customClass: { popup: "swal-high-z" }
        });
      }
    }
    return;
  }

  let html = `<div style="display:grid; gap:12px;">`;

  snap.docs.forEach(doc => {
    const a = doc.data();
    const cor = statusColor(a.status);

    html += `
      <div style="
        background:${cor};
        padding:12px;
        border-radius:8px;
        color:#fff;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <div>
          <div><b>${a.horario || "--:--"}</b> — ${a.cliente || ""}</div>
          <div style="font-size:13px; opacity:.9">
            ${a.pacoteNome || a.itemNome || ""}
          </div>
        </div>
        <button class="btn btn-dark" onclick="window.abrirModalDetalhes('${doc.id}')">
          Visualizar
        </button>
      </div>
    `;
  });

  html += `</div>`;

  Swal.fire({
    title: `Agendamentos — ${dataStr.split("-").reverse().join("/")}`,
    html,
    width: 720,
    confirmButtonText: "Fechar",
    customClass: { popup: "swal-high-z" }
  });
}

// ===========================
// RENDER CALENDÁRIO
// ===========================
async function carregarCalendario() {
  const el = document.getElementById("calendar");
  if (!el) return;

  const eventos = await carregarEventosCalendario();

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    height: "auto",
    fixedWeekCount: false,
    showNonCurrentDates: true,

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,dayGridWeek"
    },

    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana"
    },

    events: eventos,

    dateClick: info => abrirDia(info.dateStr),

    eventContent: arg => {
      // renderiza número grande no centro do dia
      return {
        html: `
          <div style="
            display:flex;
            align-items:center;
            justify-content:center;
            height:100%;
            font-size:22px;
            font-weight:700;
            color:#000;
          ">
            ${arg.event.title}
          </div>
        `
      };
    },

    eventDidMount: info => {
      // evita conflito com CSS global
      info.el.style.background = "transparent";
      info.el.style.border = "none";
      info.el.style.pointerEvents = "none";
    }
  });

  calendar.render();
}

// ===========================
// INIT
// ===========================
window.addEventListener("DOMContentLoaded", () => {
  // garante que agendamentos.js já expôs API
  if (!window.abrirModalDetalhes) {
    console.warn("calendar.js: abrirModalDetalhes ainda não disponível no load");
  }

  carregarCalendario();
});
