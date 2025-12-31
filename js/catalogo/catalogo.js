// ============================
// CATÁLOGO — BASE (CORE)
// ============================

// ---------- STATE GLOBAL ----------
const CATALOGO_STATE = {
  itens: [],
  pacotes: [],
  promocoes: [],

  imagensTempItem: [],
  imagensTempPacote: []
};

// ---------- CONTEXTO GLOBAL ----------
let MODAL_CONTEXTO = "item";

// ============================
// HELPERS UTILITÁRIOS
// ============================

function setValorSeguro(id, valor = "") {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}

function getImagensTempAtivas() {
  return MODAL_CONTEXTO === "pacote"
    ? CATALOGO_STATE.imagensTempPacote
    : CATALOGO_STATE.imagensTempItem;
}

// ============================
// HELPERS GLOBAIS (UTILS)
// ============================


// ---------- IMAGENS ----------

function limparPreviewImagens() {
  const preview = document.getElementById("preview-imagens");
  if (preview) preview.innerHTML = "";

  if (MODAL_CONTEXTO === "pacote") {
    CATALOGO_STATE.imagensTempPacote = [];
  } else {
    CATALOGO_STATE.imagensTempItem = [];
  }
}

// ---------- SALVAR REGISTRO GENÉRICO ----------

async function salvarRegistro({ colecao, id = null, dados, onSucesso }) {
  try {
    mostrarLoading("Salvando...");

    if (id) {
      await db.collection(colecao).doc(id).update(dados);
    } else {
      await db.collection(colecao).add(dados);
    }

    fecharLoading();
    mostrarSucesso("Sucesso", "Registro salvo.");

    if (typeof onSucesso === "function") onSucesso();

  } catch (err) {
    console.error(err);
    fecharLoading();
    mostrarErro("Erro ao salvar", err.message || "Erro inesperado");
  }
}


function aplicarTransformImagem(imgEl, estado) {
  // limites de segurança
  const scale = Math.min(2.5, Math.max(0.7, estado.scale ?? 1));
  const offsetX = Math.min(80, Math.max(-80, estado.offsetX ?? 0));
  const offsetY = Math.min(50, Math.max(-50, estado.offsetY ?? 0));

  // salva de volta (estado consistente)
  estado.scale = scale;
  estado.offsetX = offsetX;
  estado.offsetY = offsetY;

  imgEl.style.transformOrigin = "center center";
  imgEl.style.transform =
    `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

function garantirImagemPrincipal() {
  const imagens = getImagensTempAtivas();
  if (!imagens || imagens.length === 0) return;

  const existePrincipal = imagens.some(img => img.principal === true);

  if (!existePrincipal) {
    imagens[0].principal = true;
  }
}

// ============================
// PREVIEW DE IMAGENS (CORE)
// ============================

function renderPreviewImagens() {
  const preview = document.getElementById("preview-imagens");
  if (!preview) return;

  preview.innerHTML = "";

  getImagensTempAtivas().forEach((img, index) => {

    const isPrincipal = img.principal === true;

    const div = document.createElement("div");
    div.className = "preview-item";

   div.innerHTML = `
  <div class="preview-actions-top">
    <button class="preview-open"
  onclick="abrirImagemNoNavegador('${img.url || img.preview}')"
  title="Abrir em nova aba">
  🡕
</button>

    <button class="preview-delete"
      onclick="removerImagem(${index})"
      title="Remover">✖</button>
  </div>

  <div class="preview-image-wrapper">
    <img />
    <div class="preview-star ${isPrincipal ? 'principal' : ''}"
      onclick="definirImagemPrincipal(${index})">
      <svg viewBox="0 0 24 24">
        <path d="M12 2l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/>
      </svg>
    </div>
  </div>
`;
    const wrapper = div.querySelector(".preview-image-wrapper");

   const image = div.querySelector("img");
image.src = img.url || img.preview || "";
    
    aplicarTransformImagem(image, img);
    habilitarZoomImagem(image, img);
    habilitarDragImagem(image, img);

    wrapper.appendChild(image);
    preview.appendChild(div);
  });
}


function removerImagem(index) {
  const imagens = getImagensTempAtivas();
  imagens.splice(index, 1);
  garantirImagemPrincipal();
  renderPreviewImagens();
}

function definirImagemPrincipal(index) {
  const imagens = getImagensTempAtivas();

  imagens.forEach(img => img.principal = false);

  if (imagens[index]) {
    imagens[index].principal = true;
  }

  renderPreviewImagens();
}

window.handleSelecionarFotos = function (e) {
  const files = Array.from(e.target.files);
  if (!files.length) return;

  for (const file of files) {
    const imagens = getImagensTempAtivas();

if (imagens.length >= 5) {
      Swal.fire("Limite de imagens", "Máximo de 5 imagens.", "warning");
      break;
    }

    imagens.push({
  file,
  url: URL.createObjectURL(file),
  principal: imagens.length === 0,
  offsetX: 0,
  offsetY: 0,
  scale: 1
});
  }
garantirImagemPrincipal();
  renderPreviewImagens();
  e.target.value = "";
};

async function uploadImagensRegistro({ colecao, registroId }) {
  if (!colecao || !registroId) {
    throw new Error("Parâmetros inválidos para upload de imagens");
  }

  const imagens = getImagensTempAtivas();
  const fotos = [];

  for (const img of imagens) {
    // mantém imagens já existentes
    if (img.existente) {
      fotos.push(img);
      continue;
    }

    const ref = firebase
      .storage()
      .ref(`${colecao}/${registroId}/${Date.now()}_${img.file.name}`);

    await ref.put(img.file);
    const url = await ref.getDownloadURL();

    fotos.push({
      url,
      principal: img.principal || false,
      offsetX: img.offsetX ?? 0,
      offsetY: img.offsetY ?? 0,
      scale: img.scale ?? 1
    });
  }

  return fotos;
}

window.uploadImagensItem = async function (itemId) {
  return uploadImagensRegistro({
    colecao: "item",
    registroId: itemId
  });
};

window.uploadImagensPacote = async function (pacoteId) {
  return uploadImagensRegistro({
    colecao: "pacotes",
    registroId: pacoteId
  });
};

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  if (!window.db) {
    console.error("Firestore não disponível");
    return;
  }

  carregarCatalogo();
  bindTabs();
});

// ============================
// CARREGAMENTO DE DADOS
// ============================

async function carregarCatalogo() {
  await Promise.all([
    carregarItens(),
    carregarPacotes(),
    carregarPromocoes()
  ]);

  // ⚠️ Renderizações ficam nos arquivos específicos
  if (typeof renderItens === "function") renderItens();
  if (typeof renderPacotes === "function") renderPacotes();
}

// ---------- ITENS ----------
async function carregarItens() {
  const snap = await db.collection("item").orderBy("nome").get();
  CATALOGO_STATE.itens = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

// ---------- PACOTES ----------
async function carregarPacotes() {
  const snap = await db.collection("pacotes").orderBy("nome").get();
  CATALOGO_STATE.pacotes = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

// ---------- PROMOÇÕES ----------
async function carregarPromocoes() {
  const snap = await db.collection("promocoes").get();
  CATALOGO_STATE.promocoes = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));
}

// ============================
// TABS (ITENS / PACOTES / PROMOÇÕES)
// ============================

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

// ============================
// SWEETALERT — UX PADRÃO
// ============================

function mostrarLoading(texto = "Processando...") {
  Swal.fire({
    title: texto,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => Swal.showLoading()
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

function limparContextoModal() {
  // limpa blocos específicos de pacote
  document.getElementById("pacote-itens-bloco")?.remove();
  document.getElementById("pacote-itens-preview")?.remove();

  // fecha dropdown se existir
  document.getElementById("pacote-dropdown-lista")?.classList.remove("aberto");

  // restaura quantidade (default item)
  const qtd = document.getElementById("item-quantidade")?.parentElement;
  if (qtd) qtd.style.display = "";

  // 🔴 NOVO: limpa imagens temporárias e preview
  if (typeof limparPreviewImagens === "function") {
    limparPreviewImagens();
  }
}




function habilitarDragImagem(imgEl, estado) {
  let dragging = false;
  let startX = 0;
  let startY = 0;

  imgEl.style.cursor = "grab";

  imgEl.addEventListener("mousedown", (e) => {
    e.preventDefault();
    dragging = true;
    imgEl.style.cursor = "grabbing";

    startX = e.clientX - (estado.offsetX || 0);
    startY = e.clientY - (estado.offsetY || 0);
  });

  window.addEventListener("mousemove", (e) => {
    if (!dragging) return;

    estado.offsetX = e.clientX - startX;
    estado.offsetY = e.clientY - startY;

    aplicarTransformImagem(imgEl, estado);
  });

  window.addEventListener("mouseup", () => {
    dragging = false;
    imgEl.style.cursor = "grab";
  });
}

function habilitarZoomImagem(imgEl, estado) {
  imgEl.addEventListener("wheel", (e) => {
    e.preventDefault();

    const delta = e.deltaY < 0 ? 0.1 : -0.1;

    estado.scale = (estado.scale ?? 1) + delta;

    aplicarTransformImagem(imgEl, estado);
  }, { passive: false });
}

function definirImagemPrincipal(index) {
  const imagens = getImagensTempAtivas();
  if (!imagens || !imagens[index]) return;

  imagens.forEach((img, i) => {
    img.principal = i === index;
  });

  renderPreviewImagens();
}


function abrirImagemNoNavegador(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener");
}

function prepararModalPacote() {
  const modal = document.getElementById("modal-item");
  modal.classList.add("modo-pacote");

  // label
  const labelNome = document.getElementById("label-nome-item");
  if (labelNome) {
    labelNome.textContent = "Nome do pacote *";
  }

  // form-groups
  const fgNome = document.getElementById("item-nome")?.closest(".form-group");
  const fgPreco = document.getElementById("item-preco")?.closest(".form-group");
  const fgStatus = document.getElementById("item-status")?.closest(".form-group");

  fgNome?.classList.add("nome-principal");
  fgPreco?.classList.add("preco");
  fgStatus?.classList.add("status");
}

function prepararModalItem() {
  const modal = document.getElementById("modal-item");
  if (!modal) return;

  // desativa modo pacote
  modal.classList.remove("modo-pacote");

  // restaura label
  const label = modal.querySelector("label[for='item-nome']") 
             || modal.querySelector("#item-nome")?.previousElementSibling;

  if (label) {
    label.textContent = "Nome do item *";
  }

  // restaura layout padrão
  const inputNome = document.getElementById("item-nome");
  const formGroup = inputNome?.closest(".form-group");

  if (formGroup) {
    formGroup.classList.remove("nome-principal");
  }
}

function limparModoPacote() {
  const modal = document.getElementById("modal-item");
  modal.classList.remove("modo-pacote");

  const labelNome = document.getElementById("label-nome-item");
  if (labelNome) {
    labelNome.textContent = "Nome do item *";
  }

  modal.querySelectorAll(
    ".form-group.nome-principal, .form-group.preco, .form-group.status"
  ).forEach(el => {
    el.classList.remove("nome-principal", "preco", "status");
  });
}

