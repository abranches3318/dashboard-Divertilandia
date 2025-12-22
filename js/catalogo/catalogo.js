// ============================
// CATÁLOGO — BASE
// ============================

console.log("catalogo.js carregado");

// ---------- STATE ----------
const CATALOGO_STATE = {
  itens: [],
  pacotes: [],
  promocoes: []
};

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
    <div class="table-wrapper">
      <table class="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Valor</th>
            <th>Quantidade</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${CATALOGO_STATE.itens.map(item => `
            <tr>
              <td>${item.nome || "-"}</td>
              <td>R$ ${Number(item.valor || 0).toFixed(2)}</td>
              <td>${item.quantidade ?? "-"}</td>
              <td>${item.ativo === false ? "Inativo" : "Ativo"}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
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
  if (btnNovoItem) {
    btnNovoItem.addEventListener("click", abrirModalNovoItem);
  }
}

  if (btnNovoPacote) {
    btnNovoPacote.addEventListener("click", () => {
      Swal.fire({
        icon: "info",
        title: "Novo Pacote",
        text: "Fluxo de criação será implementado no próximo passo.",
        customClass: { popup: "swal-high-z" }
      });
    });
  }


// ============================
// MODAL — NOVO ITEM
// ============================

async function abrirModalNovoItem() {
  const { value: formData } = await Swal.fire({
    title: "Novo Item",
    html: `
      <input id="item-nome" class="swal2-input" placeholder="Nome do item">
      <input id="item-valor" type="number" class="swal2-input" placeholder="Valor (R$)">
      <input id="item-quantidade" type="number" class="swal2-input" placeholder="Quantidade disponível">
      <textarea id="item-descricao" class="swal2-textarea" placeholder="Descrição (opcional)"></textarea>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Salvar",
    cancelButtonText: "Cancelar",
    customClass: { popup: "swal-high-z" },
    preConfirm: () => {
      const nome = document.getElementById("item-nome").value.trim();
      const valor = Number(document.getElementById("item-valor").value);
      const quantidade = Number(document.getElementById("item-quantidade").value);
      const descricao = document.getElementById("item-descricao").value.trim();

      if (!nome) {
        Swal.showValidationMessage("Informe o nome do item");
        return;
      }
      if (!valor || valor <= 0) {
        Swal.showValidationMessage("Informe um valor válido");
        return;
      }
      if (!quantidade || quantidade < 0) {
        Swal.showValidationMessage("Informe a quantidade");
        return;
      }

      return { nome, valor, quantidade, descricao };
    }
  });

  if (!formData) return;

  salvarNovoItem(formData);
}

// ============================
// SALVAR ITEM
// ============================

async function salvarNovoItem(dados) {
  try {
    await db.collection("itens").add({
      nome: dados.nome,
      valor: dados.valor,
      quantidade: dados.quantidade,
      descricao: dados.descricao || "",
      ativo: true,
      fotos: [],
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    Swal.fire({
      icon: "success",
      title: "Item criado",
      text: "O item foi cadastrado com sucesso.",
      customClass: { popup: "swal-high-z" }
    });

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
