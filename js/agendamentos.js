// ==============================================
// AGENDAMENTOS.JS — CARREGAMENTO E FUNÇÕES
// ==============================================

if (!window.db) {
    console.error("Firestore (db) não encontrado! Verifique firebase-config.js");
}

// ----------------------------
// ELEMENTOS
// ----------------------------
const listaEl = document.getElementById("listaAgendamentos");
const btnNovoAg = document.getElementById("btnNovoAg");

const filtroData = document.getElementById("filtroData");
const filtroCliente = document.getElementById("filtroCliente");
const filtroTelefone = document.getElementById("filtroTelefone");
const filtroStatus = document.getElementById("filtroStatus");
const btnFiltrar = document.getElementById("btnFiltrar");

// ----------------------------
// ESTADO
// ----------------------------
let listaCompleta = [];

// ----------------------------
// CARREGAR AGENDAMENTOS
// ----------------------------
async function carregarAgendamentos() {
    try {
        const snap = await db.collection("agendamentos")
            .orderBy("data", "asc")
            .get();

        listaCompleta = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderTabela(listaCompleta);
    } catch (e) {
        console.error("Erro ao carregar agendamentos:", e);
        Swal.fire("Erro", "Falha ao carregar agendamentos", "error");
    }
}

// ----------------------------
// RENDERIZAR TABELA
// ----------------------------
function renderTabela(lista) {
    listaEl.innerHTML = "";

    if (lista.length === 0) {
        listaEl.innerHTML = `
            <tr>
                <td colspan="6" style="text-align:center">Nenhum agendamento encontrado</td>
            </tr>
        `;
        return;
    }

    lista.forEach(a => {
        const data = a.data?.toDate
            ? a.data.toDate()
            : new Date(a.data);

        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${data.toLocaleDateString()}</td>
            <td>${a.cliente || "-"}</td>
            <td>${a.telefone || "-"}</td>
            <td>${a.status || "-"}</td>
            <td>R$ ${(a.valor || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-dark" onclick="verAgendamento('${a.id}')">Ver</button>
            </td>
        `;

        listaEl.appendChild(linha);
    });
}

// ----------------------------
// FILTRAR
// ----------------------------
function aplicarFiltros() {
    let filtrada = [...listaCompleta];

    // Data
    if (filtroData.value) {
        filtrada = filtrada.filter(a => {
            const d = a.data?.toDate ? a.data.toDate() : new Date(a.data);
            return d.toISOString().slice(0, 10) === filtroData.value;
        });
    }

    // Cliente
    if (filtroCliente.value.trim() !== "") {
        const nome = filtroCliente.value.toLowerCase();
        filtrada = filtrada.filter(a =>
            (a.cliente || "").toLowerCase().includes(nome)
        );
    }

    // Telefone
    if (filtroTelefone.value.trim() !== "") {
        const tel = filtroTelefone.value.replace(/\D/g, "");
        filtrada = filtrada.filter(a =>
            (a.telefone || "").replace(/\D/g, "").includes(tel)
        );
    }

    // Status
    if (filtroStatus.value !== "") {
        filtrada = filtrada.filter(a =>
            a.status === filtroStatus.value
        );
    }

    renderTabela(filtrada);
}

// ----------------------------
// NOVO AGENDAMENTO
// ----------------------------
async function novoAgendamento() {
    Swal.fire({
        title: "Novo Agendamento",
        html: `
            <input class="swal2-input" id="ag-nome" placeholder="Cliente">
            <input class="swal2-input" id="ag-tel" placeholder="Telefone">
            <input class="swal2-input" type="date" id="ag-data">
            <input class="swal2-input" id="ag-valor" placeholder="Valor">

        `,
        showCancelButton: true,
        confirmButtonText: "Salvar"
    }).then(async result => {
        if (!result.isConfirmed) return;

        const nome = document.getElementById("ag-nome").value.trim();
        const tel = document.getElementById("ag-tel").value.trim();
        const data = document.getElementById("ag-data").value;
        const valor = Number(document.getElementById("ag-valor").value || 0);

        if (!nome || !tel || !data) {
            Swal.fire("Erro", "Preencha todos os campos obrigatórios", "error");
            return;
        }

        await db.collection("agendamentos").add({
            cliente: nome,
            telefone: tel,
            valor: valor,
            data: new Date(data),
            status: "pendente",
            criado_em: firebase.firestore.FieldValue.serverTimestamp()
        });

        Swal.fire("Salvo!", "Agendamento criado", "success");
        carregarAgendamentos();
    });
}

// ----------------------------
// VER DETALHES
// ----------------------------
window.verAgendamento = async function (id) {
    const doc = await db.collection("agendamentos").doc(id).get();
    if (!doc.exists) {
        Swal.fire("Erro", "Agendamento não encontrado", "error");
        return;
    }

    const a = doc.data();

    Swal.fire({
        title: a.cliente,
        html: `
            <p><b>Telefone:</b> ${a.telefone}</p>
            <p><b>Data:</b> ${a.data.toDate().toLocaleDateString()}</p>
            <p><b>Status:</b> ${a.status}</p>
            <p><b>Valor:</b> R$ ${(a.valor || 0).toFixed(2)}</p>
        `
    });
};

// ----------------------------
// EVENTOS
// ----------------------------
if (btnNovoAg) btnNovoAg.addEventListener("click", novoAgendamento);
if (btnFiltrar) btnFiltrar.addEventListener("click", aplicarFiltros);

// ----------------------------
// INICIAR
// ----------------------------
carregarAgendamentos();
