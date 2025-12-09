// ===============================================
// AGENDAMENTOS.JS – versão estável e compatível
// ===============================================

// Firebase (vem de firebase-config.js)
const auth = firebase.auth();
const db = firebase.firestore();

// Elementos
const lista = document.getElementById("listaAgendamentos");
const btnFiltrar = document.getElementById("btnFiltrar");
const btnNovo = document.getElementById("btnNovoAg");

const fData = document.getElementById("filtroData");
const fCliente = document.getElementById("filtroCliente");
const fTelefone = document.getElementById("filtroTelefone");
const fStatus = document.getElementById("filtroStatus");

// Estado em memória
let AGENDAMENTOS = [];

// -----------------------------------------------
// 1. Carregar todos os agendamentos
// -----------------------------------------------
async function carregarAgendamentos() {
  try {
    const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
    AGENDAMENTOS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTabela(AGENDAMENTOS);
  } catch (e) {
    console.error("Erro ao carregar:", e);
    Swal.fire("Erro", "Não foi possível carregar os agendamentos.", "error");
  }
}

// -----------------------------------------------
// 2. Renderizar tabela
// -----------------------------------------------
function renderTabela(listaAg) {
  lista.innerHTML = "";

  if (listaAg.length === 0) {
    lista.innerHTML = `
      <tr><td colspan="6" style="text-align:center">Nenhum agendamento encontrado</td></tr>
    `;
    return;
  }

  listaAg.forEach(a => {
    const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);

    const linha = document.createElement("tr");
    linha.innerHTML = `
      <td>${data.toLocaleDateString()}</td>
      <td>${a.cliente || "-"}</td>
      <td>${a.telefone || "-"}</td>
      <td>${a.status || "-"}</td>
      <td>R$ ${Number(a.valor || 0).toFixed(2)}</td>
      <td>
        <button class="btn btn-dark" data-id="${a.id}">Ver</button>
      </td>
    `;

    linha.querySelector("button").addEventListener("click", () => abrirAgendamento(a.id));

    lista.appendChild(linha);
  });
}

// -----------------------------------------------
// 3. Aplicar filtros
// -----------------------------------------------
function aplicarFiltros() {
  let filtrados = [...AGENDAMENTOS];

  if (fData.value) {
    const d = new Date(fData.value).toDateString();
    filtrados = filtrados.filter(a => {
      const ad = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return ad.toDateString() === d;
    });
  }

  if (fCliente.value) {
    const nome = fCliente.value.toLowerCase();
    filtrados = filtrados.filter(a => (a.cliente || "").toLowerCase().includes(nome));
  }

  if (fTelefone.value) {
    const tel = fTelefone.value.replace(/\D/g, "");
    filtrados = filtrados.filter(a =>
      (a.telefone || "").replace(/\D/g, "").includes(tel)
    );
  }

  if (fStatus.value) {
    filtrados = filtrados.filter(a => a.status === fStatus.value);
  }

  renderTabela(filtrados);
}

// -----------------------------------------------
// 4. Novo agendamento
// -----------------------------------------------
async function novoAgendamento() {
  const { value: dados } = await Swal.fire({
    title: "Novo Agendamento",
    html: `
      <input id="ag-nome" class="swal2-input" placeholder="Cliente">
      <input id="ag-tel" class="swal2-input" placeholder="Telefone">
      <input id="ag-valor" class="swal2-input" placeholder="Valor">
      <input type="date" id="ag-data" class="swal2-input">
    `,
    preConfirm: () => ({
      cliente: document.getElementById("ag-nome").value,
      telefone: document.getElementById("ag-tel").value,
      valor: Number(document.getElementById("ag-valor").value || 0),
      data: new Date(document.getElementById("ag-data").value),
      status: "pendente"
    }),
    showCancelButton: true
  });

  if (!dados) return;

  try {
    await db.collection("agendamentos").add(dados);
    Swal.fire("Pronto!", "Agendamento criado com sucesso!", "success");
    carregarAgendamentos();
  } catch (err) {
    console.error(err);
    Swal.fire("Erro", "Não foi possível salvar o agendamento.", "error");
  }
}

// -----------------------------------------------
// 5. Abrir agendamento
// -----------------------------------------------
async function abrirAgendamento(id) {
  const doc = await db.collection("agendamentos").doc(id).get();
  if (!doc.exists) return Swal.fire("Erro", "Agendamento não encontrado", "error");

  const a = doc.data();
  const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);

  Swal.fire({
    title: a.cliente,
    html: `
      <p>Telefone: ${a.telefone || "-"}</p>
      <p>Valor: R$ ${Number(a.valor || 0).toFixed(2)}</p>
      <p>Data: ${data.toLocaleDateString()}</p>
      <p>Status: ${a.status}</p>
    `
  });
}

// -----------------------------------------------
// 6. Eventos
// -----------------------------------------------
btnFiltrar?.addEventListener("click", aplicarFiltros);
btnNovo?.addEventListener("click", novoAgendamento);

// Inicializar
carregarAgendamentos();
