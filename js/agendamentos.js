// ==============================================
// AGENDAMENTOS.JS — versão otimizada e corrigida
// ==============================================

// Base do repositório (GitHub Pages)
// (nome exclusivo para evitar conflitos globais)
const AG_BASE = "/dashboard-Divertilandia/";

// Firebase compat
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
// ESTADO LOCAL
// =====================
const STATE = {
    todos: [],
    pacotes: [],
    monitores: []
};

// =====================
// FUNÇÕES ÚTEIS
// =====================
function formatMoney(v) {
    return "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
}

function parseDate(value) {
    if (!value) return null;
    if (value.toDate) return value.toDate();
    if (typeof value === "string") return new Date(value + "T00:00:00");
    return new Date(value);
}

function toYMD(date) {
    if (!date) return "";
    return date.toISOString().slice(0, 10);
}

function calcularHoraFim(horaInicio) {
    if (!horaInicio) return "";

    const [h, m] = horaInicio.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    d.setHours(d.getHours() + 4);

    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// =====================
// RENDERIZAÇÃO DA TABELA
// =====================
function renderTabela(lista) {
    listaEl.innerHTML = "";

    if (!lista.length) {
        painelTabela.style.display = "none";
        return;
    }

    painelTabela.style.display = "block";

    lista.forEach(a => {
        const dt = parseDate(a.data);
        const dataStr = dt ? dt.toLocaleDateString() : a.data;

        const cliente = a.cliente || "---";
        const telefone = a.telefone || "---";
        const status = a.status || "pendente";

        const valor = Number(
            a.valor_final ??
            a.preco ??
            a.valor ??
            a.entrada ??
            0
        );

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${dataStr} ${a.horario || ""}</td>
            <td>${cliente}</td>
            <td>${telefone}</td>
            <td>${status}</td>
            <td>${formatMoney(valor)}</td>
            <td>
                <button class="btn btn-dark btn-editar" data-id="${a.id}">Editar</button>
                <button class="btn btn-danger btn-excluir" data-id="${a.id}">Cancelar</button>
            </td>
        `;
        listaEl.appendChild(tr);
    });

    document.querySelectorAll(".btn-editar")
        .forEach(btn => btn.addEventListener("click", e => abrirModalEditar(e.target.dataset.id)));

    document.querySelectorAll(".btn-excluir")
        .forEach(btn => btn.addEventListener("click", e => cancelarAgendamento(e.target.dataset.id)));
}

// =====================
// CANCELAR AGENDAMENTO
// =====================
async function cancelarAgendamento(id) {
    const res = await Swal.fire({
        title: "Cancelar agendamento?",
        text: "O agendamento será marcado como cancelado.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim"
    });

    if (!res.isConfirmed) return;

    await db.collection("agendamentos").doc(id).update({ status: "cancelado" });

    Swal.fire("OK", "Agendamento cancelado!", "success");
    carregarAgendamentos();
}

// =====================
// CARREGAR PACOTES
// =====================
async function carregarPacotes() {
    const snap = await db.collection("pacotes").get();
    STATE.pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    selectItem.innerHTML = `<option value="">Selecione...</option>`;

    STATE.pacotes.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.dataset.valor = p.valor || 0;
        opt.textContent = `${p.nome} - R$ ${Number(p.valor).toFixed(2)}`;
        selectItem.appendChild(opt);
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
        const div = document.createElement("div");
        div.classList.add("chk-line");
        div.innerHTML = `
            <label>
                <input type="checkbox" class="chk-monitor" value="${m.id}">
                ${m.nome}
            </label>
        `;
        containerMonitores.appendChild(div);
    });
}

// =====================
// CARREGAR AGENDAMENTOS
// =====================
async function carregarAgendamentos() {
    const snap = await db.collection("agendamentos")
        .orderBy("data", "asc")
        .orderBy("horario", "asc")
        .get();

    STATE.todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTabela(STATE.todos);
}

// =====================
// FILTRAR
// =====================
function aplicarFiltros() {
    let lista = [...STATE.todos];

    if (filtroData.value) {
        lista = lista.filter(a => toYMD(parseDate(a.data)) === filtroData.value);
    }

    if (filtroCliente.value) {
        const q = filtroCliente.value.toLowerCase();
        lista = lista.filter(a => (a.cliente || "").toLowerCase().includes(q));
    }

    if (filtroTelefone.value) {
        const q = filtroTelefone.value.replace(/\D/g, "");
        lista = lista.filter(a => (a.telefone || "").replace(/\D/g, "").includes(q));
    }

    if (filtroStatus.value) {
        lista = lista.filter(a => (a.status || "") === filtroStatus.value);
    }

    renderTabela(lista);
}

// =====================
// MODAL — NOVO
// =====================
function abrirModalNovo() {
    modalTitulo.textContent = "Novo Agendamento";

    [
        inputId, inputCliente, inputTelefone, inputData,
        inputHoraInicio, inputHoraFim, inputPreco,
        inputDesconto, inputEntrada, inputValorFinal
    ].forEach(el => el.value = "");

    selectItem.value = "";

    document.querySelectorAll(".chk-monitor").forEach(cb => cb.checked = false);

    modal.classList.add("active");
}

// =====================
// MODAL — EDITAR
// =====================
async function abrirModalEditar(id) {
    modalTitulo.textContent = "Editar Agendamento";

    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) return;

    const a = doc.data();

    inputId.value = id;
    inputCliente.value = a.cliente || "";
    inputTelefone.value = a.telefone || "";
    inputData.value = toYMD(parseDate(a.data));
    inputHoraInicio.value = a.horario || "";
    inputHoraFim.value = a.hora_fim || "";
    selectItem.value = a.pacoteId || "";
    inputPreco.value = a.preco || "";
    inputDesconto.value = a.desconto || "";
    inputEntrada.value = a.entrada || "";
    inputValorFinal.value = a.valor_final || "";

    document.querySelectorAll(".chk-monitor").forEach(cb => {
        cb.checked = (a.monitores || []).includes(cb.value);
    });

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

    const dados = {
        cliente: inputCliente.value,
        telefone: inputTelefone.value,
        data: inputData.value,
        horario: inputHoraInicio.value,
        hora_fim: inputHoraFim.value || calcularHoraFim(inputHoraInicio.value),
        pacoteId: selectItem.value || null,
        preco: Number(inputPreco.value || 0),
        desconto: Number(inputDesconto.value || 0),
        entrada: Number(inputEntrada.value || 0),
        valor_final: Number(inputValorFinal.value || 0),
        monitores: Array.from(document.querySelectorAll(".chk-monitor:checked")).map(cb => cb.value),
        status: Number(inputEntrada.value || 0) > 0 ? "confirmado" : "pendente",
        atualizado_em: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (id) {
        await db.collection("agendamentos").doc(id).set(dados, { merge: true });
        Swal.fire("OK", "Agendamento atualizado!", "success");
    } else {
        dados.criado_em = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection("agendamentos").add(dados);
        Swal.fire("OK", "Agendamento criado!", "success");
    }

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
    inputHoraFim.value = calcularHoraFim(e.target.value);
});

// =====================
// INICIALIZAÇÃO
// =====================
async function init() {
    await carregarPacotes();
    await carregarMonitores();
    await carregarAgendamentos();

    const params = new URLSearchParams(location.search);
    if (params.get("date")) {
        filtroData.value = params.get("date");
        aplicarFiltros();
    }
}

document.addEventListener("DOMContentLoaded", init);

// EXPORTAR
window.agendamentosModule = {
    reload: carregarAgendamentos,
    novo: abrirModalNovo
};
