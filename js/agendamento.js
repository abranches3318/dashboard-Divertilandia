// js/agendamentos.js
// módulo de agendamentos — funciona tanto na seção embutida quanto em página separada

// garantir db/auth
window.db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
window.auth = window.auth || (firebase && firebase.auth ? firebase.auth() : null);

// referência a elementos (podem não existir se página for separada)
const listaAgendamentosEl = document.getElementById('listaAgendamentos');
const btnFiltrar = document.getElementById('btnFiltrarAgendamentos');
const btnNovo = document.getElementById('btnNovoAgendamento');
const filtroData = document.getElementById('filtroData');
const filtroCliente = document.getElementById('filtroCliente');
const filtroTelefone = document.getElementById('filtroTelefone');
const filtroStatus = document.getElementById('filtroStatus');

// cache global
window.agendamentosState = window.agendamentosState || { todos: [] };

// carregar todos
async function carregarAgendamentos() {
  if (!window.db) return;
  try {
    const snap = await window.db.collection('agendamentos').orderBy('data','asc').get();
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.agendamentosState.todos = lista;
    renderizarTabela(lista);
  } catch (err) {
    console.error('Erro ao carregar agendamentos:', err);
  }
}

// renderizar tabela
function renderizarTabela(lista) {
  if (!listaAgendamentosEl) return;
  listaAgendamentosEl.innerHTML = '';
  if (!lista || lista.length === 0) {
    listaAgendamentosEl.innerHTML = `<tr><td colspan="6" style="text-align:center">Nenhum agendamento encontrado</td></tr>`;
    return;
  }

  lista.forEach(a => {
    // formatar data
    let dataText = '';
    if (a.data?.toDate) dataText = a.data.toDate().toLocaleDateString();
    else if (a.data) dataText = (new Date(a.data)).toLocaleDateString();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dataText} ${a.horario||''}</td>
      <td>${a.cliente || ''}</td>
      <td>${a.telefone || ''}</td>
      <td class="status-${a.status || ''}">${a.status || ''}</td>
      <td>R$ ${Number(a.valor_final || a.valor || 0).toFixed(2)}</td>
      <td>
        <button class="btn btn-secundario btn-ver" data-id="${a.id}">Ver</button>
        <button class="btn btn-dark btn-edit" data-id="${a.id}">Editar</button>
        <button class="btn btn-danger btn-cancel" data-id="${a.id}">Cancelar</button>
      </td>
    `;
    listaAgendamentosEl.appendChild(tr);
  });

  // bind buttons
  listaAgendamentosEl.querySelectorAll('.btn-ver').forEach(b => b.addEventListener('click', e => {
    const id = e.currentTarget.getAttribute('data-id');
    if (id) abrirAgendamento(id);
  }));
  listaAgendamentosEl.querySelectorAll('.btn-edit').forEach(b => b.addEventListener('click', async e => {
    const id = e.currentTarget.getAttribute('data-id');
    if (id) abrirModalEditar(id);
  }));
  listaAgendamentosEl.querySelectorAll('.btn-cancel').forEach(b => b.addEventListener('click', async e => {
    const id = e.currentTarget.getAttribute('data-id');
    if (id) cancelarAgendamento(id);
  }));
}

// aplicar filtros
function aplicarFiltros() {
  let lista = [...(window.agendamentosState.todos || [])];
  if (filtroData?.value) {
    const f = new Date(filtroData.value).toDateString();
    lista = lista.filter(a => {
      const d = a.data?.toDate ? a.data.toDate().toDateString() : (a.data ? new Date(a.data).toDateString() : '');
      return d === f;
    });
  }
  if (filtroCliente?.value) {
    const q = filtroCliente.value.toLowerCase();
    lista = lista.filter(a => (a.cliente || '').toLowerCase().includes(q));
  }
  if (filtroTelefone?.value) {
    const q = filtroTelefone.value.replace(/\D/g,'');
    lista = lista.filter(a => (a.telefone || '').replace(/\D/g,'').includes(q));
  }
  if (filtroStatus?.value) {
    lista = lista.filter(a => (a.status || '') === filtroStatus.value);
  }
  renderizarTabela(lista);
}

// abrir criação via modal (disponível para calendar.dateClick)
async function abrirModalNovoAgendamento(dataInicial = null) {
  // carregar pacotes itens (se existir)
  let pacotes = [];
  try {
    const snap = await window.db.collection('pacotes').get();
    pacotes = snap.docs.map(d => ({ id: d.id, ...(d.data()||{}) }));
  } catch(e){ /* ignore */ }

  const pacOptions = pacotes.map(p => `<option value="${p.id}" data-valor="${p.valor||0}">${p.nome || p.titulo} - R$ ${Number(p.valor||0).toFixed(2)}</option>`).join('');

  const { value: formValues } = await Swal.fire({
    title: 'Novo Agendamento',
    html:
      `<input id="swal-cliente" class="swal2-input" placeholder="Cliente">
       <input id="swal-telefone" class="swal2-input" placeholder="Telefone">
       <input id="swal-endereco" class="swal2-input" placeholder="Endereço">
       <select id="swal-pacote" class="swal2-select">
         <option value="">Selecione Pacote / Item</option>
         ${pacOptions}
       </select>
       <input id="swal-valor" class="swal2-input" placeholder="Valor" readonly>
       <input type="date" id="swal-data" class="swal2-input" value="${dataInicial ? dataInicial.toISOString().slice(0,10) : ''}">
       <input type="time" id="swal-horario" class="swal2-input" placeholder="Horário">
       <input id="swal-pagamento" class="swal2-input" placeholder="Pagamento (entrada)">
       <textarea id="swal-observacao" class="swal2-textarea" placeholder="Observação"></textarea>`,
    focusConfirm: false,
    preConfirm: () => {
      return {
        cliente: document.getElementById('swal-cliente').value,
        telefone: document.getElementById('swal-telefone').value,
        endereco: document.getElementById('swal-endereco').value,
        pacoteId: document.getElementById('swal-pacote').value,
        valor_final: Number(document.getElementById('swal-valor').value || 0),
        data: document.getElementById('swal-data').value,
        horario: document.getElementById('swal-horario').value,
        pagamento_entrada: document.getElementById('swal-pagamento').value,
        observacao: document.getElementById('swal-observacao').value,
        status: 'pendente',
        criado_em: firebase.firestore.FieldValue.serverTimestamp()
      };
    },
    showCancelButton: true
  });

  if (!formValues) return;

  // validações mínimas
  if (!formValues.cliente || !formValues.data || !formValues.horario) {
    Swal.fire('Atenção', 'Preencha Cliente, Data e Horário', 'warning');
    return;
  }

  try {
    // salvar: data como string ISO YYYY-MM-DD (consistente com consultas)
    const payload = {
      ...formValues,
      data: formValues.data, // manter string YYYY-MM-DD
      receita_recebida: Number(formValues.pagamento_entrada || 0)
    };
    await window.db.collection('agendamentos').add(payload);
    Swal.fire('OK', 'Agendamento criado.', 'success');
    carregarAgendamentos();
    // atualizar calendário (se dashboardState existir)
    if (window.dashboardState && typeof window.renderCalendar === 'function') {
      window.dashboardState.agendamentosCache = window.agendamentosState.todos;
      window.renderCalendar(window.agendamentosState.todos);
    }
  } catch (e) {
    console.error(e);
    Swal.fire('Erro', 'Falha ao salvar agendamento', 'error');
  }
}

// abrir edição
async function abrirModalEditar(id) {
  try {
    const doc = await window.db.collection('agendamentos').doc(id).get();
    if (!doc.exists) { Swal.fire('Erro','Agendamento não encontrado','error'); return; }
    const a = doc.data();

    const { value } = await Swal.fire({
      title: 'Editar Agendamento',
      html:
        `<input id="ed-cliente" class="swal2-input" value="${a.cliente||''}">
         <input id="ed-telefone" class="swal2-input" value="${a.telefone||''}">
         <input id="ed-endereco" class="swal2-input" value="${a.endereco||''}">
         <input type="date" id="ed-data" class="swal2-input" value="${a.data || (a.data?.toDate ? a.data.toDate().toISOString().slice(0,10) : '')}">
         <input id="ed-horario" class="swal2-input" value="${a.horario||''}">
         <input id="ed-valor" class="swal2-input" value="${Number(a.valor_final||a.valor||0).toFixed(2)}">
         <textarea id="ed-observacao" class="swal2-textarea">${a.observacao||''}</textarea>`,
      showCancelButton: true,
      preConfirm: () => ({
        cliente: document.getElementById('ed-cliente').value,
        telefone: document.getElementById('ed-telefone').value,
        endereco: document.getElementById('ed-endereco').value,
        data: document.getElementById('ed-data').value,
        horario: document.getElementById('ed-horario').value,
        valor_final: Number(document.getElementById('ed-valor').value||0),
        observacao: document.getElementById('ed-observacao').value
      })
    });

    if (!value) return;

    await window.db.collection('agendamentos').doc(id).update({
      cliente: value.cliente,
      telefone: value.telefone,
      endereco: value.endereco,
      data: value.data,
      horario: value.horario,
      valor_final: value.valor_final,
      observacao: value.observacao
    });

    Swal.fire('OK','Atualizado','success');
    carregarAgendamentos();
    if (window.dashboardState && typeof window.renderCalendar === 'function') {
      window.renderCalendar(window.agendamentosState.todos);
    }
  } catch (e) {
    console.error(e);
    Swal.fire('Erro','Falha ao editar','error');
  }
}

// cancelar agendamento (status = cancelado)
async function cancelarAgendamento(id) {
  const res = await Swal.fire({ title:'Cancelar agendamento?', showCancelButton:true, confirmButtonText:'Sim', icon:'warning' });
  if (!res.isConfirmed) return;
  try {
    await window.db.collection('agendamentos').doc(id).update({ status: 'cancelado' });
    Swal.fire('OK','Agendamento cancelado','success');
    carregarAgendamentos();
    if (window.dashboardState && typeof window.renderCalendar === 'function') {
      window.renderCalendar(window.agendamentosState.todos);
    }
  } catch (e) {
    console.error(e);
    Swal.fire('Erro','Falha ao cancelar','error');
  }
}

// abrir detalhes (pode ser chamado pelo calendário)
window.abrirAgendamento = window.abrirAgendamento || async function (id) {
  try {
    const doc = await window.db.collection('agendamentos').doc(id).get();
    if (!doc.exists) { Swal.fire('Erro','Agendamento não encontrado','error'); return; }
    const a = doc.data();
    const dataText = a.data?.toDate ? a.data.toDate().toLocaleDateString() : (a.data ? new Date(a.data).toLocaleDateString() : '');
    Swal.fire({
      title: `Agendamento: ${a.cliente || ''}`,
      html: `
        <p><strong>Data:</strong> ${dataText} ${a.horario || ''}</p>
        <p><strong>Telefone:</strong> ${a.telefone || ''}</p>
        <p><strong>Endereço:</strong> ${a.endereco || ''}</p>
        <p><strong>Valor:</strong> R$ ${Number(a.valor_final || a.valor || 0).toFixed(2)}</p>
        <p><strong>Status:</strong> ${a.status || ''}</p>
        <p><strong>Observação:</strong> ${a.observacao || ''}</p>
      `,
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Editar',
      denyButtonText: 'Concluir',
      preDeny: async () => {
        // marcar como concluído
        await window.db.collection('agendamentos').doc(id).update({ status: 'concluido' });
        Swal.fire('OK','Agendamento concluído','success');
        carregarAgendamentos();
        if (window.dashboardState && typeof window.renderCalendar === 'function') window.renderCalendar(window.agendamentosState.todos);
      }
    }).then(result => {
      if (result.isConfirmed) abrirModalEditar(id);
    });

  } catch (e) {
    console.error(e);
    Swal.fire('Erro','Falha ao abrir agendamento','error');
  }
};

// hooks: botões (se existirem)
if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltros);
if (btnNovo) btnNovo.addEventListener('click', () => abrirModalNovoAgendamento());

// inicializa quando DOM pronto
document.addEventListener('DOMContentLoaded', () => {
  // se a seção existe, carregar
  if (document.getElementById('pagina-agendamentos')) {
    carregarAgendamentos();
  }
});

// tornar funções públicas para dashboard.js/calendar.js
window.carregarAgendamentos = carregarAgendamentos;
window.aplicarFiltros = aplicarFiltros;
window.abrirModalNovoAgendamento = abrirModalNovoAgendamento;
