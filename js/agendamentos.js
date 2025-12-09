// js/agendamentos.js
// Versão completa — gerencia listagem, filtro, criação/edição (modal), integração com Firestore
// Compatível com /pages/agendamentos.html (estrutura de elementos já definida)

// Base path (ajuste se seu repositório estiver em outro subpath)
const BASE = '/dashboard-Divertilandia/';

// ==== DEPENDÊNCIAS FIREBASE (compat) - usar window.db / window.auth se já existentes ====
const db = window.db || (window.db = (firebase && firebase.firestore ? firebase.firestore() : null));
const auth = window.auth || (window.auth = (firebase && firebase.auth ? firebase.auth() : null));

if (!db) {
  console.error('agendamentos.js: Firestore (db) não encontrado. Verifique firebase-config.js.');
}
if (!auth) {
  console.warn('agendamentos.js: Auth não encontrado — algumas funcionalidades podem depender de login.');
}

// ==== ELEMENTOS (DOM) ====
const painelTabela = document.getElementById('painelTabela');
const listaEl = document.getElementById('listaAgendamentos');

const btnFiltrar = document.getElementById('btnFiltrar');
const btnNovoAg = document.getElementById('btnNovoAg');

const filtroData = document.getElementById('filtroData');
const filtroCliente = document.getElementById('filtroCliente');
const filtroTelefone = document.getElementById('filtroTelefone');
const filtroStatus = document.getElementById('filtroStatus');

const modal = document.getElementById('modalAgendamento');
const modalTitulo = document.getElementById('modalTitulo');

const inputId = document.getElementById('ag-id');
const inputCliente = document.getElementById('ag-cliente');
const inputTelefone = document.getElementById('ag-telefone');
const inputData = document.getElementById('ag-data');
const inputHoraInicio = document.getElementById('ag-hora-inicio');
const inputHoraFim = document.getElementById('ag-hora-fim');
const selectItem = document.getElementById('ag-item');
const inputPreco = document.getElementById('ag-preco');
const inputDesconto = document.getElementById('ag-desconto');
const inputEntrada = document.getElementById('ag-entrada');
const inputValorFinal = document.getElementById('ag-valor-final');
const containerMonitores = document.getElementById('ag-monitores');

const btnCancelar = document.getElementById('btnCancelar');
const btnSalvarAg = document.getElementById('btnSalvarAg');

// ==== ESTADO LOCAL ====
window.agendamentosState = window.agendamentosState || {
  todos: [],       // array de agendamentos carregados do Firestore
  pacotes: [],     // pacotes / itens (para select)
  monitores: []    // lista de monitores (para checkboxes)
};

// ==== UTILITÁRIOS ====
function toYMD(d) {
  // recebe Date -> 'YYYY-MM-DD'
  if (!d) return null;
  const dt = (d.toDate ? d.toDate() : d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateField(field) {
  // aceita Timestamp, Date, string 'YYYY-MM-DD', retorna Date
  if (!field) return null;
  if (field.toDate) return field.toDate();
  if (typeof field === 'string') {
    // try YYYY-MM-DD or ISO
    const iso = field.length === 10 ? field + 'T00:00:00' : field;
    return new Date(iso);
  }
  if (field instanceof Date) return field;
  return new Date(field);
}

function formatMoney(v) {
  if (isNaN(v) || v === null) return 'R$ 0,00';
  return 'R$ ' + Number(v).toFixed(2).replace('.', ',');
}

function safeGet(obj, path, def = '') {
  try {
    return path.split('.').reduce((s, k) => (s && s[k] != null) ? s[k] : def, obj);
  } catch {
    return def;
  }
}

// calcular hora fim automático (+4 horas)
function calcularHoraFim(horaInicio) {
  if (!horaInicio) return '';
  // horaInicio: "HH:MM"
  const [hh, mm] = horaInicio.split(':').map(n => parseInt(n, 10));
  if (isNaN(hh)) return '';
  const date = new Date();
  date.setHours(hh, mm || 0, 0, 0);
  date.setHours(date.getHours() + 4);
  const h2 = String(date.getHours()).padStart(2, '0');
  const m2 = String(date.getMinutes()).padStart(2, '0');
  return `${h2}:${m2}`;
}

// ======= RENDERIZAÇÃO DA TABELA =======
function renderTabela(agendamentos) {
  if (!listaEl) return;
  listaEl.innerHTML = '';

  if (!agendamentos || agendamentos.length === 0) {
    // esconder painel quando não houver nada
    if (painelTabela) painelTabela.style.display = 'none';
    return;
  }

  // mostrar painel
  if (painelTabela) painelTabela.style.display = 'block';

  agendamentos.forEach(a => {
    // normalizar data/hora
    const dt = parseDateField(a.data);
    const dataStr = dt ? dt.toLocaleDateString() : (a.data || '');
    const hora = a.horario || a.hora_inicio || a.hora || (a.hora_inicio_text || '');
    const cliente = a.cliente || a.cliente_nome || a.nome || '---';
    const telefone = a.telefone || a.tel || '---';
    const status = a.status || 'pendente';
    const valor = Number(a.valor_final ?? a.valor ?? a.valor_entrada ?? a.valor || 0);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${dataStr}${hora ? ' ' + hora : ''}</td>
      <td>${cliente}</td>
      <td>${telefone}</td>
      <td>${status}</td>
      <td>${isNaN(valor) ? 'R$ 0,00' : 'R$ ' + Number(valor).toFixed(2)}</td>
      <td>
        <button class="btn btn-dark btn-editar" data-id="${a.id}">Editar</button>
        <button class="btn btn-danger btn-excluir" data-id="${a.id}">Cancelar</button>
      </td>
    `;
    listaEl.appendChild(tr);
  });

  // ligar eventos dos botões
  listaEl.querySelectorAll('.btn-editar').forEach(b => {
    b.removeEventListener('click', onEditarClick);
    b.addEventListener('click', onEditarClick);
  });
  listaEl.querySelectorAll('.btn-excluir').forEach(b => {
    b.removeEventListener('click', onExcluirClick);
    b.addEventListener('click', onExcluirClick);
  });
}

// botão editar
function onEditarClick(e) {
  const id = e.currentTarget.getAttribute('data-id');
  if (!id) return;
  abrirModalEditar(id);
}

// botão excluir
async function onExcluirClick(e) {
  const id = e.currentTarget.getAttribute('data-id');
  if (!id) return;
  const res = await Swal.fire({
    title: 'Cancelar agendamento?',
    text: 'Essa ação marcará o agendamento como cancelado (não será removido).',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sim, cancelar'
  });
  if (!res.isConfirmed) return;
  try {
    await db.collection('agendamentos').doc(id).update({ status: 'cancelado' });
    Swal.fire('OK', 'Agendamento cancelado.', 'success');
    await carregarAgendamentos(); // recarregar
  } catch (err) {
    console.error(err);
    Swal.fire('Erro', 'Não foi possível cancelar.', 'error');
  }
}

// ======= CARREGAR DADOS AUXILIARES (pacotes, monitores) =======
async function carregarPacotes() {
  try {
    const snap = await db.collection('pacotes').get();
    const pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.agendamentosState.pacotes = pacotes;

    // popular select
    if (selectItem) {
      selectItem.innerHTML = `<option value="">Selecione...</option>`;
      pacotes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.nome || p.title || p.id} - R$ ${Number(p.valor || 0).toFixed(2)}`;
        opt.dataset.valor = Number(p.valor || 0);
        selectItem.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Erro ao carregar pacotes:', err);
  }
}

async function carregarMonitores() {
  try {
    const snap = await db.collection('monitores').get();
    const monitores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.agendamentosState.monitores = monitores;

    // popular checkboxes
    if (containerMonitores) {
      containerMonitores.innerHTML = '';
      monitores.forEach(m => {
        const id = m.id;
        const label = m.nome || m.name || id;
        const wrapper = document.createElement('label');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '8px';
        wrapper.innerHTML = `
          <input type="checkbox" class="chk-monitor" value="${id}">
          <span>${label}</span>
        `;
        containerMonitores.appendChild(wrapper);
      });
    }
  } catch (err) {
    console.error('Erro ao carregar monitores:', err);
  }
}

// ======= CARREGAR AGENDAMENTOS (LIST) =======
async function carregarAgendamentos() {
  if (!db) return;
  try {
    // busca todos (ordenar por data + inicio)
    const snap = await db.collection('agendamentos').orderBy('data', 'asc').orderBy('horario', 'asc').get();
    const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    window.agendamentosState.todos = lista;
    renderTabela(lista);
  } catch (err) {
    console.error('Erro ao carregar agendamentos:', err);
    Swal.fire('Erro', 'Não foi possível carregar agendamentos.', 'error');
  }
}

// ======= FILTRAR =======
function aplicarFiltros() {
  let lista = [...(window.agendamentosState.todos || [])];

  if (filtroData?.value) {
    lista = lista.filter(a => {
      const d = parseDateField(a.data);
      const ymd = toYMD(d);
      return ymd === filtroData.value;
    });
  }

  if (filtroCliente?.value) {
    const q = filtroCliente.value.toLowerCase();
    lista = lista.filter(a => (a.cliente || a.cliente_nome || '').toLowerCase().includes(q));
  }

  if (filtroTelefone?.value) {
    const q = filtroTelefone.value.replace(/\D/g,'');
    lista = lista.filter(a => ((a.telefone || '') + '').replace(/\D/g,'').includes(q));
  }

  if (filtroStatus?.value) {
    lista = lista.filter(a => (a.status || '') === filtroStatus.value);
  }

  renderTabela(lista);
}

// ======= MODAL: ABRIR/FECHAR, CRIAR/EDITAR =======
function abrirModalNovo(dataInicial = null) {
  modalTitulo.textContent = 'Novo Agendamento';
  inputId.value = '';
  inputCliente.value = '';
  inputTelefone.value = '';
  inputData.value = dataInicial ? (dataInicial.toISOString().slice(0,10)) : '';
  inputHoraInicio.value = '';
  inputHoraFim.value = '';
  selectItem.value = '';
  inputPreco.value = '';
  inputDesconto.value = '';
  inputEntrada.value = '';
  inputValorFinal.value = '';
  // limpar checkboxes
  containerMonitores.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

  modal.classList.add('active');
}

async function abrirModalEditar(id) {
  modalTitulo.textContent = 'Editar Agendamento';
  try {
    const doc = await db.collection('agendamentos').doc(id).get();
    if (!doc.exists) {
      Swal.fire('Erro', 'Agendamento não encontrado', 'error');
      return;
    }
    const a = { id: doc.id, ...doc.data() };

    inputId.value = a.id || '';
    inputCliente.value = a.cliente || a.cliente_nome || '';
    inputTelefone.value = a.telefone || a.tel || '';
    inputData.value = toYMD(parseDateField(a.data)) || '';
    inputHoraInicio.value = a.horario || a.hora_inicio || '';
    inputHoraFim.value = a.hora_fim || a.hora_fim_text || '';
    // selecionar pacote/item no select (se tiver pacoteId)
    if (a.pacoteId) {
      selectItem.value = a.pacoteId;
      // carregar preco do pacote se existir no cache
      const p = window.agendamentosState.pacotes.find(x => x.id === a.pacoteId);
      if (p) inputPreco.value = Number(p.valor || 0);
    } else {
      selectItem.value = '';
      inputPreco.value = Number(a.preco || a.valor || 0);
    }
    inputDesconto.value = Number(a.desconto || 0);
    inputEntrada.value = Number(a.entrada || a.valor_entrada || 0);
    inputValorFinal.value = Number(a.valor_final || a.valor || 0);

    // marcar monitores
    const selMonitores = Array.isArray(a.monitores) ? a.monitores : (a.monitores ? [a.monitores] : []);
    containerMonitores.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.checked = selMonitores.includes(cb.value);
    });

    modal.classList.add('active');
  } catch (err) {
    console.error(err);
    Swal.fire('Erro', 'Não foi possível abrir o agendamento para edição.', 'error');
  }
}

function fecharModal() {
  modal.classList.remove('active');
}

// ======= SALVAR AGENDAMENTO =======
async function salvarAgendamento() {
  // coletar valores
  const id = inputId.value || null;
  const cliente = inputCliente.value.trim();
  const telefone = inputTelefone.value.trim();
  const dataVal = inputData.value;
  const horaInicio = inputHoraInicio.value;
  const horaFim = inputHoraFim.value;
  const pacoteId = selectItem.value || null;
  const preco = Number(inputPreco.value || 0);
  const desconto = Number(inputDesconto.value || 0);
  const entrada = Number(inputEntrada.value || 0);
  const valorFinal = Number(inputValorFinal.value || (preco - desconto));
  const monitores = Array.from(containerMonitores.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);

  // validações mínimas
  if (!cliente) { Swal.fire('Atenção', 'Preencha o nome do cliente.', 'warning'); return; }
  if (!dataVal) { Swal.fire('Atenção', 'Escolha a data do evento.', 'warning'); return; }
  if (!horaInicio) { Swal.fire('Atenção', 'Informe o horário de início.', 'warning'); return; }

  // preparar objeto
  const dados = {
    cliente,
    telefone,
    data: dataVal, // armazenar como 'YYYY-MM-DD' string para compatibilidade com queries simples
    horario: horaInicio,
    hora_fim: horaFim || calcularHoraFim(horaInicio),
    pacoteId: pacoteId || null,
    preco: preco,
    desconto: desconto,
    entrada: entrada,
    valor_final: valorFinal,
    monitores: monitores,
    atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
  };

  // definir status conforme entrada
  dados.status = (entrada && entrada > 0) ? 'confirmado' : 'pendente';
  if (!id) {
    dados.criado_em = firebase.firestore.FieldValue.serverTimestamp();
  }

  try {
    if (id) {
      await db.collection('agendamentos').doc(id).set(dados, { merge: true });
      Swal.fire('OK', 'Agendamento atualizado.', 'success');
    } else {
      await db.collection('agendamentos').add(dados);
      Swal.fire('OK', 'Agendamento criado.', 'success');
    }
    fecharModal();
    await carregarAgendamentos();
  } catch (err) {
    console.error(err);
    Swal.fire('Erro', 'Não foi possível salvar o agendamento.', 'error');
  }
}

// ======= EVENTOS UI =======

// abrir novo agendamento (botão)
if (btnNovoAg) {
  btnNovoAg.addEventListener('click', () => {
    // se veio via query param ?date=YYYY-MM-DD já presente, preenche
    const urlDate = (new URLSearchParams(window.location.search)).get('date');
    const dateObj = urlDate ? new Date(urlDate + 'T00:00:00') : null;
    abrirModalNovo(dateObj);
  });
}

// cancelar modal
if (btnCancelar) btnCancelar.addEventListener('click', fecharModal);

// salvar modal
if (btnSalvarAg) btnSalvarAg.addEventListener('click', salvarAgendamento);

// filtro
if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltros);

// auto preencher hora fim quando hora inicio perde o foco / muda
if (inputHoraInicio) {
  inputHoraInicio.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val && inputHoraFim) {
      inputHoraFim.value = calcularHoraFim(val);
    }
  });
  // também preencher ao perder foco
  inputHoraInicio.addEventListener('blur', (e) => {
    const val = e.target.value;
    if (val && inputHoraFim && !inputHoraFim.value) {
      inputHoraFim.value = calcularHoraFim(val);
    }
  });
}

// quando selecionar pacote/item preencher preço automaticamente
if (selectItem) {
  selectItem.addEventListener('change', (e) => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.dataset && opt.dataset.valor) {
      inputPreco.value = Number(opt.dataset.valor || 0).toFixed(2);
      // recalcular valor final se desconto vazio
      const desconto = Number(inputDesconto.value || 0);
      inputValorFinal.value = Number((Number(opt.dataset.valor || 0) - desconto)).toFixed(2);
    } else {
      inputPreco.value = '';
    }
  });
}

// recalcular valor final se desconto ou preco alterar
[inputPreco, inputDesconto].forEach(el => {
  if (!el) return;
  el.addEventListener('input', () => {
    const preco = Number(inputPreco.value || 0);
    const desconto = Number(inputDesconto.value || 0);
    const final = preco - desconto;
    inputValorFinal.value = isNaN(final) ? '' : Number(final).toFixed(2);
  });
});

// ======= API EXPOSIÇÃO PARA CALENDÁRIO (abrir página agendamentos p/ data) =======
window.openAgendamentosByDate = function(dateISO) {
  // abre a página de agendamentos passando ?date=YYYY-MM-DD
  window.location.href = `${BASE}pages/agendamentos.html?date=${dateISO}`;
};

// ======= INICIALIZAÇÃO: carrega pacotes, monitores e agendamentos =======
async function initModule() {
  try {
    await carregarPacotes();
    await carregarMonitores();
    await carregarAgendamentos();

    // se a página recebeu ?date=YYYY-MM-DD, preencher filtro e aplicar
    const q = new URLSearchParams(window.location.search);
    const dateParam = q.get('date');
    if (dateParam && filtroData) {
      filtroData.value = dateParam;
      aplicarFiltros();
    }
  } catch (err) {
    console.error('Erro init agendamentos:', err);
  }
}

// auto-run on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initModule);

// ==== evitar conflitos globais e exportar poucas funções úteis ====
window.agendamentosModule = window.agendamentosModule || {};
window.agendamentosModule.reload = carregarAgendamentos;
window.agendamentosModule.openModalNew = abrirModalNovo;
window.agendamentosModule.openModalEdit = abrirModalEditar;
