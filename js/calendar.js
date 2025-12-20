let calendar;

/* ============================
   HELPERS
============================ */
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

function formatarDataBR(dataStr) {
  return dataStr.split("-").reverse().join("/");
}

/* ============================
   CARREGAR AGENDAMENTOS
============================ */
async function carregarAgendamentos() {
  const snap = await db.collection("agendamentos").get();
  const porDia = {};
  const lista = [];

  snap.docs.forEach(doc => {
    const a = doc.data();
    if (!a.data) return;

    const ag = { id: doc.id, ...a };
    lista.push(ag);

    porDia[a.data] = porDia[a.data] || [];
    porDia[a.data].push(ag);
  });

  // ordena por horário
  Object.values(porDia).forEach(arr =>
    arr.sort((a, b) => (a.horario || "").localeCompare(b.horario || ""))
  );

  return { porDia, lista };
}

/* ============================
   MODAL DO DIA
============================ */
async function abrirDia(dataStr) {
  const { porDia } = window.__dadosCalendario;
  const ags = porDia[dataStr] || [];

  if (ags.length === 0) {
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

  ags.forEach(a => {
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
          <div style="font-weight:bold">
            ${a.horario || "--:--"} — ${a.cliente || ""}
          </div>
          <div style="font-size:13px; opacity:.9">
            ${a.pacoteNome || a.itemNome || ""}
          </div>
        </div>
        <button class="btn btn-dark"
          onclick="visualizarAgendamento('${a.id}')">
          Visualizar
        </button>
      </div>
    `;
  });

  html += `</div>`;

  Swal.fire({
    title: `Agendamentos — ${formatarDataBR(dataStr)}`,
    html,
    width: 700,
    confirmButtonText: "Fechar",
    customClass: { popup: "swal-high-z" }
  });
}

/* ============================
   VISUALIZAR AGENDAMENTO
============================ */
function visualizarAgendamento(id) {
  Swal.close();

  if (window.irParaAgendamentos) {
    window.irParaAgendamentos();
  }

  setTimeout(() => {
    if (window.abrirModalDetalhes) {
      window.abrirModalDetalhes(id);
    }
  }, 300);
}

/* ============================
   RENDER CALENDÁRIO
============================ */
async function carregarCalendario() {
  const dados = await carregarAgendamentos();
  window.__dadosCalendario = dados;

  const eventos = Object.keys(dados.porDia).map(data => ({
    start: data,
    allDay: true,
    title: String(dados.porDia[data].length)
  }));

  const el = document.getElementById("calendar");

  calendar = new FullCalendar.Calendar(el, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "yearSelect"
    },

    customButtons: {
      yearSelect: {
        text: new Date().getFullYear(),
        click() {
          const anoAtual = calendar.getDate().getFullYear();
          Swal.fire({
            title: "Selecionar ano",
            input: "number",
            inputValue: anoAtual,
            showCancelButton: true,
            confirmButtonText: "Ir",
            cancelButtonText: "Cancelar",
            customClass: { popup: "swal-high-z" }
          }).then(res => {
            if (res.isConfirmed) {
              calendar.gotoDate(`${res.value}-01-01`);
            }
          });
        }
      }
    },

    buttonText: {
      today: "Hoje"
    },

    events: eventos,

    dateClick: info => abrirDia(info.dateStr),

    eventContent(arg) {
      return {
        html: `
          <div style="
            font-size:26px;
            font-weight:bold;
            text-align:center;
            color:#000;
          ">
            ${arg.event.title}
          </div>
        `
      };
    }
  });

  calendar.render();
}

window.addEventListener("DOMContentLoaded", carregarCalendario);
