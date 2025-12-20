// ===========================
// CALENDAR.JS — VERSÃO FINAL
// Dashboard apenas VISUAL
// ===========================

let calendar;

// ===========================
// FIRESTORE
// ===========================
const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
if (!db) {
  console.error("calendar.js: Firestore não encontrado");
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
// CLIQUE NO DIA
// ===========================
async function onClickDia(dataStr) {
  const snap = await db
    .collection("agendamentos")
    .where("data", "==", dataStr)
    .get();

  // 🔹 SEM AGENDAMENTOS
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
        window.location.href =
          "/dashboard-Divertilandia/pages/agendamentos.html?date=" + dataStr;
      }
    });
    return;
  }

  // 🔹 COM AGENDAMENTOS → LISTA
  let html = `<div style="display:grid; gap:12px;">`;

  snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""))
    .forEach(a => {
      const cor =
        (a.status || "").toLowerCase() === "confirmado" ? "#4cafef" :
        (a.status || "").toLowerCase() === "pendente"   ? "#e6b800" :
        (a.status || "").toLowerCase() === "cancelado"  ? "#d32f2f" :
        "#555";

      html += `
        <div style="
          border:2px solid ${cor};
          border-radius:8px;
          padding:10px;
          display:flex;
          justify-content:space-between;
          align-items:center;
        ">
          <div>
            <div><b>${a.horario || "--:--"}</b> — ${a.cliente || ""}</div>
            <div style="font-size:13px; opacity:.8">
              ${a.pacoteNome || a.itemNome || ""}
            </div>
          </div>
          <button class="btn btn-dark"
            onclick="window.location.href='/dashboard-Divertilandia/pages/agendamentos.html?open=${a.id}'">
            Visualizar
          </button>
        </div>
      `;
    });

  html += `</div>`;

  Swal.fire({
    title: "Agendamentos",
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
  const eventos = await carregarEventosCalendario();

  const el = document.getElementById("calendar");
  if (!el) return;

  calendar = new FullCalendar.Calendar(el, {
    locale: "pt-br",
    initialView: "dayGridMonth",
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

    dateClick: info => onClickDia(info.dateStr),

    dayCellDidMount: info => {
      const ev = eventos.find(e => e.start === info.dateStr);
      if (!ev) return;

      const badge = document.createElement("div");
      badge.textContent = ev.extendedProps.total;
      badge.style.fontSize = "20px";
      badge.style.fontWeight = "700";
      badge.style.textAlign = "center";
      badge.style.marginTop = "6px";
      badge.style.color = "#000";

      info.el.appendChild(badge);
    }
  });

  calendar.render();
}

// ===========================
// INIT
// ===========================
document.addEventListener("DOMContentLoaded", carregarCalendario);
