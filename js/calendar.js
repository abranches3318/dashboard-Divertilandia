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
  if (!lista.length) {
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
        location.href = `pages/agendamentos.html?date=${dataStr}`;
      }
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
          justify-content:space-between;
          align-items:center;
        ">
          <div>
            <div><b>${a.horario || "--:--"}</b> — ${a.cliente || ""}</div>
            <div style="font-size:13px; opacity:.85">
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

  Swal.fire({
    title: dataStr.split("-").reverse().join("/"),
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
  await carregarDados();

  const el = document.getElementById("calendar");
  if (!el) return;

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    fixedWeekCount: false,
    showNonCurrentDates: true,

    headerToolbar: {
      left: "prev,next hoje",
      center: "title",
      right: "dayGridMonth,dayGridWeek"
    },

    customButtons: {
      hoje: {
        text: "Hoje",
        click: () => calendar.gotoDate(new Date())
      }
    },

    buttonText: {
      month: "Mês",
      week: "Semana"
    },

    dateClick: info => abrirDia(info.dateStr),

    dayCellDidMount: info => {
      const total = contagemPorDia[info.dateStr];
      if (!total) return;

      const top = info.el.querySelector(".fc-daygrid-day-top");
      if (!top) return;

      const badge = document.createElement("span");
      badge.textContent = total;
      badge.style.marginLeft = "auto";
      badge.style.background = "#4cafef";
      badge.style.color = "#fff";
      badge.style.padding = "2px 8px";
      badge.style.borderRadius = "10px";
      badge.style.fontSize = "13px";
      badge.style.fontWeight = "700";

      top.appendChild(badge);
    }
  });

  calendar.render();
}

// ===========================
// INIT
// ===========================
window.addEventListener("DOMContentLoaded", carregarCalendario);
