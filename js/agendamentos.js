// ==============================================
// agendamentos.js — versão estável e corrigida
// ==============================================

const AG_BASE = "/dashboard-Divertilandia/";

const db = firebase.firestore();
const auth = firebase.auth();

// =====================
// ELEMENTOS DOM
// =====================
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

// =====================
// ESTADO
// =====================
const STATE = {
    todos: [],
    pacotes: [],
    itens: [],
    monitores: []
};

// =====================
// HELPERS
// =====================
function parseDateField(v) {
    if (!v) return null;
    if (v.toDate) return v.toDate();
    if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + "T00:00:00");
    return new Date(v);
}

function toYMD(date) {
    if (!date) return "";
    return date.toISOString().split("T")[0];
}

function maskTelefone(v) {
    const d = (v || "").replace(/\D/g, "").slice(0, 11);
    if (d.length <= 2) return "(" + d;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

function safeNum(el) {
    if (!el) return 0;
    let v = String(el.value).replace(/[^\d.,]/g, "").replace(",", ".");
    let n = Number(v);
    if (isNaN(n) || n < 0) return 0;
    return n;
}

function formatMoney(n) {
    return "R$ " + Number(n || 0).toFixed(2).replace(".", ",");
}

function calcularFim(horaInicio) {
    if (!horaInicio) return "";
    const [h, m] = horaInicio.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setHours(d.getHours() + 4);
    return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

// =====================
// RENDERIZAÇÃO DA TABELA
// =====================
function renderTabela(lista) {
    listaEl.innerHTML = "";

    if (!lista.length) {
        painelTabela.style.display = "none";
        Swal.fire({
            title: "Nenhum agendamento encontrado",
            text: "Deseja criar um novo agendamento?",
            icon: "info",
            showCancelButton: true,
            confirmButtonText: "Criar novo"
        }).then(r => {
            if (r.isConfirmed) abrirModalNovo();
        });
        return;
    }

    painelTabela.style.display = "block";

    lista.forEach(a => {
        const dt = parseDateField(a.data);
        const dataStr = dt ? dt.toLocaleDateString() : "---";

        const endereco =
            (a.endereco?.rua || "") +
            (a.endereco?.numero ? ", Nº " + a.endereco.numero : "") +
            (a.endereco?.bairro ? " — " + a.endereco.bairro : "") +
            (a.endereco?.cidade ? " / " + a.endereco.cidade : "");

        const valor = a.valor_final || a.preco || 0;

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${dataStr} ${a.horario || ""}</td>
            <td>${a.cliente || "---"}</td>
            <td>${a.telefone || "---"}</td>
            <td>${endereco || "---"}</td>
            <td>${a.itemNome || a.pacoteNome || "---"}</td>
            <td>${a.status || "pendente"}</td>
            <td>${formatMoney(valor)}</td>
            <td>
                <button class="btn btn-dark btn-editar" data-id="${a.id}">Editar</button>
                <button class="btn btn-danger btn-excluir" data-id="${a.id}">Cancelar</button>
            </td>
        `;
        listaEl.appendChild(tr);
    });

    document.querySelectorAll(".btn-editar")
        .forEach(b => b.addEventListener("click", e => abrirModalEditar(e.target.dataset.id)));

    document.querySelectorAll(".btn-excluir")
        .forEach(b => b.addEventListener("click", e => cancelarAgendamento(e.target.dataset.id)));
}

// =====================
// CANCELAR
// =====================
async function cancelarAgendamento(id) {
    const r = await Swal.fire({
        title: "Cancelar agendamento?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim"
    });
    if (!r.isConfirmed) return;

    await db.collection("agendamentos").doc(id).update({ status: "cancelado" });

    Swal.fire("OK", "Agendamento cancelado!", "success");
    carregarAgendamentos();
}

// =====================
// CARREGAR PACOTES + ITENS
// =====================
async function carregarPacotesEItens() {
    selectItem.innerHTML = `<option value="">Selecionar...</option>`;

    const pac = await db.collection("pacotes").get();
    const items = await db.collection("item").get();

    STATE.pacotes = pac.docs.map(d => ({ id: d.id, tipo: "pacote", ...d.data() }));
    STATE.itens = items.docs.map(d => ({ id: d.id, tipo: "item", ...d.data() }));

    STATE.pacotes.forEach(p => {
        const op = document.createElement("option");
        op.value = "pacote_" + p.id;
        op.dataset.tipo = "pacote";
        op.dataset.valor = Number(p.preço || p.preco || 0);
        op.textContent = `${p.nome} (pacote) - R$ ${Number(p.preço || p.preco || 0).toFixed(2)}`;
        selectItem.appendChild(op);
    });

    STATE.itens.forEach(i => {
        const op = document.createElement("option");
        op.value = "item_" + i.id;
        op.dataset.tipo = "item";
        op.dataset.valor = Number(i.preço || i.preco || 0);
        op.textContent = `${i.nome} (item) - R$ ${Number(i.preço || i.preco || 0).toFixed(2)}`;
        selectItem.appendChild(op);
    });
}

// =====================
// CARREGAR MONITORES
// =====================
async function carregarMonitores() {
    const snap = await db.collection("monitores").get();
    STATE.monitores = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    containerMonitores.innerHTML = "";
    STATE.monitores.forEach(m => {
        const d = document.createElement("div");
        d.classList.add("chk-line");
        d.innerHTML = `
            <label>
                <input type="checkbox" class="chk-monitor" value="${m.id}">
                ${m.nome}
            </label>`;
        containerMonitores.appendChild(d);
    });
}

// =====================
// CARREGAR AGENDAMENTOS
// =====================
async function carregarAgendamentos() {
    painelTabela.style.display = "none";

    const snap = await db.collection("agendamentos")
        .orderBy("data")
        .orderBy("horario")
        .get();

    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderTabela(STATE.todos);
}

// =====================
// FILTRAR
// =====================
function aplicarFiltros() {
    let lista = [...STATE.todos];

    if (filtroData.value)
        lista = lista.filter(a => toYMD(parseDateField(a.data)) === filtroData.value);

    if (filtroCliente.value)
        lista = lista.filter(a => (a.cliente || "").toLowerCase().includes(filtroCliente.value.toLowerCase()));

    if (filtroTelefone.value) {
        const q = filtroTelefone.value.replace(/\D/g, "");
        lista = lista.filter(a => (a.telefone || "").replace(/\D/g, "").includes(q));
    }

    if (filtroStatus.value)
        lista = lista.filter(a => (a.status || "") === filtroStatus.value);

    renderTabela(lista);
}

// =====================
// MODAL
// =====================
function abrirModalNovo() {
    modalTitulo.textContent = "Novo Agendamento";

    [
        inputId, inputCliente, inputTelefone,
        inputEndRua, inputEndNumero, inputEndBairro, inputEndCidade,
        inputData, inputHoraInicio, inputHoraFim,
        inputPreco, inputDesconto, inputEntrada, inputValorFinal
    ].forEach(el => el.value = "");

    selectItem.value = "";

    modal.classList.add("active");
}

async function abrirModalEditar(id) {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) return;
    const a = doc.data();

    modalTitulo.textContent = "Editar Agendamento";

    inputId.value = id;
    inputCliente.value = a.cliente || "";
    inputTelefone.value = a.telefone || "";

    inputEndRua.value = a.endereco?.rua || "";
    inputEndNumero.value = a.endereco?.numero || "";
    inputEndBairro.value = a.endereco?.bairro || "";
    inputEndCidade.value = a.endereco?.cidade || "";

    inputData.value = toYMD(parseDateField(a.data));
    inputHoraInicio.value = a.horario || "";
    inputHoraFim.value = a.hora_fim || "";

    inputPreco.value = a.preco || "";
    inputDesconto.value = a.desconto || "";
    inputEntrada.value = a.entrada || "";
    inputValorFinal.value = a.valor_final || "";

    modal.classList.add("active");
}

function fecharModal() {
    modal.classList.remove("active");
}

// =====================
// SALVAR
// =====================
async function salvarAgendamento() {
    const id = inputId.value || null;

    const preco = safeNum(inputPreco);
    const desconto = safeNum(inputDesconto);
    const entrada = safeNum(inputEntrada);

    let valorFinal = preco - desconto;
    if (valorFinal < 0) valorFinal = 0;

    const dados = {
        cliente: inputCliente.value,
        telefone: inputTelefone.value,
        data: inputData.value,
        horario: inputHoraInicio.value,
        hora_fim: inputHoraFim.value || calcularFim(inputHoraInicio.value),
        endereco: {
            rua: inputEndRua.value,
            numero: inputEndNumero.value,
            bairro: inputEndBairro.value,
            cidade: inputEndCidade.value
        },
        pacoteId: selectItem.value || null,
        pacoteNome: selectItem.selectedOptions[0]?.textContent || "",
        preco,
        desconto,
        entrada,
        valor_final: valorFinal,
        status: entrada > 0 ? "confirmado" : "pendente",
        atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (!id) {
        dados.criado_em = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("agendamentos").add(dados);
    } else {
        await db.collection("agendamentos").doc(id).set(dados, { merge: true });
    }

    Swal.fire("OK", "Agendamento salvo!", "success");

    fecharModal();
    carregarAgendamentos();
}

// =====================
// EVENTOS
// =====================
btnFiltrar.addEventListener("click", aplicarFiltros);
btnNovoAg.addEventListener("click", abrirModalNovo);
btnCancelar.addEventListener("click", fecharModal);
btnSalvar.addEventListener("click", salvarAgendamento);

inputHoraInicio.addEventListener("change", e => {
    inputHoraFim.value = calcularFim(e.target.value);
});

inputTelefone.addEventListener("input", e => {
    e.target.value = maskTelefone(e.target.value);
});

// money mask
[inputPreco, inputDesconto, inputEntrada, inputValorFinal].forEach(el => {
    el.addEventListener("input", () => {
        const n = safeNum(el);
        el.value = n === 0 ? "" : n.toFixed(2);
    });
    el.addEventListener("blur", () => {
        const n = safeNum(el);
        el.value = n === 0 ? "" : n.toFixed(2);
    });
});

// select pacote/item
selectItem.addEventListener("change", e => {
    const opt = e.target.selectedOptions[0];
    if (!opt) return;
    const preco = Number(opt.dataset.valor || 0);
    inputPreco.value = preco.toFixed(2);
    inputValorFinal.value = (preco - safeNum(inputDesconto)).toFixed(2);
});

// =====================
// INICIALIZAÇÃO
// =====================
async function init() {
    painelTabela.style.display = "none";
    await carregarPacotesEItens();
    await carregarMonitores();
    await carregarAgendamentos();

    const params = new URLSearchParams(location.search);
    if (params.get("date")) {
        filtroData.value = params.get("date");
        aplicarFiltros();
    }
}

document.addEventListener("DOMContentLoaded", init);
