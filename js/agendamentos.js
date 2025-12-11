// js/agendamentos.js (corrigido: tabela, ações por status, upload+exclusão comprovantes no modal, validação estoque)
const AG_BASE = "/dashboard-Divertilandia/";

// firebase compat (deve estar carregado via <script> no HTML)
const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
const auth = window.auth || (firebase && firebase.auth ? firebase.auth() : null);
const storage = window.storage || (firebase && firebase.storage ? firebase.storage() : null);

if (!db) console.error("agendamentos.js: Firestore (db) não encontrado. Verifique firebase-config.js");
if (!storage) console.warn("agendamentos.js: Firebase Storage não encontrado. Upload de comprovantes ficará desabilitado.");

// ---------- DOM ----------
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
  monitores: []
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

// ---------- UTIL: resolve selected value (item_... or pacote_...) => array of item names
function resolveSelectedValueToItemNames(selectValue) {
  if (!selectValue) return [];
  if (selectValue.startsWith("pacote_")) {
    const pid = selectValue.replace(/^pacote_/, "");
    const pack = STATE.pacotes.find(p => p.id === pid);
    if (pack) return Array.isArray(pack.itens) ? pack.itens.slice() : [];
    return []; // fallback (will be resolved from Firestore when checking)
  } else if (selectValue.startsWith("item_")) {
    const iid = selectValue.replace(/^item_/, "");
    const it = STATE.itens.find(x => x.id === iid);
    if (it) return [it.nome || it.name || it.nome || it.nome || it.name || it.id];
  }
  return [];
}

// ---------- TABELA ----------
function renderTabela(lista) {
  if (!listaEl || !painelTabela) return;
  listaEl.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    painelTabela.style.display = "none";
    if (window._ag_show_no_results_alert) {
      window._ag_show_no_results_alert = false;
      Swal.fire({
        title: "Nenhum agendamento encontrado",
        text: "Deseja criar um novo agendamento?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Criar novo",
        cancelButtonText: "Fechar"
      }).then(res => {
        if (res.isConfirmed) abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + "T00:00:00") : null);
      });
    }
    return;
  }

  painelTabela.style.display = "block";

  lista.forEach(a => {
    const dt = parseDateField(a.data);
    const dateStr = dt ? dt.toLocaleDateString() : (a.data || "---");
    const horarioStr = a.horario || (a.horario_inicio || "") || "";

    const enderecoStr =
      (a.endereco?.rua || "") +
      (a.endereco?.numero ? ", Nº " + a.endereco.numero : "") +
      (a.endereco?.bairro ? " — " + a.endereco.bairro : "") +
      (a.endereco?.cidade ? " / " + a.endereco.cidade : "");

    const itemName = a.pacoteNome || a.itemNome || a.pacoteId || "---";
    const valor = Number(a.valor_final ?? a.preco ?? 0);

    const tr = document.createElement("tr");

    // Build status colored label
    const status = (a.status || "pendente").toLowerCase();
    let statusHtml = status;
    if (status === "confirmado") statusHtml = `<span class="label-status label-confirmado">Confirmado</span>`;
    else if (status === "pendente") statusHtml = `<span class="label-status label-pendente">Pendente</span>`;
    else if (status === "cancelado") statusHtml = `<span class="label-status label-cancelado">Cancelado</span>`;
    else if (status === "concluido" || status === "finalizado" || status === "concluído") statusHtml = `<span class="label-status label-finalizado">Finalizado</span>`;

    // Actions: for canceled show details + excluir; for others show detalhes, editar, cancelar
    let actionsHtml = `<button class="btn btn-dark btn-detalhes" data-id="${a.id}">Detalhes</button> `;
    if (status === "cancelado") {
      actionsHtml += `<button class="btn btn-danger btn-excluir-perm" data-id="${a.id}">Excluir</button>`;
    } else {
      actionsHtml += `<button class="btn btn-dark btn-editar" data-id="${a.id}">Editar</button> `;
      actionsHtml += `<button class="btn btn-danger btn-cancelar" data-id="${a.id}">Cancelar</button>`;
    }

    tr.innerHTML = `
      <td>${dateStr}</td>
      <td>${horarioStr}</td>
      <td>${a.cliente || "---"}</td>
      <td>${a.telefone || "---"}</td>
      <td>${enderecoStr || "---"}</td>
      <td>${itemName}</td>
      <td>${statusHtml}</td>
      <td>${formatNumberToCurrencyString(valor)}</td>
      <td>${actionsHtml}</td>
    `;

    listaEl.appendChild(tr);
  });

  // attach handlers (delegation could be used but keep simple)
  listaEl.querySelectorAll(".btn-editar").forEach(btn => btn.onclick = onEditarClick);
  listaEl.querySelectorAll(".btn-cancelar").forEach(btn => btn.onclick = async (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    if (!id) return;
    // reuse cancelarAgendamento
    await cancelarAgendamento(id);
  });
  listaEl.querySelectorAll(".btn-excluir-perm").forEach(btn => btn.onclick = async (e) => {
    const id = e.currentTarget.getAttribute("data-id");
    if (!id) return;
    const c = await Swal.fire({
      title: "Excluir permanentemente?",
      text: "A exclusão é irreversível.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir"
    });
    if (!c.isConfirmed) return;
    try {
      // delete storage comprovantes if any
      const snap = await db.collection("agendamentos").doc(id).get();
      if (snap.exists) {
        const arr = snap.data().comprovantes || [];
        for (const cp of arr) {
          try { if (cp.path && storage) await storage.ref(cp.path).delete(); } catch(e){ console.warn("del storage fallback", e); }
        }
      }
      await db.collection("agendamentos").doc(id).delete();
      Swal.fire("OK", "Agendamento excluído.", "success");
      await carregarAgendamentos();
    } catch (err) {
      console.error("Excluir perm:", err);
      Swal.fire("Erro", "Não foi possível excluir.", "error");
    }
  });

  listaEl.querySelectorAll(".btn-detalhes").forEach(btn => btn.onclick = onDetalhesClick);
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

// ---------- CANCELAR (marca como cancelado) ----------
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
    await db.collection("agendamentos").doc(id).update({ status: "cancelado", atualizado_em: firebase.firestore.FieldValue.serverTimestamp() });
    Swal.fire("OK", "Agendamento cancelado.", "success");
    await carregarAgendamentos();
  } catch (err) {
    console.error("cancelarAgendamento:", err);
    Swal.fire("Erro", "Não foi possível cancelar.", "error");
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
      opt.dataset.valor = Number(p.preco ?? p.preço ?? p.valor ?? 0);
      opt.textContent = `${p.nome || p.title || p.id} (pacote) - R$ ${Number(p.preco ?? p.preço ?? p.valor ?? 0).toFixed(2)}`;
      selectItem.appendChild(opt);
    });

    // itens
    STATE.itens.forEach(i => {
      const opt = document.createElement("option");
      opt.value = `item_${i.id}`;
      opt.dataset.valor = Number(i.preco ?? i.preço ?? i.valor ?? 0);
      opt.textContent = `${i.nome || i.title || i.id} (item) - R$ ${Number(i.preco ?? i.preço ?? i.valor ?? 0).toFixed(2)}`;
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
    STATE.monitores.forEach(m => {
      const div = document.createElement("div");
      div.className = "chk-line";
      div.innerHTML = `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="chk-monitor" value="${m.id}"> ${m.nome || m.name || m.id}</label>`;
      containerMonitores.appendChild(div);
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

    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTabela([]); // keep hidden on initial load
  } catch (err) {
    console.error("carregarAgendamentos:", err);
    Swal.fire("Erro", "Não foi possível carregar agendamentos.", "error");
  }
}

// ---------- FILTRAR ----------
window._ag_show_no_results_alert = false;
function aplicarFiltros() {
  let lista = Array.isArray(STATE.todos) ? [...STATE.todos] : [];

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

  window._ag_show_no_results_alert = true;
  renderTabela(lista);
}

// ---------- MODAL: abrir / editar / fechar ----------
function abrirModalNovo(dateInitial = null) {
  if (modalTitulo) modalTitulo.textContent = "Novo Agendamento";
  if (inputId) inputId.value = "";

  [
    inputCliente, inputTelefone, inputEndRua, inputEndNumero, inputEndBairro, inputEndCidade,
    inputData, inputHoraInicio, inputHoraFim, selectItem, inputPreco, inputDesconto, inputEntrada, inputValorFinal, inputRestante, inputObservacao
  ].forEach(el => { if (el) el.value = ""; });

  if (inputComprovantes) inputComprovantes.value = "";
  if (listaComprovantesEl) listaComprovantesEl.innerHTML = "";

  if (dateInitial && inputData) inputData.value = toYMD(dateInitial);
  document.querySelectorAll(".chk-monitor").forEach(cb => { cb.checked = false; });

  if (modal) modal.classList.add("active");
  if (inputCliente) inputCliente.focus();
}

async function abrirModalEditar(id) {
  if (!id || !db) return;
  try {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) { Swal.fire("Erro", "Agendamento não encontrado", "error"); return; }
    const a = doc.data();

    // If canceled, do not open edit - show details instead
    if ((a.status || "").toLowerCase() === "cancelado") {
      Swal.fire("Agendamento cancelado", "Este agendamento está cancelado. Abra Detalhes para ações.", "info");
      // open detalhes modal instead
      return onDetalhesShow(id, a);
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
      } else if (a.itemId && selectItem.querySelector(`option[value="${a.itemId}"]`)) {
        selectItem.value = a.itemId;
      } else {
        // try match by text containing name
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

    if (inputRestante) {
      const vf = Number(a.valor_final ?? a.preco ?? 0);
      const entradaN = Number(a.entrada ?? 0);
      setCurrencyInput(inputRestante, Math.max(0, vf - entradaN));
    }

    if (inputObservacao) inputObservacao.value = a.observacao || "";

    document.querySelectorAll(".chk-monitor").forEach(cb => {
      cb.checked = Array.isArray(a.monitores) ? a.monitores.includes(cb.value) : false;
    });

    renderComprovantesPreview(a.comprovantes || [], id);

    if (modal) modal.classList.add("active");
  } catch (err) {
    console.error("abrirModalEditar:", err);
    Swal.fire("Erro", "Não foi possível abrir edição.", "error");
  }
}

function fecharModal() {
  if (modal) modal.classList.remove("active");
}

// ---------- COMPROVANTES UI & UPLOAD ----------
function renderComprovantesPreview(comprovantesArray, agId) {
  if (!listaComprovantesEl) return;
  listaComprovantesEl.innerHTML = "";

  if (!Array.isArray(comprovantesArray) || comprovantesArray.length === 0) return;

  comprovantesArray.forEach((c) => {
    const wrapper = document.createElement("div");
    wrapper.className = "comp-wrapper";
    wrapper.dataset.path = c.path || "";
    wrapper.dataset.agId = agId || "";
    const img = document.createElement("img");
    img.src = c.url;
    img.onclick = () => window.open(c.url, "_blank");

    const del = document.createElement("button");
    del.className = "comp-del-btn";
    del.textContent = "X";

    del.onclick = async (ev) => {
      ev.stopPropagation();
      const confirm = await Swal.fire({
        title: "Excluir comprovante?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Excluir"
      });
      if (!confirm.isConfirmed) return;

      try {
        if (c.path && storage) {
          await storage.ref(c.path).delete();
        }
        const ref = db.collection("agendamentos").doc(agId);
        const snap = await ref.get();
        if (!snap.exists) return;
        const atual = snap.data().comprovantes || [];
        const novo = atual.filter(x => x.url !== c.url);
        await ref.update({ comprovantes: novo });

        if (inputComprovantes) inputComprovantes.value = "";

        renderComprovantesPreview(novo, agId);
      } catch (err) {
        console.error("Erro excluindo comprovante", err);
        Swal.fire("Erro", "Não foi possível excluir.", "error");
      }
    };

    wrapper.appendChild(img);
    wrapper.appendChild(del);
    listaComprovantesEl.appendChild(wrapper);
  });

  ensureComprovanteDeleteButtons();
}

async function uploadComprovantesFiles(files, agId) {
  if (!storage) throw new Error("Storage não disponível");
  if (!files || files.length === 0) return [];

  const uploaded = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const safeName = f.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const path = `comprovantes/${agId}/${Date.now()}_${safeName}`;
    const ref = storage.ref(path);
    try {
      await ref.put(f);
      const url = await ref.getDownloadURL();
      uploaded.push({ url, name: f.name, path });
    } catch (err) {
      console.error("uploadComprovantesFiles error:", err);
    }
  }
  return uploaded;
}

if (inputComprovantes) {
  inputComprovantes.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!listaComprovantesEl) return;

    listaComprovantesEl.innerHTML = "";
    files.forEach(f => {
      const wrapper = document.createElement("div");
      wrapper.className = "comp-wrapper";
      wrapper.dataset.agId = inputId ? inputId.value : "";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(f);
      img.title = f.name;
      img.onclick = () => window.open(img.src, "_blank");

      wrapper.appendChild(img);

      const del = document.createElement("button");
      del.className = "comp-del-btn";
      del.textContent = "X";
      del.onclick = () => {
        wrapper.remove();
        inputComprovantes.value = "";
      };

      wrapper.appendChild(del);
      listaComprovantesEl.appendChild(wrapper);
    });

    ensureComprovanteDeleteButtons();
  });
}

function ensureComprovanteDeleteButtons() {
  document.querySelectorAll(".comp-wrapper").forEach(wrapper => {
    if (wrapper.querySelector(".comp-del-btn") && wrapper.dataset._handled) return;
    wrapper.dataset._handled = "1";

    const img = wrapper.querySelector("img");
    if (!img) return;

    const del = wrapper.querySelector(".comp-del-btn");
    if (!del) return;

    del.onclick = async (ev) => {
      ev.stopPropagation();
      const url = img.src;
      const confirm = await Swal.fire({
        title: "Excluir comprovante?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Excluir"
      });
      if (!confirm.isConfirmed) return;

      try {
        const path = wrapper.dataset.path || null;
        const agId = wrapper.dataset.agId || (inputId ? inputId.value : null);

        if (path && storage) {
          await storage.ref(path).delete();
        }

        if (agId && db) {
          const ref = db.collection("agendamentos").doc(agId);
          const snap = await ref.get();
          if (snap.exists) {
            const atual = snap.data().comprovantes || [];
            const novo = atual.filter(x => x.url !== url);
            await ref.update({ comprovantes: novo });
          }
        }

        wrapper.remove();
        if (inputComprovantes) inputComprovantes.value = "";

      } catch (err) {
        console.error("Erro ao excluir comprovante (fallback):", err);
        Swal.fire("Erro", "Não foi possível excluir o comprovante.", "error");
      }
    };
  });
}

// ---------- SALVAR AGENDAMENTO (inclui upload de comprovantes) ----------
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
  const horaFim = inputHoraFim ? inputHoraFim.value || calcularHoraFim(horaInicio) : calcularHoraFim(horaInicio);

  const selected = selectItem ? selectItem.selectedOptions[0] : null;
  const pacoteId = selectItem ? selectItem.value || null : null;
  const pacoteNome = selected ? selected.textContent : "";

  const preco = safeNumFromInputEl(inputPreco);
  const desconto = Math.max(0, safeNumFromInputEl(inputDesconto));
  const entrada = Math.max(0, safeNumFromInputEl(inputEntrada));
  let valorFinal = safeNumFromInputEl(inputValorFinal);
  if (!valorFinal || valorFinal === 0) valorFinal = Math.max(0, preco - desconto);
  if (valorFinal < 0) valorFinal = 0;

  if (!cliente) { Swal.fire("Atenção", "Preencha o nome do cliente.", "warning"); return; }
  if (!dataVal) { Swal.fire("Atenção", "Escolha a data do evento.", "warning"); return; }
  if (!horaInicio) { Swal.fire("Atenção", "Informe o horário de início.", "warning"); return; }

  const monitores = Array.from(document.querySelectorAll(".chk-monitor:checked")).map(cb => cb.value);
  const observacao = inputObservacao ? inputObservacao.value : "";

  // determine requestedItems (array of names)
  const requestedItems = resolveSelectedValueToItemNames(pacoteId);
  // fallback: if empty but pacoteNome present, include pacoteNome text
  if (requestedItems.length === 0 && pacoteNome) requestedItems.push(pacoteNome);

  // fetch existing bookings for same date (excluding current id if editing)
  let existing = [];
  try {
    const q = await db.collection("agendamentos").where("data", "==", dataVal).get();
    existing = q.docs.map(d => {
      const obj = { id: d.id, ...d.data() };
      return obj;
    }).filter(x => x.id !== id);
  } catch (err) {
    console.warn("Erro ao buscar agendamentos para checagem de estoque:", err);
  }

  // call regras_negocio to validate (async)
  try {
    if (window.regrasNegocio && window.regrasNegocio.checkConflitoPorEstoque) {
      const res = await window.regrasNegocio.checkConflitoPorEstoque(requestedItems, existing, { fetchFromFirestore: true });
      if (!res.ok) {
        const msg = res.problems.map(p => `${p.item}: precisa ${p.need}, reservado ${p.reserved}, disponível ${p.available}`).join("\n");
        Swal.fire("Conflito de estoque", msg, "error");
        return;
      }
    }
  } catch (err) {
    console.error("Erro ao validar estoque:", err);
    Swal.fire("Erro", "Não foi possível validar estoque. Tente novamente.", "error");
    return;
  }

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
    observacao,
    status: entrada > 0 ? "confirmado" : "pendente",
    atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
  };

  try {
    let docRef;
    if (id) {
      docRef = db.collection("agendamentos").doc(id);
      await docRef.set(dados, { merge: true });
    } else {
      docRef = await db.collection("agendamentos").add(dados);
    }
    const docId = id || docRef.id;

    // process file uploads (if any)
    if (inputComprovantes && inputComprovantes.files && inputComprovantes.files.length > 0 && storage) {
      Swal.fire({ title: "Enviando comprovantes...", didOpen: () => Swal.showLoading() });
      const files = Array.from(inputComprovantes.files);
      const uploaded = await uploadComprovantesFiles(files, docId);
      if (uploaded.length > 0) {
        const snap = await db.collection("agendamentos").doc(docId).get();
        const prev = snap.exists ? (snap.data().comprovantes || []) : [];
        const novo = prev.concat(uploaded);
        await db.collection("agendamentos").doc(docId).update({ comprovantes: novo });
      }
      Swal.close();
    }

    await db.collection("agendamentos").doc(docId).update({
      observacao,
      atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
    });

    Swal.fire("OK", id ? "Agendamento atualizado." : "Agendamento criado.", "success");
    fecharModal();
    await carregarAgendamentos();
  } catch (err) {
    console.error("salvarAgendamento:", err);
    Swal.fire("Erro", "Não foi possível salvar o agendamento.", "error");
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

if (inputTelefone) {
  inputTelefone.addEventListener("input", e => { e.target.value = maskTelefone(e.target.value); });
}

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

if (inputEntrada) inputEntrada.addEventListener("blur", () => {
  const n = parseCurrencyToNumber(inputEntrada.value);
  if (n === 0) inputEntrada.value = ""; else inputEntrada.value = formatNumberToCurrencyString(n);
  const vfNow = safeNumFromInputEl(inputValorFinal);
  setCurrencyInput(inputRestante, Math.max(0, vfNow - safeNumFromInputEl(inputEntrada)));
});

// ---------- DETALHES (modal) ----------
function onDetalhesClick(e) {
  const id = e.currentTarget.getAttribute("data-id");
  if (!id) return;
  // load doc and show detalhes
  db.collection("agendamentos").doc(id).get().then(doc => {
    if (!doc.exists) { Swal.fire("Erro", "Agendamento não encontrado", "error"); return; }
    onDetalhesShow(id, doc.data());
  }).catch(err => {
    console.error("onDetalhesClick:", err);
    Swal.fire("Erro", "Não foi possível carregar detalhes.", "error");
  });
}

function onDetalhesShow(id, a) {
  // dynamic modal
  const existing = document.getElementById("modalDetalhesAg");
  if (existing) existing.remove();

  const div = document.createElement("div");
  div.id = "modalDetalhesAg";
  div.className = "modal active";
  const enderecoStr =
    (a.endereco?.rua || "") +
    (a.endereco?.numero ? ", Nº " + a.endereco.numero : "") +
    (a.endereco?.bairro ? " — " + a.endereco.bairro : "") +
    (a.endereco?.cidade ? " / " + a.endereco.cidade : "");

  const itensList = (a.itens && a.itens.length) ? a.itens.join(", ") : (a.pacoteNome || a.itemNome || "");

  let comprovantesHtml = "";
  (a.comprovantes || []).forEach(c => {
    comprovantesHtml += `<div style="display:inline-block;margin:6px"><img src="${c.url}" style="width:100px;height:100px;object-fit:cover;border-radius:6px;cursor:pointer" onclick="window.open('${c.url}','_blank')"></div>`;
  });

  div.innerHTML = `
    <div class="modal-content" style="max-width:900px;">
      <h2>Detalhes - ${a.cliente || ""}</h2>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:18px;">
        <div>
          <b>Data:</b> ${a.data || ""}<br>
          <b>Horário:</b> ${a.horario || ""}<br>
          <b>Telefone:</b> ${a.telefone || ""}<br>
          <b>Endereço:</b> ${enderecoStr || ""}<br>
          <b>Itens / Pacote:</b> ${itensList || ""}<br>
          <b>Valor final:</b> ${formatNumberToCurrencyString(a.valor_final || a.preco || 0)}<br>
          <b>Status:</b> ${a.status || ""}<br>
        </div>
        <div>
          <b>Observação:</b><br>
          <div style="white-space:pre-wrap;margin-top:8px;">${a.observacao || ""}</div>
        </div>
      </div>

      <div style="margin-top:12px">
        <h3>Comprovantes</h3>
        <div id="detalhes-comprovantes">${comprovantesHtml || "<i>Sem comprovantes</i>"}</div>
      </div>

      <div style="margin-top:18px; display:flex; justify-content:space-between;">
        <div>
          <button class="btn btn-dark" id="fecharDetalhes">Fechar</button>
        </div>
        <div>
          <button class="btn" id="gerarComprovante">Comprovante de agendamento</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(div);

  document.getElementById("fecharDetalhes").onclick = () => { div.remove(); };
  document.getElementById("gerarComprovante").onclick = () => {
    gerarComprovanteImagemAgora(a);
  };
}

// gera imagem simples em canvas e baixa como PNG
function gerarComprovanteImagemAgora(a) {
  try {
    const w = 1000, h = 600;
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0,0,w,h);
    ctx.fillStyle = "#000";
    ctx.font = "24px Arial";
    let y = 40;
    ctx.fillText("Comprovante de Agendamento", 30, y); y += 40;
    ctx.font = "20px Arial";
    ctx.fillText("Cliente: " + (a.cliente || ""), 30, y); y += 30;
    ctx.fillText("Telefone: " + (a.telefone || ""), 30, y); y += 30;
    ctx.fillText("Data: " + (a.data || ""), 30, y); y += 30;
    ctx.fillText("Horário: " + (a.horario || ""), 30, y); y += 30;
    ctx.fillText("Item/Pacote: " + (a.pacoteNome || a.itemNome || ""), 30, y); y += 30;
    ctx.fillText("Valor: " + formatNumberToCurrencyString(a.valor_final || a.preco || 0), 30, y); y += 40;
    ctx.fillText("Observação:", 30, y); y += 28;
    const obs = String(a.observacao || "");
    wrapText(ctx, obs, 30, y, w - 60, 22);
    const dataUrl = c.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `comprovante_agendamento_${(a.cliente||'')}_${(a.data||'')}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    console.error("Erro gerar comprovante imagem:", err);
    Swal.fire("Erro", "Não foi possível gerar comprovante.", "error");
  }
}
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
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

// ---------- INIT ----------
async function init() {
  try {
    if (painelTabela) painelTabela.style.display = "none";
    await carregarPacotesEItens();
    await carregarMonitores();
    await carregarAgendamentos();

    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    if (dateParam && filtroData) {
      filtroData.value = dateParam;
      aplicarFiltros();
    }

    // add small CSS for status labels (inject if not present)
    if (!document.getElementById("ag-status-styles")) {
      const style = document.createElement("style");
      style.id = "ag-status-styles";
      style.innerHTML = `
        .label-status { padding:4px 8px; border-radius:6px; color:#fff; font-weight:600; font-size:12px; }
        .label-confirmado { background:#1976d2; } /* azul */
        .label-pendente { background:#f4b400; color:#111; } /* amarelo */
        .label-cancelado { background:#d32f2f; } /* vermelho */
        .label-finalizado { background:#2e7d32; } /* verde */
        .comp-wrapper { position:relative; display:inline-block; width:80px; height:80px; margin:6px; }
        .comp-wrapper img { width:80px; height:80px; object-fit:cover; border-radius:6px; }
        .comp-del-btn { position:absolute; top:-8px; right:-8px; background:#d00; color:#fff; border:none; border-radius:50%; width:22px; height:22px; cursor:pointer; font-size:12px; line-height:22px; }
      `;
      document.head.appendChild(style);
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
