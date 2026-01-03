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
          <div class="item-quantidade">${p.alvos?.length || 0} alvo(s) · até ${formatarData(p.periodo.fim)}</div>
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
  prepararModalPacote();
  document.getElementById("modal-item-titulo").textContent = "Nova Promoção";
  setValorSeguro("item-nome", "");
  setValorSeguro("item-preco", "");
  setValorSeguro("item-descricao", "");
  setValorSeguro("item-status", "ativo");
  document.getElementById("item-quantidade")?.parentElement?.style.setProperty("display", "none");
  montarBlocosPromocao();
  document.getElementById("modal-item").classList.add("active");
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
  prepararModalPacote();
  document.getElementById("modal-item-titulo").textContent = "Editar Promoção";
  setValorSeguro("item-nome", promo.nome);
  setValorSeguro("item-preco", promo.valorFinal ?? "");
  setValorSeguro("item-descricao", promo.descricao);
  setValorSeguro("item-status", promo.status);
  montarBlocosPromocao(promo);
  document.getElementById("modal-item").classList.add("active");
}

// ---------------------------
// BLOCOS DINÂMICOS
// ---------------------------
function montarBlocosPromocao(dados = {}) {
  removerBlocosPromocao();
  const ref = document.getElementById("grupo-descricao");
  if (!ref) return;
  ref.after(criarBlocoPeriodo(dados));
  ref.after(criarBlocoOrigem(dados));
}

function removerBlocosPromocao() {
  document.getElementById("promo-origem-bloco")?.remove();
  document.getElementById("promo-periodo-bloco")?.remove();
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
    // -------------------------
    // VALIDAR REGRAS
    // -------------------------
    const promocao = montarObjetoPromocao();
    const periodoValido = validarPeriodoPromocao(promocao.periodo);
    if (!periodoValido.valido) throw new Error(periodoValido.mensagem);

    const conflito = validarConflitosTemporais({ promocaoNova: promocao, promocoesExistentes: CATALOGO_STATE.promocoes });
    if (!conflito.valido) throw new Error(conflito.mensagem);

    validarIntegridadePromocao(promocao);

    const aplicacao = CATALOGO_STATE.promocaoAplicacao;
    if (aplicacao?.modo === "manual" && (!Array.isArray(aplicacao.selecionados) || aplicacao.selecionados.length === 0)) {
      throw new Error("Selecione ao menos um item ou pacote para aplicar a promoção.");
    }

    // -------------------------
    // SALVAR NO FIREBASE
    // -------------------------
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
        fecharModalItem();
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

function prepararModalPacote() {
  // placeholder para futura implementação de blocos de itens/pacotes
}

// ---------------------------
// BIND EVENTOS
// ---------------------------
function bindEventosPromocoes() {
  document.getElementById("btn-nova-promocao")?.addEventListener("click", abrirModalNovaPromocao);
  document.getElementById("btn-salvar-promocao")?.addEventListener("click", salvarPromocao);
}
