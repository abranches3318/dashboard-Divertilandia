// ============================
// DASHBOARD.JS
// ============================

// Firebase compat (já inicializado no firebase-config.js)
window.auth = window.auth || firebase.auth();
window.db = window.db || firebase.firestore();
window.storage = window.storage || firebase.storage();

// ============================
// ELEMENTOS
// ============================
const paginas = document.querySelectorAll(".pagina");
const menuLinks = document.querySelectorAll("aside nav ul li");
const notifCountEl = document.getElementById("notif-count");
const logoImg = document.querySelector(".logo-img");

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
// FUNÇÃO DE NAVEGAÇÃO
// ============================
window.nav = function (idPagina) {
  const pageId = "pagina-" + idPagina;

  // Mostrar apenas a página ativa
  paginas.forEach(p => p.classList.remove("ativa"));
  const pagina = document.getElementById(pageId);
  if (pagina) pagina.classList.add("ativa");

  // Atualizar menu ativo
  menuLinks.forEach(li => li.classList.remove("active"));
  const menuItem = Array.from(menuLinks).find(li =>
    li.getAttribute("onclick")?.includes(`'${idPagina}'`)
  );
  if (menuItem) menuItem.classList.add("active");

  // Atualizar título da página
  const titulo = document.getElementById("titulo-pagina");
  if (titulo) {
    titulo.textContent = pagina?.querySelector("h2")?.textContent || 
      idPagina.charAt(0).toUpperCase() + idPagina.slice(1);
  }
};

// ============================
// RESPONSIVIDADE SIDEBAR
// ============================
function ajustarSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (!sidebar) return;
  if (window.innerWidth <= 768) {
    sidebar.style.position = "absolute";
    sidebar.style.left = "-260px";
    sidebar.style.transition = "left 0.3s";
  } else {
    sidebar.style.position = "relative";
    sidebar.style.left = "0";
  }
}
window.addEventListener("resize", ajustarSidebar);
window.addEventListener("DOMContentLoaded", ajustarSidebar);

// ============================
// INICIALIZAÇÃO
// ============================
window.addEventListener("DOMContentLoaded", () => {
  auth.onAuthStateChanged(async user => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }

    dashboardState.user = user;

    // Nome do usuário
    const userInfoEl = document.querySelector(".user-info");
    if (userInfoEl) userInfoEl.textContent = user.displayName || user.email;

    // Logo
    if (logoImg) logoImg.src = "img/logo.png";

    // Carregar dados
    await carregarResumo();
    await carregarNotificacoes();
    await carregarCalendario();

    // Abrir dashboard inicialmente
    nav("dashboard");
  });
});

// ============================
// CARREGAR RESUMO (CARDS)
// ============================
async function carregarResumo() {
  try {
    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

    // AGENDAMENTOS HOJE
    const snap = await db.collection("agendamentos")
      .where("data", ">=", inicioDia)
      .where("data", "<=", fimDia)
      .get();
    document.getElementById("ag-hoje").textContent = snap.size;

    // RECEITA MENSAL
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
    const snapMes = await db.collection("agendamentos")
      .where("data", ">=", inicioMes)
      .where("data", "<=", fimMes)
      .get();

    let receita = 0;
    snapMes.forEach(doc => {
      const data = doc.data();
      if (data?.entrada_paga) receita += Number(data.valor_entrada || 0);
    });
    document.getElementById("receita-mes").textContent = "R$ " + receita.toFixed(2);

    // TAREFAS PENDENTES
    const tarefasSnap = await db.collection("tarefas")
      .where("status", "==", "pendente")
      .get();
    document.getElementById("tarefas-pendentes").textContent = tarefasSnap.size;

  } catch (err) {
    console.error("Erro ao carregar resumo:", err);
  }
}

// ============================
// CARREGAR NOTIFICAÇÕES
// ============================
async function carregarNotificacoes() {
  try {
    const snap = await db.collection("notificacoes")
      .orderBy("criado_em", "desc")
      .limit(20)
      .get();

    dashboardState.notificacoes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (notifCountEl) notifCountEl.textContent = dashboardState.notificacoes.length;
  } catch (err) {
    console.error("Erro ao carregar notificações:", err);
  }
}
window.abrirNotificacoes = function () {
  nav("notificacoes");
};

// ============================
// CARREGAR CALENDÁRIO
// ============================
async function carregarCalendario() {
  try {
    const calendarEl = document.getElementById("calendar");
    if (!calendarEl) return;

    const snap = await db.collection("agendamentos").get();
    const eventos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    dashboardState.agendamentosCache = eventos;

    // Renderizar calendário (calendar.js)
    if (window.renderCalendar) window.renderCalendar(eventos);

  } catch (err) {
    console.error("Erro ao carregar calendário:", err);
  }
}

// ============================
// ABRIR DETALHES AGENDAMENTO
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
