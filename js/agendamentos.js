// ==============================================
// agendamentos.js — versão consolidada e corrigida
// ==============================================

// Base do repositório (GitHub Pages)
const AG_BASE = "/dashboard-Divertilandia/";

// FIREBASE (compat) - espera firebase já carregado via <script>
const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
const auth = window.auth || (firebase && firebase.auth ? firebase.auth() : null);

if (!db) console.error("Firestore não encontrado. Verifique firebase-config.js");

// =====================
// ELEMENTOS DOM (garantir que IDs existam no HTML)
// =====================
const painelTabela = document.getElementById("painelTabela"); // opcional, envoltório da tabela
const listaEl = document.getElementById("listaAgendamentos");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnNovoAg = document.getElementById("btnNovoAg");

const filtroData = document.getElementById("filtroData");
const filtroCliente = document.getElementById("filtroCliente");
const filtroTelefone = document.getElementById("filtroTelefone");
const filtroStatus = document.getElementById("filtroStatus");

const modal = document.getElementById("modalAgendamento");
const modalTitulo = document.getElementById("modalTitulo");

// campos do modal (certifique-se de que existam com esses IDs)
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
const containerMonitores = document.getElementById("ag-monitores");

const btnCancelar = document.getElementById("btnCancelar");
const btnSalvar = document.getElementById("btnSalvarAg");

// =====================
// ESTADO
// =====================
const STATE = {
  todos: [],
  pacotes: [],
  monitores: []
};

// =====================
// HELPERS
// =====================
function formatMoneyNumber(n) {
  if (n === "" || n == null || isNaN(Number(n))) return 0;
  return Number(n);
}
function formatMoney(n) {
  n = Number(n || 0);
  return "R$ " + n.toFixed(2).replace(".", ",");
}
function parseDateField(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (typeof value === "string") {
    // se for YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + "T00:00:00");
    return new Date(value);
  }
  if (value instanceof Date) return value;
  return new Date(value);
}
function toYMD(date) {
  if (!date) return "";
  const d = (date.toDate ? date.toDate() : date);
  return d.toISOString().slice(0, 10);
}
function calcularHoraFim(horaInicio) {
  if (!horaInicio) return "";
  const parts = horaInicio.split(":").map(x => Number(x));
  if (parts.length === 0 || isNaN(parts[0])) return "";
  const dt = new Date();
  dt.setHours(parts[0], parts[1] || 0, 0, 0);
  dt.setHours(dt.getHours() + 4);
  return String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
}

// máscara de telefone simples (formatação ao digitar)
// formata para (99) 99999-9999 e tenta corrigir ao apagar
function maskTelefone(value) {
  if (!value) return "";
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return "(" + digits;
  if (digits.length <= 6) return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
  if (digits.length <= 10) return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
  return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
}

// valida valor não negativo e retorna number
function safeNumberInput(el) {
  if (!el) return 0;
  let v = String(el.value || "").replace(/[^\d.,-]/g, "").replace(",", ".");
  if (v === "" || isNaN(Number(v))) return 0;
  let num = Number(v);
  if (num < 0) num = 0;
  return num;
}

// atualiza campo monetário (exibe com R$)
function updateMoneyInputDisplay(el) {
  if (!el) return;
  const n = safeNumberInput(el);
  el.value = n === 0 ? "" : n.toFixed(2);
}

// =====================
// RENDER TABELA
// =====================
function renderTabela(lista) {
  if (!listaEl) return;
  listaEl.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    if (painelTabela) painelTabela.style.display = "none";
    return;
  }
  if (painelTabela) painelTabela.style.display = "block";

  lista.forEach(a => {
    // criar elemento TR corretamente (corrige erro tr is not defined)
    const tr = document.createElement("tr");

    const dt = parseDateField(a.data);
    const dataStr = dt ? dt.toLocaleDateString() : (a.data || "");

    const cliente = a.cliente || a.cliente_nome || "---";
    const telefone = a.telefone || a.tel || "---";
    const status = a.status || "pendente";

    // endereço (obj)
    const enderecoObj = a.endereco || {};
    const enderecoStr = (
      (enderecoObj.rua || "") +
      (enderecoObj.numero ? ", Nº " + enderecoObj.numero : "") +
      (enderecoObj.bairro ? " — " + enderecoObj.bairro : "") +
      (enderecoObj.cidade ? " / " + enderecoObj.cidade : "")
    ) || "---";

    // pacote/item nome e valor (se houver)
    let pacoteLabel = "";
    let pacoteValor = 0;
    if (a.pacoteId) {
      // tentar achar no cache
      const p = STATE.pacotes.find(x => x.id === a.pacoteId);
      if (p) {
        pacoteLabel = p.nome || p.title || a.pacoteId;
        pacoteValor = Number(p.valor || 0);
      } else {
        pacoteLabel = a.pacoteNome || a.pacoteId;
        pacoteValor = Number(a.preco || a.valor || 0);
      }
    } else {
      pacoteLabel = a.item_nome || a.item || "";
      pacoteValor = Number(a.preco || a.valor || 0);
    }

    // valor final (preferência: valor_final > preco > entrada)
    const valorNum = Number(a.valor_final ?? a.preco ?? a.valor ?? a.entrada ?? 0);

    tr.innerHTML = `
      <td>${dataStr} ${a.horario || ""}</td>
      <td>${cliente}</td>
      <td>${telefone}</td>
      <td>${enderecoStr}</td>
      <td>${pacoteLabel || "---"}</td>
      <td>${formatMoney(valorNum)}</td>
      <td>${status}</td>
      <td>
        <button class="btn btn-dark btn-editar" data-id="${a.id}">Editar</button>
        <button class="btn btn-danger btn-excluir" data-id="${a.id}">Cancelar</button>
      </td>
    `;
    listaEl.appendChild(tr);
  });

  // ligar eventos
  listaEl.querySelectorAll(".btn-editar").forEach(b => {
    b.removeEventListener("click", onEditarClick);
    b.addEventListener("click", onEditarClick);
  });
  listaEl.querySelectorAll(".btn-excluir").forEach(b => {
    b.removeEventListener("click", onExcluirClick);
    b.addEventListener("click", onExcluirClick);
  });
}

// event handlers helpers
function onEditarClick(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!id) return;
  abrirModalEditar(id);
}
async function onExcluirClick(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!id) return;
  await cancelarAgendamento(id);
}

// =====================
// CANCELAR AGENDAMENTO
// =====================
async function cancelarAgendamento(id) {
  const res = await Swal.fire({
    title: "Cancelar agendamento?",
    text: "O agendamento será marcado como cancelado (não será removido).",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim, cancelar"
  });
  if (!res.isConfirmed) return;
  try {
    await db.collection("agendamentos").doc(id).update({ status: "cancelado" });
    Swal.fire("OK", "Agendamento cancelado.", "success");
    await carregarAgendamentos();
  } catch (err) {
    console.error(err);
    Swal.fire("Erro", "Não foi possível cancelar.", "error");
  }
}

// =====================
// CARREGAR DADOS AUX (pacotes, monitores)
// =====================
async function carregarPacotes() {
  if (!db) return;
  try {
    const snap = await db.collection("pacotes").get();
    STATE.pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (selectItem) {
      selectItem.innerHTML = `<option value="">Selecione...</option>`;
      STATE.pacotes.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.dataset.valor = Number(p.valor || 0);
        opt.textContent = `${p.nome || p.title || p.id} - R$ ${Number(p.valor || 0).toFixed(2)}`;
        selectItem.appendChild(opt);
      });
    }
  } catch (err) {
    console.error("carregarPacotes:", err);
  }
}

async function carregarMonitores() {
  if (!db) return;
  try {
    const snap = await db.collection("monitores").get();
    STATE.monitores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (containerMonitores) {
      containerMonitores.innerHTML = "";
      STATE.monitores.forEach(m => {
        const wrapper = document.createElement("div");
        wrapper.className = "chk-line";
        wrapper.innerHTML = `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="chk-monitor" value="${m.id}"> ${m.nome || m.name || m.id}</label>`;
        containerMonitores.appendChild(wrapper);
      });
    }
  } catch (err) {
    console.error("carregarMonitores:", err);
  }
}

// =====================
// CARREGAR AGENDAMENTOS (lista completa)
// =====================
async function carregarAgendamentos() {
  if (!db) return;
  try {
    const snap = await db.collection("agendamentos")
      .orderBy("data", "asc")
      .orderBy("horario", "asc")
      .get();
    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTabela(STATE.todos);
  } catch (err) {
    console.error("carregarAgendamentos:", err);
    Swal.fire("Erro", "Não foi possível carregar agendamentos.", "error");
  }
}

// =====================
// FILTRAR (com feedback quando vazio)
// =====================
function aplicarFiltros() {
  let lista = [...(STATE.todos || [])];

  if (filtroData && filtroData.value) {
    lista = lista.filter(a => toYMD(parseDateField(a.data)) === filtroData.value);
  }
  if (filtroCliente && filtroCliente.value) {
    const q = filtroCliente.value.toLowerCase();
    lista = lista.filter(a => (a.cliente || a.cliente_nome || "").toLowerCase().includes(q));
  }
  if (filtroTelefone && filtroTelefone.value) {
    const q = filtroTelefone.value.replace(/\D/g, "");
    lista = lista.filter(a => ((a.telefone || "") + "").replace(/\D/g, "").includes(q));
  }
  if (filtroStatus && filtroStatus.value) {
    lista = lista.filter(a => (a.status || "") === filtroStatus.value);
  }

  if (!lista.length) {
    // mostrar SweetAlert com botão para abrir modal novo
    Swal.fire({
      title: "Nenhum agendamento encontrado",
      text: "Deseja criar um novo agendamento para este filtro?",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Criar novo",
      cancelButtonText: "Fechar"
    }).then(res => {
      if (res.isConfirmed) abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + "T00:00:00") : null);
    });
    // esconder tabela
    if (painelTabela) painelTabela.style.display = "none";
    if (listaEl) listaEl.innerHTML = "";
    return;
  }

  renderTabela(lista);
}

// =====================
// MODAL: abrir / fechar / preencher
// =====================
function abrirModalNovo(dataInicial = null) {
  if (!modal) return;
  modalTitulo && (modalTitulo.textContent = "Novo Agendamento");

  // limpar campos
  [
    inputId, inputCliente, inputTelefone, inputEndRua, inputEndNumero, inputEndBairro, inputEndCidade,
    inputData, inputHoraInicio, inputHoraFim, selectItem, inputPreco, inputDesconto, inputEntrada, inputValorFinal
  ].forEach(el => { if (el) el.value = ""; });

  if (dataInicial && inputData) inputData.value = toYMD(dataInicial);

  // desmarcar monitores
  document.querySelectorAll(".chk-monitor").forEach(cb => cb.checked = false);

  modal.classList.add("active");

  // foco inicial
  if (inputCliente) inputCliente.focus();
}

async function abrirModalEditar(id) {
  if (!id) return;
  if (!db) return;
  try {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Erro", "Agendamento não encontrado", "error");
      return;
    }
    const a = { id: doc.id, ...doc.data() };

    modalTitulo && (modalTitulo.textContent = "Editar Agendamento");

    if (inputId) inputId.value = a.id || "";
    if (inputCliente) inputCliente.value = a.cliente || "";
    if (inputTelefone) inputTelefone.value = a.telefone || "";
    if (inputEndRua) inputEndRua.value = a.endereco?.rua || "";
    if (inputEndNumero) inputEndNumero.value = a.endereco?.numero || "";
    if (inputEndBairro) inputEndBairro.value = a.endereco?.bairro || "";
    if (inputEndCidade) inputEndCidade.value = a.endereco?.cidade || "";
    if (inputData) inputData.value = toYMD(parseDateField(a.data));
    if (inputHoraInicio) inputHoraInicio.value = a.horario || "";
    if (inputHoraFim) inputHoraFim.value = a.hora_fim || "";
    if (selectItem) selectItem.value = a.pacoteId || "";
    if (inputPreco) inputPreco.value = a.preco || a.valor || "";
    if (inputDesconto) inputDesconto.value = a.desconto || 0;
    if (inputEntrada) inputEntrada.value = a.entrada || 0;
    if (inputValorFinal) inputValorFinal.value = a.valor_final || a.preco || "";

    // marcar monitores
    document.querySelectorAll(".chk-monitor").forEach(cb => {
      cb.checked = Array.isArray(a.monitores) ? a.monitores.includes(cb.value) : false;
    });

    modal.classList.add("active");
  } catch (err) {
    console.error("abrirModalEditar:", err);
    Swal.fire("Erro", "Não foi possível abrir edição.", "error");
  }
}

function fecharModal() {
  if (!modal) return;
  modal.classList.remove("active");
}

// =====================
// SALVAR AGENDAMENTO (validações + cálculo valorFinal + prevenção de valores negativos)
// =====================
async function salvarAgendamento() {
  if (!db) return;

  const id = inputId ? inputId.value || null : null;
  const cliente = inputCliente ? inputCliente.value.trim() : "";
  const telefone = inputTelefone ? inputTelefone.value.trim() : "";
  const rua = inputEndRua ? inputEndRua.value.trim() : "";
  const numero = inputEndNumero ? inputEndNumero.value.trim() : "";
  const bairro = inputEndBairro ? inputEndBairro.value.trim() : "";
  const cidade = inputEndCidade ? inputEndCidade.value.trim() : "";
  const dataVal = inputData ? inputData.value : "";
  const horaInicio = inputHoraInicio ? inputHoraInicio.value : "";
  const horaFim = inputHoraFim ? inputHoraFim.value : "";
  const pacoteId = selectItem ? selectItem.value || null : null;

  const preco = formatMoneyNumber(inputPreco ? inputPreco.value : 0);
  const desconto = Math.max(0, formatMoneyNumber(inputDesconto ? inputDesconto.value : 0));
  const entrada = Math.max(0, formatMoneyNumber(inputEntrada ? inputEntrada.value : 0));
  let valorFinal = formatMoneyNumber(inputValorFinal ? inputValorFinal.value : 0);

  // aplicar regra: valor_final = preco - desconto (se valorFinal vazio)
  if (!valorFinal || valorFinal === 0) {
    valorFinal = preco - desconto;
  }
  if (valorFinal < 0) valorFinal = 0;

  // validações
  if (!cliente) { Swal.fire("Atenção", "Preencha o nome do cliente.", "warning"); return; }
  if (!dataVal) { Swal.fire("Atenção", "Escolha a data do evento.", "warning"); return; }
  if (!horaInicio) { Swal.fire("Atenção", "Informe o horário de início.", "warning"); return; }

  // montar objeto para salvar
  const dados = {
    cliente,
    telefone,
    data: dataVal, // armazenar 'YYYY-MM-DD'
    horario: horaInicio,
    hora_fim: horaFim || calcularHoraFim(horaInicio),
    endereco: { rua, numero, bairro, cidade },
    pacoteId: pacoteId || null,
    preco: preco,
    desconto: desconto,
    entrada: entrada,
    valor_final: valorFinal,
    monitores: Array.from(document.querySelectorAll(".chk-monitor:checked")).map(cb => cb.value),
    status: (entrada && entrada > 0) ? "confirmado" : "pendente",
    atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    // (opcional) checagem simples de conflito por data/horario/pacote:
    // não removi implementações complexas para não bloquear — mas já avisará se houver agendamentos no mesmo horário com mesmo pacoteId em excesso
    if (pacoteId) {
      const dupSnap = await db.collection("agendamentos")
        .where("data", "==", dataVal)
        .where("horario", "==", horaInicio)
        .where("pacoteId", "==", pacoteId)
        .get();
      // se existe outro agendamento pra mesmo pacote e mesmo horário, apenas alerta (não bloqueia por agora)
      if (!id && dupSnap.size > 0) {
        const proceed = await Swal.fire({
          title: "Possível conflito",
          text: "Já existe um agendamento com o mesmo pacote/horário. Deseja prosseguir?",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Prosseguir",
          cancelButtonText: "Cancelar"
        });
        if (!proceed.isConfirmed) return;
      }
    }

    if (id) {
      await db.collection("agendamentos").doc(id).set(dados, { merge: true });
      Swal.fire("OK", "Agendamento atualizado.", "success");
    } else {
      dados.criado_em = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("agendamentos").add(dados);
      Swal.fire("OK", "Agendamento criado.", "success");
    }

    fecharModal();
    await carregarAgendamentos();
  } catch (err) {
    console.error("salvarAgendamento:", err);
    Swal.fire("Erro", "Não foi possível salvar o agendamento.", "error");
  }
}

// =====================
// EVENTOS UI / FORMATTING
// =====================

// proteger chamadas caso elementos não existam
if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);
if (btnNovoAg) btnNovoAg.addEventListener("click", () => abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + "T00:00:00") : null));
if (btnCancelar) btnCancelar.addEventListener("click", fecharModal);
if (btnSalvar) btnSalvar.addEventListener("click", salvarAgendamento);

// auto preencher hora fim
if (inputHoraInicio) {
  inputHoraInicio.addEventListener("change", e => {
    if (inputHoraFim) inputHoraFim.value = calcularHoraFim(e.target.value);
  });
  inputHoraInicio.addEventListener("blur", e => {
    if (inputHoraFim && !inputHoraFim.value) inputHoraFim.value = calcularHoraFim(e.target.value);
  });
}

// phone mask
if (inputTelefone) {
  inputTelefone.addEventListener("input", e => {
    const cur = e.target.value;
    const masked = maskTelefone(cur);
    e.target.value = masked;
  });
  // attempt to keep caret reasonable omitted for simplicity
}

// quando selecionar pacote, preencher preco automaticamente e recalcular valor final
if (selectItem) {
  selectItem.addEventListener("change", e => {
    const opt = e.target.selectedOptions[0];
    if (opt && opt.dataset) {
      const v = Number(opt.dataset.valor || 0);
      if (inputPreco) inputPreco.value = v ? v.toFixed(2) : "";
      // recalcular valor final
      const desconto = safeNumberInput(inputDesconto);
      if (inputValorFinal) inputValorFinal.value = Number(Math.max(0, v - desconto)).toFixed(2);
    }
  });
}

// validar e formatar campos monetários (preco, desconto, entrada, valor final)
const moneyFields = [inputPreco, inputDesconto, inputEntrada, inputValorFinal];
moneyFields.forEach(el => {
  if (!el) return;
  // evitar spinners via CSS/HTML; aqui apenas normalizamos valor
  el.addEventListener("input", () => {
    // permitir apenas números e comma/dot
    const raw = String(el.value || "");
    const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
    // atualizar sem formatação agressiva enquanto digita
    el.value = cleaned;
    // recalc valor final live
    const preco = safeNumberInput(inputPreco);
    const desconto = Math.max(0, safeNumberInput(inputDesconto));
    if (inputValorFinal) inputValorFinal.value = Number(Math.max(0, preco - desconto)).toFixed(2);
  });
  el.addEventListener("blur", () => {
    // on blur, format to 2 decimals
    const n = safeNumberInput(el);
    el.value = n === 0 ? "" : Number(n).toFixed(2);
  });
});

// =====================
// INICIALIZAÇÃO
// =====================
async function init() {
  try {
    if (!db) return;
    await carregarPacotes();
    await carregarMonitores();
    await carregarAgendamentos();

    // se ?date=YYYY-MM-DD presente, aplicar
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    if (dateParam && filtroData) {
      filtroData.value = dateParam;
      aplicarFiltros();
    }
  } catch (err) {
    console.error("init:", err);
  }
}
document.addEventListener("DOMContentLoaded", init);

// =====================
// EXPORT / UTILITIES
// =====================
window.agendamentosModule = window.agendamentosModule || {};
window.agendamentosModule.reload = carregarAgendamentos;
window.agendamentosModule.openModalNew = abrirModalNovo;
