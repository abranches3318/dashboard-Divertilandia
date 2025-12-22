// ============================
// CATÁLOGO — BASE
// ============================

console.log("catalogo.js carregado");

// ---------- STATE ----------
const CATALOGO_STATE = {
  itens: [],
  pacotes: [],
  promocoes: [],
  imagensTemp: []
};

let ITEM_EDITANDO_ID = null;
let MENU_ITEM_ATUAL = null;

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  if (!window.db) {
    console.error("Firestore não disponível");
    return;
  }

  carregarCatalogo();
  bindEventos();
  criarMenuItem();
  bindTabs();
});

// ============================
// CARREGAR DADOS
// ============================

async function carregarCatalogo() {
  await Promise.all([
    carregarItens(),
    carregarPacotes(),
    carregarPromocoes()
  ]);

  renderItens();
  renderPacotes();
  renderPromocoes();
}

async function carregarItens() {
  const snap = await db.collection("item").orderBy("nome").get();
  CATALOGO_STATE.itens = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function carregarPacotes() {
  const snap = await db.collection("pacotes").orderBy("nome").get();
  CATALOGO_STATE.pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function carregarPromocoes() {
  const snap = await db.collection("promocoes").get();
  CATALOGO_STATE.promocoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================
// RENDER ITENS
// ============================

function renderItens() {
  const el = document.getElementById("lista-itens");
  if (!el) return;

  if (!CATALOGO_STATE.itens.length) {
    el.innerHTML = `<p style="opacity:.7">Nenhum item cadastrado.</p>`;
    return;
  }

  el.innerHTML = `
    <div class="itens-lista">
      ${CATALOGO_STATE.itens.map(item => {
        const capa = item.fotos?.find(f => f.principal)?.url || item.fotos?.[0]?.url || "../img/imageplaceholder.jpg";

        return `
          <div class="item-row">
            <div class="item-thumb">
              <img src="${capa}">
            </div>

            <div class="item-info">
              <div class="item-nome">${item.nome}</div>
              <div class="item-quantidade">Qtd: ${item.quantidade}</div>
            </div>

            <div class="item-valor">R$ ${(item.valor ?? item.preco ?? 0).toFixed(2)}</div>

            <div class="item-status ${item.ativo === false ? "inativo" : "ativo"}">
              ${item.ativo === false ? "Inativo" : "Ativo"}
            </div>

            <button class="item-acoes" onclick="abrirMenuItem(event,'${item.id}')">⋮</button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ============================
// MENU ⋮
// ============================

function criarMenuItem() {
  if (document.getElementById("menu-item-flutuante")) return;

  const menu = document.createElement("div");
  menu.id = "menu-item-flutuante";
  menu.className = "menu-acoes";
  menu.innerHTML = `
    <button class="menu-item editar" onclick="editarItem()">✏️ Editar</button>
    <button class="menu-item excluir" onclick="excluirItem()">🗑️ Excluir</button>
  `;

  document.body.appendChild(menu);

  document.addEventListener("click", e => {
    if (!menu.contains(e.target)) {
      menu.style.display = "none";
      MENU_ITEM_ATUAL = null;
    }
  });
}

function abrirMenuItem(event, itemId) {
  event.stopPropagation();
  const menu = document.getElementById("menu-item-flutuante");
  const rect = event.target.getBoundingClientRect();

  MENU_ITEM_ATUAL = itemId;
  menu.style.top = `${rect.bottom + 6}px`;
  menu.style.left = `${rect.left - 120}px`;
  menu.style.display = "block";
}

// ============================
// MODAL ITEM
// ============================

function abrirModalNovoItem() {
  ITEM_EDITANDO_ID = null;
  limparModalItem();
  document.getElementById("modal-item-titulo").textContent = "Novo Item";
  document.getElementById("modal-item").classList.add("active");
}

function editarItem() {
  const item = CATALOGO_STATE.itens.find(i => i.id === MENU_ITEM_ATUAL);
  if (!item) return;

  ITEM_EDITANDO_ID = item.id;

  document.getElementById("modal-item-titulo").textContent = "Editar Item";
  document.getElementById("item-nome").value = item.nome;
  document.getElementById("item-preco").value = item.valor ?? item.preco ?? 0;
  document.getElementById("item-quantidade").value = item.quantidade;
  document.getElementById("item-descricao").value = item.descricao || "";
  document.getElementById("item-status").value = item.ativo ? "ativo" : "inativo";

  CATALOGO_STATE.imagensTemp = (item.fotos || []).map(f => ({
    url: f.url,
    principal: f.principal,
    existente: true
  }));

  renderPreviewImagens();
  document.getElementById("menu-item-flutuante").style.display = "none";
  document.getElementById("modal-item").classList.add("active");
}

function fecharModalItem() {
  document.getElementById("modal-item").classList.remove("active");
}

// ============================
// SALVAR ITEM (NOVO / EDITAR)
// ============================

async function salvarNovoItem() {
  const nome = itemNome.value.trim();
  const valor = Number(itemPreco.value);
  const quantidade = Number(itemQuantidade.value);
  const descricao = itemDescricao.value.trim();
  const status = itemStatus.value;

  if (!nome || valor <= 0 || quantidade < 0) {
    Swal.fire("Erro", "Preencha corretamente os campos.", "warning");
    return;
  }

  const dados = {
    nome,
    valor,
    preco: valor,
    quantidade,
    descricao,
    ativo: status === "ativo",
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (ITEM_EDITANDO_ID) {
    await db.collection("item").doc(ITEM_EDITANDO_ID).update(dados);
  } else {
    const ref = await db.collection("item").add({
      ...dados,
      fotos: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    if (CATALOGO_STATE.imagensTemp.length) {
      const fotos = await uploadImagensItem(ref.id);
      await ref.update({ fotos });
    }
  }

  fecharModalItem();
  ITEM_EDITANDO_ID = null;
  await carregarItens();
  renderItens();
}

// ============================
// EXCLUIR
// ============================

async function excluirItem(itemId = MENU_ITEM_ATUAL) {
  const confirm = await Swal.fire({
    icon: "warning",
    title: "Excluir item?",
    showCancelButton: true,
    confirmButtonText: "Excluir"
  });

  if (!confirm.isConfirmed) return;

  await db.collection("item").doc(itemId).delete();
  await carregarItens();
  renderItens();
}
