// ============================
// FIREBASE (compat, global)
// ============================
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
// FUNÇÃO GLOBAL NAV
// ============================
window.nav = function (idPagina) {
  const pageId = "pagina-" + idPagina;

  // Mostrar a página
  paginas.forEach(p => p.classList.remove("ativa"));
  const pagina = document.getElementById(pageId);
  if (pagina) pagina.classList.add("ativa");

  // Destacar menu ativo
  menuLinks.forEach(li => li.classList.remove("active"));
  const menuItem = Array.from(menuLinks).find(li =>
    li.getAttribute("onclick")?.includes(`'${idPagina}'`)
  );
  if (menuItem) menuItem.classList.add("active");

  // Atualizar título
  const titulo = document.getElementById("titulo-pagina");
  if (titulo) {
    if (pagina) {
      const h2 = pagina.querySelector("h2");
      titulo.textContent = h2 ? h2.textContent : idPagina.charAt(0).toUpperCase() + idPagina.slice(1);
    } else {
      titulo.textContent = "";
    }
  }
};

// ============================
// RESPONSIVIDADE
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
// RESUMO (CARDS)
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
    const agHojeEl = document.getElementById("ag-hoje");
    if (agHojeEl) agHojeEl.textContent = snap.size;

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
    const receitaEl = document.getElementById("receita-mes");
    if (receitaEl) receitaEl.textContent = "R$ " + receita.toFixed(2);

    // TAREFAS PENDENTES
    const tarefasSnap = await db.collection("tarefas")
      .where("status", "==", "pendente")
      .get();
    const tarefasEl = document.getElementById("tarefas-pendentes");
    if (tarefasEl) tarefasEl.textContent = tarefasSnap.size;

  } catch (err) {
    console.error("Erro ao carregar resumo:", err);
  }
}

// ============================
// NOTIFICAÇÕES
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
// CALENDÁRIO
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
