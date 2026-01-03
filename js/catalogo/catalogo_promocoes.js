// ============================
// CATÁLOGO — PROMOÇÕES (FINAL)
// ============================

let PROMOCAO_EDITANDO_ID = null;
let MENU_PROMOCAO_ATUAL = null;
const COLECAO_PROMOCOES = "promocoes";

// Estado global do catálogo
CATALOGO_STATE.promocoes = [];
CATALOGO_STATE.promocaoAplicacao = { modo: "manual", tipo: null, selecionados: [] };
CATALOGO_STATE.imagensTempPacote = [];

// ---------------------------
// INIT
// ---------------------------
document.addEventListener("DOMContentLoaded", async () => {
  criarMenuPromocao();
  bindEventosPromocoes();
  await carregarPromocoes();
  renderPromocoes();
});

// ---------------------------
// RENDER LISTA DE PROMOÇÕES
// ---------------------------
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
    html += `<div class="itens-lista"><p style="opacity:.6; padding:15px;">Nenhuma promoção cadastrada.</p></div>`;
  } else {
    html += `<div class="itens-lista">${promocoes.map(p => `
      <div class="item-row">
        <div class="item-thumb">
          <div class="item-thumb-wrapper">
            <img src="${p.fotos?.[0]?.url || "../img/imageplaceholder.jpg"}">
          </div>
        </div>
        <div class="item-info">
          <div class="item-nome">${p.nome}</div>
          <div class="item-quantidade">
            ${p.alvos?.length || 0} alvo(s) · de ${formatarData(p.periodo.inicio)} até ${formatarData(p.periodo.fim)}
          </div>
        </div>
        <div class="item-valor">${p.valorFinal !== null ? `R$ ${Number(p.valorFinal).toFixed(2)}` : "Variável"}</div>
        <div class="item-status ${p.status}">${p.status}</div>
        <button class="item-acoes" onclick="abrirMenuPromocao(event,'${p.id}')">⋮</button>
      </div>`).join("")}</div>`;
  }

  container.innerHTML = html;
}

// ---------------------------
// MENU FLUTUANTE
// ---------------------------
function criarMenuPromocao() {
  if (document.getElementById("menu-promocao-flutuante")) return;

  const menu = document.createElement("div");
  menu.id = "menu-promocao-flutuante";
  menu.className = "menu-acoes";
  menu.style.display = "none";
  menu.innerHTML = `<button onclick="editarPromocao()">✏️ Editar</button>
                    <button class="excluir" onclick="excluirPromocao()">🗑️ Excluir</button>`;
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

// ---------------------------
// MODAL NOVA / EDITAR PROMOÇÃO
// ---------------------------
function abrirModalNovaPromocao() {
  PROMOCAO_EDITANDO_ID = null;
  limparContextoModal();

  const modal = document.getElementById("modal-promocao") || 
                document.getElementById("modal-promocao-container");

  if (!modal) {
    console.error("Modal de promoção não encontrado! Verifique o HTML.");
    return;
  }

  modal.style.display = "flex";

  setValorSeguro("promo-nome", "");
  setValorSeguro("promo-valor", "");
  setValorSeguro("promo-inicio", "");
  setValorSeguro("promo-fim", "");

  CATALOGO_STATE.promocaoAplicacao = { modo: "manual", tipo: null, selecionados: [] };
}

function editarPromocao() {
  const promo = CATALOGO_STATE.promocoes.find(p => p.id === MENU_PROMOCAO_ATUAL);
  if (!promo) return;

  PROMOCAO_EDITANDO_ID = promo.id;

  CATALOGO_STATE.promocaoAplicacao = {
    modo: "manual",
    tipo: promo.aplicacao?.tipo || null,
    selecionados: Array.isArray(promo.alvos)
      ? promo.alvos.map(a => ({ tipo: a.tipo, id: a.id, nome: a.nome, valorOriginal: a.valorOriginal }))
      : []
  };

  limparContextoModal();
  document.getElementById("modal-promocao-container").style.display = "block";
  setValorSeguro("promo-nome", promo.nome);
  setValorSeguro("promo-valor", promo.valorFinal ?? "");
  setValorSeguro("promo-inicio", promo.periodo.inicio ?? "");
  setValorSeguro("promo-fim", promo.periodo.fim ?? "");
}

// ---------------------------
// EXCLUIR PROMOÇÃO
// ---------------------------
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
  Swal.fire("Sucesso", "Promoção excluída.", "success");
}

// ---------------------------
// SALVAR PROMOÇÃO
// ---------------------------
async function salvarPromocao() {
  try {
    const promocao = {
      nome: document.getElementById("promo-nome").value.trim(),
      valorFinal: Number(document.getElementById("promo-valor").value) || null,
      periodo: {
        inicio: document.getElementById("promo-inicio").value,
        fim: document.getElementById("promo-fim").value
      },
      status: "ativo",
      aplicacao: CATALOGO_STATE.promocaoAplicacao,
      alvos: CATALOGO_STATE.promocaoAplicacao.selecionados
    };

    // Validações básicas
    if (!promocao.nome) throw new Error("Informe o nome da promoção.");
    if (!promocao.periodo.inicio || !promocao.periodo.fim) throw new Error("Informe período válido.");

    await salvarRegistro({
      colecao: COLECAO_PROMOCOES,
      id: PROMOCAO_EDITANDO_ID,
      dados: promocao,
      onSucesso: async id => {
        if (CATALOGO_STATE.imagensTempPacote?.length) {
          const fotos = await uploadImagensRegistro({ colecao: COLECAO_PROMOCOES, registroId: id });
          await db.collection(COLECAO_PROMOCOES).doc(id).update({ fotos });
        }
        await carregarPromocoes();
        renderPromocoes();
        Swal.fire("Sucesso", "Promoção salva com sucesso.", "success");
        fecharModalPromocao();
      }
    });

  } catch (err) {
    Swal.fire("Erro", err.message, "error");
  }
}

// ---------------------------
// CARREGAR PROMOÇÕES
// ---------------------------
async function carregarPromocoes() {
  const snapshot = await db.collection(COLECAO_PROMOCOES).get();
  CATALOGO_STATE.promocoes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// ---------------------------
// FUNÇÕES AUXILIARES
// ---------------------------
function setValorSeguro(id, valor) {
  const el = document.getElementById(id);
  if (el) el.value = valor;
}

function formatarData(str) {
  if (!str) return "-";
  const d = new Date(str);
  return d.toLocaleDateString("pt-BR");
}

function limparContextoModal() {
  CATALOGO_STATE.imagensTempPacote = [];
}

function fecharModalPromocao() {
  const modal = document.getElementById("modal-promocao-container") || 
                document.getElementById("modal-promocao");

  if (!modal) return; // previne erro se modal não existir
  modal.style.display = "none";
  }
  
// ---------------------------
// BIND EVENTOS – PROMOÇÕES
// ---------------------------
function bindEventosPromocoes() {
  // 1️⃣ Clique no botão "Nova Promoção" (delegação, funciona mesmo se o botão for dinâmico)
  document.addEventListener("click", (e) => {
    if (e.target.closest("#btn-nova-promocao")) {
      abrirModalNovaPromocao();
    }
  });

  // 2️⃣ Clique no botão "Salvar Promoção"
  const btnSalvar = document.getElementById("btn-salvar-promocao");
  if (btnSalvar) {
    btnSalvar.addEventListener("click", salvarPromocao);
  } else {
    console.warn("btn-salvar-promocao não encontrado!");
  }

  // 3️⃣ Clique fora do menu flutuante fecha o menu (global)
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("menu-promocao-flutuante");
    if (menu && !e.target.closest("#menu-promocao-flutuante")) {
      menu.style.display = "none";
      MENU_PROMOCAO_ATUAL = null;
    }
  });

  // 4️⃣ Evitar que clique no próprio menu feche ele
  const menu = document.getElementById("menu-promocao-flutuante");
  if (menu) {
    menu.addEventListener("click", (e) => {
      e.stopPropagation();
    });
  }
}
