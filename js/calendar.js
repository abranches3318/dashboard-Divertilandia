 // ===========================
// CALENDAR.JS – VISUAL E NAVEGAÇÃO
// ===========================

document.addEventListener("DOMContentLoaded", async function () {
  const calendarEl = document.getElementById("calendar");

  if (!calendarEl) return;

  const calendar = new FullCalendar.Calendar(calendarEl, {
    locale: "pt-br",
    initialView: "dayGridMonth",
    height: "auto",

    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek"
    },

    buttonText: {
      today: "Hoje",
      month: "Mês",
      week: "Semana"
    },

    selectable: true,
    dayMaxEvents: true,

    dateClick: function (info) {
      abrirModalDia(info.dateStr);
    },

    events: async function (fetchInfo, successCallback) {
      const inicio = fetchInfo.startStr;
      const fim = fetchInfo.endStr;

      const snap = await db.collection("agendamentos")
        .where("data", ">=", inicio)
        .where("data", "<=", fim)
        .get();

      const porDia = {};

      snap.forEach(doc => {
        const a = doc.data();
        if (!porDia[a.data]) porDia[a.data] = 0;
        porDia[a.data]++;
      });

      const eventos = Object.keys(porDia).map(data => ({
        start: data,
        allDay: true,
        title: porDia[data].toString()
      }));

      successCallback(eventos);
    }
  });

  calendar.render();
});

// ===========================
// MODAL DIA
// ===========================

async function abrirModalDia(data) {
  const snap = await db.collection("agendamentos")
    .where("data", "==", data)
    .orderBy("horario")
    .get();

  if (snap.empty) {
    Swal.fire({
      icon: "info",
      title: "Sem agendamentos",
      text: "Não há agendamentos para esta data. Deseja criar um novo?",
      showCancelButton: true,
      confirmButtonText: "Criar novo",
      cancelButtonText: "Fechar"
    }).then(res => {
      if (res.isConfirmed) {
        abrirNovoAgendamento(data);
      }
    });
    return;
  }

  let html = "";

  snap.forEach(doc => {
    const a = doc.data();
    const cor = a.status === "confirmado"
      ? "#2ecc71"
      : a.status === "pendente"
        ? "#f1c40f"
        : "#bdc3c7";

    html += `
      <div style="
        border: 1px solid ${cor};
        border-left: 6px solid ${cor};
        padding: 10px;
        margin-bottom: 10px;
        border-radius: 6px;
      ">
        <strong>${a.cliente}</strong><br>
        ${a.horario} - ${a.item || a.pacote}<br><br>
        <button class="swal2-confirm swal2-styled"
          onclick="visualizarAgendamento('${doc.id}')">
          Visualizar
        </button>
      </div>
    `;
  });

  Swal.fire({
    title: "Agendamentos do dia",
    html,
    width: 600,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: "Fechar"
  });
}

// ===========================
// VISUALIZAR AGENDAMENTO
// ===========================

async function visualizarAgendamento(id) {
  const doc = await db.collection("agendamentos").doc(id).get();
  if (!doc.exists) return;

  const a = doc.data();

  Swal.fire({
    title: "Detalhes do Agendamento",
    html: `
      <strong>Cliente:</strong> ${a.cliente}<br>
      <strong>Telefone:</strong> ${a.telefone || "-"}<br>
      <strong>Horário:</strong> ${a.horario}<br>
      <strong>Item:</strong> ${a.item || a.pacote}<br>
      <strong>Status:</strong> ${a.status}
    `,
    showCancelButton: true,
    confirmButtonText: "Ver opções",
    cancelButtonText: "Fechar"
  }).then(res => {
    if (res.isConfirmed) {
      irParaAgendamento(id);
    }
  });
}

// ===========================
// REDIRECIONAMENTOS
// ===========================

function irParaAgendamento(id) {
  window.location.href =
    `/dashboard-Divertilandia/pages/agendamentos.html?open=${id}`;
}

function abrirNovoAgendamento(data) {
  window.location.href =
    `/dashboard-Divertilandia/pages/agendamentos.html?novo=1&data=${data}`;
}
