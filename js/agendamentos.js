// ======================================================================
// AGENDAMENTOS.JS – Controle completo da lista + filtros + modal
// ======================================================================

// Verifica se o Firebase já está disponível
if (!window.db) {
    console.error("Erro: db não encontrado. Verifique se dashboard.js carregou antes.");
}

// ======================================================================
// ELEMENTOS DA PÁGINA
// ======================================================================
let listaAgendamentos;
let filtroData;
let filtroCliente;
let filtroTelefone;
let filtroStatus;
let btnFiltrar;
let btnNovo;

// ======================================================================
// INICIALIZAÇÃO DA PÁGINA
// ======================================================================
document.addEventListener("DOMContentLoaded", () => {
    // Seleção dos elementos SOMENTE quando estiverem presentes
    listaAgendamentos = document.getElementById("listaAgendamentos");
    filtroData = document.getElementById("filtroData");
    filtroCliente = document.getElementById("filtroCliente");
    filtroTelefone = document.getElementById("filtroTelefone");
    filtroStatus = document.getElementById("filtroStatus");
    btnFiltrar = document.getElementById("btnFiltrarAgendamentos");
    btnNovo = document.getElementById("btnNovoAgendamento");

    // Se algum não existir, não quebra o arquivo
    if (!listaAgendamentos) return;

    btnFiltrar.addEventListener("click", aplicarFiltros);
    btnNovo.addEventListener("click", abrirModalNovoAgendamento);

    carregarAgendamentos();
});

// ======================================================================
// CARREGAR AGENDAMENTOS DO FIREBASE
// ======================================================================
async function carregarAgendamentos() {
    try {
        const snap = await db.collection("agendamentos")
            .orderBy("data", "asc")
            .get();

        const lista = [];

        snap.forEach(doc => {
            lista.push({
                id: doc.id,
                ...doc.data()
            });
        });

        renderizarLista(lista);

    } catch (e) {
        console.error("Erro ao carregar agendamentos:", e);
        Swal.fire("Erro", "Não foi possível carregar os agendamentos.", "error");
    }
}

// ======================================================================
// RENDERIZAR LISTA NO HTML
// ======================================================================
function renderizarLista(lista) {
    listaAgendamentos.innerHTML = "";

    if (lista.length === 0) {
        listaAgendamentos.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center; padding:20px;">
                    Nenhum agendamento encontrado.
                </td>
            </tr>
        `;
        return;
    }

    lista.forEach(ag => {
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td>${formatarData(ag.data)}</td>
            <td>${ag.cliente || "-"}</td>
            <td>${ag.telefone || "-"}</td>
            <td>${formatarStatus(ag.status)}</td>
            <td>${formatarValor(ag.valor)}</td>
            <td>
                <button class="btn-secundario" onclick="editarAgendamento('${ag.id}')">Editar</button>
            </td>
        `;

        listaAgendamentos.appendChild(tr);
    });
}

// ======================================================================
// FILTROS
// ======================================================================
async function aplicarFiltros() {
    try {
        let ref = db.collection("agendamentos");

        if (filtroStatus.value) {
            ref = ref.where("status", "==", filtroStatus.value);
        }

        const snap = await ref.get();
        let lista = [];

        snap.forEach(doc => {
            lista.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Aplicar filtros locais
        if (filtroData.value) {
            lista = lista.filter(x => x.data?.startsWith(filtroData.value));
        }

        if (filtroCliente.value) {
            lista = lista.filter(x =>
                (x.cliente || "").toLowerCase().includes(filtroCliente.value.toLowerCase())
            );
        }

        if (filtroTelefone.value) {
            lista = lista.filter(x =>
                (x.telefone || "").toLowerCase().includes(filtroTelefone.value.toLowerCase())
            );
        }

        renderizarLista(lista);

    } catch (e) {
        console.error("Erro ao filtrar agendamentos:", e);
        Swal.fire("Erro", "Falha ao aplicar filtros.", "error");
    }
}

// ======================================================================
// FUNÇÕES DE FORMATAÇÃO
// ======================================================================
function formatarData(dataISO) {
    if (!dataISO) return "-";
    const d = new Date(dataISO);
    return d.toLocaleDateString("pt-BR");
}

function formatarStatus(s) {
    if (!s) return "-";
    const map = {
        pendente: "Pendente",
        confirmado: "Confirmado",
        concluido: "Concluído",
        cancelado: "Cancelado"
    };
    return map[s] || s;
}

function formatarValor(v) {
    if (!v) return "-";
    return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ======================================================================
// BOTÃO: NOVO AGENDAMENTO
// ======================================================================
function abrirModalNovoAgendamento() {
    Swal.fire({
        title: "Novo Agendamento",
        html: `
            <input id="novoData" type="datetime-local" class="swal2-input">
            <input id="novoCliente" type="text" class="swal2-input" placeholder="Cliente">
            <input id="novoTelefone" type="text" class="swal2-input" placeholder="Telefone">
            <input id="novoValor" type="number" class="swal2-input" placeholder="Valor (R$)">
            <select id="novoStatus" class="swal2-input">
                <option value="pendente">Pendente</option>
                <option value="confirmado">Confirmado</option>
                <option value="concluido">Concluído</option>
                <option value="cancelado">Cancelado</option>
            </select>
        `,
        confirmButtonText: "Salvar",
        showCancelButton: true
    }).then(async (result) => {
        if (!result.isConfirmed) return;

        const novo = {
            data: document.getElementById("novoData").value,
            cliente: document.getElementById("novoCliente").value,
            telefone: document.getElementById("novoTelefone").value,
            valor: Number(document.getElementById("novoValor").value),
            status: document.getElementById("novoStatus").value,
            criadoEm: new Date().toISOString()
        };

        if (!novo.data || !novo.cliente) {
            Swal.fire("Atenção", "Data e cliente são obrigatórios.", "warning");
            return;
        }

        try {
            await db.collection("agendamentos").add(novo);
            Swal.fire("Sucesso", "Agendamento criado.", "success");
            carregarAgendamentos();
            if (window.atualizarCalendar) atualizarCalendar();
        } catch (e) {
            console.error(e);
            Swal.fire("Erro", "Falha ao salvar.", "error");
        }
    });
}

// ======================================================================
// EDITAR AGENDAMENTO
// ======================================================================
async function editarAgendamento(id) {
    try {
        const doc = await db.collection("agendamentos").doc(id).get();
        if (!doc.exists) return;

        const ag = doc.data();

        Swal.fire({
            title: "Editar Agendamento",
            html: `
                <input id="editData" type="datetime-local" class="swal2-input" value="${ag.data || ""}">
                <input id="editCliente" type="text" class="swal2-input" value="${ag.cliente || ""}">
                <input id="editTelefone" type="text" class="swal2-input" value="${ag.telefone || ""}">
                <input id="editValor" type="number" class="swal2-input" value="${ag.valor || ""}">
                <select id="editStatus" class="swal2-input">
                    <option value="pendente" ${ag.status === "pendente" ? "selected" : ""}>Pendente</option>
                    <option value="confirmado" ${ag.status === "confirmado" ? "selected" : ""}>Confirmado</option>
                    <option value="concluido" ${ag.status === "concluido" ? "selected" : ""}>Concluído</option>
                    <option value="cancelado" ${ag.status === "cancelado" ? "selected" : ""}>Cancelado</option>
                </select>
            `,
            confirmButtonText: "Salvar",
            showCancelButton: true
        }).then(async (result) => {
            if (!result.isConfirmed) return;

            try {
                await db.collection("agendamentos").doc(id).update({
                    data: document.getElementById("editData").value,
                    cliente: document.getElementById("editCliente").value,
                    telefone: document.getElementById("editTelefone").value,
                    valor: Number(document.getElementById("editValor").value),
                    status: document.getElementById("editStatus").value,
                    atualizadoEm: new Date().toISOString()
                });

                Swal.fire("Sucesso", "Agendamento atualizado.", "success");
                carregarAgendamentos();
                if (window.atualizarCalendar) atualizarCalendar();
            } catch (e) {
                console.error(e);
                Swal.fire("Erro", "Falha ao salvar alterações.", "error");
            }
        });

    } catch (e) {
        console.error("Erro ao editar agendamento:", e);
        Swal.fire("Erro", "Não foi possível carregar este agendamento.", "error");
    }
}
