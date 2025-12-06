// ============================
// FIRESTORE
// ============================
const agendamentosRef = db.collection("agendamentos");

// ============================
// ESTADO
// ============================
window.agendamentosState = {
  lista: [],
  filtros: {
    data: "",
    cliente: "",
    telefone: "",
    status: ""
  }
};

// ============================
// LISTAR AGENDAMENTOS
// ============================
async function listarAgendamentos() {
  try {
    const snap = await agendamentosRef.orderBy("data", "asc").get();
    window.agendamentosState.lista = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    renderizarAgendamentos();
  } catch (err) {
    console.error("Erro ao listar agendamentos:", err);
  }
}

// ============================
// RENDERIZAR AGENDAMENTOS
// ============================
function renderizarAgendamentos() {
  const tbody = document.querySelector("#tabela-agendamentos tbody");
  if (!tbody) return;

  const { lista, filtros } = window.agendamentosState;

  const listaFiltrada = lista.filter(a => {
    const matchData = filtros.data ? a.data === filtros.data : true;
    const matchCliente = filtros.cliente ? a.cliente.toLowerCase().includes(filtros.cliente.toLowerCase()) : true;
    const matchTelefone = filtros.telefone ? a.telefone.includes(filtros.telefone) : true;
    const matchStatus = filtros.status ? a.status === filtros.status : true;
    return matchData && matchCliente && matchTelefone && matchStatus;
  });

  tbody.innerHTML = listaFiltrada.map(a => `
    <tr>
      <td>${a.data}</td>
      <td>${a.cliente}</td>
      <td>${a.telefone || "-"}</td>
      <td>${a.status}</td>
      <td>${a.item || "-"}</td>
      <td>${(a.monitores || []).join(", ")}</td>
      <td>
        <button class="btn" onclick="abrirModalAgendamento('${a.id}')">Editar</button>
        <button class="btn btn-danger" onclick="excluirAgendamento('${a.id}')">Excluir</button>
      </td>
    </tr>
  `).join("");
}

// ============================
// FILTROS
// ============================
function aplicarFiltros() {
  window.agendamentosState.filtros.data = document.getElementById("filtro-data").value;
  window.agendamentosState.filtros.cliente = document.getElementById("filtro-cliente").value;
  window.agendamentosState.filtros.telefone = document.getElementById("filtro-telefone").value;
  window.agendamentosState.filtros.status = document.getElementById("filtro-status").value;
  renderizarAgendamentos();
}

function limparFiltros() {
  document.getElementById("filtro-data").value = "";
  document.getElementById("filtro-cliente").value = "";
  document.getElementById("filtro-telefone").value = "";
  document.getElementById("filtro-status").value = "";
  aplicarFiltros();
}

// ============================
// MODAL AGENDAMENTO
// ============================
function abrirModalAgendamento(id = "") {
  const modal = document.getElementById("modal-agendamento");
  if (!modal) return;

  modal.classList.add("active");

  const titulo = document.getElementById("titulo-modal");
  titulo.textContent = id ? "Editar Agendamento" : "Novo Agendamento";

  if (id) {
    const ag = window.agendamentosState.lista.find(a => a.id === id);
    if (!ag) return;

    document.getElementById("agendamento-id").value = ag.id;
    document.getElementById("agendamento-data").value = ag.data || "";
    document.getElementById("agendamento-cliente").value = ag.cliente || "";
    document.getElementById("agendamento-telefone").value = ag.telefone || "";
    document.getElementById("agendamento-status").value = ag.status || "pendente";
    document.getElementById("agendamento-item").value = ag.item || "";
    document.getElementById("agendamento-monitores").value = (ag.monitores || []).join(", ");
  } else {
    document.getElementById("agendamento-id").value = "";
    document.getElementById("agendamento-data").value = "";
    document.getElementById("agendamento-cliente").value = "";
    document.getElementById("agendamento-telefone").value = "";
    document.getElementById("agendamento-status").value = "pendente";
    document.getElementById("agendamento-item").value = "";
    document.getElementById("agendamento-monitores").value = "";
  }
}

function fecharModalAgendamento() {
  const modal = document.getElementById("modal-agendamento");
  if (modal) modal.classList.remove("active");
}

// ============================
// SALVAR AGENDAMENTO
// ============================
async function salvarAgendamento() {
  const id = document.getElementById("agendamento-id").value;
  const data = document.getElementById("agendamento-data").value;
  const cliente = document.getElementById("agendamento-cliente").value.trim();
  const telefone = document.getElementById("agendamento-telefone").value.trim();
  const status = document.getElementById("agendamento-status").value;
  const item = document.getElementById("agendamento-item").value.trim();
  const monitores = document.getElementById("agendamento-monitores").value.split(",").map(m => m.trim()).filter(Boolean);

  if (!data || !cliente) {
    alert("Data e Cliente são obrigatórios!");
    return;
  }

  const dados = { data, cliente, telefone, status, item, monitores };

  try {
    if (id) {
      await agendamentosRef.doc(id).set(dados, { merge: true });
    } else {
      await agendamentosRef.add(dados);
    }
    fecharModalAgendamento();
    await listarAgendamentos();
  } catch (err) {
    console.error("Erro ao salvar agendamento:", err);
  }
}

// ============================
// EXCLUIR AGENDAMENTO
// ============================
async function excluirAgendamento(id) {
  if (!confirm("Deseja realmente excluir este agendamento?")) return;
  try {
    await agendamentosRef.doc(id).delete();
    await listarAgendamentos();
  } catch (err) {
    console.error("Erro ao excluir agendamento:", err);
  }
}

// ============================
// INIT
// ============================
window.addEventListener("DOMContentLoaded", listarAgendamentos);
