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
// CARREGAR EVENTOS (CONTAGEM POR DIA)
// ===========================
async function carregarEventos() {
  const snap = await db.collection("agendamentos").get();
  const mapa = {};

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;
    mapa[a.data] = (mapa[a.data] || 0) + 1;
  });

  // guardamos isso globalmente para uso no render
  window.__mapaEventosCalendario = mapa;

  return Object.keys(mapa).map(data => ({
    start: data,
    allDay: true,
    display: "background"
  }));
}

// ===========================
// VISUALIZAR AGENDAMENTO
// ===========================
function visualizarAgendamento(id) {
  // fecha swal do calendário
  Swal.close();

  // garante navegação correta
  if (window.irParaAgendamentos) {
    window.irParaAgendamentos();
  }

  // abre modal de detalhes após navegação
  setTimeout(() => {
    if (window.abrirModalDetalhes) {
      window.abrirModalDetalhes(id);
    }
  }, 300);
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
      if (res.isConfirmed && window.irParaAgendamentos) {
        window.irParaAgendamentos({
          abrirNovo: true,
          data: dataStr
        });
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
        padding:14px;
        border-radius:10px;
        color:#fff;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <div>
          <div style="font-weight:bold">
            ${a.horario || "--:--"} — ${a.cliente || ""}
          </div>
          <div style="font-size:13px; opacity:.9">
            ${a.pacoteNome || a.itemNome || ""}
          </div>
        </div>
        <button class="btn btn-dark"
          onclick="visualizarAgendamento('${doc.id}')">
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
      const total = window.__mapaEventosCalendario?.[info.dateStr];
      if (!total) return;

      const badge = document.createElement("div");
      badge.textContent = total;
      badge.style.fontSize = "26px";
      badge.style.fontWeight = "bold";
      badge.style.textAlign = "center";
      badge.style.marginTop = "6px";
      badge.style.color = "#000";

      info.el.appendChild(badge);
    }
  });

  calendar.render();
}

window.addEventListener("DOMContentLoaded", carregarCalendario);
