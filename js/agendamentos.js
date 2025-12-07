// ==========================================
//  AGENDAMENTOS.JS
// ==========================================

// Referências Firebase
const db = firebase.firestore();

// ======================================================================
//  ABERTURA DA SEÇÃO AGENDAMENTOS PELO MENU
// ======================================================================
document.getElementById("menu-agendamentos").addEventListener("click", () => {
    mostrarPagina("pagina-agendamentos");
    carregarAgendamentos();
});

// ======================================================================
//  BOTÃO: "+ Novo Agendamento"
// ======================================================================
document.getElementById("btnNovoAgendamento").addEventListener("click", () => {
    abrirModalNovoAgendamento();
});

// ======================================================================
//  FILTRAR AGENDAMENTOS
// ======================================================================
document.getElementById("btnFiltrarAgendamentos").addEventListener("click", () => {
    carregarAgendamentos();
});

// ======================================================================
//  FUNÇÃO PRINCIPAL: CARREGAR AGENDAMENTOS
// ======================================================================
async function carregarAgendamentos(filtroDataDireta = null) {
    const tbody = document.getElementById("listaAgendamentos");
    tbody.innerHTML = "";

    try {
        let ref = db.collection("agendamentos");

        const dataFiltro = filtroDataDireta || document.getElementById("filtroData").value;
        const clienteFiltro = document.getElementById("filtroCliente").value.trim().toLowerCase();
        const telefoneFiltro = document.getElementById("filtroTelefone").value.trim();
        const statusFiltro = document.getElementById("filtroStatus").value;

        let snapshot = await ref.orderBy("data").orderBy("horario").get();
        let lista = [];

        snapshot.forEach(doc => {
            let ag = doc.data();
            ag.id = doc.id;

            let incluir = true;

            if (dataFiltro && ag.data !== dataFiltro) incluir = false;
            if (statusFiltro && ag.status !== statusFiltro) incluir = false;
            if (clienteFiltro && !ag.cliente?.toLowerCase().includes(clienteFiltro)) incluir = false;
            if (telefoneFiltro && ag.telefone !== telefoneFiltro) incluir = false;

            if (incluir) lista.push(ag);
        });

        lista.forEach(ag => {
            let linha = `
                <tr>
                    <td>${ag.data} ${ag.horario}</td>
                    <td>${ag.cliente || "---"}</td>
                    <td>${ag.telefone || "---"}</td>
                    <td class="status-${ag.status}">${ag.status}</td>
                    <td>R$ ${Number(ag.valor_final || 0).toFixed(2)}</td>

                    <td>
                        <button class="btnAcao" onclick="editarAgendamento('${ag.id}')">Editar</button>
                        <button class="btnAcao" onclick="cancelarAgendamento('${ag.id}')">Cancelar</button>
                        <button class="btnAcao" onclick="concluirAgendamento('${ag.id}')">Concluir</button>
                    </td>
                </tr>
            `;
            tbody.insertAdjacentHTML("beforeend", linha);
        });

    } catch (e) {
        Swal.fire("Erro", "Não foi possível carregar os agendamentos.", "error");
        console.error(e);
    }
}

// ======================================================================
//  FUNÇÃO CHAMADA PELO CALENDÁRIO
//  calendar.js chamará: abrirAgendamentosNaData("2025-12-15")
// ======================================================================
window.abrirAgendamentosNaData = function (data) {
    document.getElementById("filtroData").value = data;
    mostrarPagina("pagina-agendamentos");
    carregarAgendamentos(data);
};

// ======================================================================
//  MODAL: NOVO AGENDAMENTO
// ======================================================================
function abrirModalNovoAgendamento() {
    Swal.fire({
        title: "Novo agendamento",
        html: `
            <div class="form-group">
                <label>Data</label>
                <input type="date" id="ag_data" class="swal2-input">
            </div>

            <div class="form-group">
                <label>Horário</label>
                <input type="time" id="ag_horario" class="swal2-input">
            </div>

            <div class="form-group">
                <label>Cliente</label>
                <input type="text" id="ag_cliente" class="swal2-input" placeholder="Nome do cliente">
            </div>

            <div class="form-group">
                <label>Telefone</label>
                <input type="text" id="ag_telefone" class="swal2-input" placeholder="(DDD) 9XXXX-XXXX">
            </div>

            <div class="form-group">
                <label>Itens (JSON)</label>
                <textarea id="ag_itens" class="swal2-textarea" placeholder='[{"id":"pula-pula","qtd":1}]'></textarea>
            </div>

            <div class="form-group">
                <label>Valor Final</label>
                <input type="number" id="ag_valorfinal" class="swal2-input">
            </div>
        `,
        confirmButtonText: "Salvar",
        showCancelButton: true,
        preConfirm: async () => {
            let data = document.getElementById("ag_data").value;
            let horario = document.getElementById("ag_horario").value;
            let cliente = document.getElementById("ag_cliente").value;
            let telefone = document.getElementById("ag_telefone").value;
            let itens;
            let valorFinal = Number(document.getElementById("ag_valorfinal").value || 0);

            try {
                itens = JSON.parse(document.getElementById("ag_itens").value || "[]");
            } catch (e) {
                Swal.fire("Atenção", "Itens devem estar em formato JSON.", "warning");
                return false;
            }

            if (!data || !horario || !cliente || !telefone) {
                Swal.fire("Atenção", "Preencha todos os campos obrigatórios.", "warning");
                return false;
            }

            const novo = {
                data,
                horario,
                cliente,
                telefone,
                itens,
                valor_final: valorFinal,
                receita_recebida: valorFinal, // Solicitado
                status: "pendente",
                criado_em: new Date().toISOString()
            };

            await db.collection("agendamentos").add(novo);
            Swal.fire("OK", "Agendamento criado com sucesso.", "success");

            carregarAgendamentos();
        }
    });
}

// ======================================================================
//  EDITAR AGENDAMENTO
// ======================================================================
async function editarAgendamento(id) {
    const doc = await db.collection("agendamentos").doc(id).get();
    const ag = doc.data();

    Swal.fire({
        title: "Editar Agendamento",
        html: `
            <input type="date" id="ed_data" class="swal2-input" value="${ag.data}">
            <input type="time" id="ed_horario" class="swal2-input" value="${ag.horario}">
            <input type="text" id="ed_cliente" class="swal2-input" value="${ag.cliente}">
            <input type="text" id="ed_telefone" class="swal2-input" value="${ag.telefone}">
            <textarea id="ed_itens" class="swal2-textarea">${JSON.stringify(ag.itens || [])}</textarea>
            <input type="number" id="ed_valor" class="swal2-input" value="${ag.valor_final || 0}">
        `,
        confirmButtonText: "Salvar",
        showCancelButton: true,
        preConfirm: async () => {

            let itens;
            try {
                itens = JSON.parse(document.getElementById("ed_itens").value);
            } catch (e) {
                Swal.fire("Erro", "Itens inválidos.", "error");
                return false;
            }

            await db.collection("agendamentos").doc(id).update({
                data: document.getElementById("ed_data").value,
                horario: document.getElementById("ed_horario").value,
                cliente: document.getElementById("ed_cliente").value,
                telefone: document.getElementById("ed_telefone").value,
                itens,
                valor_final: Number(document.getElementById("ed_valor").value),
                receita_recebida: Number(document.getElementById("ed_valor").value)
            });

            Swal.fire("OK", "Agendamento atualizado.", "success");
            carregarAgendamentos();
        }
    });
}

// ======================================================================
//  CANCELAR AGENDAMENTO
// ======================================================================
function cancelarAgendamento(id) {
    Swal.fire({
        title: "Cancelar Agendamento?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim",
        cancelButtonText: "Não"
    }).then(async (res) => {
        if (res.isConfirmed) {
            await db.collection("agendamentos").doc(id).update({
                status: "cancelado"
            });
            Swal.fire("OK", "Agendamento cancelado.", "success");
            carregarAgendamentos();
        }
    });
}

// ======================================================================
//  CONCLUIR AGENDAMENTO
// ======================================================================
function concluirAgendamento(id) {
    Swal.fire({
        title: "Marcar como concluído?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Sim",
        cancelButtonText: "Não"
    }).then(async (r) => {
        if (r.isConfirmed) {
            await db.collection("agendamentos").doc(id).update({
                status: "concluido"
            });
            Swal.fire("OK", "Agendamento concluído.", "success");
            carregarAgendamentos();
        }
    });
}
