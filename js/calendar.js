// ===============================
// CALENDAR.JS – VISUAL PURO
// ===============================

document.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("calendar");
  if (!el) return;

  const STATUS_COLORS = {
    pendente:   { bg: "#e6b800", text: "#000" },
    confirmado: { bg: "#4cafef", text: "#fff" },
    cancelado:  { bg: "#d32f2f", text: "#fff" },
    concluido:  { bg: "#2e7d32", text: "#fff" }
  };

  let cachePorDia = {};

  const calendar = new FullCalendar.Calendar(el, {
    locale: "pt-br",
    initialView: "dayGridMonth",
    height: "auto",
    fixedWeekCount: false,

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

    selectable: false,
    events: [], // NÃO usamos eventos visuais

    datesSet: async (info) => {
      cachePorDia = {};
      const snap = await db.collection("agendamentos")
        .where("data", ">=", info.startStr)
        .where("data", "<=", info.endStr)
        .get();

      snap.forEach(doc => {
        const a = doc.data();
        if (!cachePorDia[a.data]) cachePorDia[a.data] = [];
        cachePorDia[a.data].push({ id: doc.id, ...a });
      });

      calendar.render();
    },

    dayCellDidMount(info) {
      const data = info.date.toISOString().split("T")[0];
      const qtd = cachePorDia[data]?.length || 0;

      if (qtd > 0) {
        const num = document.createElement("div");
        num.textContent = qtd;
        num.style.fontSize = "22px";
        num.style.fontWeight = "bold";
        num.style.textAlign = "center";
        num.style.marginTop = "8px";
        info.el.appendChild(num);
      }

      info.el.style.cursor = "pointer";
      info.el.onclick = () => abrirModalDia(data);
    }
  });

  calendar.render();

  // ===============================
  // MODAL DO DIA
  // ===============================
  async function abrirModalDia(data) {
    const lista = cachePorDia[data] || [];

    if (lista.length === 0) {
      Swal.fire({
        icon: "info",
        title: "Sem agendamentos",
        text: "Não há agendamentos para esta data. Deseja criar um novo?",
        showCancelButton: true,
        confirmButtonText: "Criar novo",
        cancelButtonText: "Fechar",
        customClass: { popup: "swal-high-z" }
      }).then(res => {
        if (res.isConfirmed) {
          abrirNovoAgendamento(data);
        }
      });
      return;
    }

    lista.sort((a, b) => a.horario.localeCompare(b.horario));

    let html = "";
    lista.forEach(a => {
      const cor = STATUS_COLORS[a.status] || STATUS_COLORS.pendente;

      html += `
        <div style="
          background:${cor.bg};
          color:${cor.text};
          padding:12px;
          border-radius:8px;
          margin-bottom:10px;
        ">
          <strong>${a.cliente}</strong><br>
          ${a.horario} – ${a.pacoteNome || "-"}<br><br>
          <button class="btn"
            onclick="window.visualizarAgendamento('${a.id}')">
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
      cancelButtonText: "Fechar",
      customClass: { popup: "swal-high-z" }
    });
  }

  // ===============================
  // EXPOR FUNÇÕES GLOBAIS
  // ===============================
  window.visualizarAgendamento = function (id) {
    Swal.close();
    if (window.abrirModalDetalhes) {
      window.abrirModalDetalhes(id);
    } else {
      window.location.href = `?open=${id}`;
    }
  };

  window.abrirNovoAgendamento = function (data) {
    Swal.close();
    if (window.agendamentosModule?.openModalNew) {
      window.agendamentosModule.openModalNew(data);
    } else {
      window.location.href = `?novo=1&data=${data}`;
    }
  };
});
