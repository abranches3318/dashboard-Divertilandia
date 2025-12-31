// ============================
// CATÁLOGO — PACOTES
// ============================

// ---------- STATE LOCAL ----------
let PACOTE_EDITANDO_ID = null;
let MENU_PACOTE_ATUAL = null;

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", () => {
  criarMenuPacote();
  bindEventosPacotes();
});

// ============================
// MENU FLUTUANTE
// ============================

function criarMenuPacote() {
  if (document.getElementById("menu-pacote-flutuante")) return;

  const menu = document.createElement("div");
  menu.id = "menu-pacote-flutuante";
  menu.className = "menu-acoes";
  menu.style.display = "none";
  menu.innerHTML = `
    <button onclick="editarPacote()">✏️ Editar</button>
    <button class="excluir" onclick="excluirPacote()">🗑️ Excluir</button>
  `;

  document.body.appendChild(menu);

  document.addEventListener("click", e => {
    if (!menu.contains(e.target)) {
      menu.style.display = "none";
      MENU_PACOTE_ATUAL = null;
    }
  });
}

function abrirMenuPacote(event, pacoteId) {
  event.stopPropagation();

  const menu = document.getElementById("menu-pacote-flutuante");
  if (!menu) return;

  MENU_PACOTE_ATUAL = pacoteId;

  const rect = event.target.getBoundingClientRect();
  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.left = `${rect.right - 160}px`;
  menu.style.display = "block";
}

// ============================
// RENDER PACOTES
// ============================

function renderPacotes() {
  const el = document.getElementById("lista-pacotes");
  if (!el) return;

  if (!CATALOGO_STATE.pacotes.length) {
    el.innerHTML = `<p style="opacity:.7">Nenhum pacote cadastrado.</p>`;
    return;
  }

  el.innerHTML = `
    <div class="itens-lista">
      <div class="itens-header">
        <div></div>
        <div>Pacote</div>
        <div style="text-align:center;">Valor</div>
        <div style="text-align:center;">Status</div>
        <div></div>
      </div>

      ${CATALOGO_STATE.pacotes.map(pacote => {
        const capa =
          Array.isArray(pacote.fotos)
            ? pacote.fotos.find(f => f.principal) || pacote.fotos[0]
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
              <div class="item-nome">${pacote.nome}</div>
              <div class="item-quantidade">
                ${(pacote.itens || []).length} itens
              </div>
            </div>

            <div class="item-valor">
              R$ ${(pacote.valor ?? 0).toFixed(2)}
            </div>

            <div class="item-status ${pacote.ativo === false ? "inativo" : "ativo"}">
              ${pacote.ativo === false ? "Inativo" : "Ativo"}
            </div>

            <button class="item-acoes"
              onclick="abrirMenuPacote(event,'${pacote.id}')">⋮</button>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

// ============================
// MODAL — NOVO PACOTE
// ============================

function abrirModalNovoPacote() {
  PACOTE_EDITANDO_ID = null;
  MODAL_CONTEXTO = "pacote";
  prepararModalPacote();

  

  document.getElementById("modal-item-titulo").textContent = "Novo Pacote";
  document.getElementById("item-nome").value = "";
  document.getElementById("item-preco").value = "";
  setValorSeguro("item-descricao", "");
  document.getElementById("item-status").value = "ativo";

  // quantidade não se aplica a pacotes
  document.getElementById("item-quantidade").parentElement.style.display = "none";

  montarListaItensPacote([]);

  document.getElementById("modal-item").classList.add("active");
}

// ============================
// MODAL — EDITAR PACOTE
// ============================

function editarPacote() {
  
  MODAL_CONTEXTO = "pacote";

  prepararModalPacote();

  const pacote = CATALOGO_STATE.pacotes.find(p => p.id === MENU_PACOTE_ATUAL);
  if (!pacote) return;

  PACOTE_EDITANDO_ID = pacote.id;

  document.getElementById("modal-item-titulo").textContent = "Editar Pacote";
  document.getElementById("item-nome").value = pacote.nome;
  document.getElementById("item-preco").value = pacote.valor ?? 0;
  setValorSeguro("item-descricao", pacote.descricao || "");
  document.getElementById("item-status").value = pacote.ativo ? "ativo" : "inativo";
  document.getElementById("item-quantidade").parentElement.style.display = "none";

  montarListaItensPacote(pacote.itens || []);
  
  // 🔵 RESTAURA IMAGENS JÁ SALVAS DO PACOTE
  CATALOGO_STATE.imagensTempPacote = (pacote.fotos || []).map(f => ({
    url: f.url,
    principal: f.principal,
    existente: true,
    offsetX: f.offsetX ?? 0,
    offsetY: f.offsetY ?? 0,
    scale: f.scale ?? 1
  }));
garantirImagemPrincipal();
  renderPreviewImagens();


  document.getElementById("menu-pacote-flutuante").style.display = "none";
  document.getElementById("modal-item").classList.add("active");

  renderMiniaturasItensPacote(pacote.itens || []);
}

// ============================
// ITENS DO PACOTE — DROPDOWN
// ============================

function montarListaItensPacote(selecionados = []) {
  if (MODAL_CONTEXTO !== "pacote") return;

  let bloco = document.getElementById("pacote-itens-bloco");

  if (!bloco) {
    bloco = document.createElement("div");
    bloco.id = "pacote-itens-bloco";
    bloco.className = "form-group full";

    const descricaoGroup =
      document.getElementById("item-descricao")?.parentElement;

    if (!descricaoGroup) return;

    descricaoGroup.after(bloco);
  }

  bloco.style.display = "block";
  
  bloco.innerHTML = `
    <label>Selecionar itens *</label>
    <div class="pacote-dropdown">
  <div class="pacote-dropdown-header" id="pacote-dropdown-header">
    Selecionar itens
    <span>▾</span>
  </div>
  <div class="pacote-dropdown-lista" id="pacote-dropdown-lista"></div>
</div>
  `;

  const lista = document.getElementById("pacote-dropdown-lista");

  CATALOGO_STATE.itens.forEach(item => {
    const checked = selecionados.some(i => i.itemId === item.id);

    const label = document.createElement("label");
    label.className = "pacote-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = item.id;
    checkbox.checked = checked;
    checkbox.onchange = atualizarPreviewItensPacote;

    const span = document.createElement("span");
    span.textContent = item.nome;

    label.appendChild(checkbox);
    label.appendChild(span);
    lista.appendChild(label);
  });

  atualizarPreviewItensPacote();
  bindDropdownPacote();
}

function toggleDropdownPacote(e) {
  e?.stopPropagation();
  document
    .getElementById("pacote-dropdown-lista")
    ?.classList.toggle("aberto");
}
// ============================
// MINIATURAS DOS ITENS
// ============================

function atualizarPreviewItensPacote() {
  const checkboxes = document.querySelectorAll(
    "#pacote-dropdown-lista input[type='checkbox']:checked"
  );

  const itensSelecionados = Array.from(checkboxes).map(cb => ({
    itemId: cb.value
  }));

  renderMiniaturasItensPacote(itensSelecionados);
}

function renderMiniaturasItensPacote(itensSelecionados = []) {
  let bloco = document.getElementById("pacote-itens-preview");
  if (bloco) bloco.remove();

  if (!itensSelecionados.length) return;

  bloco = document.createElement("div");
  bloco.id = "pacote-itens-preview";
  bloco.style.display = "flex";
  bloco.style.gap = "10px";
  bloco.style.marginTop = "10px";

  itensSelecionados.forEach(sel => {
    const item = CATALOGO_STATE.itens.find(i => i.id === sel.itemId);
    if (!item) return;

    const capa =
      Array.isArray(item.fotos)
        ? item.fotos.find(f => f.principal) || item.fotos[0]
        : null;

    const thumb = document.createElement("div");
    thumb.style.width = "90px";
    thumb.style.height = "70px";
    thumb.style.background = "#222";
    thumb.style.borderRadius = "6px";
    thumb.style.overflow = "hidden";
    thumb.title = item.nome;

    const img = document.createElement("img");
    img.src = capa?.url || "../img/imageplaceholder.jpg";
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";

    thumb.appendChild(img);
    bloco.appendChild(thumb);
  });

 const containerPacote = document.getElementById("pacote-itens-bloco");
containerPacote.appendChild(bloco);
}

// ============================
// SALVAR / EXCLUIR
// ============================

function pacoteDuplicado(itensSelecionados, ignorarId = null) {
  const chave = itensSelecionados.map(i => i.itemId).sort().join("|");

  return CATALOGO_STATE.pacotes.some(p => {
    if (ignorarId && p.id === ignorarId) return false;
    const chaveExistente = (p.itens || []).map(i => i.itemId).sort().join("|");
    return chaveExistente === chave;
  });
}

async function salvarPacote() {
  const nome = document.getElementById("item-nome").value.trim();
  const valor = Number(document.getElementById("item-preco").value);
  const descricao = document.getElementById("item-descricao")?.value.trim() || "";
  const status = document.getElementById("item-status").value;

  const checkboxes = document.querySelectorAll(
    "#pacote-dropdown-lista input[type='checkbox']:checked"
  );

  const itensSelecionados = Array.from(checkboxes).map(cb => ({
    itemId: cb.value
  }));

  if (pacoteDuplicado(itensSelecionados, PACOTE_EDITANDO_ID)) {
    Swal.fire("Pacote duplicado", "Este pacote já existe.", "warning");
    return;
  }

  if (!nome || !itensSelecionados.length) {
    Swal.fire("Erro", "Preencha nome e selecione ao menos um item.", "warning");
    return;
  }

  mostrarLoading("Salvando pacote...");

  try {
    let ref;
    const payload = {
      nome,
      valor,
      descricao,
      ativo: status === "ativo",
      itens: itensSelecionados,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (PACOTE_EDITANDO_ID) {
      ref = db.collection("pacotes").doc(PACOTE_EDITANDO_ID);
      await ref.update(payload);
    } else {
      ref = await db.collection("pacotes").add({
        ...payload,
        fotos: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    if (CATALOGO_STATE.imagensTempPacote.length) {
  const fotos = await uploadImagensPacote(ref.id);
  await ref.update({ fotos });
}

    fecharLoading();
    mostrarSucesso("Pacote salvo");
    fecharModalItem();

    await carregarPacotes();
    renderPacotes();

  } catch (err) {
    console.error(err);
    fecharLoading();
    mostrarErro("Erro ao salvar pacote");
  }
}

async function excluirPacote(pacoteId = MENU_PACOTE_ATUAL) {
  if (!pacoteId) return;

  const confirm = await Swal.fire({
    icon: "warning",
    title: "Excluir pacote?",
    showCancelButton: true,
    confirmButtonText: "Excluir"
  });

  if (!confirm.isConfirmed) return;

  await db.collection("pacotes").doc(pacoteId).delete();
  await carregarPacotes();
  renderPacotes();
}

// ============================
// EVENTOS
// ============================

function bindEventosPacotes() {
  document.getElementById("btn-novo-pacote")
    ?.addEventListener("click", abrirModalNovoPacote);
}

function bindDropdownPacote() {
  const header = document.getElementById("pacote-dropdown-header");
  const lista = document.getElementById("pacote-dropdown-lista");

  if (!header || !lista) return;

  header.onclick = e => {
    e.stopPropagation();
    lista.classList.toggle("aberto");
  };

  lista.onclick = e => e.stopPropagation();

  document.addEventListener("click", fecharDropdownPacote);
}

function fecharDropdownPacote() {
  document
    .getElementById("pacote-dropdown-lista")
    ?.classList.remove("aberto");
}
