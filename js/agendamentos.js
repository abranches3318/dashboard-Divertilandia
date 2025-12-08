// ======================================================================
//  AGENDAMENTOS.JS  (USANDO db GLOBAL DO firebase-config.js)
// ======================================================================

// Abertura da página via menu
document.getElementById("menu-agendamentos").addEventListener("click", () => {
    mostrarPagina("pagina-agendamentos");
    carregarAgendamentos();
});

// Botão "+ Novo Agendamento"
document.getElementById("btnNovoAgendamento").addEventListener("click", () => {
    abrirModalNovoAgendamento();
});

// Botão "Filtrar"
document.getElementById("btnFiltrarAgendamentos").addEventListener("click", () => {
    carregarAgendamentos();
});

// ======================================================================
//  FUNÇÃO PRINCIPAL — CARREGAR LISTA
// ======================================================================
async function carregarAgendamentos(filtroDataDireta = null) {
    const tbody = document.getElementById("listaAgendamentos");
    tbody.innerHTML = "";

    try {
        const dataFiltro = filtroDataDireta || document.getElementById("filtroData").value;
        const clienteFiltro = document.getElementById("filtroCliente").value.trim().toLowerCase();
        const telefoneFiltro = document.getElementById("filtroTelefone").value.trim();
        const statusFiltro = document.getElementById("filtroStatus").value;

        const snapshot = await db.collection("agendamentos")
            .orderBy("data")
            .orderBy("horario")
            .get();

        let lista = [];

        snapshot.forEach(doc => {
            let ag = doc.data();
            ag.id = doc.id;

            let ok = true;

            if (dataFiltro && ag.data !== dataFiltro) ok = false;
            if (statusFiltro && ag.status !== statusFiltro) ok = false;
            if (clienteFiltro && !ag.cliente?.toLowerCase().includes(clienteFiltro)) ok = false;
            if (telefoneFiltro && ag.telefone !== telefoneFiltro) ok = false;

            if (ok) lista.push(ag);
        });

        lista.forEach(ag => {
            const linha = `
                <tr>
                    <td>${ag.data} ${ag.horario}</td>
                    <td>${ag.cliente || "---"}</td>
                    <td>${ag.telefone || "---"}</td>

                    <td class="status-${ag.status}">
                        ${ag.status}
                    </td>

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
        console.error(e);
        Swal.fire("Erro", "Falha ao carregar agendamentos.", "error");
    }
}

// ======================================================================
//  FUNÇÃO CHAMADA PELO FULLCALENDAR
// ======================================================================
window.abrirAgendamentosNaData = function (dataISO) {
    document.getElementById("filtroData").value = dataISO;
    mostrarPagina("pagina-agendamentos");
    carregarAgendamentos(dataISO);
};

// ======================================================================
//  NOVO AGENDAMENTO
// ======================================================================
function abrirModalNovoAgendamento() {
    Swal.fire({
        title: "Novo Agendamento",
        html: `
            <input type="date" id="ag_data" class="swal2-input">
            <input type="time" id="ag_horario" class="swal2-input">
            <input type="text" id="ag_cliente" class="swal2-input" placeholder="Nome">
            <input type="text" id="ag_telefone" class="swal2-input" placeholder="Telefone">
            <textarea id="ag_itens" class="swal2-textarea" placeholder='[{"id":"pula-pula","qtd":1}]'></textarea>
            <input type="number" id="ag_valorfinal" class="swal2-input" placeholder="Valor Final">
        `,
        confirmButtonText: "Salvar",
        showCancelButton: true,
        preConfirm: async () => {
            const data = document.getElementById("ag_data").value;
            const horario = document.getElementById("ag_horario").value;
            const cliente = document.getElementById("ag_cliente").value;
            const telefone = document.getElementById("ag_telefone").value;
            const valorFinal = Number(document.getElementById("ag_valorfinal").value || 0);

            let itens;
            try {
                itens = JSON.parse(document.getElementById("ag_itens").value || "[]");
            } catch {
                Swal.fire("Atenção", "Itens precisam estar em JSON.", "warning");
                return false;
            }

            if (!data || !horario || !cliente || !telefone) {
                Swal.fire("Atenção", "Preencha todos os campos.", "warning");
                return false;
            }

            await db.collection("agendamentos").add({
                data,
                horario,
                cliente,
                telefone,
                itens,
                valor_final: valorFinal,
                receita_recebida: valorFinal,
                status: "pendente",
                criado_em: new Date().toISOString()
            });

            Swal.fire("OK", "Agendamento criado.", "success");
            carregarAgendamentos();
        }
    });
}

// ======================================================================
//  EDITAR
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
            } catch {
                Swal.fire("Erro", "JSON dos itens inválido.", "error");
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

            Swal.fire("OK", "Atualizado.", "success");
            carregarAgendamentos();
        }
    });
}

// ======================================================================
//  CANCELAR
// ======================================================================
function cancelarAgendamento(id) {
    Swal.fire({
        title: "Cancelar Agendamento?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim"
    }).then(async (r) => {
        if (r.isConfirmed) {
            await db.collection("agendamentos").doc(id).update({ status: "cancelado" });
            Swal.fire("OK", "Cancelado.", "success");
            carregarAgendamentos();
        }
    });
}

// ======================================================================
//  CONCLUIR
// ======================================================================
function concluirAgendamento(id) {
    Swal.fire({
        title: "Marcar como concluído?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Sim"
    }).then(async (r) => {
        if (r.isConfirmed) {
            await db.collection("agendamentos").doc(id).update({ status: "concluido" });
            Swal.fire("OK", "Concluído.", "success");
            carregarAgendamentos();
        }
    });
}
