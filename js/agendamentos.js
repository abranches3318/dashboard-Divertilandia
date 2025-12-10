// ==============================================
// agendamentos.js — versão corrigida
// Somente problemas ajustados: tabela oculta, item/pacote,
// carregamento de itens, select funcionando, modal habilitado.
// ==============================================

const AG_BASE = "/dashboard-Divertilandia/";

// firebase compat (já carregado no HTML)
const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
const auth = window.auth || (firebase && firebase.auth ? firebase.auth() : null);

// DOM
const painelTabela = document.getElementById("painelTabela");
const listaEl = document.getElementById("listaAgendamentos");

const btnFiltrar = document.getElementById("btnFiltrar");
const btnNovoAg = document.getElementById("btnNovoAg");

const filtroData = document.getElementById("filtroData");
const filtroCliente = document.getElementById("filtroCliente");
const filtroTelefone = document.getElementById("filtroTelefone");
const filtroStatus = document.getElementById("filtroStatus");

const modal = document.getElementById("modalAgendamento");
const modalTitulo = document.getElementById("modalTitulo");

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

// estado local
const STATE = {
  todos: [],
  pacotes: [],
  itens: [],
  monitores: []
};

// ------------- HELPERS -------------
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

// telefone mask
function maskTelefone(value) {
  const d = (value || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return "(" + d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

// currency helpers
function parseCurrencyToNumber(str) {
  if (str == null) return 0;
  if (typeof str === "number") return Number(str);
  let s = String(str).trim();
  s = s.replace(/R\$\s?/, "");
  if (s.indexOf(",") > -1 && s.indexOf(".") > -1) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.indexOf(",") > -1) {
    s = s.replace(",", ".");
  } else {
    s = s.replace(/,/g, "");
  }
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
  if (!n) { el.value = ""; return; }
  el.value = formatNumberToCurrencyString(Number(n));
}

// ------------------------------------------------------
// ------------- RENDER TABELA (corrigido) --------------
// ------------------------------------------------------
function renderTabela(lista) {
  if (!listaEl || !painelTabela) return;

  listaEl.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {

    painelTabela.classList.add("table-hidden");
    painelTabela.classList.remove("table-visible");

    Swal.fire({
      title: "Nenhum agendamento encontrado",
      text: "Deseja criar um novo agendamento?",
      icon: "info",
      showCancelButton: true,
      confirmButtonText: "Criar novo",
      cancelButtonText: "Fechar"
    }).then(res => {
      if (res.isConfirmed) abrirModalNovo();
    });
    return;
  }

  painelTabela.classList.remove("table-hidden");
  painelTabela.classList.add("table-visible");

  lista.forEach(a => {
    const dt = parseDateField(a.data);
    const dateStr = dt ? dt.toLocaleDateString() : (a.data || "---");

    const enderecoStr =
      (a.endereco?.rua || "") +
      (a.endereco?.numero ? ", Nº " + a.endereco.numero : "") +
      (a.endereco?.bairro ? " — " + a.endereco.bairro : "") +
      (a.endereco?.cidade ? " / " + a.endereco.cidade : "");

    const itemName = a.pacoteNome || a.itemNome || a.pacoteId || "---";
    const valor = Number(a.valor_final ?? a.preco ?? 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${dateStr} ${a.horario || ""}</td>
      <td>${a.cliente || "---"}</td>
      <td>${a.telefone || "---"}</td>
      <td>${enderecoStr || "---"}</td>
      <td>${itemName}</td>
      <td>${a.status || "pendente"}</td>
      <td>${formatNumberToCurrencyString(valor)}</td>
      <td>
        <button class="btn btn-dark btn-editar" data-id="${a.id}">Editar</button>
        <button class="btn btn-danger btn-excluir" data-id="${a.id}">Cancelar</button>
      </td>
    `;
    listaEl.appendChild(tr);
  });

  listaEl.querySelectorAll(".btn-editar").forEach(btn => {
    btn.addEventListener("click", onEditarClick);
  });
  listaEl.querySelectorAll(".btn-excluir").forEach(btn => {
    btn.addEventListener("click", onExcluirClick);
  });
}

// ------------------------------------------------------
// ------------- EVENTOS TABELA -------------------------
// ------------------------------------------------------
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

// ------------------------------------------------------
// ------------- CANCELAR --------------------------------
// ------------------------------------------------------
async function cancelarAgendamento(id) {
  const res = await Swal.fire({
    title: "Cancelar agendamento?",
    text: "O agendamento será marcado como cancelado.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sim"
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

// ------------------------------------------------------
// ------------- CARREGAR PACOTES + ITENS ---------------
// TOTALMENTE CORRIGIDO: itens agora carregam corretamente
// ------------------------------------------------------
async function carregarPacotesEItens() {
  if (!db || !selectItem) return;
  selectItem.innerHTML = `<option value="">Selecionar...</option>`;

  try {
    const pacSnap = await db.collection("pacotes").get();
    const itSnap = await db.collection("item").get(); // coleção correta

    STATE.pacotes = pacSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    STATE.itens = itSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // pacotes
    STATE.pacotes.forEach(p => {
      const opt = document.createElement("option");
      opt.value = `pacote_${p.id}`;
      opt.dataset.valor = Number(p.preço ?? p.preco ?? 0);
      opt.textContent = `${p.nome || p.id} (pacote) - R$ ${(opt.dataset.valor).toString().replace(".", ",")}`;
      selectItem.appendChild(opt);
    });

    // itens
    STATE.itens.forEach(i => {
      const opt = document.createElement("option");
      opt.value = `item_${i.id}`;
      opt.dataset.valor = Number(i.preço ?? i.preco ?? 0);
      opt.textContent = `${i.nome || i.id} (item) - R$ ${(opt.dataset.valor).toString().replace(".", ",")}`;
      selectItem.appendChild(opt);
    });

    selectItem.removeAttribute("disabled");

  } catch (err) {
    console.error("carregarPacotesEItens:", err);
  }
}

// ------------------------------------------------------
// ------------- CARREGAR MONITORES ---------------------
// ------------------------------------------------------
async function carregarMonitores() {
  if (!db || !containerMonitores) return;
  try {
    const snap = await db.collection("monitores").get();
    STATE.monitores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    containerMonitores.innerHTML = "";
    STATE.monitores.forEach(m => {
      const div = document.createElement("div");
      div.className = "chk-line";
      div.innerHTML = `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="chk-monitor" value="${m.id}"> ${m.nome || m.id}</label>`;
      containerMonitores.appendChild(div);
    });
  } catch (err) {
    console.error("carregarMonitores:", err);
  }
}

// ------------------------------------------------------
// ------------- CARREGAR AGENDAMENTOS ------------------
// ------------------------------------------------------
async function carregarAgendamentos() {
  if (!db) return;
  try {
    if (painelTabela) painelTabela.style.display = "none";

    const snap = await db.collection("agendamentos")
      .orderBy("data")
      .orderBy("horario")
      .get();

    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderTabela(STATE.todos);
  } catch (err) {
    console.error("carregarAgendamentos:", err);
    Swal.fire("Erro", "Não foi possível carregar agendamentos.", "error");
  }
}

// ------------------------------------------------------
// ------------- FILTRAR -------------------------------
// ------------------------------------------------------
function aplicarFiltros() {
  let lista = [...STATE.todos];

  if (filtroData && filtroData.value) {
    lista = lista.filter(a => toYMD(parseDateField(a.data)) === filtroData.value);
  }
  if (filtroCliente && filtroCliente.value) {
    const q = filtroCliente.value.toLowerCase();
    lista = lista.filter(a => (a.cliente || "").toLowerCase().includes(q));
  }
  if (filtroTelefone && filtroTelefone.value) {
    const q = filtroTelefone.value.replace(/\D/g, "");
    lista = lista.filter(a => ((a.telefone || "") + "").replace(/\D/g, "").includes(q));
  }
  if (filtroStatus && filtroStatus.value) {
    lista = lista.filter(a => (a.status || "") === filtroStatus.value);
  }

  renderTabela(lista);
}

// ------------------------------------------------------
// ------------- MODAL (NOVO) ---------------------------
// ------------------------------------------------------
async function abrirModalNovo(dateInitial = null) {
  if (modalTitulo) modalTitulo.textContent = "Novo Agendamento";
  if (inputId) inputId.value = "";

  // garantir carregamento dos itens/pacotes ANTES
  await carregarPacotesEItens();

  [
    inputCliente, inputTelefone, inputEndRua, inputEndNumero, inputEndBairro, inputEndCidade,
    inputData, inputHoraInicio, inputHoraFim, inputPreco, inputDesconto, inputEntrada, inputValorFinal
  ].forEach(el => { if (el) el.value = ""; });

  if (selectItem) selectItem.value = "";

  if (dateInitial && inputData) inputData.value = toYMD(dateInitial);

  document.querySelectorAll(".chk-monitor").forEach(cb => cb.checked = false);

  if (modal) modal.classList.add("active");
  if (inputCliente) inputCliente.focus();
}

// ------------------------------------------------------
// ------------- MODAL (EDITAR) -------------------------
// ------------------------------------------------------
async function abrirModalEditar(id) {
  if (!id || !db) return;

  await carregarPacotesEItens();

  try {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) {
      Swal.fire("Erro", "Agendamento não encontrado", "error");
      return;
    }
    const a = doc.data();

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

    if (selectItem) {
      if (a.pacoteId && selectItem.querySelector(`option[value="${a.pacoteId}"]`)) {
        selectItem.value = a.pacoteId;
      }
    }

    setCurrencyInput(inputPreco, a.preco || 0);
    setCurrencyInput(inputDesconto, a.desconto || 0);
    setCurrencyInput(inputEntrada, a.entrada || 0);
    setCurrencyInput(inputValorFinal, a.valor_final || a.preco || 0);

    document.querySelectorAll(".chk-monitor").forEach(cb => {
      cb.checked = Array.isArray(a.monitores) ? a.monitores.includes(cb.value) : false;
    });

    if (modal) modal.classList.add("active");

  } catch (err) {
    console.error("abrirModalEditar:", err);
    Swal.fire("Erro", "Não foi possível abrir edição.", "error");
  }
}

function fecharModal() {
  if (modal) modal.classList.remove("active");
}

// ------------------------------------------------------
// ------------- SALVAR ---------------------------------
// ------------------------------------------------------
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
  const horaFim = inputHoraFim ? (inputHoraFim.value || calcularHoraFim(horaInicio)) : calcularHoraFim(horaInicio);

  const selected = selectItem ? selectItem.selectedOptions[0] : null;
  const pacoteId = selectItem ? selectItem.value || null : null;
  const pacoteNome = selected ? selected.textContent : "";

  const preco = safeNumFromInputEl(inputPreco);
  const desconto = Math.max(0, safeNumFromInputEl(inputDesconto));
  const entrada = Math.max(0, safeNumFromInputEl(inputEntrada));

  let valorFinal = safeNumFromInputEl(inputValorFinal);
  if (!valorFinal || valorFinal === 0) {
    valorFinal = Math.max(0, preco - desconto);
  }

  if (!cliente) { Swal.fire("Atenção", "Preencha o nome do cliente.", "warning"); return; }
  if (!dataVal) { Swal.fire("Atenção", "Escolha a data do evento.", "warning"); return; }
  if (!horaInicio) { Swal.fire("Atenção", "Informe o horário de início.", "warning"); return; }

  const monitores = Array.from(document.querySelectorAll(".chk-monitor:checked"))
    .map(cb => cb.value);

  const dados = {
    cliente,
    telefone,
    data: dataVal,
    horario: horaInicio,
    hora_fim: horaFim,
    endereco: { rua, numero, bairro, cidade },
    pacoteId,
    pacoteNome,
    preco,
    desconto,
    entrada,
    valor_final: valorFinal,
    monitores,
    status: entrada > 0 ? "confirmado" : "pendente",
    atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
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

// ------------------------------------------------------
// ------------- EVENTOS UI -----------------------------
// ------------------------------------------------------
function safeAttach(el, ev, fn) { if (el) el.addEventListener(ev, fn); }

safeAttach(btnFiltrar, "click", aplicarFiltros);
safeAttach(btnNovoAg, "click", () =>
  abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + "T00:00:00") : null)
);
safeAttach(btnCancelar, "click", fecharModal);
safeAttach(btnSalvar, "click", salvarAgendamento);

safeAttach(inputHoraInicio, "change", e => {
  if (inputHoraFim) inputHoraFim.value = calcularHoraFim(e.target.value);
});
safeAttach(inputHoraInicio, "blur", e => {
  if (inputHoraFim && !inputHoraFim.value) inputHoraFim.value = calcularHoraFim(e.target.value);
});

// mask telefone
if (inputTelefone) {
  inputTelefone.addEventListener("input", e => {
    e.target.value = maskTelefone(e.target.value);
  });
}

// corrigido — selectItem funcionando 100%
if (selectItem) {
  selectItem.addEventListener("change", e => {
    const opt = e.target.selectedOptions[0];
    if (!opt) { if (inputPreco) inputPreco.value = ""; return; }

    const p = Number(opt.dataset.valor) || 0;

    setCurrencyInput(inputPreco, p);

    const desconto = safeNumFromInputEl(inputDesconto);
    setCurrencyInput(
      inputValorFinal,
      Math.max(0, p - desconto)
    );
  });
}

// money fields
[inputPreco, inputDesconto, inputEntrada, inputValorFinal].forEach(el => {
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

    if (el === inputPreco || el === inputDesconto) {
      inputValorFinal.value = computed.toFixed(2);
    }
  });
  el.addEventListener("blur", () => {
    const n = parseCurrencyToNumber(el.value);
    el.value = n === 0 ? "" : formatNumberToCurrencyString(n);

    const precoNow = safeNumFromInputEl(inputPreco);
    const descontoNow = safeNumFromInputEl(inputDesconto);
    const vf = Math.max(0, precoNow - descontoNow);
    const currentVF = safeNumFromInputEl(inputValorFinal);

    if (!currentVF || Math.abs(currentVF - vf) < 0.001) {
      setCurrencyInput(inputValorFinal, vf);
    } else {
      setCurrencyInput(inputValorFinal, currentVF);
    }
  });
});

// ------------------------------------------------------
// ------------- INIT ----------------------------------
// ------------------------------------------------------
async function init() {
  try {
    if (painelTabela) painelTabela.style.display = "none";

    // CORREÇÃO IMPORTANTE:
    // retirar "carregarPacotes()" (não existe) e chamar corretamente:
    await carregarPacotesEItens();
    await carregarMonitores();

    const snap = await db.collection("agendamentos")
      .orderBy("data", "asc")
      .orderBy("horario", "asc")
      .get();

    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    painelTabela.classList.add("table-hidden");

    const p = new URLSearchParams(location.search);
    const d = p.get("date");
    if (d && filtroData) {
      filtroData.value = d;
      aplicarFiltros();
    }

  } catch (err) {
    console.error("init agendamentos:", err);
  }
}
document.addEventListener("DOMContentLoaded", init);

window.agendamentosModule = window.agendamentosModule || {};
window.agendamentosModule.reload = carregarAgendamentos;
window.agendamentosModule.openModalNew = abrirModalNovo;
