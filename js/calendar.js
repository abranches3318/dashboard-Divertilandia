// calendar.js – compatível com dashboard.html

// Usa o Firestore já inicializado previamente (firebase.firestore())
const firestore = firebase.firestore();

// ------------------------
// ELEMENTOS
// ------------------------
const calendarContainer = document.getElementById("calendar");
const novoEventoBtn = document.getElementById("novoEventoBtn");
const modalNovoEvento = document.getElementById("modalNovoEvento");

const eventoData = document.getElementById("eventoData");
const eventoHorario = document.getElementById("eventoHorario");
const eventoCliente = document.getElementById("eventoCliente");
const eventoDescricao = document.getElementById("eventoDescricao");
const salvarEventoBtn = document.getElementById("salvarEventoBtn");

// Proteção caso elementos não existam
if (!calendarContainer) {
    console.error("ERRO: Elemento #calendar não encontrado no HTML.");
}
if (!novoEventoBtn) {
    console.error("ERRO: Elemento #novoEventoBtn não encontrado no HTML.");
}


// ------------------------
// ESTADO DO CALENDÁRIO
// ------------------------
let currentDate = new Date();
let selectedDate = null;


// ------------------------
// FUNÇÃO PRINCIPAL: RENDERIZAR CALENDÁRIO
// ------------------------
function renderCalendar() {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    calendarContainer.innerHTML = "";

    const firstDay = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    const header = document.createElement("h3");
    header.textContent = `${getMonthName(month)} ${year}`;
    header.classList.add("calendar-title");

    const daysContainer = document.createElement("div");
    daysContainer.classList.add("calendar-grid");

    // Dias vazios até o primeiro dia
    for (let i = 0; i < firstDay; i++) {
        const emptyCell = document.createElement("div");
        emptyCell.classList.add("empty-cell");
        daysContainer.appendChild(emptyCell);
    }

    // Dias do mês
    for (let day = 1; day <= lastDay; day++) {
        const cell = document.createElement("div");
        cell.classList.add("calendar-day");
        cell.textContent = day;

        const dateString = formatDate(year, month + 1, day);

        // Ao clicar em um dia: abrir lista de eventos desse dia
        cell.addEventListener("click", () => {
            selectedDate = dateString;
            abrirListaEventos(dateString);
        });

        daysContainer.appendChild(cell);
    }

    calendarContainer.appendChild(header);
    calendarContainer.appendChild(daysContainer);
}


// ------------------------
// LISTA DE EVENTOS POR DATA
// ------------------------
function abrirListaEventos(date) {
    firestore.collection("agendamentos")
        .where("data", "==", date)
        .orderBy("horario", "asc")
        .get()
        .then(snapshot => {

            if (snapshot.empty) {
                Swal.fire("Sem eventos", `Nenhum evento encontrado para ${date}`, "info");
                return;
            }

            let html = `<strong>Eventos em ${date}:</strong><br><br>`;

            snapshot.forEach(doc => {
                const ev = doc.data();
                html += `
                    <div style="margin-bottom:10px; border-bottom:1px solid #ccc; padding-bottom:6px;">
                        <strong>${ev.horario}</strong> - ${ev.cliente}<br>
                        ${ev.descricao}
                    </div>
                `;
            });

            Swal.fire({
                title: "Eventos",
                html: html,
                width: 500
            });
        })
        .catch(err => {
            console.error("Erro ao buscar eventos:", err);
            Swal.fire("Erro", "Falha ao carregar eventos.", "error");
        });
}


// ------------------------
// MODAL
// ------------------------
function abrirModal() {
    modalNovoEvento.style.display = "block";
}

function fecharModal() {
    modalNovoEvento.style.display = "none";
}


// ------------------------
// SALVAR EVENTO
// ------------------------
if (salvarEventoBtn) {
    salvarEventoBtn.addEventListener("click", async () => {

        const dataValue = eventoData.value;
        const horaValue = eventoHorario.value;
        const clienteValue = eventoCliente.value.trim();
        const descValue = eventoDescricao.value.trim();

        if (!dataValue || !horaValue || !clienteValue) {
            Swal.fire("Atenção", "Preencha os campos obrigatórios.", "warning");
            return;
        }

        try {
            await firestore.collection("agendamentos").add({
                data: dataValue,
                horario: horaValue,
                cliente: clienteValue,
                descricao: descValue || "",
                criadoEm: new Date().toISOString()
            });

            Swal.fire("Sucesso", "Evento criado com sucesso!", "success");

            fecharModal();
            renderCalendar(); // atualiza

        } catch (err) {
            console.error("Erro ao salvar evento:", err);
            Swal.fire("Erro", "Falha ao salvar evento.", "error");
        }
    });
}


// ------------------------
// BOTÃO NOVO EVENTO
// ------------------------
if (novoEventoBtn) {
    novoEventoBtn.addEventListener("click", () => {
        abrirModal();
    });
}


// ------------------------
// FUNÇÕES AUXILIARES
// ------------------------
function getMonthName(m) {
    const nomes = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return nomes[m];
}

function formatDate(y, m, d) {
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}


// ------------------------
// INICIALIZAÇÃO
// ------------------------
document.addEventListener("DOMContentLoaded", () => {
    renderCalendar();
});

// -----------------------------------------------------------------
