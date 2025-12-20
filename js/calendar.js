let calendar = null;

/* =====================================================
   HELPERS
===================================================== */
function statusColor(status) {
  switch ((status || "").toLowerCase()) {
    case "confirmado": return "#4cafef";
    case "pendente": return "#e6b800";
    case "cancelado": return "#d32f2f";
    case "concluido":
    case "finalizado": return "#2e7d32";
    default: return "#999";
  }
}

function formatDateBR(ymd) {
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}/${y}`;
}

/* =====================================================
   CARREGAR AGENDAMENTOS AGRUPADOS POR DIA
===================================================== */
async function carregarResumoPorDia() {
  if (!window.db) return [];

  const snap = await db.collection("agendamentos").get();

  const mapa = {};

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;

    if (!mapa[a.data]) {
      mapa[a.data] = {
        total: 0,
        statusCount: {}
      };
    }

    mapa[a.data].total++;

    const st = (a.status || "pendente").toLowerCase();
    mapa[a.data].statusCount[st] =
      (mapa[a.data].statusCount[st] || 0) + 1;
  });

  return Object.keys(mapa).map(data => ({
    start: data,
    allDay: true,
    display: "background",
    backgroundColor: "#f2f2f2",
    extendedProps: mapa[data]
  }));
}

/* =====================================================
   MODAL LISTA DO DIA
===================================================== */
async function abrirDia(dataStr) {
  if (!window.db) return;

  const snap = await db.collection("agendamentos")
    .where("data", "==", dataStr)
    .orderBy("horario", "asc")
    .get();

  // ---------------- SEM AGENDAMENTOS
  if (snap.empty) {
    const res = await Swal.fire({
      icon: "info",
      title: `Nenhum agendamento em ${formatDateBR(dataStr)}`,
      text: "Deseja criar um novo agendamento?",
      showCancelButton: true,
      confirmButtonText: "Criar novo",
      cancelButtonText: "Fechar",
      customClass: { popup: "swal-high-z" }
    });

    if (res.isConfirmed && window.agendamentosModule?.openModalNew) {
      window.agendamentosModule.openModalNew(
        new Date(dataStr + "T00:00:00")
      );
    }
    return;
  }

  // ---------------- COM AGENDAMENTOS
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
        gap:10px;
      ">
        <div>
          <div style="font-weight:700">
            ${a.horario || "--:--"} — ${a.cliente || ""}
          </div>
          <div style="font-size:13px; opacity:.9">
            ${a.pacoteNome || a.itemNome || ""}
          </div>
        </div>
        <button class="btn btn-dark"
          onclick="window.abrirModalDetalhes('${doc.id}')">
          Visualizar
        </button>
      </div>
    `;
  });

  html += `</div>`;

  Swal.fire({
    title: `Agendamentos — ${formatDateBR(dataStr)}`,
    html,
    width: 720,
    confirmButtonText: "Fechar",
    customClass: { popup: "swal-high-z" }
  });
}

/* =====================================================
   RENDER CALENDÁRIO
===================================================== */
async function carregarCalendario() {
  const eventosResumo = await carregarResumoPorDia();

  const el = document.getElementById("calendar");
  if (!el) return;

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,dayGridWeek,dayGridDay"
    },

    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana",
      day: "Dia"
    },

    navLinks: true,
    selectable: true,

    events: eventosResumo,

    dateClick: info => abrirDia(info.dateStr),

    dayCellDidMount: info => {
      const ev = eventosResumo.find(e => e.start === info.dateStr);
      if (!ev || !ev.extendedProps?.total) return;

      const badge = document.createElement("div");
      badge.textContent = ev.extendedProps.total;
      badge.style.marginTop = "6px";
      badge.style.fontSize = "18px";
      badge.style.fontWeight = "800";
      badge.style.textAlign = "center";
      badge.style.color = "#000";

      info.el.appendChild(badge);
    }
  });

  calendar.render();
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener("DOMContentLoaded", carregarCalendario);
