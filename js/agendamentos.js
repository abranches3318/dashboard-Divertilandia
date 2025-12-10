// js/agendamentos.js
// Versão final: integra pacotes + items, endereço, máscaras, validações e regras (regras_negocio.js)

(() => {
  const AG_BASE = "/dashboard-Divertilandia/";
  const db = window.db || (firebase && firebase.firestore ? firebase.firestore() : null);
  const auth = window.auth || (firebase && firebase.auth ? firebase.auth() : null);
  const regras = window.regrasNegocio || null;

  if (!db) console.error("agendamentos.js: Firestore (db) não encontrado. Verifique firebase-config.js");

  // DOM elements (IDs must exist in your HTML)
  const painelTabela = document.getElementById("painelTabela"); // envolver tabela (se tiver)
  const listaEl = document.getElementById("listaAgendamentos");

  const btnFiltrar = document.getElementById("btnFiltrar");
  const btnNovoAg = document.getElementById("btnNovoAg");

  const filtroData = document.getElementById("filtroData");
  const filtroCliente = document.getElementById("filtroCliente");
  const filtroTelefone = document.getElementById("filtroTelefone");
  const filtroStatus = document.getElementById("filtroStatus");

  const modal = document.getElementById("modalAgendamento");
  const modalTitulo = document.getElementById("modalTitulo");

  // modal fields (must exist)
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
  const selectItem = document.getElementById("ag-item"); // single select that will contain both items and pacotes
  const inputPreco = document.getElementById("ag-preco");
  const inputDesconto = document.getElementById("ag-desconto");
  const inputEntrada = document.getElementById("ag-entrada");
  const inputValorFinal = document.getElementById("ag-valor-final");
  const containerMonitores = document.getElementById("ag-monitores");

  const btnCancelar = document.getElementById("btnCancelar");
  const btnSalvar = document.getElementById("btnSalvarAg");

  // state
  const STATE = { todos: [], pacotes: [], items: [], monitores: [] };

  // -----------------------
  // helpers: money / date / mask
  // -----------------------
  function safeNumberFromString(s) {
    if (s == null) return 0;
    const cleaned = String(s).replace(/[^\d.,-]/g, "").replace(",", ".");
    if (cleaned === "" || isNaN(Number(cleaned))) return 0;
    return Number(cleaned);
  }

  function formatMoney(n, emptyAsBlank = false) {
    const num = Number(n || 0);
    if (emptyAsBlank && (n === "" || n == null || num === 0)) return "";
    return "R$ " + num.toFixed(2).replace(".", ",");
  }

  function toYMD(date) {
    if (!date) return "";
    const d = (date.toDate ? date.toDate() : date);
    return d.toISOString().slice(0, 10);
  }

  function parseDateField(value) {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (typeof value === "string") {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(value + "T00:00:00");
      return new Date(value);
    }
    if (value instanceof Date) return value;
    return new Date(value);
  }

  function calcularHoraFim(horaInicio) {
    if (!horaInicio) return "";
    const parts = horaInicio.split(":").map(x => Number(x));
    if (isNaN(parts[0])) return "";
    const dt = new Date();
    dt.setHours(parts[0], parts[1] || 0, 0, 0);
    dt.setHours(dt.getHours() + 4);
    return String(dt.getHours()).padStart(2, "0") + ":" + String(dt.getMinutes()).padStart(2, "0");
  }

  // mask telefone (99) 99999-9999
  function maskTelefone(value) {
    if (!value) return "";
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return "(" + digits;
    if (digits.length <= 6) return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
    if (digits.length <= 10) return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 6) + "-" + digits.slice(6);
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7);
  }

  // -----------------------
  // renderTabela (requer lista array)
  // - panela some se vazio
  // - SweetAlert com botão Criar novo se vazio no filtro
  // -----------------------
  function renderTabela(lista) {
    if (!listaEl) return;

    listaEl.innerHTML = "";

    if (!Array.isArray(lista) || lista.length === 0) {
      // hide panel wrapper if exists
      if (painelTabela) painelTabela.style.display = "none";

      // If renderTabela was called after applying filters, we show SweetAlert offering to create
      // To avoid popups at initial load (when STATE.todos empty) check a flag: only show when applyFiltros calls this.
      // We'll expose a small property to decide: showCreateWhenEmpty (default true when called from applyFiltros)
      if (renderTabela._showCreateWhenEmpty) {
        Swal.fire({
          title: "Nenhum agendamento encontrado",
          text: "Deseja criar um novo agendamento para esta data/consulta?",
          icon: "info",
          showCancelButton: true,
          confirmButtonText: "Criar novo",
          cancelButtonText: "Fechar"
        }).then(res => {
          if (res.isConfirmed) {
            abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + "T00:00:00") : null);
          }
        });
      }
      // ensure table cleared
      if (listaEl) listaEl.innerHTML = "";
      return;
    }

    // show panel wrapper
    if (painelTabela) painelTabela.style.display = "block";

    // build rows
    lista.forEach(a => {
      const dt = parseDateField(a.data);
      const dataStr = dt ? dt.toLocaleDateString() : (a.data || "");
      const cliente = a.cliente || a.cliente_nome || "---";
      const telefone = a.telefone || a.tel || "---";
      const status = a.status || "pendente";

      // show pacote/item name and price: prefer pacote name, else item name
      let nomeItem = "";
      let precoMostrado = 0;

      if (a.pacoteNome) {
        nomeItem = a.pacoteNome;
        precoMostrado = safePickPrice(a, "preco", "preço", "valor") || 0;
      } else if (a.itemNome) {
        nomeItem = a.itemNome;
        precoMostrado = safePickPrice(a, "preco", "preço", "valor") || 0;
      } else if (a.pacoteId) {
        // try lookup in state
        const p = STATE.pacotes.find(x => x.id === a.pacoteId);
        if (p) {
          nomeItem = p.nome || p.title || p.id;
          precoMostrado = pickPriceFromDoc(p);
        }
      } else if (a.itemId) {
        const it = STATE.items.find(x => x.id === a.itemId);
        if (it) {
          nomeItem = it.nome || it.name || it.id;
          precoMostrado = pickPriceFromDoc(it);
        }
      }

      // fallback: if document contains preco/ preço fields directly
      precoMostrado = precoMostrado || safePickPrice(a, "preco", "preço", "valor") || 0;

      const enderecoStr =
        (a.endereco?.rua || "") +
        (a.endereco?.numero ? ", Nº " + a.endereco.numero : "") +
        (a.endereco?.bairro ? " — " + a.endereco.bairro : "") +
        (a.endereco?.cidade ? " / " + a.endereco.cidade : "");

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${dataStr} ${a.horario || ""}</td>
        <td>${cliente}</td>
        <td>${telefone}</td>
        <td>${nomeItem || "---"}</td>
        <td>${enderecoStr || "---"}</td>
        <td>${status}</td>
        <td>${formatMoney(precoMostrado)}</td>
        <td>
          <button class="btn btn-dark btn-editar" data-id="${a.id}">Editar</button>
          <button class="btn btn-danger btn-excluir" data-id="${a.id}">Cancelar</button>
        </td>
      `;
      listaEl.appendChild(tr);
    });

    // attach handlers
    listaEl.querySelectorAll(".btn-editar").forEach(b => {
      b.removeEventListener("click", onEditarClick);
      b.addEventListener("click", onEditarClick);
    });
    listaEl.querySelectorAll(".btn-excluir").forEach(b => {
      b.removeEventListener("click", onExcluirClick);
      b.addEventListener("click", onExcluirClick);
    });
  }

  // Helper: pick price from object fields that may be named 'preco' or 'preço' or 'valor'
  function safePickPrice(obj, ...fields) {
    if (!obj) return 0;
    for (const f of fields) {
      if (obj[f] != null) return Number(obj[f]);
    }
    return 0;
  }
  function pickPriceFromDoc(doc) {
    return safePickPrice(doc, "preco", "preço", "valor", "price");
  }

  // onEditar/onExcluir helpers
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

  // cancelar
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

  // -----------------------
  // carregar pacotes + items + monitores
  // -----------------------
  async function carregarPacotes() {
    if (!db) return;
    try {
      const snap = await db.collection("pacotes").get();
      STATE.pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // populate selectItem with both pacotes and items later (we will also load items)
      populateSelectWithPacotesAndItems();
    } catch (err) {
      console.error("carregarPacotes:", err);
    }
  }

  async function carregarItems() {
    if (!db) return;
    try {
      const snap = await db.collection("items").get();
      STATE.items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      populateSelectWithPacotesAndItems();
    } catch (err) {
      console.error("carregarItems:", err);
    }
  }

  async function carregarMonitores() {
    if (!db) return;
    try {
      const snap = await db.collection("monitores").get();
      STATE.monitores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // fill checkboxes
      if (containerMonitores) {
        containerMonitores.innerHTML = "";
        STATE.monitores.forEach(m => {
          const div = document.createElement("div");
          div.className = "chk-line";
          div.innerHTML = `<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" class="chk-monitor" value="${m.id}"> ${m.nome || m.name || m.id}</label>`;
          containerMonitores.appendChild(div);
        });
      }
    } catch (err) {
      console.error("carregarMonitores:", err);
    }
  }

  function populateSelectWithPacotesAndItems() {
    if (!selectItem) return;
    // preserve selection
    const cur = selectItem.value;
    selectItem.innerHTML = `<option value="">-- Selecionar pacote ou item --</option>`;

    // pacotes first (identify by prefix "pacote::" value to avoid id collisions)
    STATE.pacotes.forEach(p => {
      const opt = document.createElement("option");
      opt.value = `pacote::${p.id}`;
      opt.dataset.valor = pickPriceFromDoc(p);
      opt.textContent = `${p.nome || p.title || p.id} (pacote) - ${formatMoney(p['preço'] ?? p.preco ?? p.valor ?? 0)}`;
      selectItem.appendChild(opt);
    });

    // then items
    STATE.items.forEach(it => {
      const opt = document.createElement("option");
      opt.value = `item::${it.id}`;
      opt.dataset.valor = pickPriceFromDoc(it);
      opt.textContent = `${it.nome || it.name || it.id} - ${formatMoney(it['preço'] ?? it.preco ?? it.valor ?? 0)}`;
      selectItem.appendChild(opt);
    });

    // restore if possible
    if (cur) selectItem.value = cur;
  }

  // -----------------------
  // carregar agendamentos
  // -----------------------
  async function carregarAgendamentos() {
    if (!db) return;
    try {
      const snap = await db.collection("agendamentos")
        .orderBy("data", "asc")
        .orderBy("horario", "asc")
        .get();
      STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // ensure table hide/show behavior at initial load: do not show create popup
      renderTabela._showCreateWhenEmpty = false;
      renderTabela(STATE.todos);
    } catch (err) {
      console.error("carregarAgendamentos:", err);
      Swal.fire("Erro", "Não foi possível carregar agendamentos.", "error");
    }
  }

  // -----------------------
  // aplicarFiltros (usa renderTabela with popup)
  // -----------------------
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

    // show SweetAlert if empty
    renderTabela._showCreateWhenEmpty = true;
    renderTabela(lista);
  }

  // -----------------------
  // modal open / edit / save
  // -----------------------
  function abrirModalNovo(dataInicial = null) {
    if (!modal) return;
    modalTitulo && (modalTitulo.textContent = "Novo Agendamento");

    // clear fields
    const fields = [inputId, inputCliente, inputTelefone, inputEndRua, inputEndNumero, inputEndBairro, inputEndCidade,
      inputData, inputHoraInicio, inputHoraFim, selectItem, inputPreco, inputDesconto, inputEntrada, inputValorFinal];
    fields.forEach(el => { if (el) el.value = ""; });

    if (dataInicial && inputData) inputData.value = toYMD(dataInicial);

    // uncheck monitors
    document.querySelectorAll(".chk-monitor").forEach(cb => cb.checked = false);

    modal.classList.add("active");
    if (inputCliente) inputCliente.focus();
  }

  async function abrirModalEditar(id) {
    if (!id || !db) return;
    try {
      const doc = await db.collection("agendamentos").doc(id).get();
      if (!doc.exists) { Swal.fire("Erro", "Agendamento não encontrado", "error"); return; }
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
      // selectItem is stored as "pacote::id" or "item::id" when saved (we'll save in that form)
      if (selectItem) {
        if (a.pacoteId) selectItem.value = `pacote::${a.pacoteId}`;
        else if (a.itemId) selectItem.value = `item::${a.itemId}`;
        else selectItem.value = "";
      }
      if (inputPreco) inputPreco.value = (a.preco != null ? Number(a.preco).toFixed(2) : "");
      if (inputDesconto) inputDesconto.value = (a.desconto != null ? Number(a.desconto).toFixed(2) : "");
      if (inputEntrada) inputEntrada.value = (a.entrada != null ? Number(a.entrada).toFixed(2) : "");
      if (inputValorFinal) inputValorFinal.value = (a.valor_final != null ? Number(a.valor_final).toFixed(2) : "");

      // mark monitors
      document.querySelectorAll(".chk-monitor").forEach(cb => {
        cb.checked = Array.isArray(a.monitores) ? a.monitores.includes(cb.value) : false;
      });

      modal.classList.add("active");
    } catch (err) {
      console.error("abrirModalEditar:", err);
      Swal.fire("Erro", "Não foi possível abrir o agendamento.", "error");
    }
  }

  function fecharModal() {
    if (!modal) return;
    modal.classList.remove("active");
  }

  // -----------------------
  // salvarAgendamento (normalize values, compute valor_final and use pacote/item logic)
  // -----------------------
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
    const sel = selectItem ? selectItem.value : "";

    // determine pacote vs item
    let pacoteId = null;
    let itemId = null;
    let pacoteNome = null;
    let itemNome = null;
    let preco = 0;

    if (sel) {
      if (sel.startsWith("pacote::")) {
        pacoteId = sel.split("::")[1];
        // try lookup
        const p = STATE.pacotes.find(x => x.id === pacoteId);
        pacoteNome = p ? (p.nome || p.title) : null;
        preco = p ? pickPriceFromDoc(p) : Number(selectItem.selectedOptions[0]?.dataset?.valor || 0);
      } else if (sel.startsWith("item::")) {
        itemId = sel.split("::")[1];
        const it = STATE.items.find(x => x.id === itemId);
        itemNome = it ? (it.nome || it.title) : null;
        preco = it ? pickPriceFromDoc(it) : Number(selectItem.selectedOptions[0]?.dataset?.valor || 0);
      } else {
        // fallback: option without prefix — try parse dataset
        preco = Number(selectItem.selectedOptions[0]?.dataset?.valor || 0);
      }
    } else {
      preco = safeNumberFromString(inputPreco ? inputPreco.value : 0);
    }

    const desconto = Math.max(0, safeNumberFromString(inputDesconto ? inputDesconto.value : 0));
    const entrada = Math.max(0, safeNumberFromString(inputEntrada ? inputEntrada.value : 0));
    let valorFinal = safeNumberFromString(inputValorFinal ? inputValorFinal.value : 0);

    // rule: valor_final = preco - desconto if not provided or zero
    if (!valorFinal || valorFinal === 0) valorFinal = Math.max(0, preco - desconto);

    // validations
    if (!cliente) { Swal.fire("Atenção", "Preencha o nome do cliente.", "warning"); return; }
    if (!dataVal) { Swal.fire("Atenção", "Escolha a data do evento.", "warning"); return; }
    if (!horaInicio) { Swal.fire("Atenção", "Informe o horário de início.", "warning"); return; }

    // prepare object to save
    const dados = {
      cliente,
      telefone,
      data: dataVal,
      horario: horaInicio,
      hora_fim: horaFim || calcularHoraFim(horaInicio),
      endereco: { rua, numero, bairro, cidade },
      pacoteId: pacoteId || null,
      pacoteNome: pacoteNome || null,
      itemId: itemId || null,
      itemNome: itemNome || null,
      preco: preco,
      desconto: desconto,
      entrada: entrada,
      valor_final: valorFinal,
      monitores: Array.from(document.querySelectorAll(".chk-monitor:checked")).map(cb => cb.value),
      status: (entrada && entrada > 0) ? "confirmado" : "pendente",
      atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      // check business rules: use regrasNegocio if available
      if (regras && (pacoteId || itemId)) {
        // resolve requested item names list:
        let requestedItems = [];
        if (pacoteId) {
          const pdoc = STATE.pacotes.find(x => x.id === pacoteId);
          if (pdoc) requestedItems = (pdoc.itens || pdoc.items || []).slice();
        }
        if (itemId) {
          const idoc = STATE.items.find(x => x.id === itemId);
          if (idoc) requestedItems.push(idoc.nome || idoc.name || idoc.id);
        }
        // collect existing bookings for same date+time (simple occupancy window)
        const sameSnap = await db.collection("agendamentos")
          .where("data", "==", dataVal)
          .where("horario", "==", horaInicio)
          .get();
        const existing = sameSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const check = regras.checkConflitoPorEstoque(requestedItems, existing, regras.estoquePadrao);
        if (!check.ok) {
          // prepare message of shortages
          const msg = check.problems.map(p => `${p.item}: precisa ${p.need}, reservado ${p.reserved}, disponível ${p.availableRemaining}`).join("\n");
          const proceed = await Swal.fire({
            title: "Possível conflito de estoque",
            html: `Há possível indisponibilidade de itens:<pre style="text-align:left">${msg}</pre><br>Deseja prosseguir mesmo assim?`,
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

  // -----------------------
  // event listeners / masks / formatting
  // -----------------------
  if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);
  if (btnNovoAg) btnNovoAg.addEventListener("click", () => abrirModalNovo(filtroData && filtroData.value ? new Date(filtroData.value + "T00:00:00") : null));
  if (btnCancelar) btnCancelar.addEventListener("click", fecharModal);
  if (btnSalvar) btnSalvar.addEventListener("click", salvarAgendamento);

  if (inputHoraInicio) {
    inputHoraInicio.addEventListener("change", e => { if (inputHoraFim) inputHoraFim.value = calcularHoraFim(e.target.value); });
    inputHoraInicio.addEventListener("blur", e => { if (inputHoraFim && !inputHoraFim.value) inputHoraFim.value = calcularHoraFim(e.target.value); });
  }

  if (inputTelefone) {
    inputTelefone.addEventListener("input", e => {
      const cur = e.target.value;
      e.target.value = maskTelefone(cur);
    });
  }

  // selectItem change: fill preco and valor_final automatically
  if (selectItem) {
    selectItem.addEventListener("change", e => {
      const opt = e.target.selectedOptions[0];
      const v = Number(opt?.dataset?.valor || 0);
      if (inputPreco) inputPreco.value = v ? v.toFixed(2) : "";
      const desconto = safeNumberFromString(inputDesconto ? inputDesconto.value : 0);
      if (inputValorFinal) inputValorFinal.value = Number(Math.max(0, v - desconto)).toFixed(2);
    });
  }

  // money fields normalize & auto-calc final
  const moneyFields = [inputPreco, inputDesconto, inputEntrada, inputValorFinal];
  moneyFields.forEach(el => {
    if (!el) return;
    el.addEventListener("input", () => {
      const raw = String(el.value || "");
      const cleaned = raw.replace(/[^\d.,-]/g, "").replace(",", ".");
      el.value = cleaned;
      const preco = safeNumberFromString(inputPreco ? inputPreco.value : 0);
      const desconto = Math.max(0, safeNumberFromString(inputDesconto ? inputDesconto.value : 0));
      if (inputValorFinal) inputValorFinal.value = Number(Math.max(0, preco - desconto)).toFixed(2);
    });
    el.addEventListener("blur", () => {
      const n = safeNumberFromString(el.value);
      el.value = n === 0 ? "" : n.toFixed(2);
    });
  });

  // -----------------------
  // init
  // -----------------------
  async function init() {
    try {
      if (!db) return;
      await Promise.all([carregarPacotes(), carregarItems(), carregarMonitores()]);
      await carregarAgendamentos();

      // if ?date=YYYY-MM-DD present, apply filter
      const params = new URLSearchParams(location.search);
      const dateParam = params.get("date");
      if (dateParam && filtroData) { filtroData.value = dateParam; aplicarFiltros(); }
    } catch (err) {
      console.error("init:", err);
    }
  }
  document.addEventListener("DOMContentLoaded", init);

  // expose
  window.agendamentosModule = window.agendamentosModule || {};
  window.agendamentosModule.reload = carregarAgendamentos;
  window.agendamentosModule.openModalNew = abrirModalNovo;

})();
