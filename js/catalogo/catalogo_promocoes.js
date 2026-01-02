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

document.addEventListener("DOMContentLoaded", () => {
  criarMenuPromocao();
  bindEventosPromocoes();
});

// ============================
// RENDER
// ============================

function renderPromocoes() {
  const container = document.getElementById("lista-promocoes");
  if (!container) return;

  // Cabeçalho
  let html = `
    <div class="itens-header">
      <div></div>
      <div>Promoção</div>
      <div class="col-valor">Valor</div>
      <div class="col-status">Status</div>
      <div></div>
    </div>
  `;

  if (!CATALOGO_STATE.promocoes || !CATALOGO_STATE.promocoes.length) {
    html += `
      <div class="itens-lista">
        <p style="opacity:.6; padding:15px;">Nenhuma promoção cadastrada.</p>
      </div>
    `;
  } else {
    html += `
      <div class="itens-lista">
        ${CATALOGO_STATE.promocoes.map(p => {
          const capa = Array.isArray(p.fotos)
            ? (p.fotos.find(f => f.principal)?.url || p.fotos[0]?.url)
            : "../img/imageplaceholder.jpg";

          return `
            <div class="item-row">
              <div class="item-thumb">
                <div class="item-thumb-wrapper">
                  <img src="${capa}">
                </div>
              </div>
              <div class="item-info">
                <div class="item-nome">${p.nome || "Promoção sem nome"}</div>
                <div class="item-quantidade">
                  ${p.origem?.tipo || "-"} · até ${p.periodo?.fim ? formatarData(p.periodo.fim) : "-"}
                </div>
              </div>
              <div class="item-valor">R$ ${(p.valorFinal ?? 0).toFixed(2)}</div>
              <div class="item-status ${p.status || "inativo"}">${p.status || "inativo"}</div>
              <button class="item-acoes" onclick="abrirMenuPromocao(event,'${p.id}')">⋮</button>
            </div>
          `;
        }).join("")}
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

  const menu = document.getElementById("menu-promocao-flutuante");
  MENU_PROMOCAO_ATUAL = id;

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
  MODAL_CONTEXTO = "pacote"; // usa imagensTempPacote

  limparContextoModal();
  prepararModalPacote();

  document.getElementById("modal-item-titulo").textContent = "Nova Promoção";

  setValorSeguro("item-nome", "");
  setValorSeguro("item-preco", "");
  setValorSeguro("item-descricao", "");
  setValorSeguro("item-status", "ativo");

  const itemQtd = document.getElementById("item-quantidade");
  if (itemQtd && itemQtd.parentElement) itemQtd.parentElement.style.display = "none";

  montarBlocosPromocao();

  document.getElementById("modal-item").classList.add("active");
}

function editarPromocao() {
  const promo = CATALOGO_STATE.promocoes.find(p => p.id === MENU_PROMOCAO_ATUAL);
  if (!promo) return;

  PROMOCAO_EDITANDO_ID = promo.id;
  MODAL_CONTEXTO = "pacote";

  limparContextoModal();
  prepararModalPacote();

  document.getElementById("modal-item-titulo").textContent = "Editar Promoção";

  setValorSeguro("item-nome", promo.nome);
  setValorSeguro("item-preco", promo.valorFinal ?? "");
  setValorSeguro("item-descricao", promo.descricao ?? "");
  setValorSeguro("item-status", promo.status ?? "ativo");

  CATALOGO_STATE.imagensTempPacote = (promo.fotos || []).map(f => ({ ...f, existente: true }));
  renderPreviewImagens();

  montarBlocosPromocao(promo);

  const itemQtd = document.getElementById("item-quantidade");
  if (itemQtd && itemQtd.parentElement) itemQtd.parentElement.style.display = "none";

  document.getElementById("modal-item").classList.add("active");
}

// ============================
// BLOCOS ESPECÍFICOS
// ============================

function montarBlocosPromocao(dados = {}) {
  removerBlocosPromocao();

  const ref = document.getElementById("grupo-descricao");
  if (!ref) return;

  ref.after(criarBlocoOrigem(dados));
  ref.after(criarBlocoPeriodo(dados));
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
    <div id="promo-origem-lista" style="margin-top:10px"></div>
  `;

  const select = div.querySelector("#promo-origem-tipo");
  select.value = dados.origem?.tipo || "";

  select.onchange = () => montarListaOrigem(select.value, dados.origem);

  if (select.value) montarListaOrigem(select.value, dados.origem);

  return div;
}

function montarListaOrigem(tipo, selecionado) {
  const lista = document.getElementById("promo-origem-lista");
  if (!lista) return;
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
        valorOriginal: o.valor ?? 0
      };
      Swal.fire("Selecionado", o.nome, "success");
    };
    lista.appendChild(btn);
  });

  if (selecionado) CATALOGO_STATE.promocaoOrigem = selecionado;
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
// SALVAR / EXCLUIR
// ============================

async function salvarPromocao() {
  try {
    if (!CATALOGO_STATE.promocaoOrigem) {
      return mostrarErro("Promoção", "Selecione um item ou pacote.");
    }

    const dados = {
      nome: document.getElementById("item-nome").value.trim(),
      descricao: document.getElementById("item-descricao").value || "",
      status: document.getElementById("item-status").value,
      origem: CATALOGO_STATE.promocaoOrigem,
      periodo: {
        inicio: document.getElementById("promo-inicio").value,
        fim: document.getElementById("promo-fim").value
      },
      valorFinal: parseFloat(document.getElementById("item-preco").value || 0),
      atualizadoEm: new Date()
    };

    await salvarRegistro({
      colecao: COLECAO_PROMOCOES,
      id: PROMOCAO_EDITANDO_ID,
      dados,
      onSucesso: async () => {
        const id = PROMOCAO_EDITANDO_ID;
        if (id) {
          dados.fotos = await uploadImagensRegistro({ colecao: COLECAO_PROMOCOES, registroId: id });
          await db.collection(COLECAO_PROMOCOES).doc(id).update({ fotos: dados.fotos });
        }
        await carregarPromocoes();
        renderPromocoes();
      }
    });

  } catch (err) {
    mostrarErro("Erro", err.message);
  }
}

async function excluirPromocao() {
  const id = MENU_PROMOCAO_ATUAL;
  if (!id) return;

  const { isConfirmed } = await Swal.fire({
    title: "Excluir promoção?",
    icon: "warning",
    showCancelButton: true
  });

  if (!isConfirmed) return;

  await db.collection(COLECAO_PROMOCOES).doc(id).delete();
  await carregarPromocoes();
  renderPromocoes();
  mostrarSucesso("Excluído");
}

// ============================
// EVENTOS
// ============================

function bindEventosPromocoes() {
  document.getElementById("btn-nova-promocao")
    ?.addEventListener("click", abrirModalNovaPromocao);
}
