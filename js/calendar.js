// js/calendar.js — versão final estável

let calendar;
let contagemPorDia = {};

// ===========================
// HELPERS
// ===========================
function statusColor(status) {
  switch ((status || "").toLowerCase()) {
    case "confirmado": return "#4cafef";
    case "pendente": return "#e6b800";
    case "cancelado": return "#d32f2f";
    default: return "#777";
  }
}

// ===========================
// CARREGAR CONTAGEM
// ===========================
async function carregarContagem() {
  const snap = await db.collection("agendamentos").get();
  contagemPorDia = {};

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;
    contagemPorDia[a.data] = (contagemPorDia[a.data] || 0) + 1;
  });
}

// ===========================
// MODAL DO DIA
// ===========================
async function abrirDia(dataStr) {
  const snap = await db.collection("agendamentos")
    .where("data", "==", dataStr)
    .orderBy("horario", "asc")
    .get();

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
      window.location.href =
        `pages/agendamentos.html?new=1&date=${dataStr}`;
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
          onclick="window.location.href=
          'pages/agendamentos.html?open=1&data=${a.data}&horario=${a.horario}&tel=${a.telefone}'">
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
  await carregarContagem();

  const el = document.getElementById("calendar");
  const anoAtual = new Date().getFullYear();

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    fixedWeekCount: false,

    headerToolbar: {
      left: "prev,next hojeBtn",
      center: "title",
      right: "yearSelect dayGridMonth,dayGridWeek"
    },

    customButtons: {
      hojeBtn: {
        text: "Hoje",
        click: () => calendar.today()
      },
      yearSelect: {
        text: anoAtual,
        click: () => {}
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

      const badge = document.createElement("div");
      badge.textContent = total;
      badge.style.position = "absolute";
      badge.style.top = "4px";
      badge.style.right = "6px";
      badge.style.background = "#4cafef";
      badge.style.color = "#fff";
      badge.style.padding = "4px 8px";
      badge.style.borderRadius = "12px";
      badge.style.fontSize = "14px";
      badge.style.fontWeight = "700";

      info.el.style.position = "relative";
      info.el.appendChild(badge);
    }
  });

  calendar.render();

  // seletor de ano real
  const toolbar = el.querySelector(".fc-toolbar-chunk:last-child");
  const select = document.createElement("select");
  select.style.marginRight = "10px";
  select.style.padding = "4px 6px";

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
