// ============================
// FIREBASE (compat, global)
// ============================
window.db = window.db || firebase.firestore();

// ============================
// ESTADO GLOBAL
// ============================
window.checklistState = {
  osId: null,
  tipo: null, // montagem ou desmontagem
  ordemServico: null
};

// ============================
// INICIALIZAÇÃO
// ============================
window.addEventListener("DOMContentLoaded", async () => {
  const paginaChecklist = document.querySelector(".pagina");
  if (!paginaChecklist) return;

  // Determina o tipo pela página
  if (paginaChecklist.id === "pagina-checklist-montagem") {
    checklistState.tipo = "montagem";
  } else if (paginaChecklist.id === "pagina-checklist-desmontagem") {
    checklistState.tipo = "desmontagem";
  } else {
    return; // página não é checklist
  }

  // Pega o ID da OS da URL
  const params = new URLSearchParams(window.location.search);
  const osId = params.get("os");
  if (!osId) {
    paginaChecklist.innerHTML = "<p>Ordem de serviço não definida.</p>";
    return;
  }
  checklistState.osId = osId;

  // Carregar checklist da OS
  await carregarChecklist(osId);
});

// ============================
// CARREGAR CHECKLIST
// ============================
async function carregarChecklist(osId) {
  try {
    const doc = await db.collection("ordens_servico").doc(osId).get();
    if (!doc.exists) {
      document.querySelector(".pagina").innerHTML = "<p>Ordem de serviço não encontrada.</p>";
      return;
    }

    checklistState.ordemServico = doc.data();

    const container = document.querySelector(".pagina");
    container.innerHTML = `<h2>Checklist - ${checklistState.tipo === "montagem" ? "Montagem" : "Desmontagem"}</h2>
      <form id="form-checklist">
        <div id="itens-container"></div>
        <button type="submit" class="btn">Salvar Checklist</button>
      </form>`;

    const itensContainer = document.getElementById("itens-container");

    // Gera checklist: item e suas peças
    (checklistState.ordemServico.itens || []).forEach((item, idxItem) => {
      const itemDiv = document.createElement("div");
      itemDiv.classList.add("checklist-item");
      itemDiv.innerHTML = `<h3>${item.nome}</h3>`;

      const ul = document.createElement("ul");
      (item.pecas || []).forEach((peca, idxPeca) => {
        const li = document.createElement("li");
        li.innerHTML = `
          <label>
            <input type="checkbox" name="item-${idxItem}-peca-${idxPeca}" value="${peca}" />
            ${peca}
          </label>
        `;
        ul.appendChild(li);
      });

      itemDiv.appendChild(ul);
      itensContainer.appendChild(itemDiv);
    });

    // Listener de submit
    const form = document.getElementById("form-checklist");
    form.addEventListener("submit", salvarChecklist);

  } catch (err) {
    console.error("Erro ao carregar checklist:", err);
    document.querySelector(".pagina").innerHTML = "<p>Erro ao carregar checklist.</p>";
  }
}

// ============================
// SALVAR CHECKLIST
// ============================
async function salvarChecklist(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const resultado = {};

  for (const [key, value] of formData.entries()) {
    resultado[key] = true;
  }

  try {
    await db.collection("ordens_servico").doc(checklistState.osId).update({
      [`checklist_${checklistState.tipo}`]: resultado,
      [`checklist_${checklistState.tipo}_atualizado_em`]: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Checklist salvo com sucesso!");
  } catch (err) {
    console.error("Erro ao salvar checklist:", err);
    alert("Erro ao salvar checklist, tente novamente.");
  }
}
