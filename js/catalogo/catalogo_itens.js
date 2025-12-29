// ============================
// CATÁLOGO — ITENS
// ============================

// ---------- STATE LOCAL ----------
let ITEM_EDITANDO_ID = null;
let MENU_ITEM_ATUAL = null;

// ---------- DRAG ----------
let DRAG_ATIVO = false;
let DRAG_INDEX = null;
let DRAG_START_X = 0;
let DRAG_START_Y = 0;

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  criarMenuItem();
  bindEventosItens();
});

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
                    height:100%;
                    width:auto;
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
// MENU FLUTUANTE
// ============================

function criarMenuItem() {
  if (document.getElementById("menu-item-flutuante")) return;

  const menu = document.createElement("div");
  menu.id = "menu-item-flutuante";
  menu.className = "menu-acoes";
  menu.style.display = "none";
  menu.innerHTML = `
    <button onclick="editarItem()">✏️ Editar</button>
    <button class="excluir" onclick="excluirItem()">🗑️ Excluir</button>
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
// MODAL — ITEM
// ============================

function abrirModalNovoItem() {
  limparContextoModal();
  limparPreviewImagens();
  ITEM_EDITANDO_ID = null;
  MODAL_CONTEXTO = "item";

  document.getElementById("item-quantidade").parentElement.style.display = "";
  document.getElementById("modal-item-titulo").textContent = "Novo Item";

  limparModalItem();
  document.getElementById("modal-item").classList.add("active");
}

function editarItem() {
  limparContextoModal();
  limparPreviewImagens();
  MODAL_CONTEXTO = "item";

  const item = CATALOGO_STATE.itens.find(i => i.id === MENU_ITEM_ATUAL);
  if (!item) return;

  ITEM_EDITANDO_ID = item.id;

  document.getElementById("modal-item-titulo").textContent = "Editar Item";
  document.getElementById("item-nome").value = item.nome;
  document.getElementById("item-preco").value = item.valor ?? item.preco ?? 0;
  document.getElementById("item-quantidade").value = item.quantidade;
  setValorSeguro("item-descricao", item.descricao || "");
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
  limparContextoModal();
  ITEM_EDITANDO_ID = null;
  PACOTE_EDITANDO_ID = null;
}

function limparModalItem() {
  document.getElementById("item-nome").value = "";
  document.getElementById("item-preco").value = "";
  document.getElementById("item-quantidade").value = "";
  setValorSeguro("item-descricao", "");
  document.getElementById("item-status").value = "ativo";
}


// ============================
// SALVAR / EXCLUIR
// ============================

async function salvarNovoItem() {
  const nome = document.getElementById("item-nome").value.trim();
  const valor = Number(document.getElementById("item-preco").value);
  const quantidade = Number(document.getElementById("item-quantidade").value);
  const descricao = document.getElementById("item-descricao")?.value.trim() || "";
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
    mostrarSucesso("Item salvo");
    fecharModalItem();

    await carregarItens();
    renderItens();

  } catch (err) {
    console.error(err);
    fecharLoading();
    mostrarErro("Erro ao salvar item");
  }
}

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
// EVENTOS
// ============================

function bindEventosItens() {
  document.getElementById("btn-novo-item")
    ?.addEventListener("click", abrirModalNovoItem);

  document.getElementById("btn-salvar-item")
    ?.addEventListener("click", salvarRegistro);

  document.getElementById("input-imagens")
    ?.addEventListener("change", handleSelecionarFotos);
}
