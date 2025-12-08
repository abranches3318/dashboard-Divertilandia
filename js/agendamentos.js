// ============================
// ============================
function atualizarCards(agendamentos) {
const hoje = new Date().toDateString();
const agHoje = agendamentos.filter(a => {
const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
return d.toDateString() === hoje;
});
document.getElementById('ag-hoje').textContent = agHoje.length;


const mesAtual = new Date().getMonth();
const receitaMes = agendamentos.reduce((acc, a) => {
const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
if (d.getMonth() === mesAtual) acc += Number(a.valor || 0);
return acc;
}, 0);
document.getElementById('receita-mes').textContent = `R$ ${receitaMes.toFixed(2)}`;


// Tarefas pendentes (opcional)
const tarefasPendentes = agendamentos.filter(a => a.status === 'pendente').length;
document.getElementById('tarefas-pendentes').textContent = tarefasPendentes;
}


// ============================
// RENDER CALENDAR
// ============================
function renderCalendar(agendamentos = []) {
const calendarEl = document.getElementById('calendar');
if (!calendarEl) return;


const eventos = agendamentos.map(a => {
const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
return {
id: a.id,
title: a.cliente || 'Sem nome',
start: data,
allDay: true,
extendedProps: {
telefone: a.telefone || '',
status: a.status || '',
valor: a.valor || 0
}
};
});


if (window.dashboardState.calendario) window.dashboardState.calendario.destroy();


const calendar = new FullCalendar.Calendar(calendarEl, {
initialView: 'dayGridMonth',
locale: 'pt-br',
headerToolbar: {
left: '',
center: 'title',
right: ''
},
events: eventos,
eventClick: info => abrirAgendamento(info.event.id),
height: 'auto'
});


calendar.render();
window.dashboardState.calendario = calendar;
}


// ============================
// EVENTOS
// ============================
if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltros);
if (btnNovo) btnNovo.addEventListener('click', novoAgendamento);


window.addEventListener('DOMContentLoaded', carregarAgendamentos);
