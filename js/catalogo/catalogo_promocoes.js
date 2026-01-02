// ============================
// CATÁLOGO — PROMOÇÕES
// ============================

// ---------- STATE LOCAL ----------
let PROMOCAO_EDITANDO_ID = null;
let MENU_PROMOCAO_ATUAL = null;

// ---------- CONTEXTO ----------
const COLECAO_PROMOCOES = "promocoes";

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", async () => {
  criarMenuPromocao();
  bindEventosPromocoes();

  await carregarPromocoes();
  renderPromocoes();
});

// ============================
// RENDER
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
    </div>
  `;

  const promocoes = CATALOGO_STATE.promocoes || [];

  if (!promocoes.length) {
    html += `
      <div class="itens-lista">
        <p style="opacity:.6; padding:15px;">Nenhuma promoção cadastrada.</p>
      </div>
    `;
  } else {
    html += `
      <div class="itens-lista">
        ${promocoes.map(p => `
          <div class="item-row">
            <div class="item-thumb">
              <div class="item-thumb-wrapper">
                <img src="${p.fotos?.[0]?.url || "../img/imageplaceholder.jpg"}">
              </div>
            </div>

            <div class="item-info">
              <div class="item-nome">${p.nome}</div>
              <div class="item-quantidade">
                ${p.origem.tipo} · até ${formatarData(p.periodo.fim)}
              </div>
            </div>

            <div class="item-valor">
              ${p.beneficio.tipo === "percentual"
                ? `${p.beneficio.valor}%`
                : `R$ ${p.beneficio.valor.toFixed(2)}`}
            </div>

            <div class="item-status ${p.status}">
              ${p.status}
            </div>

            <button class="item-acoes" onclick="abrirMenuPromocao(event,'${p.id}')">⋮</button>
          </div>
        `).join("")}
      </div>
    `;
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
// MODAL
// ============================

function abrirModalNovaPromocao() {
  PROMOCAO_EDITANDO_ID = null;
  CATALOGO_STATE.promocaoOrigem = null;

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
  CATALOGO_STATE.promocaoOrigem = promo.origem;

  limparContextoModal();
  prepararModalPacote();

  document.getElementById("modal-item-titulo").textContent = "Editar Promoção";

  setValorSeguro("item-nome", promo.nome);
  setValorSeguro("item-preco", promo.beneficio.valor);
  setValorSeguro("item-descricao", promo.descricao);
  setValorSeguro("item-status", promo.status);

  montarBlocosPromocao(promo);

  document.getElementById("modal-item").classList.add("active");
}

// ============================
// BLOCOS
// ============================

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

// ---------- ORIGEM ----------

function criarBlocoOrigem(dados) {
  const div = document.createElement("div");
  div.id = "promo-origem-bloco";
  div.className = "form-group full";

  div.innerHTML = `
    <label>Aplicar promoção em *</label>
    <select id="promo-origem-tipo">
      <option value="">Selecione</option>
      <option value="item">Item</option>
      <option value="pacote">Pacote</option>
    </select>
    <div id="promo-origem-lista" class="grid-botoes"></div>
  `;

  const select = div.querySelector("#promo-origem-tipo");
  select.value = dados.origem?.tipo || "";

  select.onchange = () => montarListaOrigem(select.value);

  if (select.value) montarListaOrigem(select.value);

  return div;
}

function montarListaOrigem(tipo) {
  const lista = document.getElementById("promo-origem-lista");
  lista.innerHTML = "";

  const origem = tipo === "item" ? CATALOGO_STATE.itens : CATALOGO_STATE.pacotes;

  origem.forEach(o => {
    const btn = document.createElement("button");
    btn.className = "btn btn-dark";
    btn.textContent = o.nome;

    btn.onclick = () => {
      CATALOGO_STATE.promocaoOrigem = {
        tipo,
        id: o.id,
        nome: o.nome,
        valorOriginal: o.valor
      };
      Swal.fire("Selecionado", o.nome, "success");
    };

    lista.appendChild(btn);
  });
}

// ---------- PERÍODO ----------

function criarBlocoPeriodo(dados) {
  const div = document.createElement("div");
  div.id = "promo-periodo-bloco";
  div.className = "form-group full";

  div.innerHTML = `
    <label>Período da promoção</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <input type="date" id="promo-inicio" value="${dados.periodo?.inicio || ""}">
      <input type="date" id="promo-fim" value="${dados.periodo?.fim || ""}">
    </div>
  `;

  return div;
}

// ============================
// SALVAR
// ============================

async function salvarPromocao() {
  const nome = document.getElementById("item-nome").value.trim();
  const inicio = document.getElementById("promo-inicio").value;
  const fim = document.getElementById("promo-fim").value;

  if (!nome) return mostrarErro("Promoção", "Informe o nome.");
  if (!CATALOGO_STATE.promocaoOrigem) return mostrarErro("Promoção", "Selecione o item ou pacote.");

  const hoje = new Date().toISOString().split("T")[0];
  if (inicio < hoje) return mostrarErro("Data inválida", "A data de início não pode ser passada.");
  if (fim < inicio) return mostrarErro("Data inválida", "A data final não pode ser menor que a inicial.");

  const dados = {
    nome,
    descricao: document.getElementById("item-descricao").value || "",
    status: document.getElementById("item-status").value,
    origem: CATALOGO_STATE.promocaoOrigem,
    periodo: { inicio, fim },
    beneficio: {
      tipo: "percentual",
      valor: parseFloat(document.getElementById("item-preco").value || 0)
    },
    atualizadoEm: new Date()
  };

  await salvarRegistro({
    colecao: COLECAO_PROMOCOES,
    id: PROMOCAO_EDITANDO_ID,
    dados,
    onSucesso: async () => {
      await carregarPromocoes();
      renderPromocoes();
      mostrarSucesso("Promoção salva");
    }
  });
}

// ============================
// EXCLUIR
// ============================

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
  mostrarSucesso("Promoção excluída");
}

// ============================
// EVENTOS
// ============================

function bindEventosPromocoes() {
  document.getElementById("btn-nova-promocao")
    ?.addEventListener("click", abrirModalNovaPromocao);
}
