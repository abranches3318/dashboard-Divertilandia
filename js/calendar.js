// js/calendar.js — versão FINAL PERSISTENTE (sem regressão)

let calendar;
let contagemPorDia = {};
let agPorDia = {};

// ===========================
// HELPERS (NÃO REMOVER)
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

function isDataPassada(dataStr) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const data = new Date(dataStr + "T00:00:00");
  return data < hoje;
}

// ===========================
// CARREGAR DADOS DO FIRESTORE
// ===========================
async function carregarDados() {
  if (!window.db) return;

  contagemPorDia = {};
  agPorDia = {};

  const snap = await db.collection("agendamentos").get();

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;

    contagemPorDia[a.data] = (contagemPorDia[a.data] || 0) + 1;

    if (!agPorDia[a.data]) agPorDia[a.data] = [];
    agPorDia[a.data].push({
      id: doc.id,
      ...a
    });
  });
}

// ===========================
// ABRIR DIA (LISTA OU NOVO)
// ===========================
async function abrirDia(dataStr) {
  const lista = agPorDia[dataStr] || [];

 
// DIA SEM AGENDAMENTO
if (lista.length === 0) {
  const dataPassada = isDataPassada(dataStr);

  const res = await Swal.fire({
    icon: "info",
    title: "Nenhum agendamento",
    text: dataPassada
      ? "Não há agendamentos para esta data."
      : "Deseja criar um novo agendamento?",
    showCancelButton: !dataPassada,
    confirmButtonText: dataPassada ? "Fechar" : "Criar novo",
    cancelButtonText: dataPassada ? "" : "Fechar",
    customClass: { popup: "swal-high-z" }
  });

  if (!dataPassada && res.isConfirmed) {
    window.location.href =
      `pages/agendamentos.html?new=1&date=${dataStr}`;
  }

  return;
}
  // DIA COM AGENDAMENTOS
  let html = `<div style="display:grid; gap:12px;">`;

  lista
    .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""))
    .forEach(a => {
      const cor = statusColor(a.status);

      html += `
        <div style="
          background:${cor};
          padding:14px;
          border-radius:10px;
          color:#fff;
         display:flex;
        gap:12px;
        align-items:flex-start;
        ">
          <div style="
  flex:1;
  min-width:0;
  display:grid;
  grid-template-columns: 70px 1fr;
  row-gap:2px;
  column-gap:8px;
  align-items:center;
">
  <div style="font-weight:700;">
    ${a.horario || "--:--"}
  </div>

  <div>
    ${a.cliente || ""}
  </div>

  <div style="grid-column: 2; font-size:13px; opacity:.85;">
    ${a.pacoteNome || a.itemNome || ""}
  </div>
</div>
          <button class="btn btn-dark"
            onclick="location.href='pages/agendamentos.html?open=${a.id}'">
            Visualizar
          </button>
        </div>
      `;
    });

  html += `</div>`;

const dataPassada = isDataPassada(dataStr);

const result = await Swal.fire({
  title: `Agendamentos — ${dataStr.split("-").reverse().join("/")}`,
  html,
  width: 720,

  showConfirmButton: true,
  confirmButtonText: "Fechar",

  showDenyButton: !dataPassada,
  denyButtonText: "Novo",

  focusConfirm: false,
  customClass: { popup: "swal-high-z" }
});

if (!dataPassada && result.isDenied) {
  window.location.href =
    `pages/agendamentos.html?new=1&date=${dataStr}`;
}
  
}

// ===========================
// CALENDÁRIO
// ===========================
async function carregarCalendario() {
  await carregarDados();

  const el = document.getElementById("calendar");
  if (!el) return;

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    fixedWeekCount: false,
    showNonCurrentDates: true,

   headerToolbar: {
  left: "prev,next",
  center: "title",
  right: "dayGridMonth,dayGridWeek"
},


    buttonText: {
      month: "Mês",
      week: "Semana"
    },

    dateClick: info => abrirDia(info.dateStr),

  dayCellDidMount: function (info) {
  const dateStr = info.date.toISOString().slice(0, 10);
  const total = contagemPorDia[dateStr];

  if (!total) return;

  const frame = info.el.querySelector(".fc-daygrid-day-frame");
  if (!frame) return;

  frame.style.position = "relative";

  const badge = document.createElement("div");
  badge.textContent = total;

  badge.style.position = "absolute";
  badge.style.bottom = "6px";
  badge.style.left = "6px";

  badge.style.background = "#4cafef";
  badge.style.color = "#fff";

  badge.style.padding = "6px 12px";
  badge.style.borderRadius = "16px";

  badge.style.fontSize = "18px";
  badge.style.fontWeight = "800";
  badge.style.lineHeight = "1";

  badge.style.pointerEvents = "none"; // não interfere no clique
  badge.style.zIndex = "5";

  frame.appendChild(badge);
}

  });

  calendar.render();
}

// ===========================
// INIT
// ===========================
window.addEventListener("DOMContentLoaded", carregarCalendario);
