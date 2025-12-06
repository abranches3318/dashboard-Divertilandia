// ============================
// FIREBASE
// ============================
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ============================
// ELEMENTOS
// ============================
const paginas = document.querySelectorAll(".pagina");
const menuLinks = document.querySelectorAll("[data-page]");
const notifCountEl = document.getElementById("notif-count");
const logoImg = document.getElementById("logo-img");

// ============================
// ESTADO GLOBAL
// ============================
window.dashboardState = {
  user: null,
  notificacoes: [],
  calendario: null,
  agendamentosCache: []
};

// ============================
// INICIALIZAÇÃO
// ============================
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  dashboardState.user = user;

  // Carregar nome do usuário
  const userInfoEl = document.querySelector(".user-info");
  if (userInfoEl) {
    userInfoEl.textContent = user.displayName || user.email;
  }

  // Carregar logo da pasta /img
  if (logoImg) {
    logoImg.src = "img/logo.png";
  }

  await carregarResumo();
  await carregarNotificacoes();
  await carregarCalendario();

  ativarPagina("inicio");
});

// ============================
// TROCA DE PÁGINAS
// ============================
menuLinks.forEach(btn => {
  btn.addEventListener("click", () => {
    const page = btn.dataset.page;
    ativarPagina(page);

    // destacar item ativo
    menuLinks.forEach(i => i.classList.remove("active"));
    btn.classList.add("active");
  });
});

function ativarPagina(id) {
  paginas.forEach(p => p.classList.remove("ativa"));
  document.getElementById(id).classList.add("ativa");
}

// ============================
// RESUMO (CARDS)
// ============================
async function carregarResumo() {
  // TOTAL CLIENTES
  const clientesSnap = await db.collection("clientes").get();
  document.getElementById("total-clientes").textContent = clientesSnap.size;

  // TOTAL AGENDAMENTOS
  const eventosSnap = await db.collection("agendamentos").get();
  document.getElementById("total-agendamentos").textContent = eventosSnap.size;

  // TOTAL ITENS DO CATÁLOGO
  const itensSnap = await db.collection("item").get();
  document.getElementById("total-itens").textContent = itensSnap.size;

  // RECEITA APENAS SOMA (BASEADO NO CAMPO "entrada_paga")
  const pagamentosSnap = await db.collection("agendamentos").get();
  let receita = 0;
  pagamentosSnap.forEach(doc => {
    const data = doc.data();
    if (data?.entrada_paga) receita += Number(data.valor_entrada || 0);
  });

  document.getElementById("total-receita").textContent = "R$ " + receita.toFixed(2);
}

// ============================
// NOTIFICAÇÕES
// ============================
async function carregarNotificacoes() {
  const snap = await db.collection("notificacoes")
    .orderBy("criado_em", "desc")
    .limit(20)
    .get();

  dashboardState.notificacoes = snap.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  notifCountEl.textContent = dashboardState.notificacoes.length;
}

// ============================
// CALENDÁRIO
// ============================
async function carregarCalendario() {
  const calendarEl = document.getElementById("calendar");
  if (!calendarEl) return;

  // Carregar agendamentos do mês
  const snap = await db.collection("agendamentos").get();

  const eventos = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  dashboardState.agendamentosCache = eventos;

  // render externo (calendar.js)
  if (window.renderCalendar) {
    window.renderCalendar(eventos);
  }
}

// ============================
// ABRIR DETALHES DO AGENDAMENTO
// ============================
window.abrirAgendamento = function (id) {
  window.location.href = `paginas/ver-agendamento.html?id=${id}`;
};

// ============================
// LOGOUT
// ============================
window.logout = function () {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
};

// ============================
// RECARREGAR NOTIFICAÇÕES
// ============================
document.querySelector(".notif").addEventListener("click", () => {
  ativarPagina("notificacoes");
});
