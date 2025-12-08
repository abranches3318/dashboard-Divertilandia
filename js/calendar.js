// =====================================================
// CALENDAR.JS — VERSÃO CORRIGIDA
// =====================================================

// Este arquivo assume que o Firebase foi inicializado no index.html/dashboard.html
// e que "db" já existe globalmente (firebase.firestore()).

// Inicialização do calendário
document.addEventListener("DOMContentLoaded", function () {

    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) {
        console.warn("Elemento #calendar não encontrado.");
        return;
    }

    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "pt-br",
        height: "auto",

        dateClick: (info) => {
            abrirAgendamentosFiltrado(info.dateStr);
        }
    });

    window.calendar.render();

    refreshCalendarEvents();
});

// =====================================================
// Carregar eventos do Firestore para o FullCalendar
// =====================================================

async function refreshCalendarEvents() {
    if (!window.calendar) return;

    try {
        window.calendar.removeAllEvents();

        const snapshot = await db.collection("agendamentos").get();

        const eventos = [];

        snapshot.forEach(doc => {
            const dados = doc.data();

            // Dados esperados no padrão atual
            if (!dados.data || !dados.cliente) return;

            eventos.push({
                id: doc.id,
                title: dados.cliente + (dados.horario ? " - " + dados.horario : ""),
                start: dados.data,
                color: "#007bff"
            });
        });

        window.calendar.addEventSource(eventos);

    } catch (error) {
        console.error("Erro ao carregar eventos no calendário:", error);
        Swal.fire("Erro", "Falha ao carregar eventos no calendário.", "error");
    }
}

// =====================================================
// Navegar para a página de Agendamentos filtrada
// =====================================================

function abrirAgendamentosFiltrado(dataSelecionada) {

    // 1. Exibir seção Agendamentos
    document.querySelectorAll(".pagina").forEach(p => p.style.display = "none");
    document.getElementById("pagina-agendamentos").style.display = "block";

    // 2. Setar o filtro de data
    const inputDataFiltro = document.getElementById("filtro-ag-data");
    if (inputDataFiltro) {
        inputDataFiltro.value = dataSelecionada;
    }

    // 3. Executar a filtragem
    if (typeof filtrarAgendamentos === "function") {
        filtrarAgendamentos();
    } else {
        console.warn("filtrarAgendamentos() não foi encontrado.");
    }
}
