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

// ===========================
// CARREGAR EVENTOS (APENAS CONTAGEM)
// ===========================
async function carregarEventos() {
  const snap = await db.collection("agendamentos").get();
  const mapa = {};

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;
    mapa[a.data] = (mapa[a.data] || 0) + 1;
  });

  return Object.keys(mapa).map(data => ({
    start: data,
    allDay: true,
    display: "background",
    extendedProps: {
      total: mapa[data]
    }
  }));
}

// ===========================
// MODAL LISTA DO DIA
// ===========================
async function abrirDia(dataStr) {
  const snap = await db.collection("agendamentos")
    .where("data", "==", dataStr)
    .orderBy("horario", "asc")
    .get();

  if (snap.empty) {
    Swal.fire({
      icon: "info",
      title: "Nenhum agendamento",
      text: "Deseja criar um novo agendamento?",
      showCancelButton: true,
      confirmButtonText: "Criar novo",
      cancelButtonText: "Fechar",
      customClass: { popup: "swal-high-z" }
    }).then(res => {
      if (res.isConfirmed) {
        document.querySelector('[data-page="agendamentos"]').click();
        window.agendamentosModule.openModalNew(new Date(dataStr + "T00:00:00"));
      }
    });
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
        <button class="btn btn-dark" onclick="abrirModalDetalhes('${doc.id}')">
          Visualizar
        </button>
      </div>
    `;
  });

  html += `</div>`;

  Swal.fire({
    title: `Agendamentos — ${dataStr.split("-").reverse().join("/")}`,
    html,
    width: 700,
    confirmButtonText: "Fechar",
    customClass: { popup: "swal-high-z" }
  });
}

// ===========================
// RENDER CALENDÁRIO
// ===========================
async function carregarCalendario() {
  const eventos = await carregarEventos();

  const el = document.getElementById("calendar");
  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    height: "auto",

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

    dayCellDidMount: info => {
      const total = eventos.find(e => e.start === info.dateStr)?.extendedProps?.total;
      if (!total) return;

      const span = document.createElement("div");
      span.textContent = total;
      span.style.fontSize = "22px";
      span.style.fontWeight = "bold";
      span.style.textAlign = "center";
      span.style.marginTop = "6px";
      span.style.color = "#000";

      info.el.appendChild(span);
    }
  });

  calendar.render();
}

window.addEventListener("DOMContentLoaded", carregarCalendario);
