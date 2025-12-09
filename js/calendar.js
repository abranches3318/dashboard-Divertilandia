let calendar;

// ===========================
// RENDERIZAÇÃO DO CALENDÁRIO
// ===========================
async function carregarEventos() {
  const snap = await db.collection("agendamentos").get();

  return snap.docs.map(doc => {
    const a = doc.data();
    return {
      id: doc.id,
      title: a.cliente || "Agendamento",
      start: a.data,
      allDay: true
    };
  });
}

async function carregarCalendario() {
  const calendarEl = document.getElementById("calendar");

  const eventos = await carregarEventos();

  calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: "dayGridMonth",
    locale: "pt-br",
    headerToolbar: {
      left: "prev,next today",
      center: "title",
      right: ""
    },

    events: eventos,

    dateClick: async (info) => {
      const dataStr = info.dateStr;

      const snap = await db.collection("agendamentos")
        .where("data", "==", dataStr)
        .get();

      if (snap.empty) {
        Swal.fire({
          icon: "info",
          title: "Nenhum agendamento",
          text: "Não há agendamentos neste dia.",
          showCancelButton: true,
          cancelButtonText: "Fechar",
          confirmButtonText: "Criar novo",
        }).then(res => {
          if (res.isConfirmed) {
            window.location.href = "agendamentos.html?novo=" + dataStr;
          }
        });

        return;
      }

      let html = "";

      snap.forEach(doc => {
        const a = doc.data();

        html += `
          <div style="padding:12px; border-bottom:1px solid #333;">
            <b>${a.cliente}</b><br>
            Tel: ${a.telefone}<br>
            Status: ${a.status}<br>
            <button class="btn" onclick="abrirAgendamento('${doc.id}')">Abrir</button>
          </div>
        `;
      });

      Swal.fire({
        title: "Agendamentos",
        html: html,
        width: 600
      });
    }
  });

  calendar.render();
}

window.addEventListener("DOMContentLoaded", carregarCalendario);

// usado pelo Swal
function abrirAgendamento(id) {
  window.location.href = "agendamentos.html?id=" + id;
}
