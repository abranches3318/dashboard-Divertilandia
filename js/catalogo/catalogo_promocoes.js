// ============================
// catalogo_promocoes.js — PROMOÇÕES (REFATORADO)
// ============================

let PROMOCAO_EDITANDO_ID = null;
let MENU_PROMOCAO_ATUAL = null;

const COLECAO_PROMOCOES = "promocoes";

// ---------------------------
// INIT
// ---------------------------
document.addEventListener("DOMContentLoaded", async () => {
  criarMenuPromocao();
  bindEventosPromocoes();
  await carregarPromocoes();
  renderPromocoes();
});

// ============================
// RENDER LISTA
// ============================
function renderPromocoes() {
  const container = document.getElementById("lista-promocoes");
  if (!container) return;

  let html = `
    <div class="itens-header">
      <div></div>
      <div>Promoção</div>
      <div class="col-valor">Valor</div>
      <div class="col-status">Status</div>
      <div></div>
    </div>`;

  const promocoes = CATALOGO_STATE.promocoes || [];

  if (!promocoes.length) {
    html += `<div class="itens-lista"><p style="opacity:.6;padding:15px;">Nenhuma promoção cadastrada.</p></div>`;
  } else {
    html += `<div class="itens-lista">
      ${promocoes.map(p => `
        <div class="item-row">
          <div class="item-thumb">
            <img src="${p.fotos?.[0]?.url || "../img/imageplaceholder.jpg"}">
          </div>
          <div class="item-info">
            <div class="item-nome">${p.nome}</div>
            <div class="item-quantidade">
              ${p.alvos?.length || 0} alvo(s) · ${formatarData(p.periodo?.inicio)} → ${formatarData(p.periodo?.fim)}
            </div>
          </div>
          <div class="item-valor">
            ${p.valorFinal !== null ? `R$ ${Number(p.valorFinal).toFixed(2)}` : "Variável"}
          </div>
          <div class="item-status ${p.status}">${p.status}</div>
          <button class="item-acoes" onclick="abrirMenuPromocao(event,'${p.id}')">⋮</button>
        </div>
      `).join("")}
    </div>`;
  }

  container.innerHTML = html;
}

// ============================
// MENU FLUTUANTE
// ============================
function criarMenuPromocao() {
  if (document.getElementById("menu-promocao-flutuante")) return;

  const menu = document.createElement("div");
  menu.id = "menu-promocao-flutuante";
  menu.className = "menu-acoes";
  menu.style.display = "none";
  menu.innerHTML = `
    <button onclick="editarPromocao()">✏️ Editar</button>
    <button class="excluir" onclick="excluirPromocao()">🗑️ Excluir</button>
  `;

  document.body.appendChild(menu);

  document.addEventListener("click", () => {
    menu.style.display = "none";
    MENU_PROMOCAO_ATUAL = null;
  });
}

function abrirMenuPromocao(e, id) {
  e.stopPropagation();
  MENU_PROMOCAO_ATUAL = id;

  const menu = document.getElementById("menu-promocao-flutuante");
  const rect = e.target.getBoundingClientRect();

  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.left = `${rect.right - 160}px`;
  menu.style.display = "block";
}

// ============================
// MODAL PROMOÇÃO — CORE
// ============================

function resetarEstadoPromocao() {
  PROMOCAO_EDITANDO_ID = null;
  CATALOGO_STATE.promocaoAplicacao = {
    modo: "manual",
    tipo: null,
    selecionados: []
  };

  setValorSeguro("promo-nome", "");
  setValorSeguro("promo-valor", "");
  setValorSeguro("promo-inicio", "");
  setValorSeguro("promo-fim", "");

  document.getElementById("promo-aplicacao-opcoes")?.replaceChildren();
  document.getElementById("promo-aplicacao-preview")?.replaceChildren();
}

function mostrarModalPromocao() {
  const modal = document.getElementById("modal-promocao");
  if (!modal) {
    console.error("Modal de promoção não encontrado no DOM");
    return;
  }

  fecharModalItem?.();

  modal.style.display = "flex";
  modal.style.opacity = "0";
  requestAnimationFrame(() => modal.style.opacity = "1");
}

function fecharModalPromocao() {
  const modal = document.getElementById("modal-promocao");
  if (!modal) return;

  modal.style.display = "none";
  resetarEstadoPromocao();
}

function abrirModalNovaPromocao() {
  resetarEstadoPromocao();
  mostrarModalPromocao();
  renderAplicacaoPromocao();
}

function editarPromocao() {
  const promo = CATALOGO_STATE.promocoes.find(p => p.id === MENU_PROMOCAO_ATUAL);
  if (!promo) return;

  PROMOCAO_EDITANDO_ID = promo.id;

  setValorSeguro("promo-nome", promo.nome);
  setValorSeguro("promo-valor", promo.valorFinal ?? "");
  setValorSeguro("promo-inicio", promo.periodo?.inicio ?? "");
  setValorSeguro("promo-fim", promo.periodo?.fim ?? "");

  CATALOGO_STATE.promocaoAplicacao = {
    modo: "manual",
    tipo: null,
    selecionados: Array.isArray(promo.alvos) ? [...promo.alvos] : []
  };

  mostrarModalPromocao();
  renderAplicacaoPromocao();
  atualizarPreviewPromocao();
}

// ============================
// APLICAÇÃO DA PROMOÇÃO
// ============================

function renderAplicacaoPromocao() {
  const container = document.getElementById("promo-aplicacao-opcoes");
  if (!container) return;

  const itens = [...CATALOGO_STATE.itens, ...CATALOGO_STATE.pacotes];

  container.innerHTML = `
    <strong>Aplicar em:</strong>
    ${itens.map(i => `
      <label style="display:block;">
        <input type="checkbox"
          onchange="toggleAlvoPromocao('${i.id}','${i.tipo || 'item'}','${i.nome}',${i.valor || 0})">
        ${i.nome}
      </label>
    `).join("")}
  `;
}

function toggleAlvoPromocao(id, tipo, nome, valorOriginal) {
  const sel = CATALOGO_STATE.promocaoAplicacao.selecionados;
  const idx = sel.findIndex(a => a.id === id);

  if (idx >= 0) {
    sel.splice(idx, 1);
  } else {
    sel.push({ id, tipo, nome, valorOriginal });
  }

  atualizarPreviewPromocao();
}

// ============================
// PREVIEW
// ============================

function atualizarPreviewPromocao() {
  const preview = document.getElementById("promo-aplicacao-preview");
  if (!preview) return;

  if (!CATALOGO_STATE.promocaoAplicacao.selecionados.length) {
    preview.innerHTML = "<em>Nenhum alvo selecionado</em>";
    return;
  }

  preview.innerHTML = `
    <strong>${CATALOGO_STATE.promocaoAplicacao.selecionados.length}</strong> alvo(s) selecionado(s)
  `;
}

// ============================
// SALVAR / EXCLUIR
// ============================

async function salvarPromocao() {
  try {
    const promocao = {
      nome: document.getElementById("promo-nome").value.trim(),
      valorFinal: Number(document.getElementById("promo-valor").value) || null,
      periodo: {
        inicio: document.getElementById("promo-inicio").value,
        fim: document.getElementById("promo-fim").value
      },
      status: "ativa",
      alvos: CATALOGO_STATE.promocaoAplicacao.selecionados
    };

    if (!promocao.nome) throw new Error("Informe o nome da promoção");
    if (!promocao.periodo.inicio || !promocao.periodo.fim)
      throw new Error("Informe período válido");

    await salvarRegistro({
      colecao: COLECAO_PROMOCOES,
      id: PROMOCAO_EDITANDO_ID,
      dados: promocao,
      onSucesso: async () => {
        await carregarPromocoes();
        renderPromocoes();
        fecharModalPromocao();
      }
    });

  } catch (err) {
    Swal.fire("Erro", err.message, "error");
  }
}

async function excluirPromocao() {
  if (!MENU_PROMOCAO_ATUAL) return;

  const { isConfirmed } = await Swal.fire({
    title: "Excluir promoção?",
    icon: "warning",
    showCancelButton: true
  });

  if (!isConfirmed) return;

  await db.collection(COLECAO_PROMOCOES).doc(MENU_PROMOCAO_ATUAL).delete();
  await carregarPromocoes();
  renderPromocoes();
  Swal.fire("Sucesso", "Promoção excluída", "success");
}

// ============================
// LOAD
// ============================

async function carregarPromocoes() {
  const snap = await db.collection(COLECAO_PROMOCOES).get();
  CATALOGO_STATE.promocoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================
// HELPERS
// ============================

function formatarData(str) {
  if (!str) return "-";
  return new Date(str).toLocaleDateString("pt-BR");
}

function bindEventosPromocoes() {
  document.getElementById("btn-nova-promocao")
    ?.addEventListener("click", abrirModalNovaPromocao);

  document.getElementById("btn-salvar-promocao")
    ?.addEventListener("click", salvarPromocao);
}
