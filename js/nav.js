// ============================
// CONFIGURAÇÃO BASE DO SITE
// (AJUSTE SE O REPOSITÓRIO TIVER OUTRO NOME)
// ============================
const BASE = "/dashboard-Divertilandia/";

// ============================
// FUNÇÃO NAV – NAVEGAÇÃO ENTRE PÁGINAS
// ============================
window.nav = function(page) {
    const pages = {
        dashboard: BASE + "dashboard.html",
        agendamentos: BASE + "pages/agendamentos.html",
        financeiro: BASE + "pages/financeiro.html",
        catalogo: BASE + "pages/catalogo.html",
        monitores: BASE + "pages/monitores.html",
        tarefas: BASE + "pages/tarefas.html",
        conversas: BASE + "pages/conversas.html",
        notificacoes: BASE + "pages/notificacoes.html"
    };

    if (!pages[page]) {
        console.warn("Página não encontrada:", page);
        window.location.href = pages.dashboard;
        return;
    }

    window.location.href = pages[page];
};

// ============================
// LOGOUT
// ============================
window.logout = function () {
    if (window.auth && auth.signOut) {
        auth.signOut().then(() => {
            window.location.href = BASE + "index.html";
        });
    } else {
        // fallback caso auth ainda não esteja carregado
        window.location.href = BASE + "index.html";
    }
};

// ============================
// EXIBIR USUÁRIO LOGADO
// ============================
document.addEventListener("DOMContentLoaded", () => {
    if (!window.auth) {
        console.warn("Auth ainda não disponível. Usuário não carregado.");
        return;
    }

    auth.onAuthStateChanged(user => {
        const el = document.getElementById("user-info");
        if (el) el.textContent = user ? (user.displayName || user.email) : "Usuário";
    });
});
