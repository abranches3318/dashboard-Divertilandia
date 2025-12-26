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

      <div class="itens-header">
        <div></div>
        <div>Item</div>
        <div style="text-align:center;">Valor</div>
        <div style="text-align:center;">Status</div>
        <div></div>
      </div>

      ${CATALOGO_STATE.itens.map(item => {
        const capa =
          Array.isArray(item.fotos)
            ? item.fotos.find(f => f.principal) || item.fotos[0]
            : null;

        return `
          <div class="item-row">
           <div class="item-thumb">
  <div class="item-thumb-wrapper">
    <img
      src="${capa?.url || "../img/imageplaceholder.jpg"}"
      style="
        position:absolute;
        top:50%;
        left:50%;
        transform:
          translate(
            calc(-50% + ${(capa?.offsetX ?? 0)}px),
            calc(-50% + ${(capa?.offsetY ?? 0)}px)
          )
          scale(${(capa?.scale ?? 1)});
        transform-origin:center;
        user-select:none;
        width:auto;
        height:100%;
      "
    >
  </div>
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
menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
menu.style.left = `${rect.right - 160}px`;
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

  for (const file of files) {

    if (CATALOGO_STATE.imagensTemp.length >= 5) {
      Swal.fire({
        icon: "warning",
        title: "Limite de imagens",
        text: "Cada item pode ter no máximo 5 imagens."
      });
      break; // interrompe o loop, não adiciona mais
    }

    CATALOGO_STATE.imagensTemp.push({
      file,
      url: URL.createObjectURL(file),
      principal: CATALOGO_STATE.imagensTemp.length === 0,
      offsetX: 0,
      offsetY: 0,
      scale: 1
    });
  }

  renderPreviewImagens();
  e.target.value = "";
}




const STAR_SVG = `
<svg viewBox="0 0 24 24" width="18" height="18">
  <path d="M12 2l2.9 6.3L22 9.2l-5 4.8L18.2 22 12 18.5 5.8 22 7 14 2 9.2l7.1-0.9L12 2z"/>
</svg>
`;

const DELETE_SVG = `
<svg viewBox="0 0 24 24" width="18" height="18">
  <path d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"/>
</svg>
`;

const VIEW_SVG = `
<svg viewBox="0 0 24 24" width="22" height="22">
  <path d="M14 3h7v7h-2V6.41l-9.29 9.3-1.42-1.42 9.3-9.29H14V3z"/>
  <path d="M5 5h6V3H3v8h2V5z"/>
</svg>
`;

const DOWNLOAD_SVG = `
<svg viewBox="0 0 24 24" width="22" height="22">
  <path d="M5 20h14v-2H5v2z"/>
  <path d="M11 4h2v8h3l-4 4-4-4h3z"/>
</svg>
`;

function renderPreviewImagens() {
  const container = document.getElementById("preview-imagens");
  if (!container) return;

  /* mantém todas as imagens em uma linha */
  container.style.display = "flex";
  container.style.gap = "12px";
  container.style.alignItems = "flex-start";

  container.innerHTML = "";

  CATALOGO_STATE.imagensTemp.forEach((img, index) => {
    /* ================= WRAPPER ================= */
    const wrapper = document.createElement("div");
    wrapper.className = "preview-item";
    wrapper.style.position = "relative";
    wrapper.style.width = "120px";               // 🔧 FIXO (não 100%)
    wrapper.style.height = "90px";
    wrapper.style.borderRadius = "8px";
    wrapper.style.background = "#111";
    wrapper.style.overflow = "hidden";

/* ================= AÇÕES SUPERIORES (FORA DA IMAGEM) ================= */
const topActions = document.createElement("div");
topActions.className = "preview-top-actions";
topActions.style.display = "flex";
topActions.style.justifyContent = "flex-end";
topActions.style.gap = "10px";
topActions.style.marginBottom = "6px";
topActions.style.pointerEvents = "auto";

const btnView = document.createElement("button");
btnView.innerHTML = VIEW_SVG;
btnView.title = "Visualizar";
btnView.style.background = "none";
btnView.style.border = "none";
btnView.style.cursor = "pointer";
btnView.onclick = (e) => {
  e.stopPropagation();
  window.open(img.url, "_blank");
};

const btnDelete = document.createElement("button");
btnDelete.className = "preview-delete";
btnDelete.innerHTML = DELETE_SVG;
btnDelete.title = "Excluir imagem";
btnDelete.style.color = "#f44336";

btnDelete.onclick = (e) => {
  e.stopPropagation();

  const eraPrincipal = img.principal;
  CATALOGO_STATE.imagensTemp.splice(index, 1);

  if (eraPrincipal && CATALOGO_STATE.imagensTemp.length) {
    CATALOGO_STATE.imagensTemp[0].principal = true;
  }

  renderPreviewImagens();
};

/* 🔹 APPEND CORRETO (FORA DOS EVENTOS) */
topActions.appendChild(btnView);
topActions.appendChild(btnDelete);
   

    /* ================= IMAGE WRAPPER ================= */
    const imageWrapper = document.createElement("div");
    imageWrapper.className = "preview-image-wrapper";
    imageWrapper.style.position = "relative";
    imageWrapper.style.width = "100%";
    imageWrapper.style.height = "100%";
    imageWrapper.style.overflow = "hidden";

    /* ================= IMAGEM ================= */
    const image = document.createElement("img");
    image.src = img.url;
    image.style.position = "absolute";
    image.style.top = "50%";
    image.style.left = "50%";
    image.style.transformOrigin = "center";
    image.style.userSelect = "none";
    image.style.cursor = "grab";
    image.style.width = "auto";
    image.style.height = "120%";

    /* ================= ESTADO ================= */
    img.offsetX ??= 0;
    img.offsetY ??= 0;
    img.scale ??= 1;

    function aplicarTransform() {
      image.style.transform =
        `translate(calc(-50% + ${img.offsetX}px), calc(-50% + ${img.offsetY}px)) scale(${img.scale})`;
    }

    aplicarTransform();

    /* ================= DRAG ================= */
    image.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();

      DRAG_ATIVO = true;
      DRAG_INDEX = index;
      DRAG_START_X = e.clientX;
      DRAG_START_Y = e.clientY;

      image.style.cursor = "grabbing";
    });

    /* ================= ZOOM ================= */
    image.addEventListener("wheel", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      img.scale = Math.min(3, Math.max(1, img.scale + delta));
      aplicarTransform();
    });

    /* ================= ESTRELA ================= */
    const btnStar = document.createElement("button");
    btnStar.className = `preview-star ${img.principal ? "principal" : "nao-principal"}`;
    btnStar.innerHTML = STAR_SVG;
    btnStar.title = "Salvar como capa do item";
    btnStar.style.position = "absolute";
    btnStar.style.top = "6px";
    btnStar.style.left = "6px";
    btnStar.style.zIndex = "5";
    btnStar.style.background = "none";
    btnStar.style.border = "none";
    btnStar.style.cursor = "pointer";

    btnStar.onclick = (e) => {
      e.stopPropagation();
      CATALOGO_STATE.imagensTemp.forEach(i => i.principal = false);
      img.principal = true;
      renderPreviewImagens();
    };

    
    /* ================= MONTAGEM ================= */
    imageWrapper.appendChild(image);
    imageWrapper.appendChild(btnStar);


    wrapper.appendChild(imageWrapper);

    const bloco = document.createElement("div");
    bloco.style.display = "flex";
    bloco.style.flexDirection = "column";
    bloco.appendChild(topActions);
    bloco.appendChild(wrapper);

    container.appendChild(bloco);
  });

  document.onmouseup = () => {
    if (!DRAG_ATIVO) return;
    DRAG_ATIVO = false;
    DRAG_INDEX = null;
  };
}


// ============================
// UPLOAD DE IMAGENS
// ============================

async function uploadImagensItem(itemId) {
  const fotos = [];

  for (const img of CATALOGO_STATE.imagensTemp) {

    // Se a imagem já existe e não foi alterada
    if (img.existente && img.url && !img.file) {
      fotos.push({
        url: img.url,
        principal: img.principal || false,
        offsetX: img.offsetX || 0,
        offsetY: img.offsetY || 0,
        scale: img.scale || 1
      });
      continue;
    }

    // Upload de nova imagem
    const fileRef = firebase
      .storage()
      .ref()
      .child(`itens/${itemId}/${Date.now()}_${img.file.name}`);

    await fileRef.put(img.file);
    const url = await fileRef.getDownloadURL();

    fotos.push({
      url,
      principal: img.principal || false,
      offsetX: img.offsetX || 0,
      offsetY: img.offsetY || 0,
      scale: img.scale || 1
    });
  }

  // Garantia: sempre existir UMA principal
  if (!fotos.some(f => f.principal) && fotos.length) {
    fotos[0].principal = true;
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

  mostrarLoading("Salvando item...");

  try {
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

    fecharLoading();
    mostrarSucesso("Item salvo", "O item foi salvo com sucesso.");

    fecharModalItem();
    ITEM_EDITANDO_ID = null;
    await carregarItens();
    renderItens();

  } catch (err) {
    console.error(err);
    fecharLoading();
    mostrarErro("Erro ao salvar", "Não foi possível salvar o item.");
  }
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

document.addEventListener("mousemove", (e) => {
  if (!DRAG_ATIVO || DRAG_INDEX === null) return;

  const img = CATALOGO_STATE.imagensTemp[DRAG_INDEX];
  if (!img) return;

  const dx = e.clientX - DRAG_START_X;
  const dy = e.clientY - DRAG_START_Y;

  img.offsetX += dx;
  img.offsetY += dy;

  DRAG_START_X = e.clientX;
  DRAG_START_Y = e.clientY;

  renderPreviewImagens();
});

document.addEventListener("mouseup", () => {
  if (!DRAG_ATIVO) return;
  DRAG_ATIVO = false;
  DRAG_INDEX = null;
});

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

function mostrarLoading(texto = "Processando...") {
  Swal.fire({
    title: texto,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
}

function fecharLoading() {
  Swal.close();
}

function mostrarErro(titulo = "Erro", mensagem = "Ocorreu um problema inesperado.") {
  Swal.fire({
    icon: "error",
    title: titulo,
    text: mensagem
  });
}

function mostrarSucesso(titulo = "Sucesso", mensagem = "Operação concluída.") {
  Swal.fire({
    icon: "success",
    title: titulo,
    text: mensagem,
    timer: 1500,
    showConfirmButton: false
  });
}
