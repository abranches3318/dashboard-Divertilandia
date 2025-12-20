// js/calendar.js — versão estabilizada e compatível

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
// CARREGAR CONTAGEM POR DIA
// ===========================
async function carregarEventosCalendario() {
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
    extendedProps: {
      total: mapa[data]
    }
  }));
}

// ===========================
// MODAL DO DIA
// ===========================
async function abrirDia(dataStr) {
  const snap = await db.collection("agendamentos")
    .where("data", "==", dataStr)
    .orderBy("horario", "asc")
    .get();

  // DIA VAZIO
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
      window.location.href = `pages/agendamentos.html?newDate=${dataStr}`;
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
        padding:14px;
        border-radius:10px;
        color:#fff;
        display:flex;
        justify-content:space-between;
        align-items:center;
      ">
        <div>
          <div><b>${a.horario}</b> — ${a.cliente}</div>
          <div style="font-size:13px; opacity:.9">
            ${a.pacoteNome || a.itemNome || ""}
          </div>
        </div>
        <button class="btn btn-dark"
          onclick="window.location.href='pages/agendamentos.html?open=${doc.id}'">
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
// CALENDÁRIO
// ===========================
async function carregarCalendario() {
  const el = document.getElementById("calendar");
  const eventos = await carregarEventosCalendario();

  const anoAtual = new Date().getFullYear();

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    fixedWeekCount: false,

    headerToolbar: {
      left: "prev,next hojeBtn",
      center: "title",
      right: "anoSelect dayGridMonth,dayGridWeek"
    },

    customButtons: {
      hojeBtn: {
        text: "Hoje",
        click: () => calendar.today()
      },
      anoSelect: {
        text: anoAtual,
        click: () => {}
      }
    },

    events: eventos,

    dateClick: info => abrirDia(info.dateStr),

    dayCellDidMount: info => {
      const ev = eventos.find(e => e.start === info.dateStr);
      if (!ev) return;

      const total = ev.extendedProps.total;

      const num = document.createElement("div");
      num.textContent = total;
      num.style.fontSize = "24px";
      num.style.fontWeight = "700";
      num.style.textAlign = "center";
      num.style.marginTop = "6px";
      num.style.color = "#000";

      info.el.appendChild(num);
    }
  });

  calendar.render();

  // seletor de ano real
  const toolbar = el.querySelector(".fc-toolbar-chunk:last-child");
  const select = document.createElement("select");
  select.style.marginRight = "10px";

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
