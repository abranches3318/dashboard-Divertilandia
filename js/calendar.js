// calendar.js
// FullCalendar + Firestore (compat) + clique em toda a célula

// =============================
// FIREBASE (compat)
// =============================
const db = firebase.firestore();

// =============================
// GLOBAL: função usada pelo monitor e dashboard
// =============================
window.recarregarCalendario = function () {
    if (window.calendar) {
        refreshCalendarEvents();
    }
};

// =============================
// INICIALIZAR FULLCALENDAR
// =============================
function initCalendar() {

    const calendarEl = document.getElementById("calendar");

    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "pt-br",
        height: "auto",
        selectable: true,
        editable: false,
        dayMaxEventRows: true,

        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },

        // =============================
        // EVENTO: clique em eventos do dia
        // =============================
        eventClick: function (info) {
            const dateStr = info.event.startStr.substring(0, 10);
            if (typeof window.openAgendamentosByDate === "function") {
                window.openAgendamentosByDate(dateStr);
            }
        },

        // =============================
        // EVENTO: quando navega entre meses/visualizações
        // =============================
        datesSet: function () {
            refreshCalendarEvents();
            setTimeout(bindDayCellClicks, 300);   // reforça clique na célula
        }
    });

    calendar.render();

    // Carregamento inicial
    refreshCalendarEvents();
    setTimeout(bindDayCellClicks, 300);
}

// =============================
// CARREGAR EVENTOS DO FIRESTORE
// =============================
async function refreshCalendarEvents() {
    if (!window.calendar) return;

    try {
        // Limpa eventos anteriores
        window.calendar.removeAllEvents();

        const snapshot = await db.collection("agendamentos").get();

        const eventos = [];

        snapshot.forEach(doc => {
            const dados = doc.data();

            if (!dados.data || !dados.nomeCliente) return;

            eventos.push({
                id: doc.id,
                title: dados.nomeCliente + (dados.horario ? " - " + dados.horario : ""),
                start: dados.data,
                color: "#007bff"
            });
        });

        window.calendar.addEventSource(eventos);

    } catch (error) {
        console.error("Erro ao buscar agendamentos:", error);
        Swal.fire("Erro", "Falha ao carregar agendamentos do calendário.", "error");
    }
}

// =============================
// CLIQUE EM TODA A CÉLULA
// =============================
function bindDayCellClicks() {
    const cells = document.querySelectorAll(".fc-daygrid-day");

    cells.forEach(cell => {
        cell.addEventListener("click", (e) => {
            const dateStr = cell.getAttribute("data-date");
            if (!dateStr) return;

            // Bloqueia conflito quando clicar num evento
            if (e.target.closest(".fc-event")) return;

            if (typeof window.openAgendamentosByDate === "function") {
                window.openAgendamentosByDate(dateStr);
            }
        });
    });
}

// =============================
// INICIAR
// =============================
document.addEventListener("DOMContentLoaded", initCalendar);
