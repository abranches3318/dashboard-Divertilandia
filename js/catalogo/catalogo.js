// ============================
// CATÁLOGO — BASE (CORE)
// ============================

// ---------- STATE GLOBAL ----------
const CATALOGO_STATE = {
  itens: [],
  pacotes: [],
  promocoes: [],
  imagensTemp: []
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


// ============================
// HELPERS GLOBAIS (UTILS)
// ============================

// ---------- IMAGENS ----------

function limparPreviewImagens() {
  const preview = document.getElementById("preview-imagens");
  if (preview) preview.innerHTML = "";

  if (window.CATALOGO_STATE) {
    CATALOGO_STATE.imagensTemp = [];
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

// ============================
// PREVIEW DE IMAGENS (CORE)
// ============================

function renderPreviewImagens() {
  const preview = document.getElementById("preview-imagens");
  if (!preview) return;

  preview.innerHTML = "";

  CATALOGO_STATE.imagensTemp.forEach((img, index) => {
    const div = document.createElement("div");
    div.className = "preview-item";

    div.innerHTML = `
      <div class="preview-image-wrapper">
        <img src="${img.url || img.preview}" />
      </div>

      <div class="preview-top-actions">
        <button onclick="definirImagemPrincipal(${index})" title="Definir capa">
          ⭐
        </button>

        <button onclick="removerImagem(${index})" title="Remover">
          🗑️
        </button>
      </div>
    `;

    preview.appendChild(div);
  });
}


function removerImagem(index) {
  CATALOGO_STATE.imagensTemp.splice(index, 1);
  renderPreviewImagens();
}

function definirImagemPrincipal(index) {
  CATALOGO_STATE.imagensTemp.forEach(img => img.principal = false);
  CATALOGO_STATE.imagensTemp[index].principal = true;
  renderPreviewImagens(

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
