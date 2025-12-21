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

   dayCellContent: function (arg) {
  const dateStr = arg.date.toISOString().slice(0, 10);
  const total = contagemPorDia[dateStr];

  const container = document.createElement("div");
  container.style.position = "relative";
  container.style.height = "100%";
  container.style.padding = "4px";

  // 🔹 Número do dia (FORÇADO, nunca some)
  const dayNumber = document.createElement("div");
  dayNumber.textContent = arg.date.getDate(); // <- AQUI está a correção real
  dayNumber.style.fontSize = "14px";
  dayNumber.style.fontWeight = "600";
  dayNumber.style.color = "#000";

  container.appendChild(dayNumber);

  // 🔹 Badge de quantidade
  if (total) {
  const badge = document.createElement("div");
  badge.textContent = total;

  badge.style.position = "absolute";
  badge.style.bottom = "6px";
  badge.style.left = "6px";

  badge.style.background = "#4cafef";
  badge.style.color = "#fff";

  badge.style.padding = "6px 10px"; // reduzido horizontal
  badge.style.borderRadius = "14px";

  badge.style.fontSize = "18px";
  badge.style.fontWeight = "800";
  badge.style.lineHeight = "1";

  badge.style.maxWidth = "90%";            // 🔴 CRÍTICO
  badge.style.boxSizing = "border-box";    // 🔴 CRÍTICO
  badge.style.whiteSpace = "nowrap";
  badge.style.overflow = "hidden";
  badge.style.textOverflow = "ellipsis";

  container.appendChild(badge);
}

  return { domNodes: [container] };
}

  });

  calendar.render();
}

// ===========================
// INIT
// ===========================
window.addEventListener("DOMContentLoaded", carregarCalendario);
