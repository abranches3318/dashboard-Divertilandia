// ===========================
// NAVEGAÇÃO MULTIPÁGINAS (GITHUB PAGES CORRIGIDO)
// ===========================
function nav(page) {
  const base = "/dashboard-Divertilandia/";

  const pages = {
    dashboard: base + "dashboard.html",
    agendamentos: base + "pages/agendamentos.html",
    financeiro: base + "pages/financeiro.html",
    catalogo: base + "pages/catalogo.html",
    monitores: base + "pages/monitores.html",
    tarefas: base + "pages/tarefas.html",
    conversas: base + "pages/conversas.html",
    notificacoes: base + "pages/notificacoes.html"
  };

  // redireciona para página ou para dashboard caso não exista
  window.location.href = pages[page] || pages.dashboard;
}

// ===========================
// LOGOUT
// ===========================
function logout() {
  auth.signOut().then(() => {
    window.location.href = "/dashboard-Divertilandia/index.html";
  });
}

// ===========================
// USER INFO
// ===========================
auth.onAuthStateChanged(user => {
  if (!user) return;

  const info = document.getElementById("user-info");
  if (info) {
    info.textContent = user.displayName || user.email;
  }
});

// ===========================
// CONTADORES DO DASHBOARD
// ===========================
async function carregarResumo() {
  const hoje = new Date();
  const hojeStr = hoje.toISOString().substring(0, 10);

  // AGENDAMENTOS HOJE
  const snapAg = await db.collection("agendamentos")
    .where("data", "==", hojeStr)
    .get();

  document.getElementById("ag-hoje").textContent = snapAg.size;

  // TAREFAS PENDENTES
  const snapT = await db.collection("tarefas")
    .where("status", "==", "pendente")
    .get();

  document.getElementById("tarefas-pendentes").textContent = snapT.size;

  // CONVERSAS ATIVAS
  const snapC = await db.collection("conversas")
    .where("status", "==", "ativo")
    .get();

  document.getElementById("conversas-ativas").textContent = snapC.size;
}

window.irParaAgendamentos = function (opts = {}) {
  const btn = document.querySelector('[data-page="agendamentos"]');
  if (!btn) return;

  btn.click();

  if (opts.abrirNovo && window.agendamentosModule?.openModalNew) {
    setTimeout(() => {
      window.agendamentosModule.openModalNew(
        opts.data ? new Date(opts.data + "T00:00:00") : null
      );
    }, 300);
  }
};
window.addEventListener("DOMContentLoaded", carregarResumo);
