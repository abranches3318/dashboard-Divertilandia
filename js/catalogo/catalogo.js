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
let DRAG_ATIVO = false;
let DRAG_INDEX = null;
let DRAG_START_X = 0;
let DRAG_START_Y = 0;

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  if (!window.db) {
    console.error("Firestore não disponível");
    return;
  }

  criarMenuItem();
  carregarCatalogo();
  bindEventos();
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
        const capa =
          item.fotos?.find(f => f.principal)?.url ||
          item.fotos?.[0]?.url ||
          "../img/imageplaceholder.jpg";

        return `
          <div class="item-row">
            <div class="item-thumb">
              <img src="${capa}">
            </div>

            <div class="item-info">
              <div class="item-nome">${item.nome}</div>
              <div class="item-quantidade">Qtd: ${item.quantidade}</div>
            </div>

            <div class="item-valor">
              R$ ${(item.valor ?? item.preco ?? 0).toFixed(2)}
            </div>

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
  menu.style.display = "none";
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
  if (!menu) return;

  MENU_ITEM_ATUAL = itemId;

  const rect = event.target.getBoundingClientRect();
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
  existente: true,
  offsetX: f.offsetX ?? 0,
  offsetY: f.offsetY ?? 0,
  scale: f.scale ?? 1
}));

  renderPreviewImagens();
  document.getElementById("menu-item-flutuante").style.display = "none";
  document.getElementById("modal-item").classList.add("active");
}

function fecharModalItem() {
  document.getElementById("modal-item").classList.remove("active");
}

function limparModalItem() {
  document.getElementById("item-nome").value = "";
  document.getElementById("item-preco").value = "";
  document.getElementById("item-quantidade").value = "";
  document.getElementById("item-descricao").value = "";
  document.getElementById("item-status").value = "ativo";

  CATALOGO_STATE.imagensTemp = [];
  renderPreviewImagens();
}

// ============================
// IMAGENS
// ============================

function handleSelecionarFotos(e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  files.forEach(file => {
    CATALOGO_STATE.imagensTemp.push({
  file,
  url: URL.createObjectURL(file),
  principal: CATALOGO_STATE.imagensTemp.length === 0,
  offsetX: 0,
  offsetY: 0,
  scale: 1
});
  });

  renderPreviewImagens();
  e.target.value = "";
}

function renderPreviewImagens() {
  const container = document.getElementById("preview-imagens");
  if (!container) return;

  container.innerHTML = "";

  CATALOGO_STATE.imagensTemp.forEach((img, index) => {
    const wrapper = document.createElement("div");
  wrapper.className = "preview-item";
wrapper.style.position = "relative";
wrapper.style.width = "100%";
wrapper.style.height = "90px";
wrapper.style.overflow = "hidden";

    const image = document.createElement("img");
    image.src = img.url;
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
image.style.borderRadius = "8px";
image.style.display = "block";

    const image = document.createElement("img");
image.src = img.url;

    image.style.cursor = "grab";

/* =========================
   DRAG — INÍCIO
========================= */
image.addEventListener("mousedown", (e) => {
  e.preventDefault();

  DRAG_ATIVO = true;
  DRAG_INDEX = index;
  DRAG_START_X = e.clientX;
  DRAG_START_Y = e.clientY;

  image.style.cursor = "grabbing";
});

/* =========================
   DRAG — MOVIMENTO
========================= */
document.addEventListener("mousemove", (e) => {
  if (!DRAG_ATIVO || DRAG_INDEX !== index) return;

  const dx = e.clientX - DRAG_START_X;
  const dy = e.clientY - DRAG_START_Y;

  img.offsetX = (img.offsetX ?? 0) + dx;
  img.offsetY = (img.offsetY ?? 0) + dy;

  DRAG_START_X = e.clientX;
  DRAG_START_Y = e.clientY;

  renderPreviewImagens();
});

/* =========================
   DRAG — FIM
========================= */
document.addEventListener("mouseup", () => {
  if (DRAG_ATIVO) {
    DRAG_ATIVO = false;
    DRAG_INDEX = null;
  }
});

/* 🔹 APLICA ENQUADRAMENTO */
const x = img.offsetX ?? 0;
const y = img.offsetY ?? 0;
const scale = img.scale ?? 1;

image.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
image.style.transition = "transform 0.15s ease";
    wrapper.appendChild(image);
    container.appendChild(wrapper);
  });
}

async function uploadImagensItem(itemId) {
  const fotos = [];

  for (const img of CATALOGO_STATE.imagensTemp) {
    if (img.existente) {
      fotos.push(img);
      continue;
    }

    const ref = storage
      .ref()
      .child(`catalogo/itens/${itemId}/${Date.now()}_${img.file.name}`);

    const snap = await ref.put(img.file);
    const url = await snap.ref.getDownloadURL();

    fotos.push({
  url,
  principal: img.principal === true,
  offsetX: img.offsetX ?? 0,
  offsetY: img.offsetY ?? 0,
  scale: img.scale ?? 1
});
  }

  return fotos;
}

// ============================
// SALVAR ITEM
// ============================

async function salvarNovoItem() {
  const nome = document.getElementById("item-nome").value.trim();
  const valor = Number(document.getElementById("item-preco").value);
  const quantidade = Number(document.getElementById("item-quantidade").value);
  const descricao = document.getElementById("item-descricao").value.trim();
  const status = document.getElementById("item-status").value;

  if (!nome || valor <= 0 || quantidade < 0) {
    Swal.fire("Erro", "Preencha corretamente os campos.", "warning");
    return;
  }

  let ref;

  if (ITEM_EDITANDO_ID) {
    ref = db.collection("item").doc(ITEM_EDITANDO_ID);
    await ref.update({
      nome,
      valor,
      preco: valor,
      quantidade,
      descricao,
      ativo: status === "ativo",
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    ref = await db.collection("item").add({
      nome,
      valor,
      preco: valor,
      quantidade,
      descricao,
      ativo: status === "ativo",
      fotos: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  if (CATALOGO_STATE.imagensTemp.length) {
    const fotos = await uploadImagensItem(ref.id);
    await ref.update({ fotos });
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
  if (!itemId) return;

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

// ============================
// EVENTOS / TABS
// ============================

function bindEventos() {
  document.getElementById("btn-novo-item")?.addEventListener("click", abrirModalNovoItem);
  document.getElementById("btn-salvar-item")?.addEventListener("click", salvarNovoItem);
  document.getElementById("input-imagens")?.addEventListener("change", handleSelecionarFotos);
}

function bindTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  const sections = document.querySelectorAll(".catalogo-section");

  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      const alvo = btn.dataset.tab;

      tabs.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      sections.forEach(sec => {
        sec.classList.toggle("active", sec.id === `sec-${alvo}`);
      });
    });
  });
}
