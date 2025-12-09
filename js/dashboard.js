// ===========================
// NAVEGAÇÃO MULTIPÁGINAS (CORRIGIDA PARA GITHUB PAGES)
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

  window.location.href = pages[page] || pages.dashboard;
}

  if (page === "dashboard") {
    window.location.href = "dashboard.html";
  } else {
    window.location.href = pages[page];
  }
}

// ===========================
// LOGOUT
// ===========================
function logout() {
  auth.signOut().then(() => {
    window.location.href = "index.html";
  });
}

// ===========================
// USER INFO
// ===========================
auth.onAuthStateChanged(user => {
  if (!user) return;

  document.getElementById("user-info").textContent =
    user.displayName || user.email;
});

// ===========================
// CONTADORES DO DASHBOARD
// ===========================
async function carregarResumo() {
  // ---------------- AGENDAMENTOS HOJE ----------------
  const hoje = new Date();
  hoje.setHours(0,0,0,0);

  const snapAg = await db.collection("agendamentos")
    .where("data", "==", hoje.toISOString().substring(0, 10))
    .get();

  document.getElementById("ag-hoje").textContent = snapAg.size;

  // ---------------- TAREFAS ----------------
  const snapT = await db.collection("tarefas")
    .where("status", "==", "pendente")
    .get();

  document.getElementById("tarefas-pendentes").textContent = snapT.size;

  // ---------------- CONVERSAS ----------------
  const snapC = await db.collection("conversas")
    .where("status", "==", "ativo")
    .get();

  document.getElementById("conversas-ativas").textContent = snapC.size;
}

window.addEventListener("DOMContentLoaded", () => {
  carregarResumo();
});
