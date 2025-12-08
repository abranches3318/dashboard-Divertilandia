// ============================
// DASHBOARD.JS
// ============================

// Firebase compat
window.db = firebase.firestore();
window.auth = firebase.auth();

// Estado global
window.dashboardState = {
  agendamentos: [],
  calendario: null
};

// ============================
// FUNÇÃO PARA ABRIR AGENDAMENTO
// ============================
window.abrirAgendamento = async function(id) {
  const ag = window.dashboardState.agendamentos.find(a => a.id === id);
  if (!ag) {
    Swal.fire('Erro', 'Agendamento não encontrado', 'error');
    return;
  }
  Swal.fire({
    title: `Agendamento: ${ag.cliente || ''}`,
    html: `
      <p><strong>Data:</strong> ${ag.data?.toDate ? ag.data.toDate().toLocaleString() : ag.data}</p>
      <p><strong>Telefone:</strong> ${ag.telefone || ''}</p>
      <p><strong>Status:</strong> ${ag.status || ''}</p>
      <p><strong>Valor:</strong> R$ ${Number(ag.valor||0).toFixed(2)}</p>
    `
  });
};

// ============================
// CARREGAR AGENDAMENTOS
// ============================
async function carregarAgendamentos() {
  try {
    const snap = await window.db.collection('agendamentos').orderBy('data','asc').get();
    const agendamentos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.dashboardState.agendamentos = agendamentos;
    renderTabela(agendamentos);
    renderCalendar(agendamentos);
    atualizarCards(agendamentos);
  } catch(err) {
    console.error("Erro ao carregar agendamentos:", err);
  }
}

// ============================
// RENDERIZAR TABELA
// ============================
function renderTabela(agendamentos) {
  const tbody = document.getElementById('listaAgendamentos');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (agendamentos.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center">Nenhum agendamento encontrado</td></tr>`;
    return;
  }

  agendamentos.forEach(a => {
    const data = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${data.toLocaleDateString()}</td>
      <td>${a.cliente || ''}</td>
      <td>${a.telefone || ''}</td>
      <td>${a.status || ''}</td>
      <td>R$ ${Number(a.valor||0).toFixed(2)}</td>
      <td><button class="btn-secundario btn-ver" data-id="${a.id}">Ver</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-ver').forEach(btn => {
    btn.addEventListener('click', ()=>window.abrirAgendamento(btn.dataset.id));
  });
}

// ============================
// FILTRAR AGENDAMENTOS
// ============================
function aplicarFiltros() {
  let ag = [...window.dashboardState.agendamentos];

  const fd = document.getElementById('filtroData')?.value;
  const fc = document.getElementById('filtroCliente')?.value.toLowerCase();
  const ft = document.getElementById('filtroTelefone')?.value.replace(/\D/g,'');
  const fs = document.getElementById('filtroStatus')?.value;

  if (fd) {
    const dataFiltro = new Date(fd);
    ag = ag.filter(a=>{
      const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
      return d.toDateString() === dataFiltro.toDateString();
    });
  }
  if (fc) ag = ag.filter(a=>(a.cliente||'').toLowerCase().includes(fc));
  if (ft) ag = ag.filter(a=>(a.telefone||'').replace(/\D/g,'').includes(ft));
  if (fs) ag = ag.filter(a=>(a.status||'') === fs);

  renderTabela(ag);
  renderCalendar(ag);
}

// ============================
// BOTÃO NOVO AGENDAMENTO
// ============================
function novoAgendamento() {
  Swal.fire({
    title: 'Novo Agendamento',
    html: `
      <input id="swal-cliente" class="swal2-input" placeholder="Nome do cliente">
      <input id="swal-telefone" class="swal2-input" placeholder="Telefone">
      <input id="swal-data" type="datetime-local" class="swal2-input">
      <input id="swal-valor" type="number" class="swal2-input" placeholder="Valor">
      <select id="swal-status" class="swal2-input">
        <option value="pendente">Pendente</option>
        <option value="confirmado">Confirmado</option>
        <option value="concluido">Concluído</option>
        <option value="cancelado">Cancelado</option>
      </select>
    `,
    preConfirm: ()=>{
      return {
        cliente: document.getElementById('swal-cliente').value,
        telefone: document.getElementById('swal-telefone').value,
        data: new Date(document.getElementById('swal-data').value),
        valor: Number(document.getElementById('swal-valor').value||0),
        status: document.getElementById('swal-status').value
      };
    },
    showCancelButton: true
  }).then(async result=>{
    if (result.isConfirmed) {
      try {
        const docRef = await window.db.collection('agendamentos').add(result.value);
        result.value.id = docRef.id;
        window.dashboardState.agendamentos.push(result.value);
        aplicarFiltros();
        Swal.fire('Sucesso','Agendamento criado!','success');
      } catch(err){
        console.error(err);
        Swal.fire('Erro','Não foi possível criar agendamento','error');
      }
    }
  });
}

// ============================
// ATUALIZAR CARDS
// ============================
function atualizarCards(agendamentos) {
  const hoje = new Date().toDateString();
  document.getElementById('ag-hoje').textContent = agendamentos.filter(a=>{
    const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    return d.toDateString() === hoje;
  }).length;

  const mesAtual = new Date().getMonth();
  const receita = agendamentos.reduce((acc,a)=>{
    const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    if(d.getMonth()===mesAtual) return acc + Number(a.valor||0);
    return acc;
  },0);
  document.getElementById('receita-mes').textContent = `R$ ${receita.toFixed(2)}`;

  const tarefasPend = agendamentos.filter(a=>a.status==='pendente').length;
  document.getElementById('tarefas-pendentes').textContent = tarefasPend;
}

// ============================
// CALENDÁRIO
// ============================
function renderCalendar(agendamentos) {
  const el = document.getElementById('calendar');
  if (!el) return;

  const eventos = agendamentos.map(a=>{
    const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
    return { id:a.id, title:a.cliente||'Sem nome', start:d, allDay:true };
  });

  if (window.dashboardState.calendario) window.dashboardState.calendario.destroy();

  const calendar = new FullCalendar.Calendar(el,{
    initialView: 'dayGridMonth',
    locale:'pt-br',
    headerToolbar:false, // sem today/month/week/day
    events:eventos,
    eventClick: info=>window.abrirAgendamento(info.event.id),
    height:'auto'
  });
  calendar.render();
  window.dashboardState.calendario = calendar;
}

// ============================
// EVENTOS
// ============================
document.getElementById('btnFiltrarAgendamentos')?.addEventListener('click', aplicarFiltros);
document.getElementById('btnNovoAgendamento')?.addEventListener('click', novoAgendamento);

// ============================
// INICIALIZAÇÃO
// ============================
window.addEventListener('DOMContentLoaded', carregarAgendamentos);
