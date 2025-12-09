// =====================================================
// AGENDAMENTOS.JS - fluxo completo e integrado ao Firebase
// =====================================================

// Proteção: exige auth
auth.onAuthStateChanged(user => {
  if (!user) {
    window.location.href = "/dashboard-Divertilandia/index.html";
  }
});

// ===========================
// Elementos da tela
// ===========================
const btnNovoAg = document.getElementById("btnNovoAg");
const btnFiltrar = document.getElementById("btnFiltrar");
const listaAgendamentos = document.getElementById("listaAgendamentos");


// ===========================
// Carregar LISTA COMPLETA ao entrar
// ===========================
window.addEventListener("DOMContentLoaded", () => {
  carregarAgendamentos();
});


// =====================================================
// 1. FUNÇÃO PRINCIPAL DE LISTAGEM
// =====================================================
async function carregarAgendamentos(filtros = {}) {
  try {
    let ref = db.collection("agendamentos");

    if (filtros.data) ref = ref.where("data", "==", filtros.data);
    if (filtros.cliente) ref = ref.where("cliente", "==", filtros.cliente.toLowerCase());
    if (filtros.telefone) ref = ref.where("telefone", "==", filtros.telefone);
    if (filtros.status) ref = ref.where("status", "==", filtros.status);

    const snap = await ref.orderBy("data", "asc").get();

    listaAgendamentos.innerHTML = "";

    if (snap.empty) {
      listaAgendamentos.innerHTML = `
        <tr><td colspan="6" style="text-align:center; padding:20px;">Nenhum agendamento encontrado.</td></tr>
      `;
      return;
    }

    snap.forEach(doc => {
      const ag = doc.data();
      const id = doc.id;

      listaAgendamentos.innerHTML += `
        <tr>
          <td>${ag.data}</td>
          <td>${ag.cliente}</td>
          <td>${ag.telefone}</td>
          <td>${ag.status}</td>
          <td>R$ ${Number(ag.valorFinal).toFixed(2)}</td>
          <td>
            <button class="btn" onclick="editarAgendamento('${id}')">Editar</button>
          </td>
        </tr>
      `;
    });

  } catch (err) {
    console.error("Erro ao carregar agendamentos:", err);
    Swal.fire("Erro", "Não foi possível carregar os agendamentos.", "error");
  }
}


// =====================================================
// 2. FILTRO
// =====================================================
btnFiltrar.addEventListener("click", async () => {
  const filtros = {
    data: document.getElementById("filtroData").value || null,
    cliente: document.getElementById("filtroCliente").value.toLowerCase() || null,
    telefone: document.getElementById("filtroTelefone").value || null,
    status: document.getElementById("filtroStatus").value || null
  };

  await carregarAgendamentos(filtros);
});


// =====================================================
// 3. NOVO AGENDAMENTO
// =====================================================
btnNovoAg.addEventListener("click", async () => {
  abrirFormularioAgendamento();
});


// =====================================================
// 4. FORMULÁRIO DE CRIAÇÃO / EDIÇÃO
// =====================================================
async function abrirFormularioAgendamento(id = null) {
  let dados = {
    cliente: "",
    telefone: "",
    data: "",
    horaInicio: "",
    horaFim: "",
    pacote: "",
    preco: "",
    desconto: "",
    entrada: "",
    valorFinal: "",
    monitor: "",
    status: "pendente"
  };

  // Se for edição, buscar dados
  if (id) {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (doc.exists) dados = doc.data();
  }

  // Carregar pacotes, itens e monitores (busca dinâmica)
  const pacotes = await carregarPacotes();
  const monitores = await carregarMonitores();

  const htmlPacotes = pacotes.map(p => `<option value="${p.nome}">${p.nome} — R$ ${p.preco}</option>`).join("");
  const htmlMonitores = monitores.map(m => `<option value="${m.nome}">${m.nome}</option>`).join("");

  // SweetAlert Form
  Swal.fire({
    title: id ? "Editar Agendamento" : "Novo Agendamento",
    html: `
      <div style="text-align:left">
        <label>Cliente:</label>
        <input id="sw-cliente" class="swal2-input" value="${dados.cliente}">

        <label>Telefone:</label>
        <input id="sw-telefone" class="swal2-input" value="${dados.telefone}">

        <label>Data:</label>
        <input id="sw-data" type="date" class="swal2-input" value="${dados.data}">

        <label>Hora início:</label>
        <input id="sw-horaInicio" type="time" class="swal2-input" value="${dados.horaInicio}">

        <label>Hora fim (auto +4h):</label>
        <input id="sw-horaFim" type="time" class="swal2-input" value="${dados.horaFim}">

        <label>Pacote / Item:</label>
        <select id="sw-pacote" class="swal2-input">
          <option value="">Selecione...</option>
          ${htmlPacotes}
        </select>

        <label>Preço:</label>
        <input id="sw-preco" class="swal2-input" value="${dados.preco}" disabled>

        <label>Desconto:</label>
        <input id="sw-desconto" class="swal2-input" value="${dados.desconto || 0}">

        <label>Entrada:</label>
        <input id="sw-entrada" class="swal2-input" value="${dados.entrada || 0}">

        <label>Monitor:</label>
        <select id="sw-monitor" class="swal2-input">
          <option value="">Selecione...</option>
          ${htmlMonitores}
        </select>
      </div>
    `,
    confirmButtonText: id ? "Salvar alterações" : "Criar",
    showCancelButton: true,
    preConfirm: async () => {
      const cliente = document.getElementById("sw-cliente").value;
      const telefone = document.getElementById("sw-telefone").value;
      const data = document.getElementById("sw-data").value;
      const horaInicio = document.getElementById("sw-horaInicio").value;
      const horaFim = document.getElementById("sw-horaFim").value;
      const pacote = document.getElementById("sw-pacote").value;
      const preco = document.getElementById("sw-preco").value;
      const desconto = Number(document.getElementById("sw-desconto").value || 0);
      const entrada = Number(document.getElementById("sw-entrada").value || 0);
      const monitor = document.getElementById("sw-monitor").value;

      if (!cliente || !telefone || !data || !horaInicio || !pacote || !monitor) {
        Swal.showValidationMessage("Preencha todos os campos obrigatórios!");
        return false;
      }

      const precoNum = Number(preco);
      const valorFinal = precoNum - desconto;

      const status = entrada > 0 ? "confirmado" : "pendente";

      const dadosSalvar = {
        cliente,
        telefone,
        data,
        horaInicio,
        horaFim,
        pacote,
        preco: precoNum,
        desconto,
        entrada,
        valorFinal,
        monitor,
        status,
        atualizadoEm: new Date()
      };

      if (id) {
        await db.collection("agendamentos").doc(id).update(dadosSalvar);
      } else {
        dadosSalvar.criadoEm = new Date();
        await db.collection("agendamentos").add(dadosSalvar);
      }
    }
  }).then(() => carregarAgendamentos());
}


// =====================================================
// 5. Carregar PACOTES / ITENS
// =====================================================
async function carregarPacotes() {
  const snap = await db.collection("pacotes").get();
  let lista = [];
  snap.forEach(doc => lista.push(doc.data()));
  return lista;
}


// =====================================================
// 6. Carregar MONITORES
// =====================================================
async function carregarMonitores() {
  const snap = await db.collection("monitores").get();
  let lista = [];
  snap.forEach(doc => lista.push(doc.data()));
  return lista;
}


// =====================================================
// 7. EDIÇÃO (atalho)
// =====================================================
function editarAgendamento(id) {
  abrirFormularioAgendamento(id);
}
