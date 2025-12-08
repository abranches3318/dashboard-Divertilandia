// ============================
// AGENDAMENTOS.JS
// ============================

window.addEventListener("DOMContentLoaded", async () => {
  const db = window.db;
  const auth = window.auth;

  // ----------------------------
  // ELEMENTOS
  // ----------------------------
  const listaEl = document.getElementById("listaAgendamentos");
  const btnFiltrar = document.getElementById("btnFiltrarAgendamentos");
  const btnNovo = document.getElementById("btnNovoAgendamento");

  const filtroData = document.getElementById("filtroData");
  const filtroCliente = document.getElementById("filtroCliente");
  const filtroTelefone = document.getElementById("filtroTelefone");
  const filtroStatus = document.getElementById("filtroStatus");

  // ----------------------------
  // ESTADO GLOBAL
  // ----------------------------
  window.agendamentoState = {
    agendamentos: []
  };

  // ----------------------------
  // CARREGAR AGENDAMENTOS
  // ----------------------------
  async function carregarAgendamentos() {
    try {
      const snap = await db.collection("agendamentos").orderBy("data", "asc").get();
      const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.agendamentoState.agendamentos = agendamentos;
      renderizarTabela(agendamentos);
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
      Swal.fire("Erro", "Não foi possível carregar agendamentos", "error");
    }
  }

  // ----------------------------
  // RENDERIZAR TABELA
  // ----------------------------
  function renderizarTabela(agendamentos) {
    if (!listaEl) return;
    listaEl.innerHTML = "";

    if (agendamentos.length === 0) {
      listaEl.innerHTML = `<tr><td colspan="8" style="text-align:center">Nenhum agendamento encontrado</td></tr>`;
      return;
    }

    agendamentos.forEach(a => {
      const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      const linha = document.createElement("tr");
      linha.innerHTML = `
        <td>${data.toLocaleDateString()}</td>
        <td>${a.cliente || ""}</td>
        <td>${a.telefone || ""}</td>
        <td>${a.endereco || ""}</td>
        <td>${a.pacoteNome || ""}</td>
        <td>R$ ${Number(a.valor || 0).toFixed(2)}</td>
        <td>${a.status || ""}</td>
        <td>
          <button class="btn-secundario btn-ver" data-id="${a.id}">Ver</button>
          <button class="btn-danger btn-excluir" data-id="${a.id}">Cancelar</button>
        </td>
      `;
      listaEl.appendChild(linha);
    });

    listaEl.querySelectorAll(".btn-ver").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        abrirAgendamento(id);
      });
    });

    listaEl.querySelectorAll(".btn-excluir").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-id");
        excluirAgendamento(id);
      });
    });
  }

  // ----------------------------
  // FILTROS
  // ----------------------------
  function aplicarFiltros() {
    let agendamentos = [...window.agendamentoState.agendamentos];

    if (filtroData?.value) {
      const dataFiltro = new Date(filtroData.value);
      agendamentos = agendamentos.filter(a => {
        const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
        return d.toDateString() === dataFiltro.toDateString();
      });
    }

    if (filtroCliente?.value) {
      const nome = filtroCliente.value.toLowerCase();
      agendamentos = agendamentos.filter(a => (a.cliente || "").toLowerCase().includes(nome));
    }

    if (filtroTelefone?.value) {
      const tel = filtroTelefone.value.replace(/\D/g, "");
      agendamentos = agendamentos.filter(a => (a.telefone || "").replace(/\D/g, "").includes(tel));
    }

    if (filtroStatus?.value) {
      agendamentos = agendamentos.filter(a => (a.status || "") === filtroStatus.value);
    }

    renderizarTabela(agendamentos);
  }

  // ----------------------------
  // ABRIR AGENDAMENTO (DETALHES)
  // ----------------------------
  async function abrirAgendamento(id) {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Erro", "Agendamento não encontrado", "error");
      return;
    }
    const a = doc.data();
    Swal.fire({
      title: `Agendamento: ${a.cliente}`,
      html: `
        <p>Telefone: ${a.telefone || ''}</p>
        <p>Endereço: ${a.endereco || ''}</p>
        <p>Pacote/Item: ${a.pacoteNome || ''}</p>
        <p>Valor: R$ ${Number(a.valor || 0).toFixed(2)}</p>
        <p>Data: ${a.data?.toDate ? a.data.toDate().toLocaleDateString() : new Date(a.data).toLocaleDateString()}</p>
        <p>Status: ${a.status}</p>
        <p>Observação: ${a.observacao || ''}</p>
      `
    });
  }

  // ----------------------------
  // NOVO AGENDAMENTO
  // ----------------------------
  async function novoAgendamento() {
    // Buscar pacotes/items
    let pacotes = [];
    try {
      const snap = await db.collection("pacotes").get();
      pacotes = snap.docs.map(d => ({ id: d.id, nome: d.data().nome, valor: d.data().valor }));
    } catch (err) {
      console.error("Erro ao carregar pacotes:", err);
    }

    const pacotesOptions = pacotes.map(p => `<option value="${p.id}" data-valor="${p.valor}">${p.nome} - R$ ${p.valor.toFixed(2)}</option>`).join('');

    const { value: formValues } = await Swal.fire({
      title: 'Novo Agendamento',
      html: `
        <input id="swal-cliente" class="swal2-input" placeholder="Cliente">
        <input id="swal-telefone" class="swal2-input" placeholder="Telefone">
        <input id="swal-endereco" class="swal2-input" placeholder="Endereço">
        <select id="swal-pacote" class="swal2-select">
          <option value="">Selecione um pacote</option>
          ${pacotesOptions}
        </select>
        <input id="swal-valor" class="swal2-input" placeholder="Valor" readonly>
        <input type="date" id="swal-data" class="swal2-input">
        <input id="swal-pagamento" class="swal2-input" placeholder="Pagamento Entrada">
        <textarea id="swal-observacao" class="swal2-textarea" placeholder="Observação"></textarea>
      `,
      focusConfirm: false,
      preConfirm: () => {
        return {
          cliente: document.getElementById('swal-cliente').value,
          telefone: document.getElementById('swal-telefone').value,
          endereco: document.getElementById('swal-endereco').value,
          pacoteId: document.getElementById('swal-pacote').value,
          valor: parseFloat(document.getElementById('swal-valor').value || 0),
          data: new Date(document.getElementById('swal-data').value),
          pagamento: document.getElementById('swal-pagamento').value,
          observacao: document.getElementById('swal-observacao').value,
          status: 'pendente'
        };
      },
      showCancelButton: true
    });

    if (formValues) {
      // Preencher nome do pacote
      if (formValues.pacoteId) {
        const pacote = pacotes.find(p => p.id === formValues.pacoteId);
        if (pacote) formValues.pacoteNome = pacote.nome;
      }

      try {
        await db.collection("agendamentos").add(formValues);
        Swal.fire('Salvo!', 'Agendamento criado com sucesso', 'success');
        carregarAgendamentos();
      } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível salvar o agendamento', 'error');
      }
    }
  }

  // ----------------------------
  // EXCLUIR AGENDAMENTO
  // ----------------------------
  async function excluirAgendamento(id) {
    const result = await Swal.fire({
      title: 'Confirmar exclusão',
      text: "Deseja realmente cancelar este agendamento?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        await db.collection("agendamentos").doc(id).delete();
        Swal.fire('Cancelado!', 'Agendamento removido.', 'success');
        carregarAgendamentos();
      } catch (err) {
        console.error(err);
        Swal.fire('Erro', 'Não foi possível excluir o agendamento', 'error');
      }
    }
  }

  // ----------------------------
  // EVENTOS
  // ----------------------------
  if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);
  if (btnNovo) btnNovo.addEventListener("click", novoAgendamento);

  document.addEventListener('change', e => {
    if (e.target && e.target.id === 'swal-pacote') {
      const selected = e.target.selectedOptions[0];
      const valorInput = document.getElementById('swal-valor');
      if (selected && valorInput) {
        valorInput.value = parseFloat(selected.dataset.valor || 0).toFixed(2);
      }
    }
  });

  // ----------------------------
  // CARREGAR INICIAL
  // ----------------------------
  carregarAgendamentos();

  // ----------------------------
  // AUTENTICAÇÃO
  // ----------------------------
  auth.onAuthStateChanged(user => {
    const el = document.getElementById('user-name');
    if (el) el.textContent = user ? (user.displayName || user.email) : 'Usuário';
  });
});
