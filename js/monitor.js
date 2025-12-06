// js/monitor.js
// -------------------------------------------------------------
// GERENCIAMENTO DE MONITORES - Firestore
// -------------------------------------------------------------

const monitoresRef = db.collection("monitores");

// -------------------------------------------------------------
// LISTAR MONITORES (tempo real)
// -------------------------------------------------------------
function observarMonitores(callback) {
  return monitoresRef.orderBy("nome", "asc").onSnapshot((snap) => {
    const lista = [];
    snap.forEach((doc) => {
      lista.push({ id: doc.id, ...doc.data() });
    });
    callback(lista);
  });
}

// -------------------------------------------------------------
// CRIAR NOVO MONITOR
// -------------------------------------------------------------
async function criarMonitor({ nome, telefone, observacoes }) {
  if (!nome) throw new Error("Nome do monitor é obrigatório.");

  const novo = {
    nome,
    telefone: telefone || "",
    observacoes: observacoes || "",
    criado_em: firebase.firestore.FieldValue.serverTimestamp(),
  };

  const ref = await monitoresRef.add(novo);
  return { id: ref.id, ...novo };
}

// -------------------------------------------------------------
// EDITAR MONITOR
// -------------------------------------------------------------
async function editarMonitor(id, dados) {
  if (!id) throw new Error("ID do monitor é obrigatório.");
  await monitoresRef.doc(id).set(dados, { merge: true });
  return true;
}

// -------------------------------------------------------------
// EXCLUIR MONITOR
// -------------------------------------------------------------
async function excluirMonitor(id) {
  if (!id) throw new Error("ID é obrigatório.");

  await monitoresRef.doc(id).delete();
  return true;
}

// -------------------------------------------------------------
// BUSCAR MONITOR (único)
// -------------------------------------------------------------
async function getMonitor(id) {
  const snap = await monitoresRef.doc(id).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

// -------------------------------------------------------------
// VINCULAR MONITOR A AGENDAMENTO
// -------------------------------------------------------------
async function definirMonitoresNoAgendamento(agendamentoId, monitoresSelecionados) {
  if (!agendamentoId) throw new Error("ID do agendamento é obrigatório.");

  await db.collection("eventos").doc(agendamentoId).set(
    {
      monitores: monitoresSelecionados,
    },
    { merge: true }
  );

  return true;
}

// -------------------------------------------------------------
// COMPONENTE DE UI — RENDERIZAR LISTA
// -------------------------------------------------------------
function renderizarMonitores(lista, containerId) {
  const div = document.getElementById(containerId);
  if (!div) return;

  if (lista.length === 0) {
    div.innerHTML = "<p>Nenhum monitor cadastrado.</p>";
    return;
  }

  div.innerHTML = `
    <table class="tabela-monitores">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Telefone</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        ${lista
          .map(
            (m) => `
          <tr>
            <td>${m.nome}</td>
            <td>${m.telefone || "-"}</td>
            <td>
              <button class="btn-editar" onclick="abrirEditarMonitor('${m.id}')">Editar</button>
              <button class="btn-excluir" onclick="confirmarExcluirMonitor('${m.id}')">Excluir</button>
            </td>
          </tr>`
          )
          .join("")}
      </tbody>
    </table>
  `;
}

// -------------------------------------------------------------
// UI — ABRIR POPUP DE EDIÇÃO
// -------------------------------------------------------------
function abrirEditarMonitor(id) {
  getMonitor(id).then((m) => {
    if (!m) return;

    document.getElementById("monitor-editar-id").value = m.id;
    document.getElementById("monitor-editar-nome").value = m.nome;
    document.getElementById("monitor-editar-telefone").value = m.telefone || "";
    document.getElementById("monitor-editar-observacoes").value = m.observacoes || "";

    document.getElementById("modal-editar-monitor").style.display = "flex";
  });
}

// -------------------------------------------------------------
// UI — SALVAR EDIÇÃO
// -------------------------------------------------------------
async function salvarEdicaoMonitor() {
  const id = document.getElementById("monitor-editar-id").value;
  const nome = document.getElementById("monitor-editar-nome").value.trim();
  const telefone = document.getElementById("monitor-editar-telefone").value.trim();
  const observacoes = document.getElementById("monitor-editar-observacoes").value.trim();

  if (!nome) {
    alert("Nome é obrigatório.");
    return;
  }

  await editarMonitor(id, { nome, telefone, observacoes });
  document.getElementById("modal-editar-monitor").style.display = "none";
}

// -------------------------------------------------------------
// UI — CONFIRMAR EXCLUSÃO
// -------------------------------------------------------------
function confirmarExcluirMonitor(id) {
  if (confirm("Tem certeza que deseja excluir este monitor?")) {
    excluirMonitor(id);
  }
}

// -------------------------------------------------------------
// UI — FECHAR MODAL
// -------------------------------------------------------------
function fecharModalMonitor() {
  document.getElementById("modal-editar-monitor").style.display = "none";
}

// -------------------------------------------------------------
// EXPORTS GLOBAIS
// -------------------------------------------------------------
window.criarMonitor = criarMonitor;
window.observarMonitores = observarMonitores;
window.renderizarMonitores = renderizarMonitores;
window.definirMonitoresNoAgendamento = definirMonitoresNoAgendamento;
window.abrirEditarMonitor = abrirEditarMonitor;
window.salvarEdicaoMonitor = salvarEdicaoMonitor;
window.confirmarExcluirMonitor = confirmarExcluirMonitor;
window.fecharModalMonitor = fecharModalMonitor;
