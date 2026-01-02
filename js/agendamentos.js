// js/agendamentos.js (corrigido/refinado para demandas: modal detalhes, delete comprovante em tempo real,
// validação antes de salvar, conflito de estoque visível, manter filtros, botões por status)


const AG_BASE = "/dashboard-Divertilandia/";

// firebase compat (deve estar carregado via <script> no HTML)
const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
const auth = window.auth || (firebase && firebase.auth ? firebase.auth() : null);
const storage = window.storage || (firebase && firebase.storage ? firebase.storage() : null);

if (!db) console.error("agendamentos.js: Firestore (db) não encontrado. Verifique firebase-config.js");
if (!storage) console.warn("agendamentos.js: Firebase Storage não encontrado. Upload de comprovantes ficará desabilitado.");

// ---------- DOM ----------
const painelTabela = document.getElementById("painelTabela");
const listaEl = document.getElementById("listaEl");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnNovoAg = document.getElementById("btnNovoAg");

const filtroData = document.getElementById("filtroData");
const filtroCliente = document.getElementById("filtroCliente");
const filtroTelefone = document.getElementById("filtroTelefone");
const filtroStatus = document.getElementById("filtroStatus");

const modal = document.getElementById("modalAgendamento");
const modalTitulo = document.getElementById("modalTitulo");

// modal fields
const inputId = document.getElementById("ag-id");
const inputCliente = document.getElementById("ag-cliente");
const inputTelefone = document.getElementById("ag-telefone");

const inputEndRua = document.getElementById("ag-end-rua");
const inputEndNumero = document.getElementById("ag-end-numero");
const inputEndBairro = document.getElementById("ag-end-bairro");
const inputEndCidade = document.getElementById("ag-end-cidade");

const inputData = document.getElementById("ag-data");
const inputHoraInicio = document.getElementById("ag-hora-inicio");
const inputHoraFim = document.getElementById("ag-hora-fim");

const selectItem = document.getElementById("ag-item");

const inputPreco = document.getElementById("ag-preco");
const inputDesconto = document.getElementById("ag-desconto");
const inputEntrada = document.getElementById("ag-entrada");
const inputValorFinal = document.getElementById("ag-valor-final");
const inputRestante = document.getElementById("ag-restante"); // novo

const inputObservacao = document.getElementById("ag-observacao"); // novo

const inputComprovantes = document.getElementById("ag-comprovantes"); // novo file input
const listaComprovantesEl = document.getElementById("lista-comprovantes"); // novo preview container

const containerMonitores = document.getElementById("ag-monitores");

const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvarAg");

// ---------- STATE ----------
const STATE = {
  todos: [],
  pacotes: [],
  itens: [],
  monitores: [],
  comprovantesExistentes: [],
  comprovantesNovos: []
};

// ---------- FILTER STATE (to preserve filters across updates) ----------
let LAST_FILTERS = {
  data: "",
  cliente: "",
  telefone: "",
  status: ""
};

// ---------- HELPERS / FORMATAÇÃO ----------
function parseDateField(v) {
  if (!v) return null;
  if (v.toDate) return v.toDate();
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00");
  return new Date(v);
}
function toYMD(date) {
  if (!date) return "";
  const d = (date.toDate ? date.toDate() : date);
  return d.toISOString().slice(0, 10);
}
function calcularHoraFim(horaInicio) {
  if (!horaInicio) return "";
  const [hh, mm] = (horaInicio || "").split(":").map(n => Number(n || 0));
  const dt = new Date();
  dt.setHours(hh || 0, mm || 0, 0, 0);
  dt.setHours(dt.getHours() + 4);
  return `${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`;
}

function maskTelefone(value) {
  const d = (value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return "(" + d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// currency parse/format
function parseCurrencyToNumber(str) {
  if (str == null) return 0;
  if (typeof str === "number") return Number(str);
  let s = String(str).trim();
  s = s.replace(/R\$\s?/, "");
  if (s.indexOf(",") > -1 && s.indexOf(".") > -1) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") > -1) s = s.replace(",", ".");
  else s = s.replace(/,/g, "");
  s = s.replace(/[^\d.\-]/g, "");
  const n = Number(s);
  return isNaN(n) ? 0 : Math.max(0, n);
}
function formatNumberToCurrencyString(n) {
  n = Number(n || 0);
  return "R$ " + n.toFixed(2).replace(".", ",");
}
function safeNumFromInputEl(el) {
  if (!el) return 0;
  return parseCurrencyToNumber(el.value);
}
function setCurrencyInput(el, n) {
  if (!el) return;
  if (n === "" || n == null) { el.value = ""; return; }
  el.value = formatNumberToCurrencyString(Number(n));
}

function isDataPassadaYMD(dataStr) {
  if (!dataStr) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const dataAg = new Date(dataStr + "T00:00:00");
  return dataAg < hoje;
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

// ---------- TABELA ----------
function renderTabela(lista, origem = "auto") {
  if (!listaEl || !painelTabela) return;
  listaEl.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    painelTabela.style.display = "none";

    if (origem === "filtro") {
      Swal.fire({
        title: "Nenhum agendamento encontrado",
        text: "Deseja criar um novo agendamento?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Criar novo",
        cancelButtonText: "Fechar",
        customClass: { popup: "swal-high-z" }
      }).then(res => {
        if (res.isConfirmed) {
          abrirModalNovo(
            filtroData && filtroData.value
              ? new Date(filtroData.value + "T00:00:00")
              : null
          );
        }
      });
    }
    return;
  }

  painelTabela.style.display = "flex";

  lista.forEach(a => {
    const dt = parseDateField(a.data);
    const dateStr = dt ? dt.toLocaleDateString() : (a.data || "---");
    const horario = a.horario || "";

    const enderecoStr =
      (a.endereco?.rua || "") +
      (a.endereco?.numero ? ", Nº " + a.endereco.numero : "") +
      (a.endereco?.bairro ? " — " + a.endereco.bairro : "") +
      (a.endereco?.cidade ? " / " + a.endereco.cidade : "");

    const itemName = a.pacoteNome || a.itemNome || a.pacoteId || "---";
    const valor = Number(a.valor_final ?? a.preco ?? 0);

    const row = document.createElement("div");
    row.className = "ag-row";
    row.dataset.id = a.id;

    row.innerHTML = `
      <div>${dateStr}</div>
      <div>${horario}</div>
      <div>${a.cliente || "---"}</div>
      <div>${a.telefone || "---"}</div>
      <div>${enderecoStr || "---"}</div>
      <div>${itemName}</div>
      <div class="status-cell">${a.status || "pendente"}</div>
      <div>${formatNumberToCurrencyString(valor)}</div>

      <div class="actions-cell">
        <button class="ag-menu-btn" data-id="${a.id}">⋮</button>
        <div class="ag-menu-dropdown">
          <button class="ag-menu-item" data-action="detalhes">Detalhes</button>

          ${
            (a.status || "pendente").toLowerCase() === "cancelado"
              ? `<button class="ag-menu-item danger" data-action="excluir-full">Excluir</button>`
              : `
                <button class="ag-menu-item" data-action="editar">Editar</button>
                <button class="ag-menu-item danger" data-action="cancelar">Cancelar</button>
              `
          }
        </div>
      </div>
    `;

    listaEl.appendChild(row);

    // status visual
    const statusCell = row.querySelector(".status-cell");
    if (statusCell) {
      const st = (a.status || "pendente").toLowerCase();
      statusCell.style.fontWeight = "700";
      if (st === "confirmado") statusCell.style.color = "#4cafef";
      else if (st === "pendente") statusCell.style.color = "#e6b800";
      else if (st === "cancelado") statusCell.style.color = "#d32f2f";
      else if (st === "concluido" || st === "finalizado") statusCell.style.color = "#2e7d32";
    }
  });

  aplicarMenuAcoesAgendamentos();
}

  function aplicarMenuAcoesAgendamentos() {
  // abrir / fechar menu
  listaEl.querySelectorAll(".ag-menu-btn").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();

      const dropdown = btn.nextElementSibling;

      document.querySelectorAll(".ag-menu-dropdown").forEach(d => {
        if (d !== dropdown) d.style.display = "none";
      });

      dropdown.style.display =
        dropdown.style.display === "block" ? "none" : "block";
    };
  });

  // ações do menu
  listaEl.querySelectorAll(".ag-menu-item").forEach(item => {
    item.onclick = e => {
      e.stopPropagation();

      const action = item.dataset.action;
      const row = item.closest(".ag-row");
      const id = row.dataset.id;

      if (action === "detalhes") onDetalhesClick({ target: { dataset: { id } } });
      if (action === "editar") onEditarClick({ target: { dataset: { id } } });
      if (action === "cancelar") onExcluirClick({ target: { dataset: { id } } });
      if (action === "excluir-full") onExcluirPermanenteClick({ target: { dataset: { id } } });

      item.parentElement.style.display = "none";
    };
  });

  // fechar ao clicar fora
  document.addEventListener("click", () => {
    document.querySelectorAll(".ag-menu-dropdown").forEach(d => {
      d.style.display = "none";
    });
  });
}

// ---------- TABELA BUTTONS ----------
function onEditarClick(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!id) return;
  abrirModalEditar(id);
}
function onExcluirClick(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!id) return;
  cancelarAgendamento(id);
}
function onExcluirPermanenteClick(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!id) return;
  excluirPermanente(id);
}
function onDetalhesClick(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!id) return;
  abrirModalDetalhes(id);
}

// ---------- CANCELAR (marca cancelado) ----------
async function cancelarAgendamento(id) {
  const res = await Swal.fire({
    title: "Cancelar agendamento?",
    text: "O agendamento será marcado como cancelado (não será removido).",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, cancelar",
    customClass: { popup: 'swal-high-z' }
  });
  if (!res.isConfirmed) return;
  try {
    await db.collection("agendamentos").doc(id).update({ status: "cancelado", atualizado_em: firebase.firestore.FieldValue.serverTimestamp() });
    Swal.fire({ title: "OK", text: "Agendamento cancelado.", icon: "success", customClass: { popup: 'swal-high-z' } });
    
    await carregarAgendamentosPreservandoFiltro();
    
  } catch (err) {
    console.error("cancelarAgendamento:", err);
    Swal.fire({ title: "Erro", text: "Não foi possível cancelar.", icon: "error", customClass: { popup: 'swal-high-z' } });
  }
}

// ---------- EXCLUIR PERMANENTE (para agendamentos já cancelados) ----------
async function excluirPermanente(id) {
  const res = await Swal.fire({
    title: "Excluir agendamento permanentemente?",
    text: "Essa ação removerá o agendamento do sistema.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, excluir",
    customClass: { popup: 'swal-high-z' }
  });
  if (!res.isConfirmed) return;
  try {
    if (db && storage) {
      const snap = await db.collection("agendamentos").doc(id).get();
      if (snap.exists) {
        const data = snap.data() || {};
        const comps = data.comprovantes || [];
        for (const c of comps) {
          try { if (c.path) await storage.ref(c.path).delete(); } catch (_) { }
        }
      }
    }
    await db.collection("agendamentos").doc(id).delete();
    Swal.fire({ title: "OK", text: "Agendamento excluído.", icon: "success", customClass: { popup: 'swal-high-z' } });
    
    await carregarAgendamentosPreservandoFiltro();
    
  } catch (err) {
    console.error("excluirPermanente:", err);
    Swal.fire({ title: "Erro", text: "Não foi possível excluir.", icon: "error", customClass: { popup: 'swal-high-z' } });
  }
}

// ---------- CARREGAR PACOTES + ITENS ----------
async function carregarPacotesEItens() {
  if (!db || !selectItem) return;
  selectItem.innerHTML = `<option value="">Selecionar...</option>`;

  try {
    const [pacSnap, itSnap] = await Promise.all([db.collection("pacotes").get(), db.collection("item").get()]);

    STATE.pacotes = pacSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    STATE.itens = itSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // pacotes
    STATE.pacotes.forEach(p => {
      const opt = document.createElement("option");
      opt.value = `pacote_${p.id}`;
      opt.dataset.valor = Number(p.preço ?? p.preco ?? p.valor ?? 0);
      opt.textContent = `${p.nome || p.title || p.id} (pacote) - R$ ${Number(p.preço ?? p.preco ?? p.valor ?? 0).toFixed(2)}`;
      selectItem.appendChild(opt);
    });

    // itens
    STATE.itens.forEach(i => {
      const opt = document.createElement("option");
      opt.value = `item_${i.id}`;
      opt.dataset.valor = Number(i.preço ?? i.preco ?? i.valor ?? 0);
      opt.textContent = `${i.nome || i.title || i.id} (item) - R$ ${Number(i.preço ?? i.preco ?? i.valor ?? 0).toFixed(2)}`;
      selectItem.appendChild(opt);
    });
  } catch (err) {
    console.error("carregarPacotesEItens:", err);
  }
}

// ---------- CARREGAR MONITORES ----------
async function carregarMonitores() {
  if (!db || !containerMonitores) return;

  try {
    const snap = await db.collection("monitores").get();
    STATE.monitores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    containerMonitores.innerHTML = "";

    // campo visual (igual item/pacote)
    const field = document.createElement("div");
    field.style.display = "flex";
    field.style.alignItems = "center";
    field.style.justifyContent = "space-between";
    field.style.background = "#1e1e1e";
    field.style.border = "1px solid #444";
    field.style.padding = "10px";
    field.style.borderRadius = "5px";
    field.style.color = "#fff";
    field.style.cursor = "default";

    const text = document.createElement("span");
     text.innerHTML = "&nbsp;"; // 
    
    const arrow = document.createElement("span");
    arrow.textContent = "▼";
    arrow.style.cursor = "pointer";

    field.appendChild(text);
    field.appendChild(arrow);
    containerMonitores.appendChild(field);

    // dropdown FORA do container
    const dropdown = document.createElement("div");
    dropdown.style.position = "absolute";
    dropdown.style.background = "#1e1e1e";
    dropdown.style.border = "1px solid #444";
    dropdown.style.borderRadius = "5px";
    dropdown.style.display = "none";
    dropdown.style.zIndex = "9999";

    document.body.appendChild(dropdown);

    // montar lista
    dropdown.innerHTML = "";
    STATE.monitores.forEach(m => {
      const line = document.createElement("label");
line.style.display = "grid";
line.style.gridTemplateColumns = "20px 1fr";
line.style.alignItems = "center";
line.style.padding = "10px 12px";
line.style.cursor = "pointer";
line.style.color = "#fff";
line.style.userSelect = "none";
line.style.fontSize = "14px";      

      const chk = document.createElement("input");
chk.type = "checkbox";
chk.style.margin = "0";
chk.style.transform = "scale(1.05)";
      chk.className = "chk-monitor";
      chk.value = m.id;

      chk.addEventListener("change", () => {
        const selecionados = Array.from(
          dropdown.querySelectorAll(".chk-monitor:checked")
        ).map(i => {
          const mon = STATE.monitores.find(x => x.id === i.value);
          return mon ? (mon.nome || mon.name || mon.id) : "";
        });

        text.textContent = selecionados.length
          ? selecionados.join(", ")
          : "Selecionar monitores";
      });

      const span = document.createElement("span");
      span.textContent = m.nome || m.name || m.id;

      line.appendChild(chk);
      line.appendChild(span);
      dropdown.appendChild(line);
    });

    // abrir dropdown
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();

      const rect = field.getBoundingClientRect();
      dropdown.style.minWidth = rect.width + "px";
      dropdown.style.left = rect.left + "px";
      dropdown.style.top = rect.bottom + "px";

      dropdown.style.display =
        dropdown.style.display === "none" ? "block" : "none";
    });

    // fechar ao clicar fora
    document.addEventListener("click", () => {
      dropdown.style.display = "none";
    });

  } catch (err) {
    console.error("carregarMonitores:", err);
  }
}


// ---------- CARREGAR AGENDAMENTOS ----------
async function carregarAgendamentos() {
  if (!db) return;

  try {
    if (painelTabela) painelTabela.style.display = "none";

    const snap = await db.collection("agendamentos")
      .orderBy("data", "asc")
      .orderBy("horario", "asc")
      .get();

    // =====================================================
    // 🔁 ATUALIZAÇÃO AUTOMÁTICA → CONCLUIDO (DATA PASSADA)
    // =====================================================
    const hojeYMD = toYMD(new Date());

    for (const doc of snap.docs) {
      const ag = doc.data();

      if (!ag.data || !ag.status) continue;

      // Apenas pendente ou confirmado
      if (ag.status !== "pendente" && ag.status !== "confirmado") continue;

      // Data já passou
      if (ag.data < hojeYMD) {
        await db.collection("agendamentos").doc(doc.id).update({
          status: "concluido",
          atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    // =====================================================
    // 🔹 CARREGA ESTADO APÓS AJUSTE AUTOMÁTICO
    // =====================================================
    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderTabela([]); // mantém oculto no load inicial

  } catch (err) {
    console.error("carregarAgendamentos:", err);
    Swal.fire({
      title: "Erro",
      text: "Não foi possível carregar agendamentos.",
      icon: "error",
      customClass: { popup: "swal-high-z" }
    });
  }
}

// helper to reload and re-apply last filters
async function carregarAgendamentosPreservandoFiltro() {
  await carregarAgendamentos();
  // re-apply last filters if any
  if (LAST_FILTERS && (LAST_FILTERS.data || LAST_FILTERS.cliente || LAST_FILTERS.telefone || LAST_FILTERS.status)) {
    // set UI controls silently
    if (filtroData) filtroData.value = LAST_FILTERS.data || "";
    if (filtroCliente) filtroCliente.value = LAST_FILTERS.cliente || "";
    if (filtroTelefone) filtroTelefone.value = LAST_FILTERS.telefone || "";
    if (filtroStatus) filtroStatus.value = LAST_FILTERS.status || "";
    aplicarFiltros();
  }
}

// ---------- FILTRAR ----------

function aplicarFiltros() {
  // coleta valores dos filtros
  const dataVal = filtroData ? filtroData.value.trim() : "";
  const clienteVal = filtroCliente ? filtroCliente.value.trim() : "";
  const telefoneVal = filtroTelefone ? filtroTelefone.value.trim() : "";
  const statusVal = filtroStatus ? filtroStatus.value.trim() : "";

  // checa se nenhum dos filtros obrigatórios foi informado
  if (!dataVal && !clienteVal && !telefoneVal) {
    Swal.fire({
      title: "Atenção",
      text: "Preencha ao menos um dos campos: Data, Cliente ou Telefone.",
      icon: "info",
      customClass: { popup: 'swal-high-z' }
    });
    return;
  }

  // começa com todos os agendamentos carregados
  let lista = Array.isArray(STATE.todos) ? [...STATE.todos] : [];

  if (dataVal) {
    lista = lista.filter(a => toYMD(parseDateField(a.data)) === dataVal);
  }
  if (clienteVal) {
    const q = clienteVal.toLowerCase();
    lista = lista.filter(a => (a.cliente || "").toLowerCase().includes(q));
  }
  if (telefoneVal) {
    const q = telefoneVal.replace(/\D/g, "");
    lista = lista.filter(a =>
      ((a.telefone || "") + "").replace(/\D/g, "").includes(q)
    );
  }
  if (statusVal) {
    lista = lista.filter(a => (a.status || "") === statusVal);
  }

  // salva filtros atuais
  LAST_FILTERS = {
    data: dataVal,
    cliente: clienteVal,
    telefone: telefoneVal,
    status: statusVal
  };

  renderTabela(lista, "filtro");
}


// ---------- FILTRO DIRETO POR AGENDAMENTO (CALENDÁRIO) ----------
function filtrarSomenteAgendamento(id) {
  if (!id || !Array.isArray(STATE.todos)) return;

  const ag = STATE.todos.find(a => a.id === id);
  if (!ag) return;

  // mostra somente este agendamento na tabela
  renderTabela([ag], "auto");

  // preserva estado mínimo (data) para reload coerente
  LAST_FILTERS = {
    data: ag.data || "",
    cliente: "",
    telefone: "",
    status: ""
  };
}

// ---------- MODAL: abrir / editar / fechar ----------
function abrirModalNovo(dateInitial = null) {

  if (modalTitulo) modalTitulo.textContent = "Novo Agendamento";
  if (inputId) inputId.value = "";

  // clear fields
  [
    inputCliente, inputTelefone, inputEndRua, inputEndNumero, inputEndBairro, inputEndCidade,
    inputData, inputHoraInicio, inputHoraFim, selectItem, inputPreco, inputDesconto, inputEntrada, inputValorFinal, inputRestante, inputObservacao
  ].forEach(el => { if (el) el.value = ""; });

  // ---------- COMPROVANTES (NOVO AGENDAMENTO) ----------
STATE.comprovantesExistentes = [];
STATE.comprovantesNovos = [];

if (inputComprovantes) inputComprovantes.value = "";
if (listaComprovantesEl) listaComprovantesEl.innerHTML = "";

  if (dateInitial && inputData) inputData.value = toYMD(dateInitial);

  // uncheck monitors
  document.querySelectorAll(".chk-monitor").forEach(cb => { cb.checked = false; });

  if (modal) modal.classList.add("active");
  if (inputCliente) inputCliente.focus();
}

async function abrirModalEditar(id) {
  if (!id || !db) return;
  try {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) { Swal.fire({ title: "Erro", text: "Agendamento não encontrado", icon: "error", customClass: { popup: 'swal-high-z' } }); return; }
    const a = doc.data();

    // block editing canceled appointments
    if ((a.status || "").toLowerCase() === "cancelado") {
      Swal.fire({ title: "Agendamento cancelado", text: "Este agendamento está cancelado e não pode ser editado.", icon: "info", customClass: { popup: 'swal-high-z' } });
      return;
    }

    if (modalTitulo) modalTitulo.textContent = "Editar Agendamento";

    if (inputId) inputId.value = id;
    if (inputCliente) inputCliente.value = a.cliente || "";
    if (inputTelefone) inputTelefone.value = a.telefone || "";
    if (inputEndRua) inputEndRua.value = a.endereco?.rua || "";
    if (inputEndNumero) inputEndNumero.value = a.endereco?.numero || "";
    if (inputEndBairro) inputEndBairro.value = a.endereco?.bairro || "";
    if (inputEndCidade) inputEndCidade.value = a.endereco?.cidade || "";

    if (inputData) inputData.value = toYMD(parseDateField(a.data));
    if (inputHoraInicio) inputHoraInicio.value = a.horario || "";
    if (inputHoraFim) inputHoraFim.value = a.hora_fim || "";

    // select item/pacote
    if (selectItem) {
      if (a.pacoteId && selectItem.querySelector(`option[value="${a.pacoteId}"]`)) {
        selectItem.value = a.pacoteId;
      } else {
        Array.from(selectItem.options).forEach(opt => {
          if ((a.pacoteNome && opt.textContent.includes(a.pacoteNome)) || (a.itemNome && opt.textContent.includes(a.itemNome))) {
            selectItem.value = opt.value;
          }
        });
      }
    }

    if (inputPreco) setCurrencyInput(inputPreco, a.preco ?? a.preço ?? 0);
    if (inputDesconto) setCurrencyInput(inputDesconto, a.desconto ?? 0);
    if (inputEntrada) setCurrencyInput(inputEntrada, a.entrada ?? 0);
    if (inputValorFinal) setCurrencyInput(inputValorFinal, a.valor_final ?? a.preco ?? 0);

    // restante
    if (inputRestante) {
      const vf = Number(a.valor_final ?? a.preco ?? 0);
      const entradaN = Number(a.entrada ?? 0);
      const restante = Math.max(0, vf - entradaN);
      setCurrencyInput(inputRestante, restante);
    }

    if (inputObservacao) inputObservacao.value = a.observacao || "";

    // mark monitors
    document.querySelectorAll(".chk-monitor").forEach(cb => {
      cb.checked = Array.isArray(a.monitores) ? a.monitores.includes(cb.value) : false;
    });

    // ---------- COMPROVANTES (EDITAR AGENDAMENTO) ----------
STATE.comprovantesExistentes = Array.isArray(a.comprovantes)
  ? a.comprovantes.slice()
  : [];

STATE.comprovantesNovos = [];

renderComprovantesPreview(
  STATE.comprovantesExistentes,
  id,
  false
);

    if (modal) modal.classList.add("active");
  } catch (err) {
    console.error("abrirModalEditar:", err);
    Swal.fire({ title: "Erro", text: "Não foi possível abrir edição.", icon: "error", customClass: { popup: 'swal-high-z' } });
  }
}

function fecharModal() {
  if (modal) modal.classList.remove("active");
}

// ---------- COMPROVANTES UI & UPLOAD ----------
// render preview list (array of objects {url,name,path,__local})
// readOnly=true -> no delete buttons, click opens link
function renderComprovantesPreview(comprovantesArray, agId, readOnly = false) {
  if (!listaComprovantesEl) return;

  listaComprovantesEl.innerHTML = "";

  if (!Array.isArray(comprovantesArray) || comprovantesArray.length === 0) return;

  comprovantesArray.forEach((c, idx) => {
    const wrapper = document.createElement("div");
    wrapper.className = "comp-wrapper";
    wrapper.dataset.index = idx;
    wrapper.dataset.agId = agId || "";

    if (c.path) wrapper.dataset.path = c.path;
    if (c.__local) wrapper.dataset.local = "1";

    const img = document.createElement("img");
    img.src = c.url;
    img.title = c.name || "Comprovante";
    img.style.cursor = "pointer";
    img.onclick = () => window.open(c.url, "_blank");

    wrapper.appendChild(img);

    if (!readOnly) {
      const del = document.createElement("button");
      del.className = "comp-del-btn";
      del.textContent = "X";

      del.onclick = async (ev) => {
        ev.stopPropagation();

        const confirm = await Swal.fire({
          title: "Excluir comprovante?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Excluir",
          customClass: { popup: "swal-high-z" }
        });
        if (!confirm.isConfirmed) return;

        try {
          // COMPROVANTE LOCAL (ainda não salvo)
          if (c.__local) {
            STATE.comprovantesNovos =
              STATE.comprovantesNovos.filter(f => f.__uid !== c.__uid);
            wrapper.remove();
            return;
          }

          // COMPROVANTE JÁ SALVO
          if (c.path && storage) {
            await storage.ref(c.path).delete();
          }

          if (agId && db) {
            const ref = db.collection("agendamentos").doc(agId);
            const snap = await ref.get();
            if (snap.exists) {
              const atual = snap.data().comprovantes || [];
              const novo = atual.filter(x => x.url !== c.url);
              await ref.update({ comprovantes: novo });
              STATE.comprovantesExistentes = novo;
            }
          }

          wrapper.remove();
        } catch (err) {
          console.error("Erro excluindo comprovante:", err);
          Swal.fire({
            title: "Erro",
            text: "Não foi possível excluir o comprovante.",
            icon: "error",
            customClass: { popup: "swal-high-z" }
          });
        }
      };

      wrapper.appendChild(del);
    }

    listaComprovantesEl.appendChild(wrapper);
  });
}

// upload list of File objects; returns array of {url,name,path}
async function uploadComprovantesFiles(files, agId) {
  if (!storage) throw new Error("Storage não disponível");
  if (!files || files.length === 0) return [];

  const uploaded = [];

  for (const f of files) {
    const safeName = f.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const path = `comprovantes/${agId}/${Date.now()}_${safeName}`;
    const ref = storage.ref(path);

    await ref.put(f);
    const url = await ref.getDownloadURL();

    uploaded.push({
      url,
      name: f.name,
      path
    });
  }

  return uploaded;
}

// seleção de arquivos — preview local + múltiplos
if (inputComprovantes) {
  inputComprovantes.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    files.forEach((f) => {
      // evita duplicar o mesmo arquivo local
      const exists = STATE.comprovantesNovos.some(
        x => x.name === f.name && x.file?.size === f.size
      );
      if (exists) return;

      const uid = crypto.randomUUID();

      STATE.comprovantesNovos.push({
        __uid: uid,
        __local: true,
        file: f,
        name: f.name,
        url: URL.createObjectURL(f)
      });
    });

    renderComprovantesPreview(
      [...STATE.comprovantesExistentes, ...STATE.comprovantesNovos],
      inputId ? inputId.value : "",
      false
    );

    // permite selecionar o mesmo arquivo novamente
    inputComprovantes.value = "";
  });
}

/**
 * Checa duplicidade de agendamento (novo ou edição)
 * 
 * @param {Array} existingBookings - Lista de agendamentos existentes no mesmo dia
 * @param {Object} formData - Dados do agendamento atual do formulário
 *        { id, data, horario, endereco: { rua, numero, bairro, cidade } }
 * @returns {Object|null} - Retorna o agendamento duplicado encontrado ou null se não houver
 */
function checarDuplicidade(existingBookings, formData) {
  const agendamentoId = String(formData.id || "").trim();
  const dataForm = String(formData.data || "").trim(); // YYYY-MM-DD
  const horaForm = String(formData.horario || "").padEnd(5, "0"); // HH:MM
  const ruaForm = (formData.endereco?.rua || "").trim().toLowerCase();
  const numeroForm = String(formData.endereco?.numero || "").trim();
  const bairroForm = (formData.endereco?.bairro || "").trim().toLowerCase();
  const cidadeForm = (formData.endereco?.cidade || "").trim().toLowerCase();

  return existingBookings.find(b => {
    const bId = String(b.id || "").trim();

    // ignora o próprio agendamento
    if (bId && agendamentoId && bId === agendamentoId) return false;

    const mesmaData = String(b.data || "").trim() === dataForm;
    const mesmoHorario = String(b.horario || "").padEnd(5, "0") === horaForm;
    const mesmoEndereco =
      (b.endereco?.rua || "").trim().toLowerCase() === ruaForm &&
      String(b.endereco?.numero || "").trim() === numeroForm &&
      (b.endereco?.bairro || "").trim().toLowerCase() === bairroForm &&
      (b.endereco?.cidade || "").trim().toLowerCase() === cidadeForm;

    return mesmaData && mesmoHorario && mesmoEndereco;
  }) || null;
}

// ---------- SALVAR AGENDAMENTO (inclui upload de comprovantes) ----------
async function salvarAgendamento() {
  if (!db) return;

  // VALIDATION (required fields)
  const cliente = inputCliente ? inputCliente.value.trim() : "";
  const telefone = inputTelefone ? inputTelefone.value.trim() : "";
  const rua = inputEndRua ? inputEndRua.value.trim() : "";
  const numero = inputEndNumero ? inputEndNumero.value.trim() : "";
  const bairro = inputEndBairro ? inputEndBairro.value.trim() : "";
  const cidade = inputEndCidade ? inputEndCidade.value.trim() : "";
  const dataVal = inputData ? inputData.value : "";
  const horaInicio = inputHoraInicio ? inputHoraInicio.value : "";
  const horaFim = inputHoraFim ? inputHoraFim.value : "";

  const pacoteSelection = selectItem ? selectItem.value || null : null;
  const preco = safeNumFromInputEl(inputPreco);
  const valorFinalInput = safeNumFromInputEl(inputValorFinal);

  // required checks
  if (!cliente) { Swal.fire({ title: "Atenção", text: "Preencha o nome do cliente.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!telefone) { Swal.fire({ title: "Atenção", text: "Preencha o telefone.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!dataVal) { Swal.fire({ title: "Atenção", text: "Escolha a data do evento.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!horaInicio) { Swal.fire({ title: "Atenção", text: "Informe o horário de início.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!horaFim) { Swal.fire({ title: "Atenção", text: "Informe o horário fim.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!pacoteSelection) { Swal.fire({ title: "Atenção", text: "Selecione um item ou pacote.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!preco || preco <= 0) { Swal.fire({ title: "Atenção", text: "Preço inválido.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!valorFinalInput || valorFinalInput <= 0) { Swal.fire({ title: "Atenção", text: "Valor final inválido.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }
  if (!rua || !numero || !bairro || !cidade) { Swal.fire({ title: "Atenção", text: "Preencha o endereço completo.", icon: "warning", customClass: { popup: 'swal-high-z' } }); return; }

  // gather common fields
  const id = inputId ? inputId.value || null : null;
  const desconto = Math.max(0, safeNumFromInputEl(inputDesconto));
  const entrada = Math.max(0, safeNumFromInputEl(inputEntrada));
  let valorFinal = safeNumFromInputEl(inputValorFinal);
  if (!valorFinal || valorFinal === 0) valorFinal = Math.max(0, preco - desconto);
  if (valorFinal < 0) valorFinal = 0;

  const monitores = Array.from(document.querySelectorAll(".chk-monitor:checked")).map(cb => cb.value);
  const observacao = inputObservacao ? inputObservacao.value : "";

  // PREPARE requestedItems array for estoque check
  let requestedItems = [];
  try {
    if (pacoteSelection && pacoteSelection.startsWith("pacote_")) {
      const pacId = pacoteSelection.replace(/^pacote_/, "");
      const pac = STATE.pacotes.find(p => p.id === pacId);
      if (pac) {
        requestedItems = (window.regrasNegocio && window.regrasNegocio.pacoteToItens) ? window.regrasNegocio.pacoteToItens(pac) : (pac.itens || []);
      } else {
        const snapPac = await db.collection("pacotes").doc(pacId).get();
        if (snapPac.exists) {
          const pacData = snapPac.data();
          requestedItems = (window.regrasNegocio && window.regrasNegocio.pacoteToItens) ? window.regrasNegocio.pacoteToItens(pacData) : (pacData.itens || []);
        }
      }
    } else if (pacoteSelection && pacoteSelection.startsWith("item_")) {
      requestedItems = [pacoteSelection.replace(/^item_/, "")];
    } else {
      requestedItems = [pacoteSelection || ""];
    }
  } catch (err) {
    console.warn("Erro ao montar requestedItems:", err);
    requestedItems = [];
  }

  const itens_reservados = [...requestedItems];

  // get existing bookings in same date
  let existingBookings = [];
  try {
    if (db) {
      const q = await db.collection("agendamentos").where("data", "==", dataVal).get();
      existingBookings = q.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn("Erro ao buscar agendamentos existentes para checagem de estoque", err);
  }

  // ---------- CHECAR DUPLICIDADE ----------
  const formData = {
  id,
  data: dataVal,           // <<<<<< ADICIONADO
  horario: horaInicio,
  endereco: { rua, numero, bairro, cidade }
};
  const agendamentoDuplicado = checarDuplicidade(existingBookings, formData);
  if (agendamentoDuplicado) {
    Swal.fire({
      title: "Duplicidade detectada",
      text: "Este agendamento ja existe.",
      icon: "warning",
      customClass: { popup: 'swal-high-z' }
    });
    return; // bloqueia apenas duplicados reais
  }

  // CALL ASYNC CHECK for estoque
  try {
    if (window.regrasNegocio && window.regrasNegocio.checkConflitoPorEstoqueAsync) {
      const result = await window.regrasNegocio.checkConflitoPorEstoqueAsync(requestedItems, existingBookings, id || null, horaInicio,
  horaFim 
        );
      if (!result.ok) {
  const p = result.problems && result.problems[0];
  const itemName = p && p.item ? p.item : (result.warningItem || "um item");
        
  let msg = `Ops — não é possível realizar este agendamento. O brinquedo "${itemName}" não está disponível neste horário.`;

  if (p && p.reason === "INTERVALO_MENOR_1H") {
    msg = "Intervalo inferior a 1 hora entre agendamentos. Não é possível agendar.";
  }

  await Swal.fire({
    title: "Conflito de agendamento",
    text: msg,
    icon: "warning",
    customClass: { popup: 'swal-high-z' }
  });
  return;
}

/* ⚠️ ALERTA (1h até 1h30) */
if (result.warning) {
  const resp = await Swal.fire({
    icon: "warning",
    title: "Intervalo curto entre agendamentos",
    html: `
      Existe apenas um curto intervalo entre este agendamento e outro.<br><br>
      <b>Observação:</b> verifique a distância entre os eventos.
    `,
    showCancelButton: true,
    confirmButtonText: "Agendar mesmo assim",
    cancelButtonText: "Cancelar",
    customClass: { popup: 'swal-high-z' }
  });

  if (!resp.isConfirmed) return;
}
    }
  } catch (err) {
    console.error("Erro ao validar conflito de estoque:", err);
    await Swal.fire({ title: "Erro", text: "Não foi possível verificar estoque. Tente novamente.", icon: "error", customClass: { popup: 'swal-high-z' } });
    return;
  }

  // Build dados object
  const dados = {
    cliente,
    telefone,
    data: dataVal,
    horario: horaInicio,
    hora_fim: horaFim,
    endereco: { rua, numero, bairro, cidade },
    pacoteId: pacoteSelection,
    pacoteNome: (selectItem && selectItem.selectedOptions[0]) ? selectItem.selectedOptions[0].textContent : "",

    itens_reservados,
    preco,
    desconto,
    entrada,
    valor_final: valorFinal,
    monitores,
    observacao,
    status: entrada > 0 ? "confirmado" : "pendente",
    atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
  };

  let comprovantesFinal = [...STATE.comprovantesExistentes];

  dados.comprovantes = comprovantesFinal;

try {
  let docRef;
  if (id) {
    docRef = db.collection("agendamentos").doc(id);
    await docRef.set(dados, { merge: true });
  } else {
    docRef = await db.collection("agendamentos").add(dados);
  }

  // 🔹 AGORA o docId existe de verdade
  const docId = id || docRef.id;

  // =====================================================
  // 🔹 UPLOAD DE COMPROVANTES (LOCAL CORRETO)
  // =====================================================
  if (STATE.comprovantesNovos.length > 0) {
    Swal.fire({
      title: "Enviando comprovantes...",
      didOpen: () => Swal.showLoading(),
      customClass: { popup: "swal-high-z" }
    });

    const files = STATE.comprovantesNovos.map(o => o.file);
    const uploaded = await uploadComprovantesFiles(files, docId);

    const comprovantesFinal = [
      ...STATE.comprovantesExistentes,
      ...uploaded
    ];

    await db.collection("agendamentos")
      .doc(docId)
      .update({ comprovantes: comprovantesFinal });

    // 🔹 LIMPA ESTADO (evita duplicação futura)
    STATE.comprovantesExistentes = comprovantesFinal;
    STATE.comprovantesNovos = [];

    Swal.close();
  }

  // ============================================
// 🔹 DEFINE STATUS FINAL (COM ALERTA)
// ============================================
  let statusFinal = formData.status || "pendente";

// 🔴 DATA PASSADA → CONFIRMAÇÃO
if (isDataPassadaYMD(formData.data)) {
  const res = await Swal.fire({
    title: "Data já passou",
    text: "Este agendamento será salvo como CONCLUÍDO. Deseja continuar?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, salvar como concluído",
    cancelButtonText: "Cancelar",
    customClass: { popup: "swal-high-z" }
  });

  if (!res.isConfirmed) {
    return; // ⛔ cancela o salvamento
  }

  statusFinal = "concluido";
}
// =====================================================
// 🔹 PREPARA UPDATE
// =====================================================
const updateData = {
  observacao,
  atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
};

// =====================================================
// 🔹 UPDATE FINAL
// =====================================================
await db.collection("agendamentos").doc(docId).update(updateData);

  Swal.fire({
    title: "OK",
    text: id ? "Agendamento atualizado." : "Agendamento criado.",
    icon: "success",
    customClass: { popup: "swal-high-z" }
  });

  fecharModal();
  await carregarAgendamentosPreservandoFiltro();

} catch (err) {
  console.error("salvarAgendamento:", err);
  Swal.fire({
    title: "Erro",
    text: "Não foi possível salvar o agendamento.",
    icon: "error",
    customClass: { popup: "swal-high-z" }
  });
}
  }

// ---------- EVENTOS UI / MÁSCARAS ----------
function safeAttach(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

safeAttach(btnFiltrar, "click", aplicarFiltros);
safeAttach(btnNovoAg, "click", () => abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + "T00:00:00") : null));
safeAttach(btnCancelar, "click", fecharModal);
safeAttach(btnSalvar, "click", salvarAgendamento);

safeAttach(inputHoraInicio, "change", e => { if (inputHoraFim) inputHoraFim.value = calcularHoraFim(e.target.value); });
safeAttach(inputHoraInicio, "blur", e => { if (inputHoraFim && !inputHoraFim.value) inputHoraFim.value = calcularHoraFim(e.target.value); });

// telefone mask
if (inputTelefone) {
  inputTelefone.addEventListener("input", e => { e.target.value = maskTelefone(e.target.value); });
}

// when select item changes -> set preco and recalc valor final and restante
if (selectItem) {
  selectItem.addEventListener("change", e => {
    const opt = e.target.selectedOptions[0];
    if (!opt) { if (inputPreco) inputPreco.value = ""; return; }
    const raw = opt.dataset.valor;
    let p = Number(raw);
    if (isNaN(p)) p = parseCurrencyToNumber(raw);
    setCurrencyInput(inputPreco, p);
    const desconto = safeNumFromInputEl(inputDesconto);
    const vf = Math.max(0, p - desconto);
    setCurrencyInput(inputValorFinal, vf);
    const entradaNow = safeNumFromInputEl(inputEntrada);
    setCurrencyInput(inputRestante, Math.max(0, vf - entradaNow));
  });
}

// money fields behaviour: focus=>plain number, input=>allow numeric characters, blur=>format to R$
const moneyFields = [inputPreco, inputDesconto, inputEntrada, inputValorFinal];
moneyFields.forEach(el => {
  if (!el) return;
  el.addEventListener("focus", () => {
    const n = parseCurrencyToNumber(el.value);
    el.value = n === 0 ? "" : n.toFixed(2);
  });
  el.addEventListener("input", () => {
    const cleaned = String(el.value || "").replace(/[^\d,.\-]/g, "");
    el.value = cleaned;
    const precoNow = safeNumFromInputEl(inputPreco);
    const descontoNow = safeNumFromInputEl(inputDesconto);
    const computed = Math.max(0, precoNow - descontoNow);
    if (inputValorFinal && (el === inputPreco || el === inputDesconto)) {
      inputValorFinal.value = computed.toFixed(2);
    }
    const entradaNow = safeNumFromInputEl(inputEntrada);
    const vfNow = safeNumFromInputEl(inputValorFinal) || computed;
    if (inputRestante) setCurrencyInput(inputRestante, Math.max(0, vfNow - entradaNow));
  });
  el.addEventListener("blur", () => {
    const n = parseCurrencyToNumber(el.value);
    if (n === 0) el.value = "";
    else el.value = formatNumberToCurrencyString(n);
    const precoNow = safeNumFromInputEl(inputPreco);
    const descontoNow = safeNumFromInputEl(inputDesconto);
    const vf = Math.max(0, precoNow - descontoNow);
    const currentVF = safeNumFromInputEl(inputValorFinal);
    if (!currentVF || Math.abs(currentVF - vf) < 0.001) {
      setCurrencyInput(inputValorFinal, vf);
    } else {
      setCurrencyInput(inputValorFinal, currentVF);
    }
    const entradaNow = safeNumFromInputEl(inputEntrada);
    if (inputRestante) setCurrencyInput(inputRestante, Math.max(0, safeNumFromInputEl(inputValorFinal) - entradaNow));
  });
});

// ensure entrada blur formatted
if (inputEntrada) inputEntrada.addEventListener("blur", () => {
  const n = parseCurrencyToNumber(inputEntrada.value);
  if (n === 0) inputEntrada.value = ""; else inputEntrada.value = formatNumberToCurrencyString(n);
  const vfNow = safeNumFromInputEl(inputValorFinal);
  setCurrencyInput(inputRestante, Math.max(0, vfNow - safeNumFromInputEl(inputEntrada)));
});

// ---------- DETALHES MODAL (read-only) ----------
function abrirModalDetalhes(id) {
  if (!id || !db) return;

  // remove existing if any
  const existing = document.getElementById("modalDetalhesAg");
  if (existing) existing.remove();

  // fetch doc
  db.collection("agendamentos").doc(id).get().then(doc => {
    if (!doc.exists) { Swal.fire({ title: "Erro", text: "Agendamento não encontrado", icon: "error", customClass: { popup: 'swal-high-z' } }); return; }
    const a = doc.data();

    const div = document.createElement("div");
    div.id = "modalDetalhesAg";
    div.className = "modal active";
    // build HTML: left column general, right column valores + comprovantes
    div.innerHTML = `
      <div class="modal-content" style="max-width:900px;">
        <h2>Detalhes - ${a.cliente || ""}</h2>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-top:10px;">
          <div>
            <label>Cliente</label><div>${a.cliente || ""}</div>
            <label>Telefone</label><div>${a.telefone || ""}</div>
            <label>Data</label><div>${a.data || ""}</div>
            <label>Horário</label><div>${(a.horario || "") + (a.hora_fim ? " — " + (a.hora_fim||"") : "")}</div>
            <label>Endereço</label><div>${(a.endereco?.rua||"")}${a.endereco?.numero ? ", Nº " + a.endereco.numero : ""} ${(a.endereco?.bairro ? " — " + a.endereco.bairro : "")} ${(a.endereco?.cidade ? " / " + a.endereco.cidade : "")}</div>
          </div>
          <div>
            <label>Item / Pacote</label><div>${a.pacoteNome || a.itemNome || a.pacoteId || ""}</div>
            <label>Preço</label><div>${formatNumberToCurrencyString(Number(a.preco || 0))}</div>
            <label>Desconto</label><div>${formatNumberToCurrencyString(Number(a.desconto || 0))}</div>
            <label>Valor final</label><div>${formatNumberToCurrencyString(Number(a.valor_final || 0))}</div>
            <label>Entrada</label><div>${formatNumberToCurrencyString(Number(a.entrada || 0))}</div>
            <label>Restante</label><div>${formatNumberToCurrencyString(Math.max(0, Number(a.valor_final || 0) - Number(a.entrada || 0)))}</div>
          </div>
        </div>

        <div style="margin-top:12px;">
          <label>Observação</label>
          <div style="white-space:pre-wrap; background:#111; padding:10px; border-radius:6px; border:1px solid #222;">${a.observacao || ""}</div>
        </div>

        <div style="margin-top:12px;">
          <label>Comprovantes</label>
          <div id="detalhes-comprovantes" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;"></div>
        </div>

        <div style="margin-top:18px; display:flex; justify-content:space-between;">
          <div>
            <button class="btn btn-dark" id="btnFecharDetalhes">Fechar</button>
          </div>
          <div>
            <button class="btn btn-dark" id="btnGerarComprovante">Comprovante de agendamento</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(div);

    // render comprovantes as readOnly
    const compsEl = document.getElementById("detalhes-comprovantes");
    if (compsEl) {
      const comps = a.comprovantes || [];
      comps.forEach(c => {
        const w = document.createElement("div");
        w.className = "comp-wrapper";
        const img = document.createElement("img");
        img.src = c.url;
        img.onclick = () => window.open(c.url, "_blank");
        w.appendChild(img);
        compsEl.appendChild(w);
      });
    }

    document.getElementById("btnFecharDetalhes").onclick = () => {
      const el = document.getElementById("modalDetalhesAg");
      if (el) el.remove();
    };

    // generate PNG comprovante
    document.getElementById("btnGerarComprovante").onclick = async () => {
      if ((a.status || "").toLowerCase() === "cancelado") {
        await Swal.fire({ title: "Indisponível", text: "Agendamento cancelado não pode gerar comprovante.", icon: "info", customClass: { popup: 'swal-high-z' } });
        return;
      }
      try {
        await gerarComprovantePNG(a);
      } catch (err) {
        console.error("Erro gerando comprovante:", err);
        Swal.fire({ title: "Erro", text: "Não foi possível gerar comprovante.", icon: "error", customClass: { popup: 'swal-high-z' } });
      }
    };
  }).catch(err => {
    console.error("abrirModalDetalhes:", err);
    Swal.fire({ title: "Erro", text: "Não foi possível abrir detalhes.", icon: "error", customClass: { popup: 'swal-high-z' } });
  });
}

function carregarImagem(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Não foi possível carregar a imagem: " + url));
    img.src = url;
  });
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

// ---------- GERAR COMPROVANTE (PNG) ----------
async function gerarComprovantePNG(agendamentoData) {

  const W = 1200;
  const H = 820;
  const MARGIN = 40;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // ===== FUNDO =====
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);

  // ===== BORDA =====
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, W - 20, H - 20);

  // ===== LOGO =====
  const LOGO_URL = "https://abranches3318.github.io/dashboard-Divertilandia/img/logo.png";

  try {
    const logo = await carregarImagem(LOGO_URL);
    const logoW = 180;
    const logoH = Math.round(logo.height * (logoW / logo.width));
    ctx.drawImage(logo, W - logoW - MARGIN, MARGIN, logoW, logoH);
  } catch (e) {
    console.warn("Logo não carregada no comprovante:", e);
  }

  // ===== TÍTULO =====
  ctx.fillStyle = "#000";
  ctx.font = "bold 30px Arial";
  ctx.textAlign = "left";
  ctx.fillText("COMPROVANTE DE AGENDAMENTO", MARGIN, 70);

  // ===== TABELA =====
  let y = 120;
  const rowH = 36;
  const labelX = MARGIN;
  const valueX = 320;

  function row(label, value) {
    ctx.font = "bold 18px Arial";
    ctx.fillText(label, labelX, y);
    ctx.font = "16px Arial";
    wrapText(ctx, String(value || ""), valueX, y - 14, W - valueX - MARGIN, 20);
    y += rowH;
  }

  row("Cliente:", agendamentoData.cliente);
  row("Telefone:", agendamentoData.telefone);
  row("Data:", agendamentoData.data);
  row("Horário:", `${agendamentoData.horario || ""}${agendamentoData.hora_fim ? " — " + agendamentoData.hora_fim : ""}`);

  const end =
    `${agendamentoData.endereco?.rua || ""}${agendamentoData.endereco?.numero ? ", Nº " + agendamentoData.endereco.numero : ""}` +
    `${agendamentoData.endereco?.bairro ? " — " + agendamentoData.endereco.bairro : ""}` +
    `${agendamentoData.endereco?.cidade ? " / " + agendamentoData.endereco.cidade : ""}`;

  row("Endereço:", end);
  row("Item / Pacote:", agendamentoData.pacoteNome || agendamentoData.itemNome || "");
  row("Preço:", formatNumberToCurrencyString(Number(agendamentoData.preco || 0)));
  row("Desconto:", formatNumberToCurrencyString(Number(agendamentoData.desconto || 0)));
  row("Entrada:", formatNumberToCurrencyString(Number(agendamentoData.entrada || 0)));
  row("Valor final:", formatNumberToCurrencyString(Number(agendamentoData.valor_final || 0)));

  if (agendamentoData.observacao) {
    row("Observação:", agendamentoData.observacao);
  }

  // ===== LINHA DIVISÓRIA =====
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MARGIN, H - 130);
  ctx.lineTo(W - MARGIN, H - 130);
  ctx.stroke();

  // ===== RODAPÉ =====
  ctx.textAlign = "center";
  ctx.fillStyle = "#000";
  ctx.font = "bold 16px Arial";
  ctx.fillText("DIVERTILANDIA FESTA", W / 2, H - 95);

  ctx.font = "14px Arial";
  ctx.fillText("CNPJ 32.375.178/0001-03", W / 2, H - 70);
  ctx.fillText("(27) 99905-9753", W / 2, H - 50);

  // ===== DOWNLOAD =====
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = `comprovante_ag_${(agendamentoData.cliente || "cliente").replace(/\s+/g, "_")}.png`;
  a.click();
}

// ---------- INIT ----------
async function init() {
  try {
    if (painelTabela) painelTabela.style.display = "none"; // start hidden
    await carregarPacotesEItens();
    await carregarMonitores();
    await carregarAgendamentos();

const params = new URLSearchParams(location.search);
const openId = params.get("open");
const isNew = params.get("new") === "1";
const dateParam = params.get("date");

/* PRIORIDADE 1 — abrir detalhes direto */
if (openId) {
  const ag = STATE.todos.find(a => a.id === openId);

  if (ag && filtroData) {
    filtroData.value = ag.data;
    aplicarFiltros();
  }

  setTimeout(() => {
    filtrarSomenteAgendamento(openId);
    abrirModalDetalhes(openId);
  }, 100);
}
/* PRIORIDADE 2 — criar novo com data */
else if (isNew && dateParam) {
  abrirModalNovo(new Date(dateParam + "T00:00:00"));
}
  } catch (err) {
    console.error("init agendamentos:", err);
  }
}
document.addEventListener("DOMContentLoaded", init);

// ---------- EXPORT API ----------
window.agendamentosModule = window.agendamentosModule || {};
window.agendamentosModule.reload = carregarAgendamentos;
window.agendamentosModule.openModalNew = abrirModalNovo;
window.abrirModalDetalhes = abrirModalDetalhes;

