// ============================
// CATÁLOGO — BASE
// ============================

console.log("catalogo.js carregado");

// ---------- STATE ----------
const CATALOGO_STATE = {
  itens: [],
  pacotes: [],
  promocoes: [],
  imagensTemp : []
};

function handleSelecionarFotos(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  files.forEach(file => {
    CATALOGO_STATE.imagensTemp.push({
      file,
      url: URL.createObjectURL(file),
      // primeira imagem vira capa automaticamente
      principal: CATALOGO_STATE.imagensTemp.length === 0
    });
  });

  // renderiza miniaturas
  renderPreviewImagens();

  // limpa input para permitir selecionar o mesmo arquivo novamente
  event.target.value = "";
}


function renderPreviewImagens() {
  const container = document.getElementById("preview-imagens");
  if (!container) return;

  container.innerHTML = "";

  CATALOGO_STATE.imagensTemp.forEach((img, index) => {
    const wrapper = document.createElement("div");
    wrapper.className = "preview-item";
    wrapper.style.position = "relative";

    const image = document.createElement("img");
    image.src = img.url;
    image.style.width = "100%";
    image.style.height = "100%";
    image.style.objectFit = "cover";
    image.style.borderRadius = "8px";

    // ⭐ principal
    const btnPrincipal = document.createElement("button");
    btnPrincipal.textContent = "⭐";
    btnPrincipal.title = "Definir como principal";
    btnPrincipal.style.position = "absolute";
    btnPrincipal.style.top = "6px";
    btnPrincipal.style.left = "6px";
    btnPrincipal.style.background = img.principal ? "#4cafef" : "rgba(0,0,0,.6)";
    btnPrincipal.style.color = "#fff";
    btnPrincipal.style.border = "none";
    btnPrincipal.style.borderRadius = "50%";
    btnPrincipal.style.width = "28px";
    btnPrincipal.style.height = "28px";
    btnPrincipal.style.cursor = "pointer";

    btnPrincipal.onclick = () => definirImagemPrincipal(index);

    // ❌ remover
    const btnRemover = document.createElement("button");
    btnRemover.textContent = "✕";
    btnRemover.title = "Remover imagem";
    btnRemover.style.position = "absolute";
    btnRemover.style.top = "6px";
    btnRemover.style.right = "6px";
    btnRemover.style.background = "rgba(0,0,0,.6)";
    btnRemover.style.color = "#fff";
    btnRemover.style.border = "none";
    btnRemover.style.borderRadius = "50%";
    btnRemover.style.width = "28px";
    btnRemover.style.height = "28px";
    btnRemover.style.cursor = "pointer";

    btnRemover.onclick = () => removerImagem(index);

    wrapper.appendChild(image);
    wrapper.appendChild(btnPrincipal);
    wrapper.appendChild(btnRemover);

    container.appendChild(wrapper);
  });
}

function definirImagemPrincipal(index) {
  CATALOGO_STATE.imagensTemp.forEach((img, i) => {
    img.principal = i === index;
  });

  renderPreviewImagens();
}

function removerImagem(index) {
  CATALOGO_STATE.imagensTemp.splice(index, 1);

  // se removeu a principal, define a primeira como principal
  if (
    CATALOGO_STATE.imagensTemp.length &&
    !CATALOGO_STATE.imagensTemp.some(i => i.principal)
  ) {
    CATALOGO_STATE.imagensTemp[0].principal = true;
  }

  renderPreviewImagens();
}



// ---------- REFERENCES ----------
const listaItensEl = document.getElementById("lista-itens");
const listaPacotesEl = document.getElementById("lista-pacotes");
const listaPromocoesEl = document.getElementById("lista-promocoes");

const btnNovoItem = document.getElementById("btn-novo-item");
const btnNovoPacote = document.getElementById("btn-novo-pacote");

// ---------- INIT ----------
document.addEventListener("DOMContentLoaded", () => {
  if (!window.db) {
    console.error("Firestore não disponível");
    return;
  }

  carregarCatalogo();
  bindEventos();
});

// ============================
// CARREGAR DADOS
// ============================

async function carregarCatalogo() {
  try {
    await Promise.all([
      carregarItens(),
      carregarPacotes(),
      carregarPromocoes()
    ]);

    renderItens();
    renderPacotes();
    renderPromocoes();

  } catch (err) {
    console.error("Erro ao carregar catálogo:", err);
    Swal.fire({
      icon: "error",
      title: "Erro",
      text: "Não foi possível carregar o catálogo.",
      customClass: { popup: "swal-high-z" }
    });
  }
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
  CATALOGO_STATE.pacotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- PROMOÇÕES ----------
async function carregarPromocoes() {
  const snap = await db.collection("promocoes").get();
  CATALOGO_STATE.promocoes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ============================
// RENDERIZAÇÃO
// ============================

function renderItens() {
  if (!listaItensEl) return;

  if (CATALOGO_STATE.itens.length === 0) {
    listaItensEl.innerHTML = `<p style="opacity:.7">Nenhum item cadastrado.</p>`;
    return;
  }

  listaItensEl.innerHTML = `
    <div class="itens-lista">
      ${CATALOGO_STATE.itens.map(item => {
        const capa =
          Array.isArray(item.fotos)
            ? item.fotos.find(f => f.principal)?.url || item.fotos[0]?.url
            : null;

        return `
          <div class="item-row">
            
            <div class="item-thumb">
              <img src="${capa || '../img/placeholder-item.png'}" alt="Capa">
            </div>

            <div class="item-info">
              <div class="item-nome">${item.nome || "-"}</div>
              <div class="item-quantidade">Qtd: ${item.quantidade ?? 0}</div>
            </div>

            <div class="item-valor">
              R$ ${Number(item.valor || 0).toFixed(2)}
            </div>

            <div class="item-status ${item.ativo === false ? 'inativo' : 'ativo'}">
              ${item.ativo === false ? "Inativo" : "Ativo"}
            </div>

            <button class="item-acoes" title="Ações">
              ⋮
            </button>

          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderPacotes() {
  if (!listaPacotesEl) return;

  if (CATALOGO_STATE.pacotes.length === 0) {
    listaPacotesEl.innerHTML = `<p style="opacity:.7">Nenhum pacote cadastrado.</p>`;
    return;
  }

  listaPacotesEl.innerHTML = `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Valor</th>
            <th>Itens</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${CATALOGO_STATE.pacotes.map(p => `
            <tr>
              <td>${p.nome || "-"}</td>
              <td>R$ ${Number(p.valor || 0).toFixed(2)}</td>
              <td>${Array.isArray(p.itens) ? p.itens.length : 0}</td>
              <td>${p.ativo === false ? "Inativo" : "Ativo"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderPromocoes() {
  if (!listaPromocoesEl) return;

  if (CATALOGO_STATE.promocoes.length === 0) {
    listaPromocoesEl.innerHTML = `<p style="opacity:.7">Nenhuma promoção ativa.</p>`;
    return;
  }

  listaPromocoesEl.innerHTML = `
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Referência</th>
            <th>Preço Original</th>
            <th>Preço Promo</th>
            <th>Validade</th>
          </tr>
        </thead>
        <tbody>
          ${CATALOGO_STATE.promocoes.map(pr => `
            <tr>
              <td>${pr.refNome || "-"}</td>
              <td>R$ ${Number(pr.precoOriginal || 0).toFixed(2)}</td>
              <td>R$ ${Number(pr.precoPromocional || 0).toFixed(2)}</td>
              <td>${pr.fim || "-"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ============================
// EVENTOS
// ============================

function bindEventos() {
  const btnNovoItem = document.getElementById("btn-novo-item");
  if (btnNovoItem) {
    btnNovoItem.addEventListener("click", abrirModalNovoItem);
  }

  const inputFotos = document.getElementById("input-imagens");
  if (inputFotos) {
    inputFotos.addEventListener("change", handleSelecionarFotos);
  }

  const btnSalvarItem = document.getElementById("btn-salvar-item");
  if (btnSalvarItem) {
    btnSalvarItem.addEventListener("click", salvarNovoItem);
  }

  const btnNovoPacote = document.getElementById("btn-novo-pacote");
  if (btnNovoPacote) {
    btnNovoPacote.addEventListener("click", () => {
      Swal.fire({
        icon: "info",
        title: "Novo Pacote",
        text: "Fluxo será implementado depois.",
        customClass: { popup: "swal-high-z" }
      });
    });
  }
}

// ============================
// MODAL ITEM — HTML
// ============================

function abrirModalNovoItem() {
  // limpa estado
  CATALOGO_STATE.imagensTemp = [];

  document.getElementById("modal-item-titulo").textContent = "Novo Item";
  document.getElementById("item-nome").value = "";
  document.getElementById("item-preco").value = "";
  document.getElementById("item-quantidade").value = "";
  document.getElementById("item-descricao").value = "";
  document.getElementById("item-status").value = "ativo";

  document.getElementById("btn-excluir-item").style.display = "none";

  renderPreviewImagens();

  document.getElementById("modal-item").classList.add("active");
}

function fecharModalItem() {
  document.getElementById("modal-item").classList.remove("active");
}


async function uploadImagensItem(itemId) {
  if (!CATALOGO_STATE.imagensTemp.length) return [];

  const fotos = [];

  for (const img of CATALOGO_STATE.imagensTemp) {
    const nomeArquivo = `${crypto.randomUUID()}.${img.file.name.split(".").pop()}`;
    const path = `itens/${itemId}/${nomeArquivo}`;

    const ref = storage.ref(path);
    await ref.put(img.file);

    const url = await ref.getDownloadURL();

    fotos.push({
      url,
      path,
      principal: img.principal === true
    });
  }

  return fotos;
}

function limparModalItem() {
  document.getElementById("item-nome").value = "";
  document.getElementById("item-preco").value = "";
  document.getElementById("item-quantidade").value = "";
  document.getElementById("item-descricao").value = "";
  document.getElementById("item-status").value = "ativo";

  CATALOGO_STATE.imagensTemp = [];
  renderPreviewImagens();
}

async function uploadImagensItem(itemId) {
  const uploads = [];

  for (let i = 0; i < CATALOGO_STATE.imagensTemp.length; i++) {
    const img = CATALOGO_STATE.imagensTemp[i];

    const ref = storage
      .ref()
      .child(`catalogo/itens/${itemId}/${Date.now()}_${img.file.name}`);

    const snapshot = await ref.put(img.file);
    const url = await snapshot.ref.getDownloadURL();

    uploads.push({
      url,
      principal: img.principal === true
    });
  }

  return uploads;
}

// ============================
// SALVAR ITEM
// ============================

async function salvarNovoItem() {
  const nome = document.getElementById("item-nome").value.trim();
  const valor = Number(document.getElementById("item-preco").value);
  const quantidade = Number(document.getElementById("item-quantidade").value);
  const descricao = document.getElementById("item-descricao").value.trim();
  const status = document.getElementById("item-status").value;

 if (!nome || valor <= 0 || quantidade < 0) {
    Swal.fire({
      icon: "warning",
      title: "Campos obrigatórios",
      text: "Preencha corretamente nome, preço e quantidade.",
      customClass: { popup: "swal-high-z" }
    });
    return;
  }

  try {
    Swal.fire({
      title: "Salvando item...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
      customClass: { popup: "swal-high-z" }
    });

    // 1️⃣ cria item
    const docRef = await db.collection("item").add({
  nome,
  valor: valor,      // padrão novo
  preco: valor,      // compatibilidade com agendamentos
  quantidade,
  descricao,
  ativo: status === "ativo",
  fotos: [],
  createdAt: firebase.firestore.FieldValue.serverTimestamp()
});

    // 2️⃣ upload imagens
    let fotos = [];
    if (CATALOGO_STATE.imagensTemp.length) {
      fotos = await uploadImagensItem(docRef.id);
    }

    // 3️⃣ atualiza item com fotos
    if (fotos.length) {
      await docRef.update({ fotos });
    }

    Swal.fire({
      icon: "success",
      title: "Item salvo",
      text: "Item cadastrado com sucesso.",
      customClass: { popup: "swal-high-z" }
    });

    fecharModalItem();
    limparModalItem();
    await carregarItens();
    renderItens();

  } catch (err) {
    console.error(err);
    Swal.fire({
      icon: "error",
      title: "Erro",
      text: "Não foi possível salvar o item.",
      customClass: { popup: "swal-high-z" }
    });
  }
}
