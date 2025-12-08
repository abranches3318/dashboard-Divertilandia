// agendamentos.js — versão corrigida e compatível com dashboard.html e calendar.js
// Backend Firebase já inicializado no dashboard.js
// Este arquivo apenas manipula DOM e CRUD de agendamentos


(() => {
console.log("[agendamentos.js] carregado");


// =============================
// Inicialização da Seção
// =============================
window.addEventListener("DOMContentLoaded", () => {
const pagina = document.getElementById("pagina-agendamentos");
if (!pagina) {
console.warn("[agendamentos.js] pagina-agendamentos não encontrada");
return;
}


console.log("[agendamentos.js] Inicializando seção de Agendamentos...");
inicializarAgendamentos();
});


// =============================
// Função principal de inicialização
// =============================
function inicializarAgendamentos() {
const btnNovo = document.getElementById("btnNovoAgendamento");
const btnFiltrar = document.getElementById("btnFiltrarAgendamentos");


if (!btnNovo || !btnFiltrar) {
console.error("[agendamentos.js] Elementos principais não encontrados");
return;
}


btnNovo.addEventListener("click", abrirModalNovoAgendamento);
btnFiltrar.addEventListener("click", filtrarAgendamentos);


carregarListaAgendamentos();
}


// =============================
// Carregar lista completa
// =============================
async function carregarListaAgendamentos() {
const tbody = document.getElementById("listaAgendamentos");
if (!tbody) return;


tbody.innerHTML = "<tr><td colspan='6'>Carregando...</td></tr>";


try {
const snapshot = await db.collection("agendamentos")
.orderBy("data", "asc")
.get();


renderTabela(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
} catch (e) {
console.error("Erro ao carregar agendamentos", e);
tbody.innerHTML = "<tr><td colspan='6'>Erro ao carregar dados</td></tr>";
}
}


// =============================
// Filtrar
// =============================
async function filtrarAgendamentos() {
const data = document.getElementById("filtroData").value;
const cliente = document.getElementById("filtroCliente").value.toLowerCase();
const telefone = document.getElementById("filtroTelefone").value;
const status = document.getElementById("filtroStatus").value;


let ref = db.collection("agendamentos");


if (data) ref = ref.where("data", "==", data);
if (status) ref = ref.where("status", "==", status);


const tbody = document.getElementById("listaAgendamentos");
tbody.innerHTML = "<tr><td colspan='6'>Filtrando...</td></tr>";


try {
const snap = await ref.get();
let lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));


// Filtros client-side
})();
