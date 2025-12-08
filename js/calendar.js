// ====================================================================
// CALENDAR.JS – Controle do calendário FullCalendar + integração com DB
// ====================================================================

// Importante:
// ESTE arquivo NÃO declara "db". Ele apenas usa db já criado no dashboard.js
// Verifica se db existe antes de tudo.
if (!window.db) {
    console.error("Erro: 'db' não encontrado no escopo global. Certifique-se de que dashboard.js carregou antes de calendar.js.");
}

// Variável global para o calendário
let calendar = null;

// ====================================================================
// FUNÇÃO: Inicializar calendário (somente quando abrir a página)
// ====================================================================
window.inicializarCalendar = async function () {
    const calendarEl = document.getElementById("calendar");

    if (!calendarEl) {
        console.warn("calendar.js: div #calendar não existe na página atual.");
        return;
    }

    // Evita recriar o calendário se ele já existir
    if (calendar) {
        calendar.render();
        return;
    }

    // Carregar eventos do Firebase
    const eventosFirebase = await carregarEventosDB();

    // Criar o calendário
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        locale: "pt-br",
        height: "auto",
        headerToolbar: {
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
        events: eventosFirebase,
        eventClick: (info) => {
            const id = info.event.id;
            if (!id) return;

            Swal.fire({
                title: "Evento",
                html: `
                    <b>${info.event.title}</b><br>
                    ${info.event.start.toLocaleString()}
                `,
                showCancelButton: true,
                confirmButtonText: "Editar",
                cancelButtonText: "Fechar"
            }).then((result) => {
                if (result.isConfirmed) {
                    abrirModalAgendamento(id);
                }
            });
        }
    });

    calendar.render();
};

// ====================================================================
// FUNÇÃO: Carregar eventos do Firebase e transformar para o calendário
// ====================================================================
async function carregarEventosDB() {
    try {
        const snap = await db.collection("agendamentos").get();
        const eventos = [];

        snap.forEach(doc => {
            const ag = doc.data();

            if (!ag.data) return;

            eventos.push({
                id: doc.id,
                title: ag.cliente || "Agendamento",
                start: ag.data,
                color: definirCorStatus(ag.status)
            });
        });

        return eventos;

    } catch (e) {
        console.error("Erro ao carregar eventos do Firebase:", e);
        return [];
    }
}

// ====================================================================
// FUNÇÃO: cor por status
// ====================================================================
function definirCorStatus(status) {
    switch (status) {
        case "pendente": return "#f4c542";
        case "confirmado": return "#4caf50";
        case "concluido": return "#1976d2";
        case "cancelado": return "#e53935";
        default: return "#9e9e9e";
    }
}

// ====================================================================
// Atualizar calendário quando um agendamento muda
// ====================================================================
window.atualizarCalendar = async function () {
    if (!calendar) return;
    const eventos = await carregarEventosDB();
    calendar.removeAllEvents();
    calendar.addEventSource(eventos);
    calendar.render();
};
