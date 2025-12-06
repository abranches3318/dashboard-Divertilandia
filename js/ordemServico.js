// ============================
// FIREBASE (compat, global)
// ============================
window.db = window.db || firebase.firestore();

// ============================
// ESTADO GLOBAL
// ============================
window.osState = {
  ordens: []
};

// ============================
// INICIALIZAÇÃO
// ============================
window.addEventListener("DOMContentLoaded", async () => {
  const paginaOS = document.getElementById("pagina-agendamentos") || document.querySelector(".pagina");
  if (!paginaOS) return;

  // Container
  paginaOS.innerHTML = `<h2>Ordens de Serviço</h2>
    <div id="filtros-os">
      <input type="date" id="filtro-data" />
      <input type="text" id="filtro-cliente" placeholder="Cliente" />
      <select id="filtro-status">
        <option value="">Todos Status</option>
        <option value="pendente">Pendente</option>
        <option value="concluida">Concluída</option>
      </select>
      <input type="text" id="filtro-telefone" placeholder="Telefone" />
      <button class="btn" id="btn-filtrar">Filtrar</button>
    </div>
    <div id="os-container"></div>`;

  // Carregar ordens
  await carregarOrdens();

  // Filtros
  document.getElementById("btn-filtrar").addEventListener("click", aplicarFiltros);
});

// ============================
// CARREGAR ORDENS
// ============================
async function carregarOrdens() {
  try {
    const snap = await db.collection("ordens_servico")
      .orderBy("data", "desc")
      .get();

    osState.ordens = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderizarOrdens(osState.ordens);

  } catch (err) {
    console.error("Erro ao carregar ordens:", err);
    document.getElementById("os-container").innerHTML = "<p>Erro ao carregar ordens de serviço.</p>";
  }
}

// ============================
// RENDERIZAR ORDENS
// ============================
function renderizarOrdens(ordens) {
  const container = document.getElementById("os-container");
  container.innerHTML = "";

  if (!ordens.length) {
    container.innerHTML = "<p>Nenhuma ordem de serviço encontrada.</p>";
    return;
  }

  ordens.forEach(os => {
    const div = document.createElement("div");
    div.classList.add("panel");
    div.innerHTML = `
      <h3>${os.cliente || "Sem cliente"}</h3>
      <p><strong>Data:</strong> ${os.data ? new Date(os.data.seconds * 1000).toLocaleDateString("pt-BR") : "-"}</p>
      <p><strong>Status:</strong> ${os.status || "-"}</p>
      <p><strong>Itens:</strong> ${(os.itens || []).map(i => i.nome).join(", ") || "-"}</p>
      <button class="btn" onclick="abrirChecklist('${os.id}', 'montagem')">Checklist Montagem</button>
      <button class="btn btn-dark" onclick="abrirChecklist('${os.id}', 'desmontagem')">Checklist Desmontagem</button>
    `;
    container.appendChild(div);
  });
}

// ============================
// FILTROS
// ============================
function aplicarFiltros() {
  let filtradas = [...osState.ordens];

  const dataFiltro = document.getElementById("filtro-data").value;
  const clienteFiltro = document.getElementById("filtro-cliente").value.toLowerCase();
  const statusFiltro = document.getElementById("filtro-status").value;
  const telefoneFiltro = document.getElementById("filtro-telefone").value;

  if (dataFiltro) {
    const filtroDate = new Date(dataFiltro);
    filtradas = filtradas.filter(os => {
      const osDate = os.data ? new Date(os.data.seconds * 1000) : null;
      return osDate && osDate.toDateString() === filtroDate.toDateString();
    });
  }

  if (clienteFiltro) {
    filtradas = filtradas.filter(os => (os.cliente || "").toLowerCase().includes(clienteFiltro));
  }

  if (statusFiltro) {
    filtradas = filtradas.filter(os => (os.status || "") === statusFiltro);
  }

  if (telefoneFiltro) {
    filtradas = filtradas.filter(os => (os.telefone || "").includes(telefoneFiltro));
  }

  renderizarOrdens(filtradas);
}

// ============================
// ABRIR CHECKLIST
// ============================
window.abrirChecklist = function(osId, tipo) {
  // Redireciona para checklist correto
  const url = tipo === "montagem"
    ? `checklist-montagem.html?os=${osId}`
    : `checklist-desmontagem.html?os=${osId}`;

  window.location.href = url;
};
