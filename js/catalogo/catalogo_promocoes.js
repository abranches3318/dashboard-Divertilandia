// ============================
// catalogo_promocoes.js — PROMOÇÕES (FINAL)
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
// LISTAGEM
// ============================
function renderPromocoes() {
  const container = document.getElementById("lista-promocoes");
  if (!container) return;

  const promocoes = CATALOGO_STATE.promocoes || [];

  let html = `
    <div class="itens-header">
      <div></div>
      <div>Promoção</div>
      <div class="col-valor">Valor</div>
      <div class="col-status">Status</div>
      <div></div>
    </div>
    <div class="itens-lista">
  `;

  if (!promocoes.length) {
    html += `<p style="opacity:.6;padding:15px;">Nenhuma promoção cadastrada.</p>`;
  } else {
    html += promocoes.map(p => `
      <div class="item-row">
        <div class="item-thumb">
          <img src="${p.fotos?.[0]?.url || "../img/imageplaceholder.jpg"}">
        </div>

        <div class="item-info">
          <div class="item-nome">${p.nome}</div>
          <div class="item-quantidade">
            ${p.alvos?.length || 0} alvo(s) ·
            ${formatarData(p.periodo?.inicio)} → ${formatarData(p.periodo?.fim)}
          </div>
        </div>

        <div class="item-valor">
          ${p.valorFinal != null ? `R$ ${Number(p.valorFinal).toFixed(2)}` : "Variável"}
        </div>

        <div class="item-status ${p.status}">
          ${p.status}
        </div>

        <button class="item-acoes" onclick="abrirMenuPromocao(event,'${p.id}')">⋮</button>
      </div>
    `).join("");
  }

  html += `</div>`;
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
// MODAL PROMOÇÃO
// ============================
function resetarEstadoPromocao() {
  PROMOCAO_EDITANDO_ID = null;

  CATALOGO_STATE.promocaoAplicacao = {
    selecionados: []
  };

  setValorSeguro("promo-nome", "");
  setValorSeguro("promo-valor", "");
  setValorSeguro("promo-inicio", "");
  setValorSeguro("promo-fim", "");

  document.getElementById("promo-aplicacao-preview").innerHTML = "";
  document.getElementById("promo-dropdown-label").textContent =
    "Selecionar itens e pacotes";

  document.getElementById("promo-dropdown-lista")?.classList.remove("aberto");
}

function mostrarModalPromocao() {
  document.querySelectorAll(".modal.active").forEach(m =>
    m.classList.remove("active")
  );

  const modal = document.getElementById("modal-promocao");
  modal.classList.add("active");

  // Renderização tardia e segura
  renderDropdownPromocao();
}

function abrirModalNovaPromocao() {
  resetarEstadoPromocao();
  mostrarModalPromocao();
}

function fecharModalPromocao() {
  document.getElementById("modal-promocao")?.classList.remove("active");
  resetarEstadoPromocao();
}

// ============================
// DROPDOWN
// ============================
function toggleDropdownPromocao() {
  document.getElementById("promo-dropdown-lista")
    ?.classList.toggle("aberto");
}

function renderDropdownPromocao() {
  const container = document.getElementById("promo-dropdown-itens");
  if (!container) return;

  const alvos = [
    ...(CATALOGO_STATE.itens || []),
    ...(CATALOGO_STATE.pacotes || [])
  ];

  container.innerHTML = alvos.map(a => `
    <label class="pacote-item">
      <input type="checkbox"
        onchange="toggleAlvoPromocao(
          '${a.id}',
          '${a.tipo || 'item'}',
          '${a.nome}',
          ${a.valor || 0}
        )">
      ${a.nome}
    </label>
  `).join("");
}

function toggleSelecionarTodosPromocao(checkbox) {
  document
    .querySelectorAll("#promo-dropdown-itens input[type='checkbox']")
    .forEach(c => {
      c.checked = checkbox.checked;
      c.dispatchEvent(new Event("change"));
    });
}

function toggleAlvoPromocao(id, tipo, nome, valorOriginal) {
  const sel = CATALOGO_STATE.promocaoAplicacao.selecionados;
  const idx = sel.findIndex(a => a.id === id);

  if (idx >= 0) sel.splice(idx, 1);
  else sel.push({ id, tipo, nome, valorOriginal });

  atualizarPreviewPromocao();
}

// ============================
// PREVIEW
// ============================
function atualizarPreviewPromocao() {
  const preview = document.getElementById("promo-aplicacao-preview");
  const qtd = CATALOGO_STATE.promocaoAplicacao.selecionados.length;

  if (!qtd) {
    preview.innerHTML = "<em>Nenhum item ou pacote selecionado</em>";
    return;
  }

  document.getElementById("promo-dropdown-label").textContent =
    `${qtd} selecionado(s)`;

  preview.innerHTML = `<strong>${qtd}</strong> alvo(s) selecionado(s)`;
}

// ============================
// SALVAR / EXCLUIR
// ============================
async function salvarPromocao() {
  try {
    const promocao = {
      nome: promo("promo-nome"),
      valorFinal: Number(promo("promo-valor")) || null,
      periodo: {
        inicio: promo("promo-inicio"),
        fim: promo("promo-fim")
      },
      status: "ativa",
      alvos: CATALOGO_STATE.promocaoAplicacao.selecionados
    };

    if (!promocao.nome) throw new Error("Informe o nome da promoção");
    if (!promocao.periodo.inicio || !promocao.periodo.fim)
      throw new Error("Informe o período da promoção");

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

  } catch (e) {
    Swal.fire("Erro", e.message, "error");
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

  await db.collection(COLECAO_PROMOCOES)
    .doc(MENU_PROMOCAO_ATUAL).delete();

  await carregarPromocoes();
  renderPromocoes();
  Swal.fire("Sucesso", "Promoção excluída", "success");
}

// ============================
// LOAD
// ============================
async function carregarPromocoes() {
  const snap = await db.collection(COLECAO_PROMOCOES).get();
  CATALOGO_STATE.promocoes =
    snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================
// HELPERS
// ============================
function promo(id) {
  return document.getElementById(id)?.value.trim();
}

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
