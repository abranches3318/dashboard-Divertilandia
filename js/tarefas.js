// ============================
// FIREBASE (compat, global)
// ============================
window.db = window.db || firebase.firestore();

// ============================
// ESTADO GLOBAL
// ============================
window.tarefasState = {
  tarefas: []
};

// ============================
// INICIALIZAÇÃO
// ============================
window.addEventListener("DOMContentLoaded", async () => {
  const paginaTarefas = document.getElementById("pagina-tarefas");
  if (!paginaTarefas) return;

  paginaTarefas.innerHTML = `
    <h2>Tarefas</h2>
    <div id="filtros-tarefas">
      <select id="filtro-status">
        <option value="">Todos Status</option>
        <option value="pendente">Pendente</option>
        <option value="concluida">Concluída</option>
      </select>
      <input type="text" id="filtro-responsavel" placeholder="Responsável" />
      <button class="btn" id="btn-filtrar">Filtrar</button>
    </div>
    <div id="tarefas-container"></div>
  `;

  await carregarTarefas();

  document.getElementById("btn-filtrar").addEventListener("click", aplicarFiltros);
});

// ============================
// CARREGAR TAREFAS
// ============================
async function carregarTarefas() {
  try {
    const snap = await db.collection("tarefas")
      .orderBy("criado_em", "desc")
      .get();

    tarefasState.tarefas = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarTarefas(tarefasState.tarefas);

  } catch (err) {
    console.error("Erro ao carregar tarefas:", err);
    document.getElementById("tarefas-container").innerHTML = "<p>Erro ao carregar tarefas.</p>";
  }
}

// ============================
// RENDERIZAR TAREFAS
// ============================
function renderizarTarefas(tarefas) {
  const container = document.getElementById("tarefas-container");
  container.innerHTML = "";

  if (!tarefas.length) {
    container.innerHTML = "<p>Nenhuma tarefa encontrada.</p>";
    return;
  }

  tarefas.forEach(t => {
    const div = document.createElement("div");
    div.classList.add("panel");
    div.innerHTML = `
      <h3>${t.titulo || "Sem título"}</h3>
      <p><strong>Responsável:</strong> ${t.responsavel || "-"}</p>
      <p><strong>Status:</strong> <span id="status-${t.id}">${t.status || "-"}</span></p>
      <button class="btn ${t.status === "concluida" ? "btn-dark" : ""}" onclick="alterarStatus('${t.id}')">
        ${t.status === "concluida" ? "Marcar como Pendente" : "Marcar como Concluída"}
      </button>
    `;
    container.appendChild(div);
  });
}

// ============================
// FILTROS
// ============================
function aplicarFiltros() {
  let filtradas = [...tarefasState.tarefas];

  const statusFiltro = document.getElementById("filtro-status").value;
  const respFiltro = document.getElementById("filtro-responsavel").value.toLowerCase();

  if (statusFiltro) {
    filtradas = filtradas.filter(t => (t.status || "") === statusFiltro);
  }

  if (respFiltro) {
    filtradas = filtradas.filter(t => (t.responsavel || "").toLowerCase().includes(respFiltro));
  }

  renderizarTarefas(filtradas);
}

// ============================
// ALTERAR STATUS
// ============================
window.alterarStatus = async function(tarefaId) {
  try {
    const tarefaRef = db.collection("tarefas").doc(tarefaId);
    const tarefaDoc = await tarefaRef.get();
    if (!tarefaDoc.exists) return;

    const currentStatus = tarefaDoc.data().status || "pendente";
    const novoStatus = currentStatus === "pendente" ? "concluida" : "pendente";

    await tarefaRef.update({ status: novoStatus });

    // Atualizar no estado e na interface
    const tarefa = tarefasState.tarefas.find(t => t.id === tarefaId);
    if (tarefa) tarefa.status = novoStatus;

    const statusEl = document.getElementById(`status-${tarefaId}`);
    if (statusEl) statusEl.textContent = novoStatus;

    renderizarTarefas(tarefasState.tarefas); // Para atualizar o botão
  } catch (err) {
    console.error("Erro ao alterar status:", err);
  }
};
