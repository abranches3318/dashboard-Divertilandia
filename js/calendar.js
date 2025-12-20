// js/calendar.js — DEFINITIVO, INTEGRADO AO agendamentos.js

let calendar;
let contagemPorDia = {};
let agendamentosPorDia = {};

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

// ===========================
// CARREGAR DADOS FIRESTORE
// ===========================
async function carregarDadosCalendario() {
  if (!window.db) {
    console.error("calendar.js: db não disponível");
    return;
  }

  contagemPorDia = {};
  agendamentosPorDia = {};

  const snap = await db.collection("agendamentos").get();

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;

    if (!contagemPorDia[a.data]) {
      contagemPorDia[a.data] = 0;
      agendamentosPorDia[a.data] = [];
    }

    contagemPorDia[a.data]++;
    agendamentosPorDia[a.data].push({
      id: doc.id,
      ...a
    });
  });
}

// ===========================
// MODAL DO DIA
// ===========================
async function abrirDia(dataStr) {
  const lista = agendamentosPorDia[dataStr] || [];

  // DIA SEM AGENDAMENTO
  if (lista.length === 0) {
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
      if (window.agendamentosModule?.openModalNew) {
        window.agendamentosModule.openModalNew(
          new Date(dataStr + "T00:00:00")
        );
      } else {
        window.location.href = `pages/agendamentos.html?date=${dataStr}`;
      }
    }
    return;
  }

  // DIA COM AGENDAMENTOS
  let html = `<div style="display:grid; gap:12px;">`;

  lista
    .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""))
    .forEach(a => {
      html += `
        <div style="
          background:${statusColor(a.status)};
          padding:14px;
          border-radius:10px;
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
          <button class="btn btn-dark"
            onclick="window.location.href='pages/agendamentos.html?open=${a.id}'">
            Visualizar
          </button>
        </div>
      `;
    });

  html += `</div>`;

  Swal.fire({
    title: `Agendamentos — ${dataStr.split("-").reverse().join("/")}`,
    html,
    width: 760,
    confirmButtonText: "Fechar",
    customClass: { popup: "swal-high-z" }
  });
}

// ===========================
// CALENDÁRIO
// ===========================
async function carregarCalendario() {
  await carregarDadosCalendario();

  const el = document.getElementById("calendar");
  if (!el) return;

  const hoje = new Date();
  const anoAtual = hoje.getFullYear();

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

    dateClick: info => abrirDia(info.dateStr),

    dayCellDidMount: info => {
      const total = contagemPorDia[info.dateStr];
      if (!total) return;

      const badge = document.createElement("div");
      badge.textContent = total;
      badge.style.position = "absolute";
      badge.style.top = "6px";
      badge.style.right = "6px";
      badge.style.background = "#4cafef";
      badge.style.color = "#fff";
      badge.style.padding = "4px 10px";
      badge.style.borderRadius = "12px";
      badge.style.fontSize = "14px";
      badge.style.fontWeight = "700";
      badge.style.boxShadow = "0 0 0 2px #fff";

      info.el.style.position = "relative";
      info.el.appendChild(badge);
    }
  });

  calendar.render();

  // ===========================
  // SELETOR DE ANO
  // ===========================
  const toolbar = el.querySelector(".fc-toolbar-chunk:last-child");
  if (!toolbar) return;

  const select = document.createElement("select");
  select.style.marginRight = "10px";
  select.style.padding = "6px 8px";
  select.style.borderRadius = "6px";
  select.style.border = "1px solid #ccc";

  for (let y = anoAtual - 5; y <= anoAtual + 5; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    if (y === anoAtual) opt.selected = true;
    select.appendChild(opt);
  }

  select.onchange = () => {
    calendar.gotoDate(`${select.value}-01-01`);
  };

  toolbar.prepend(select);
}

// ===========================
// INIT
// ===========================
window.addEventListener("DOMContentLoaded", carregarCalendario);
