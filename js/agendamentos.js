// js/agendamentos.js
// Versão: com verificação de conflito A, máscara telefone B, formatação/validação de valores C
// Compatível com /pages/agendamentos.html (IDs esperados no HTML)

(() => {
  'use strict';

  // Ajuste caso seu site esteja em subpath diferente
  const MODULE_BASE = '/dashboard-Divertilandia/';

  // FIREBASE compat (espera window.db / window.auth, fallback para firebase compat)
  const db = window.db || (window.db = (window.firebase && window.firebase.firestore ? window.firebase.firestore() : (typeof firebase !== 'undefined' ? firebase.firestore() : null)));
  const auth = window.auth || (window.auth = (window.firebase && window.firebase.auth ? window.firebase.auth() : (typeof firebase !== 'undefined' ? firebase.auth() : null)));

  if (!db) console.error('agendamentos.js: Firestore (db) não encontrado. Verifique firebase-config.js.');
  if (!auth) console.warn('agendamentos.js: Auth não encontrado — algumas funcionalidades podem depender de login.');

  // DOM elements (IDs conforme agendamentos.html)
  const painelTabela = document.getElementById('painelTabela');
  const listaEl = document.getElementById('listaAgendamentos');
  const btnFiltrar = document.getElementById('btnFiltrar');
  const btnNovoAg = document.getElementById('btnNovoAg');

  const filtroData = document.getElementById('filtroData');
  const filtroCliente = document.getElementById('filtroCliente');
  const filtroTelefone = document.getElementById('filtroTelefone');
  const filtroStatus = document.getElementById('filtroStatus');

  // Modal fields
  const modalEl = document.getElementById('modalAgendamento');
  const modalTitulo = document.getElementById('modalTitulo');
  const bsModal = modalEl ? new bootstrap.Modal(modalEl, { backdrop: 'static' }) : null;

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

  // Estado local
  window.agendamentosState = window.agendamentosState || {
    todos: [],
    pacotes: [],
    monitores: []
  };

  // ---------- utilitários ----------
  function toYMD(d) {
    if (!d) return null;
    const dt = (d.toDate ? d.toDate() : d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDateField(field) {
    if (!field) return null;
    if (field.toDate) return field.toDate();
    if (typeof field === 'string') {
      // YYYY-MM-DD or ISO
      const iso = field.length === 10 ? (field + 'T00:00:00') : field;
      return new Date(iso);
    }
    if (field instanceof Date) return field;
    return new Date(field);
  }

  function parseTimeToMinutes(hhmm) {
    if (!hhmm) return null;
    const parts = ('' + hhmm).split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function formatCurrencyInputRawToNumber(text) {
    if (!text) return 0;
    // remove R$, dots, spaces, replace comma with dot
    const clean = text.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(clean);
    return isNaN(n) ? 0 : n;
  }

  function formatMoneyBR(n) {
    if (n == null || isNaN(n)) return 'R$ 0,00';
    return 'R$ ' + Number(n).toFixed(2).replace('.', ',');
  }

  // calcular hora fim automático (+4 horas)
  function calcularHoraFim(horaInicio) {
    if (!horaInicio) return '';
    const [hh, mm] = (horaInicio.split(':').map(s => parseInt(s, 10)));
    if (isNaN(hh)) return '';
    const date = new Date();
    date.setHours(hh, mm || 0, 0, 0);
    date.setHours(date.getHours() + 4);
    const h2 = String(date.getHours()).padStart(2, '0');
    const m2 = String(date.getMinutes()).padStart(2, '0');
    return `${h2}:${m2}`;
  }

  // máscara telefone (99) 99999-9999
  function maskPhone(value) {
    if (!value) return '';
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
  }

  // ---------- render tabela ----------
  function renderTabela(agendamentos) {
    if (!listaEl) return;
    listaEl.innerHTML = '';

    if (!agendamentos || agendamentos.length === 0) {
      if (painelTabela) painelTabela.style.display = 'none';
      return;
    }

    if (painelTabela) painelTabela.style.display = 'block';

    agendamentos.forEach(a => {
      const dt = parseDateField(a.data);
      const dataStr = dt ? dt.toLocaleDateString() : (a.data || '');
      const hora = a.horario || a.hora_inicio || '';
      const cliente = a.cliente || a.cliente_nome || a.nome || '---';
      const telefone = a.telefone || a.tel || '---';
      const status = a.status || 'pendente';
      const valor = Number(a.valor_final ?? a.valor ?? a.valor_entrada ?? a.preco ?? 0);

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${dataStr}${hora ? ' ' + hora : ''}</td>
        <td>${cliente}</td>
        <td>${telefone}</td>
        <td>${status}</td>
        <td>${isNaN(valor) ? 'R$ 0,00' : formatMoneyBR(valor)}</td>
        <td>
          <button class="btn btn-dark btn-sm btn-editar" data-id="${a.id}">Editar</button>
          <button class="btn btn-danger btn-sm btn-excluir" data-id="${a.id}">Cancelar</button>
        </td>
      `;
      listaEl.appendChild(tr);
    });

    // attach events
    listaEl.querySelectorAll('.btn-editar').forEach(b => {
      b.removeEventListener('click', onEditarClick);
      b.addEventListener('click', onEditarClick);
    });
    listaEl.querySelectorAll('.btn-excluir').forEach(b => {
      b.removeEventListener('click', onExcluirClick);
      b.addEventListener('click', onExcluirClick);
    });
  }

  function onEditarClick(e) {
    const id = e.currentTarget.getAttribute('data-id');
    if (!id) return;
    abrirModalEditar(id);
  }

  async function onExcluirClick(e) {
    const id = e.currentTarget.getAttribute('data-id');
    if (!id) return;
    const res = await Swal.fire({
      title: 'Cancelar agendamento?',
      text: 'Marcará o agendamento como cancelado.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, cancelar'
    });
    if (!res.isConfirmed) return;
    try {
      await db.collection('agendamentos').doc(id).update({ status: 'cancelado', atualizado_em: firebase.firestore.FieldValue.serverTimestamp() });
      Swal.fire('OK', 'Agendamento cancelado.', 'success');
      await carregarAgendamentos();
    } catch (err) {
      console.error(err);
      Swal.fire('Erro', 'Não foi possível cancelar.', 'error');
    }
  }

  // ---------- carregar pacotes e monitores ----------
  async function carregarPacotes() {
    if (!db) return;
    try {
      const snap = await db.collection('pacotes').get();
      const pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.agendamentosState.pacotes = pacotes || [];
      if (selectItem) {
        selectItem.innerHTML = `<option value="">Selecione...</option>`;
        pacotes.forEach(p => {
          const opt = document.createElement('option');
          opt.value = p.id;
          const val = Number(p.valor || 0);
          opt.textContent = `${p.nome || p.title || p.id} - ${formatMoneyBR(val)}`;
          opt.dataset.valor = val;
          selectItem.appendChild(opt);
        });
      }
    } catch (err) {
      console.error('Erro carregar pacotes:', err);
    }
  }

  async function carregarMonitores() {
    if (!db) return;
    try {
      const snap = await db.collection('monitores').get();
      const monitores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.agendamentosState.monitores = monitores || [];
      if (containerMonitores) {
        containerMonitores.innerHTML = '';
        monitores.forEach(m => {
          const id = m.id;
          const label = m.nome || m.name || id;
          const wrapper = document.createElement('div');
          wrapper.className = 'form-check form-check-inline';
          wrapper.innerHTML = `
            <input class="form-check-input chk-monitor" type="checkbox" id="mon-${id}" value="${id}">
            <label class="form-check-label" for="mon-${id}">${label}</label>
          `;
          containerMonitores.appendChild(wrapper);
        });
      }
    } catch (err) {
      console.error('Erro carregar monitores:', err);
    }
  }

  // ---------- carregar agendamentos ----------
  async function carregarAgendamentos() {
    if (!db) return;
    try {
      const snap = await db.collection('agendamentos').orderBy('data', 'asc').orderBy('horario', 'asc').get();
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.agendamentosState.todos = lista;
      renderTabela(lista);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      Swal.fire('Erro', 'Não foi possível carregar agendamentos.', 'error');
    }
  }

  // ---------- aplicar filtros ----------
  function aplicarFiltros() {
    let lista = [...(window.agendamentosState.todos || [])];

    if (filtroData && filtroData.value) {
      lista = lista.filter(a => toYMD(parseDateField(a.data)) === filtroData.value);
    }

    if (filtroCliente && filtroCliente.value) {
      const q = filtroCliente.value.toLowerCase();
      lista = lista.filter(a => ((a.cliente || a.cliente_nome || '') + '').toLowerCase().includes(q));
    }

    if (filtroTelefone && filtroTelefone.value) {
      const q = filtroTelefone.value.replace(/\D/g,'');
      lista = lista.filter(a => (((a.telefone||'') + '').replace(/\D/g,'')).includes(q));
    }

    if (filtroStatus && filtroStatus.value) {
      lista = lista.filter(a => (a.status || '') === filtroStatus.value);
    }

    if (!lista || lista.length === 0) {
      // feedback SweetAlert com opção de criar novo
      Swal.fire({
        title: 'Nenhum agendamento encontrado',
        text: 'Deseja criar um novo agendamento para o filtro solicitado?',
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Criar novo'
      }).then(res => {
        if (res.isConfirmed) abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + 'T00:00:00') : null);
      });
      // esconder tabela
      if (painelTabela) painelTabela.style.display = 'none';
      return;
    }

    renderTabela(lista);
  }

  // ---------- modal: abrir/fechar, novo/editar ----------
  function abrirModalNovo(dataInicial = null) {
    if (!modalEl) return;
    modalTitulo.textContent = 'Novo Agendamento';
    inputId.value = '';
    inputCliente.value = '';
    inputTelefone.value = '';
    inputData.value = dataInicial ? toYMD(dataInicial) : '';
    inputHoraInicio.value = '';
    inputHoraFim.value = '';
    selectItem.value = '';
    inputPreco.value = '';
    inputDesconto.value = '';
    inputEntrada.value = '';
    inputValorFinal.value = '';
    // clear monitors
    containerMonitores && containerMonitores.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    bsModal && bsModal.show();
  }

  async function abrirModalEditar(id) {
    if (!db) return;
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
      if (a.pacoteId) selectItem.value = a.pacoteId;
      else selectItem.value = '';
      inputPreco.value = a.preco ? Number(a.preco).toFixed(2).replace('.',',') : (a.valor ? Number(a.valor).toFixed(2).replace('.',',') : '');
      inputDesconto.value = a.desconto ? Number(a.desconto).toFixed(2).replace('.',',') : '';
      inputEntrada.value = a.entrada ? Number(a.entrada).toFixed(2).replace('.',',') : '';
      inputValorFinal.value = a.valor_final ? Number(a.valor_final).toFixed(2).replace('.',',') : '';
      // marcar monitores
      const sel = Array.isArray(a.monitores) ? a.monitores : (a.monitores ? [a.monitores] : []);
      containerMonitores && containerMonitores.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.checked = sel.includes(cb.value);
      });
      bsModal && bsModal.show();
    } catch (err) {
      console.error(err);
      Swal.fire('Erro', 'Não foi possível abrir agendamento.', 'error');
    }
  }

  function fecharModal() {
    bsModal && bsModal.hide();
  }

  // ---------- conflito de horário ----------
  // retorna true se houver conflito (sobreposição) com outros agendamentos do mesmo dia (ignorando o próprio id se presente)
  async function existeConflito(dataStr, inicioStr, fimStr, ignoreId = null) {
    if (!db) return false;
    try {
      // buscar todos do mesmo dia
      const snap = await db.collection('agendamentos').where('data', '==', dataStr).get();
      const itens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const inicioMin = parseTimeToMinutes(inicioStr);
      const fimMin = parseTimeToMinutes(fimStr || calcularHoraFim(inicioStr));
      if (inicioMin == null || fimMin == null) return false;

      for (const it of itens) {
        if (ignoreId && it.id === ignoreId) continue;
        const oInicio = parseTimeToMinutes(it.horario || it.hora_inicio || '');
        const oFim = parseTimeToMinutes(it.hora_fim || calcularHoraFim(it.horario || it.hora_inicio || ''));
        if (oInicio == null || oFim == null) continue;
        // overlap check: startA < endB && startB < endA
        if (inicioMin < oFim && oInicio < fimMin) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('Erro verificar conflito:', err);
      // se falhar consulta, não bloqueia (para evitar bloquear operações por erro temporário)
      return false;
    }
  }

  // ---------- salvar agendamento (com validações e conflito) ----------
  async function salvarAgendamento() {
    if (!db) { Swal.fire('Erro', 'Banco não disponível.', 'error'); return; }

    const id = inputId.value || null;
    const cliente = (inputCliente.value || '').trim();
    const telefone = (inputTelefone.value || '').trim();
    const dataVal = inputData.value;
    const horaInicio = inputHoraInicio.value;
    const horaFim = inputHoraFim.value || calcularHoraFim(horaInicio);
    const pacoteId = selectItem.value || null;
    const preco = formatCurrencyInputRawToNumber(inputPreco.value);
    const desconto = formatCurrencyInputRawToNumber(inputDesconto.value);
    const entrada = formatCurrencyInputRawToNumber(inputEntrada.value);
    const valorFinal = formatCurrencyInputRawToNumber(inputValorFinal.value || (preco - desconto));
    const monitores = containerMonitores ? Array.from(containerMonitores.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value) : [];

    // validações
    if (!cliente) { Swal.fire('Atenção', 'Preencha o nome do cliente.', 'warning'); return; }
    if (!dataVal) { Swal.fire('Atenção', 'Escolha a data do evento.', 'warning'); return; }
    if (!horaInicio) { Swal.fire('Atenção', 'Informe o horário de início.', 'warning'); return; }

    // verificar conflito
    const conflito = await existeConflito(dataVal, horaInicio, horaFim, id || null);
    if (conflito) {
      Swal.fire('Conflito de horário', 'Já existe outro agendamento que se sobrepõe a esse horário.', 'warning');
      return;
    }

    // montar objeto para salvar
    const dados = {
      cliente,
      telefone,
      data: dataVal, // string YYYY-MM-DD
      horario: horaInicio,
      hora_fim: horaFim,
      pacoteId: pacoteId || null,
      preco: preco,
      desconto: desconto,
      entrada: entrada,
      valor_final: valorFinal,
      monitores: monitores,
      atualizado_em: firebase.firestore.FieldValue.serverTimestamp(),
      status: (entrada && entrada > 0) ? 'confirmado' : 'pendente'
    };
    if (!id) dados.criado_em = firebase.firestore.FieldValue.serverTimestamp();

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

  // ---------- UI helper: aplicar formatação em campos monetários e telefone ----------
  function setupInputMasks() {
    if (inputTelefone) {
      inputTelefone.addEventListener('input', (e) => {
        const pos = e.target.selectionStart;
        const before = e.target.value;
        const masked = maskPhone(before);
        e.target.value = masked;
        // keep caret at end (simpler, reliable)
        setTimeout(() => e.target.setSelectionRange(e.target.value.length, e.target.value.length), 0);
      });
      // limpar não-dígitos ao sair
      inputTelefone.addEventListener('blur', (e) => {
        // if empty, keep empty; else ensure full format
        if (e.target.value) e.target.value = maskPhone(e.target.value);
      });
    }

    const moneyInputs = [inputPreco, inputDesconto, inputEntrada, inputValorFinal].filter(Boolean);
    moneyInputs.forEach(inp => {
      inp.addEventListener('input', (e) => {
        // allow numbers, comma, dot, R$ removal
        const raw = e.target.value.replace(/[R$\s]/g, '').replace(/[^\d\.,]/g, '');
        // convert to numeric with dot
        const normalized = raw.replace(/\./g, '').replace(',', '.');
        const n = parseFloat(normalized);
        if (isNaN(n)) {
          e.target.value = '';
          return;
        }
        // format as BR currency without prefix (we'll add R$ on blur)
        const formatted = n.toFixed(2).replace('.', ',');
        e.target.value = formatted;
        // update valor final automatically when preco or desconto change
        if (inp === inputPreco || inp === inputDesconto) {
          const p = formatCurrencyInputRawToNumber(inputPreco.value);
          const d = formatCurrencyInputRawToNumber(inputDesconto.value);
          const final = isNaN(p - d) ? 0 : (p - d);
          if (inputValorFinal) inputValorFinal.value = final.toFixed(2).replace('.', ',');
        }
      });

      inp.addEventListener('blur', (e) => {
        const n = formatCurrencyInputRawToNumber(e.target.value);
        e.target.value = n === 0 ? '' : (n.toFixed(2).replace('.', ','));
        // show R$ prefix in display
        if (e.target.value) e.target.value = e.target.value;
      });
    });

    // when inputValorFinal blurred, format display with comma
    if (inputValorFinal) {
      inputValorFinal.addEventListener('blur', (e) => {
        const n = formatCurrencyInputRawToNumber(e.target.value);
        e.target.value = n === 0 ? '' : n.toFixed(2).replace('.', ',');
      });
    }
  }

  // ---------- events wiring ----------
  function bindUIEvents() {
    if (btnNovoAg) {
      btnNovoAg.addEventListener('click', () => {
        // if there's a date param in URL, use it
        const q = new URLSearchParams(window.location.search);
        const dateParam = q.get('date');
        const dObj = dateParam ? new Date(dateParam + 'T00:00:00') : null;
        abrirModalNovo(dObj);
      });
    }

    if (btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltros);

    if (modalEl) {
      const btnSalvar = document.getElementById('btnSalvarAg');
      const btnCancelar = document.getElementById('btnCancelar');
      if (btnSalvar) btnSalvar.addEventListener('click', salvarAgendamento);
      if (btnCancelar) btnCancelar.addEventListener('click', fecharModal);
    }

    // auto preencher hora fim
    if (inputHoraInicio && inputHoraFim) {
      inputHoraInicio.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val && inputHoraFim) inputHoraFim.value = calcularHoraFim(val);
      });
      inputHoraInicio.addEventListener('blur', (e) => {
        const val = e.target.value;
        if (val && inputHoraFim && !inputHoraFim.value) inputHoraFim.value = calcularHoraFim(val);
      });
    }

    // select item change => preencher preco
    if (selectItem) {
      selectItem.addEventListener('change', (e) => {
        const opt = e.target.selectedOptions[0];
        if (opt && opt.dataset && opt.dataset.valor) {
          const val = Number(opt.dataset.valor || 0);
          inputPreco.value = val.toFixed(2).replace('.', ',');
          // recalc final
          const descontoVal = formatCurrencyInputRawToNumber(inputDesconto.value);
          const final = val - descontoVal;
          inputValorFinal.value = (final > 0 ? final.toFixed(2).replace('.', ',') : '0,00');
        } else {
          inputPreco.value = '';
        }
      });
    }
  }

  // ---------- inicialização ----------
  async function initModule() {
    try {
      setupInputMasks();
      bindUIEvents();
      await carregarPacotes();
      await carregarMonitores();
      await carregarAgendamentos();

      // se veio ?date=YYYY-MM-DD, preenche filtro
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

  // expose small API
  window.agendamentosModule = window.agendamentosModule || {};
  window.agendamentosModule.reload = carregarAgendamentos;
  window.agendamentosModule.openModalNew = abrirModalNovo;
  window.agendamentosModule.openModalEdit = abrirModalEditar;

  // autostart
  document.addEventListener('DOMContentLoaded', initModule);

})();
