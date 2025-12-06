// ======================================
// CALENDÁRIO — DIVERTILÂNDIA DASHBOARD
// ======================================

// estado interno
let currentDate = new Date();
let modo = "mes"; // "mes" ou "semana"

// elementos
const calendarContainer = document.getElementById("calendar");
const tituloMesEl = document.getElementById("titulo-mes");
const btnPrev = document.getElementById("cal-prev");
const btnNext = document.getElementById("cal-next");
const btnModoMes = document.getElementById("modo-mes");
const btnModoSemana = document.getElementById("modo-semana");

// Eventos de navegação
if (btnPrev) btnPrev.onclick = () => navigate(-1);
if (btnNext) btnNext.onclick = () => navigate(1);
if (btnModoMes) btnModoMes.onclick = () => changeMode("mes");
if (btnModoSemana) btnModoSemana.onclick = () => changeMode("semana");

// Troca o modo de visualização
function changeMode(newMode) {
  modo = newMode;
  renderCalendar(window.dashboardState.agendamentosCache || []);
}

// Navega entre meses/semanas
function navigate(offset) {
  if (modo === "mes") {
    currentDate.setMonth(currentDate.getMonth() + offset);
  } else {
    currentDate.setDate(currentDate.getDate() + offset * 7);
  }
  renderCalendar(window.dashboardState.agendamentosCache || []);
}

// Nome dos meses
const nomesMes = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// ==========================
// RENDERIZAÇÃO PRINCIPAL
// ==========================
window.renderCalendar = function (eventos) {
  if (!calendarContainer) return;

  calendarContainer.innerHTML = "";

  if (modo === "mes") {
    renderMes(eventos);
  } else {
    renderSemana(eventos);
  }
};

// ==========================
// RENDER MENSAL
// ==========================
function renderMes(eventos) {
  const ano = currentDate.getFullYear();
  const mes = currentDate.getMonth();

  tituloMesEl.textContent = `${nomesMes[mes]} de ${ano}`;

  const primeiroDia = new Date(ano, mes, 1).getDay();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();

  let html = "<div class='grid-calendario'>";

  // espaços antes do primeiro dia
  for (let i = 0; i < (primeiroDia === 0 ? 6 : primeiroDia - 1); i++) {
    html += `<div class="dia vazio"></div>`;
  }

  // dias
  for (let dia = 1; dia <= ultimoDia; dia++) {
    const dataISO = formatISO(ano, mes + 1, dia);

    const eventosDoDia = eventos.filter(ev => ev.data_evento === dataISO);

    html += `
      <div class="dia" onclick="abrirListaDoDia('${dataISO}')">
        <div class="num-dia">${dia}</div>
        ${eventosDoDia
          .map(ev => `<div class="tag-evento">${ev.item_nome || "Evento"}</div>`)
          .join("")}
      </div>
    `;
  }

  html += "</div>";
  calendarContainer.innerHTML = html;
}

// ==========================
// RENDER SEMANAL
// ==========================
function renderSemana(eventos) {
  const inicioSemana = getStartOfWeek(currentDate);

  tituloMesEl.textContent = `Semana de ${formatBR(inicioSemana)}`;

  let html = "<div class='grid-semana'>";

  for (let i = 0; i < 7; i++) {
    const data = new Date(inicioSemana);
    data.setDate(data.getDate() + i);

    const dataISO = normalizeDate(data);
    const eventosDoDia = eventos.filter(ev => ev.data_evento === dataISO);

    html += `
      <div class="dia-semana" onclick="abrirListaDoDia('${dataISO}')">
        <div class="num-dia">${formatDiaSemana(data)} ${data.getDate()}</div>
        ${eventosDoDia
          .map(ev => `<div class="tag-evento">${ev.item_nome || "Evento"}</div>`)
          .join("")}
      </div>
    `;
  }

  html += "</div>";
  calendarContainer.innerHTML = html;
}

// ==========================
// ABRIR LISTA DO DIA
// ==========================
window.abrirListaDoDia = function (dataISO) {
  window.location.href = "paginas/ver-agendamento.html?data=" + dataISO;
};

// ==========================
// HELPERS
// ==========================
function formatDiaSemana(date) {
  const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  return dias[date.getDay()];
}

function getStartOfWeek(date) {
  const clone = new Date(date);
  const day = clone.getDay();
  clone.setDate(clone.getDate() - (day === 0 ? 6 : day - 1));
  return clone;
}

function formatISO(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function normalizeDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatBR(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${date.getFullYear()}`;
}
