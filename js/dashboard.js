// ===========================
// NAVEGAÇÃO MULTIPÁGINAS
// ===========================
function nav(page) {
  const pages = {
    dashboard: "dashboard.html",
    agendamentos: "pages/agendamentos.html",
    financeiro: "pages/financeiro.html",
    catalogo: "pages/catalogo.html",
    monitores: "pages/monitores.html",
    tarefas: "pages/tarefas.html",
    conversas: "pages/conversas.html",
    notificacoes: "pages/notificacoes.html"
  };

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
