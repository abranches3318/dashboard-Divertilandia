async function carregarAgendamentos() {
  let snap = await db.collection("agendamentos").orderBy("data", "asc").get();
  let lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderizar(lista);
}

function renderizar(lista) {
  const tbody = document.getElementById("listaAgendamentos");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;">Nenhum agendamento encontrado</td></tr>`;
    return;
  }

  lista.forEach(a => {
    tbody.innerHTML += `
      <tr>
        <td>${a.data}</td>
        <td>${a.cliente}</td>
        <td>${a.telefone}</td>
        <td>${a.status}</td>
        <td>R$ ${Number(a.valor || 0).toFixed(2)}</td>
        <td><button class="btn" onclick="editar('${a.id}')">Abrir</button></td>
      </tr>
    `;
  });
}

async function aplicarFiltro() {
  let ref = db.collection("agendamentos");

  const data = document.getElementById("filtroData").value;
  const nome = document.getElementById("filtroCliente").value.toLowerCase();
  const tel = document.getElementById("filtroTelefone").value.replace(/\D/g, "");
  const status = document.getElementById("filtroStatus").value;

  let snap = await ref.get();
  let lista = snap.docs.map(d => ({ id:d.id, ...d.data() }));

  if (data) lista = lista.filter(a => a.data === data);
  if (nome) lista = lista.filter(a => (a.cliente || "").toLowerCase().includes(nome));
  if (tel) lista = lista.filter(a => (a.telefone || "").replace(/\D/g,"").includes(tel));
  if (status) lista = lista.filter(a => a.status === status);

  renderizar(lista);
}

function editar(id) {
  window.location.href = "agendamento-editar.html?id=" + id;
}

document.getElementById("btnFiltrar").onclick = aplicarFiltro;

document.getElementById("btnNovoAg").onclick = () => {
  window.location.href = "agendamento-editar.html?novo=1";
};

window.addEventListener("DOMContentLoaded", carregarAgendamentos);
