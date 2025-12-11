// ==============================================
// agendamentos.js — versão final com comprovantes,
// observação, restante a pagar, máscara moeda, tabela oculta
// ==============================================

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

// ---------- TABELA ----------
// renderTabela: mostra painel apenas se lista tiver elementos.
// se vazio: oculta painelTabela e mostra SweetAlert com opção criar novo.
function renderTabela(lista) {
  if (!listaEl || !painelTabela) return;
  listaEl.innerHTML = "";

  if (!Array.isArray(lista) || lista.length === 0) {
    painelTabela.style.display = "none";
    // don't spam alert if user just opened page and no action yet:
    // only show alert when user actively pressed Filtrar (we track a flag)
    if (window._ag_show_no_results_alert) {
      window._ag_show_no_results_alert = false; // reset
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

  // attach handlers
  listaEl.querySelectorAll(".btn-editar").forEach(btn => {
    btn.onclick = onEditarClick;
  });
  listaEl.querySelectorAll(".btn-excluir").forEach(btn => {
    btn.onclick = onExcluirClick;
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

// ---------- CANCELAR ----------
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
    // start hidden (page load)
    if (painelTabela) painelTabela.style.display = "none";

    const snap = await db.collection("agendamentos")
      .orderBy("data", "asc")
      .orderBy("horario", "asc")
      .get();

    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // do not show table automatically; user must filter OR if there are items and no filters yet we may show:
    // Here we keep table hidden until filter or until init decides to render
    renderTabela([]); // keep hidden on initial load
  } catch (err) {
    console.error("carregarAgendamentos:", err);
    Swal.fire("Erro", "Não foi possível carregar agendamentos.", "error");
  }
}

// ---------- FILTRAR ----------
window._ag_show_no_results_alert = false; // flag: when user triggers filter, allow alert
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

  // mark that user intentionally filtered (so we show SweetAlert when empty)
  window._ag_show_no_results_alert = true;
  renderTabela(lista);
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

  // clear comprovantes input + preview
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
    if (!doc.exists) { Swal.fire("Erro", "Agendamento não encontrado", "error"); return; }
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

    // select item/pacote: try matching by saved pacoteId (we save front-value like 'pacote_xxx' or 'item_xxx')
    if (selectItem) {
      if (a.pacoteId && selectItem.querySelector(`option[value="${a.pacoteId}"]`)) {
        selectItem.value = a.pacoteId;
      } else {
        // try to match by name included in option's text
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

    // render comprovantes (array of {url, name, path})
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
// render preview list (array of objects {url,name,path})
function renderComprovantesPreview(comprovantesArray, agId) {
  if (!listaComprovantesEl) return;
  listaComprovantesEl.innerHTML = "";

  if (!Array.isArray(comprovantesArray) || comprovantesArray.length === 0) return;

  comprovantesArray.forEach((c) => {
    const wrapper = document.createElement("div");
    wrapper.className = "comp-wrapper";

    const img = document.createElement("img");
    img.src = c.url;
    img.onclick = () => window.open(c.url, "_blank");

    const del = document.createElement("button");
    del.className = "comp-del-btn";
    del.textContent = "X";

    del.onclick = async () => {
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

// upload list of File objects; returns array of {url,name,path}
async function uploadComprovantesFiles(files, agId) {
  if (!storage) throw new Error("Storage não disponível");
  if (!files || files.length === 0) return [];

  const uploaded = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    // build path: comprovantes/{agId}/{timestamp}_{filename}
    const safeName = f.name.replace(/[^a-z0-9.\-_]/gi, "_");
    const path = `comprovantes/${agId}/${Date.now()}_${safeName}`;
    const ref = storage.ref(path);
    try {
      await ref.put(f);
      const url = await ref.getDownloadURL();
      uploaded.push({ url, name: f.name, path });
    } catch (err) {
      console.error("uploadComprovantesFiles error:", err);
      // continue with others
    }
  }
  return uploaded;
}

// when user selects files in inputComprovantes, show local preview (before upload)
if (inputComprovantes) {
  inputComprovantes.addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    if (!listaComprovantesEl) return;
    // preview local files using object URLs
    listaComprovantesEl.innerHTML = "";
    files.forEach(f => {
      const wrapper = document.createElement("div");
wrapper.className = "comp-wrapper";  // ESSENCIAL
wrapper.dataset.agId = inputId ? inputId.value : ""; // garante compatibilidade futura

const img = document.createElement("img");
img.src = URL.createObjectURL(f);
img.title = f.name;
img.onclick = () => window.open(img.src, "_blank");

wrapper.appendChild(img);

// botão X no preview local também
const del = document.createElement("button");
del.className = "comp-del-btn";
del.textContent = "X";
del.onclick = () => {
  wrapper.remove();
};

wrapper.appendChild(del);
listaComprovantesEl.appendChild(wrapper);
    });
    ensureComprovanteDeleteButtons();
  });
}

// ---------------------------------------------------------
// REPARO: GARANTE QUE OS BOTÕES X EXISTAM E FUNCIONEM
// ---------------------------------------------------------
function ensureComprovanteDeleteButtons() {
  document.querySelectorAll(".comp-wrapper").forEach(wrapper => {
    // se já tiver botão, não recria
    if (wrapper.querySelector(".comp-del-btn")) return;

    const img = wrapper.querySelector("img");
    if (!img) return;

    const del = document.createElement("button");
    del.className = "comp-del-btn";
    del.textContent = "X";

    // evento de exclusão
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
        // tenta obter path do wrapper (estamos adicionando compatibilidade)
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
      } catch (err) {
        console.error("Erro ao excluir comprovante (fallback):", err);
        Swal.fire("Erro", "Não foi possível excluir o comprovante.", "error");
      }
    };

    wrapper.appendChild(del);
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

  // pacote/item selection
  const selected = selectItem ? selectItem.selectedOptions[0] : null;
  const pacoteId = selectItem ? selectItem.value || null : null;
  const pacoteNome = selected ? selected.textContent : "";

  // monetary values robust parse
  const preco = safeNumFromInputEl(inputPreco);
  const desconto = Math.max(0, safeNumFromInputEl(inputDesconto));
  const entrada = Math.max(0, safeNumFromInputEl(inputEntrada));
  let valorFinal = safeNumFromInputEl(inputValorFinal);

  // rule: valor_final = preco - desconto if not provided
  if (!valorFinal || valorFinal === 0) valorFinal = Math.max(0, preco - desconto);
  if (valorFinal < 0) valorFinal = 0;

  // validations
  if (!cliente) { Swal.fire("Atenção", "Preencha o nome do cliente.", "warning"); return; }
  if (!dataVal) { Swal.fire("Atenção", "Escolha a data do evento.", "warning"); return; }
  if (!horaInicio) { Swal.fire("Atenção", "Informe o horário de início.", "warning"); return; }

  const monitores = Array.from(document.querySelectorAll(".chk-monitor:checked")).map(cb => cb.value);
  const observacao = inputObservacao ? inputObservacao.value : "";

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
    // handle create vs update with comprovantes upload accordingly
    let docRef;
    if (id) {
      docRef = db.collection("agendamentos").doc(id);
      await docRef.set(dados, { merge: true });
    } else {
      docRef = await db.collection("agendamentos").add(dados);
    }

    const docId = id || docRef.id;

    // If there are files selected, upload them and append to doc.comprovantes
    if (inputComprovantes && inputComprovantes.files && inputComprovantes.files.length > 0 && storage) {
      Swal.fire({ title: "Enviando comprovantes...", didOpen: () => Swal.showLoading() });
      const files = Array.from(inputComprovantes.files);
      const uploaded = await uploadComprovantesFiles(files, docId); // returns array of {url,name,path}
      // append to doc
      if (uploaded.length > 0) {
        const snap = await db.collection("agendamentos").doc(docId).get();
        const prev = snap.exists ? (snap.data().comprovantes || []) : [];
        const novo = prev.concat(uploaded);
        await db.collection("agendamentos").doc(docId).update({ comprovantes: novo });
      }
      Swal.close();
    }

    // final update: ensure comprovantes, observacao included
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
// safe attach
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
    // recalc valor final and restante
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
    // live recompute final and restante
    const precoNow = safeNumFromInputEl(inputPreco);
    const descontoNow = safeNumFromInputEl(inputDesconto);
    const computed = Math.max(0, precoNow - descontoNow);
    if (inputValorFinal && (el === inputPreco || el === inputDesconto)) {
      inputValorFinal.value = computed.toFixed(2);
    }
    // restante
    const entradaNow = safeNumFromInputEl(inputEntrada);
    const vfNow = safeNumFromInputEl(inputValorFinal) || computed;
    if (inputRestante) setCurrencyInput(inputRestante, Math.max(0, vfNow - entradaNow));
  });
  el.addEventListener("blur", () => {
    const n = parseCurrencyToNumber(el.value);
    if (n === 0) el.value = "";
    else el.value = formatNumberToCurrencyString(n);
    // keep valor_final consistent when blur
    const precoNow = safeNumFromInputEl(inputPreco);
    const descontoNow = safeNumFromInputEl(inputDesconto);
    const vf = Math.max(0, precoNow - descontoNow);
    const currentVF = safeNumFromInputEl(inputValorFinal);
    if (!currentVF || Math.abs(currentVF - vf) < 0.001) {
      setCurrencyInput(inputValorFinal, vf);
    } else {
      setCurrencyInput(inputValorFinal, currentVF);
    }
    // restante update
    const entradaNow = safeNumFromInputEl(inputEntrada);
    if (inputRestante) setCurrencyInput(inputRestante, Math.max(0, safeNumFromInputEl(inputValorFinal) - entradaNow));
  });
});

// ensure entrada blur formatted
if (inputEntrada) inputEntrada.addEventListener("blur", () => {
  const n = parseCurrencyToNumber(inputEntrada.value);
  if (n === 0) inputEntrada.value = ""; else inputEntrada.value = formatNumberToCurrencyString(n);
  // update restante
  const vfNow = safeNumFromInputEl(inputValorFinal);
  setCurrencyInput(inputRestante, Math.max(0, vfNow - safeNumFromInputEl(inputEntrada)));
});

// ---------- INIT ----------
async function init() {
  try {
    if (painelTabela) painelTabela.style.display = "none"; // start hidden
    await carregarPacotesEItens();
    await carregarMonitores();
    await carregarAgendamentos();

    // if ?date=YYYY-MM-DD passed, prefill and run filter
    const params = new URLSearchParams(location.search);
    const dateParam = params.get("date");
    if (dateParam && filtroData) {
      filtroData.value = dateParam;
      aplicarFiltros();
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

