/* ================= PROMOÇÕES — ISOLADO E DETERMINÍSTICO ================= */

(function () {




  
  /* ================= ESTADO ================= */

  let PROMOCOES = [];

  let itensSelecionados = new Set();
  let pacotesSelecionados = new Set();
  let itemGratisSelecionado = null;

  let tipoPromocao = null;
  let tipoDesconto = null;
  let PROMOCAO_EM_EDICAO_ID = null;

  /* ================= INIT ================= */

  document.addEventListener("DOMContentLoaded", () => {
    bindEventosFixos();
    carregarPromocoes();
  });


  async function carregarPromocoes() {

  const snapshot = await firebase
    .firestore()
    .collection("promocoes")
    .orderBy("criadoEm", "desc")
    .get();

  PROMOCOES = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  renderPromocoes();
}
  /* ================= EVENTOS FIXOS ================= */

  function bindEventosFixos() {

    const btnNova = document.getElementById("btn-nova-promocao");
    if (btnNova) btnNova.addEventListener("click", abrirModalPromocao);

    const btnSalvar = document.getElementById("btn-salvar-promocao");
    if (btnSalvar) btnSalvar.addEventListener("click", salvarPromocao);

    const tipo = document.getElementById("promo-tipo");
    if (tipo) tipo.addEventListener("change", onTipoPromocaoChange);

    document
      .querySelectorAll("input[name='promo-desconto-tipo']")
      .forEach(radio =>
        radio.addEventListener("change", onTipoDescontoChange)
      );
  }

  /* ================= MODAL ================= */

  function abrirModalPromocao() {

  PROMOCAO_EM_EDICAO_ID = null;

  const titulo = document.getElementById("titulo-modal-promocao");
  if (titulo) titulo.textContent = "Nova promoção";

  document
    .querySelectorAll(".modal.active")
    .forEach(m => m.classList.remove("active"));

  resetarFormulario();
  carregarDropdowns();
  prepararImagemPromocao();

  const modal = document.getElementById("modal-promocao");
  if (modal) modal.classList.add("active");
}

  window.fecharModalPromocaoIsolado = function () {
    PROMOCAO_EM_EDICAO_ID = null;
    const titulo = document.getElementById("titulo-modal-promocao");
if (titulo) titulo.textContent = "Nova promoção";
    const modal = document.getElementById("modal-promocao");
    if (modal) modal.classList.remove("active");
    resetarFormulario();
  };

  function resetarFormulario() {

    [
      "promo-nome",
      "promo-inicio",
      "promo-fim",
      "promo-desconto-valor",
      "promo-horas-extras",
      "promo-valor-final",
      "promo-descricao"
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    itensSelecionados.clear();
    pacotesSelecionados.clear();
    itemGratisSelecionado = null;

    tipoPromocao = null;
    tipoDesconto = null;

    esconderTodosBlocos();
    resetarRadios();

    const preview = document.getElementById("promo-imagem-preview");
    if (preview) preview.innerHTML = "";

    document
  .querySelectorAll(".dropdown-toggle")
  .forEach(t => removerTooltip(t));
  }

  /* ================= CONTROLE DE TIPO ================= */

function onTipoPromocaoChange(e) {
  tipoPromocao = e.target.value;

  esconderTodosBlocos();
  desbloquearSelecionarTodos();
  carregarDropdowns();

  if (tipoPromocao === "item_gratis") {

    mostrar("bloco-item-gratis");

    // 🔒 item grátis só com PACOTES
    itensSelecionados.clear();

    const dropItens = document.getElementById("dropdown-itens-promocao");
    if (dropItens) {
      dropItens.classList.add("disabled");
      dropItens.innerHTML = `
        <div class="dropdown-toggle muted">
          Indisponível para item grátis
        </div>
      `;
    }

    bloquearSelecionarTodos();
    return;
  }

  if (tipoPromocao === "desconto") {
    mostrar("bloco-desconto");
    return;
  }

  if (tipoPromocao === "horas_extras") {
    mostrar("bloco-horas-extras");
    return;
  }
}

  function onTipoDescontoChange(e) {
    tipoDesconto = e.target.value;

    const campo = document.getElementById("campo-desconto-valor");
    if (campo) campo.style.display = "block";

    const input = document.getElementById("promo-desconto-valor");
    if (input) {
      input.placeholder =
        tipoDesconto === "percentual"
          ? "Ex: 10 (%)"
          : "Ex: 50 (R$)";
    }
  }

  function esconderTodosBlocos() {
    document
      .querySelectorAll(".promo-bloco")
      .forEach(b => b.style.display = "none");

    const campo = document.getElementById("campo-desconto-valor");
    if (campo) campo.style.display = "none";
  }

  function resetarRadios() {
    document
      .querySelectorAll("input[type='radio']")
      .forEach(r => r.checked = false);
  }

  function mostrar(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
  }

  /* ================= DROPDOWNS ================= */

  function carregarDropdowns() {

    renderDropdownMulti(
      "dropdown-itens-promocao",
      CATALOGO_STATE.itens,
      itensSelecionados,
      true
    );

    renderDropdownMulti(
      "dropdown-pacotes-promocao",
      CATALOGO_STATE.pacotes,
      pacotesSelecionados,
      true
    );

    renderDropdownItemGratis(
      "dropdown-item-gratis",
      CATALOGO_STATE.itens
    );
  }

  /* ===== DROPDOWN MULTI (ITENS / PACOTES) ===== */

  function renderDropdownMulti(containerId, lista, store, permitirSelecionarTodos) {

  const dropdown = document.getElementById(containerId);
  if (!dropdown) return;

  if (!Array.isArray(lista) || !lista.length) {
    dropdown.innerHTML = `<div class="dropdown-toggle muted">Nenhum disponível</div>`;
    return;
  }

  dropdown.innerHTML = `
    <div class="dropdown-toggle">Selecionar</div>
    <div class="dropdown-menu">
      ${permitirSelecionarTodos ? `
        <label class="check-all-line">
          <input type="checkbox" class="check-all"> Selecionar todos
        </label>
      ` : ""}
      ${lista.map(i => {

        const contemItemGratis =
          tipoPromocao === "item_gratis" &&
          itemGratisSelecionado &&
          Array.isArray(i.itens) &&
          i.itens.includes(itemGratisSelecionado);

        return `
          <label class="${contemItemGratis ? "disabled" : ""}">
            <input
              type="checkbox"
              value="${i.id}"
              ${contemItemGratis ? "disabled" : ""}
            >
            <span>
              ${i.nome}
              ${contemItemGratis ? " (contém o item grátis)" : ""}
            </span>
          </label>
        `;
      }).join("")}
    </div>
  `;

  bindDropdown(dropdown, store);
}
  
  /* ===== DROPDOWN ITEM GRÁTIS (SINGLE) ===== */
function renderDropdownItemGratis(containerId, lista) {

  const dropdown = document.getElementById(containerId);
  if (!dropdown) return;

  if (!Array.isArray(lista) || !lista.length) {
    dropdown.innerHTML = `<div class="dropdown-toggle muted">Nenhum item</div>`;
    return;
  }

  // 🔎 Descobre quais itens NÃO podem ser grátis
  const itensBloqueados = new Set();

  if (tipoPromocao === "item_gratis" && pacotesSelecionados.size) {
    CATALOGO_STATE.pacotes.forEach(pacote => {
      if (pacotesSelecionados.has(pacote.id)) {
        (pacote.itens || []).forEach(itemId => {
          itensBloqueados.add(itemId);
        });
      }
    });
  }

  dropdown.innerHTML = `
    <div class="dropdown-toggle">Selecionar item grátis</div>
    <div class="dropdown-menu">
      ${lista.map(i => {
        const bloqueado = itensBloqueados.has(i.id);

        return `
          <label class="${bloqueado ? "disabled" : ""}">
            <input
              type="radio"
              name="item-gratis"
              value="${i.id}"
              ${bloqueado ? "disabled" : ""}
            >
            <span>
              ${i.nome}
              ${bloqueado ? " (já faz parte do pacote)" : ""}
            </span>
          </label>
        `;
      }).join("")}
    </div>
  `;

  const toggle = dropdown.querySelector(".dropdown-toggle");
  const menu = dropdown.querySelector(".dropdown-menu");

  // 🔁 abre / fecha
  toggle.addEventListener("click", () => {
    fecharTodosDropdowns();
    dropdown.classList.toggle("open");
  });

  // 🔄 seleção do item grátis
  menu.querySelectorAll("input[type='radio']:not(:disabled)").forEach(radio => {
    radio.addEventListener("change", () => {

      itemGratisSelecionado = radio.value;

      toggle.textContent =
        lista.find(i => i.id === radio.value)?.nome || "Selecionado";

      dropdown.classList.remove("open");

      /* =========================================
         🔒 REGRA: remover pacotes inválidos
         ========================================= */

      if (tipoPromocao === "item_gratis") {

        let houveRemocao = false;

        CATALOGO_STATE.pacotes.forEach(pacote => {
          const contemItem =
            Array.isArray(pacote.itens) &&
            pacote.itens.includes(itemGratisSelecionado);

          if (contemItem && pacotesSelecionados.has(pacote.id)) {
            pacotesSelecionados.delete(pacote.id);
            houveRemocao = true;
          }
        });

        if (houveRemocao) {
          renderDropdownMulti(
            "dropdown-pacotes-promocao",
            CATALOGO_STATE.pacotes,
            pacotesSelecionados,
            true
          );
        }
      }
    });
  });
}
  /* ===== DROPDOWN CORE ===== */

function bindDropdown(dropdown, store) {

  const toggle = dropdown.querySelector(".dropdown-toggle");
  const menu = dropdown.querySelector(".dropdown-menu");
  const checkAll = dropdown.querySelector(".check-all");
  const checks = dropdown.querySelectorAll(
    "input[type='checkbox']:not(.check-all)"
  );

  /* ================= UTIL ================= */

function atualizarToggle() {
  const ids = [...store];

  removerTooltip(toggle);
  toggle.onmouseenter = null;
  toggle.onmouseleave = null;

  if (!ids.length) {
    toggle.textContent = "Selecionar";
    return;
  }

  toggle.textContent = `Selecionados: ${ids.length}`;

  const nomes = ids
    .map(id =>
      CATALOGO_STATE.itens?.find(i => i.id === id)?.nome ||
      CATALOGO_STATE.pacotes?.find(p => p.id === id)?.nome
    )
    .filter(Boolean);

  criarTooltipInline(toggle, nomes);

  const tooltip = toggle.querySelector(".dropdown-tooltip");

  toggle.onmouseenter = () => {
    if (tooltip) tooltip.style.display = "block";
  };

  toggle.onmouseleave = () => {
    if (tooltip) tooltip.style.display = "none";
  };
}

  /* ================= ABRIR / FECHAR ================= */

  toggle.addEventListener("click", (e) => {
    e.stopPropagation();

    const isOpen = dropdown.classList.contains("open");
    fecharTodosDropdowns();

    if (!isOpen) {
      dropdown.classList.add("open");
    }
  });

  // 🔒 NÃO fecha ao clicar dentro do menu
  menu.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  /* ================= SELECIONAR TODOS ================= */

  if (checkAll) {
    checkAll.addEventListener("change", (e) => {
      e.stopPropagation();

      checks.forEach(c => {
        c.checked = checkAll.checked;
        checkAll.checked
          ? store.add(c.value)
          : store.delete(c.value);
      });

      atualizarToggle();
      limparTooltipSeVazio(toggle, store);
      
    });
  }

  /* ================= CHECK INDIVIDUAL ================= */

  checks.forEach(c => {
    c.addEventListener("change", (e) => {
      e.stopPropagation();

      c.checked
        ? store.add(c.value)
        : store.delete(c.value);

      if (checkAll && !c.checked) {
        checkAll.checked = false;
      }

      atualizarToggle();
      limparTooltipSeVazio(toggle, store);
    });
  });

  /* ================= INIT ================= */

  atualizarToggle();
}

  function bloquearSelecionarTodos() {
  document
    .querySelectorAll(".check-all")
    .forEach(c => c.disabled = true);

  document
    .querySelectorAll(".dropdown")
    .forEach(d => d.classList.remove("open"));
}

  function desbloquearSelecionarTodos() {
    document
      .querySelectorAll(".check-all")
      .forEach(c => c.disabled = false);
  }

  /* ================= IMAGEM PROMOÇÃO ================= */

  function prepararImagemPromocao() {

    const input = document.getElementById("promo-imagem");
    if (!input) return;

    input.onchange = (e) => {

      const file = e.target.files[0];
      if (!file) return;

      const preview = document.getElementById("promo-imagem-preview");
      if (!preview) return;

      preview.innerHTML = "";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      preview.appendChild(img);

      const estado = { scale: 1, offsetX: 0, offsetY: 0 };

      aplicarTransformImagem(img, estado);
      habilitarDragImagem(img, estado);
      habilitarZoomImagem(img, estado);
    };
  }

  /* ================= SALVAR ================= */

async function salvarPromocao() {
  await salvarPromocaoCore(null);
}

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : null;
  }

  /* ================= LISTAGEM ================= */

function renderPromocoes() {
  const el = document.getElementById("lista-promocoes");
  if (!el) return;

  if (!PROMOCOES.length) {
    el.innerHTML = `<p style="opacity:.7">Nenhuma promoção cadastrada.</p>`;
    return;
  }

  el.innerHTML = `
    <div class="itens-header">
      <div></div>
      <div>Promoção</div>
      <div class="col-valor">Período</div>
      <div class="col-status">Status</div>
      <div></div>
    </div>

    <div class="itens-lista">
      ${PROMOCOES.map(promo => {
        const capa = promo.imagemUrl || "../img/imageplaceholder.jpg";

        const qtdAplicacao =
          (promo.aplicacao?.itens?.length || 0) +
          (promo.aplicacao?.pacotes?.length || 0);

        const periodo = `${promo.periodo.inicio} → ${promo.periodo.fim}`;

        return `
          <div class="item-row">

            <div class="item-thumb">
              <div class="item-thumb-wrapper">
                <img
                  src="${capa}"
                  style="
                    position:absolute;
                    top:50%;
                    left:50%;
                    transform: translate(-50%, -50%);
                    height:100%;
                    width:auto;
                    object-fit: contain;
                  "
                >
              </div>
            </div>

            <div class="item-info">
              <div class="item-nome">${promo.nome}</div>
              <div class="item-quantidade">
                ${promo.tipoImpacto.replace("_", " ")} • ${qtdAplicacao} aplicáveis
              </div>
            </div>

            <div class="item-valor">
              ${periodo}
            </div>

            <div class="item-status ${promo.status === "ativa" ? "ativo" : "inativo"}">
              ${promo.status === "ativa" ? "Ativa" : "Inativa"}
            </div>

            <button
              class="item-acoes"
              onclick="abrirMenuPromocao(event,'${promo.id}')"
            >
              ⋮
            </button>

          </div>
        `;
      }).join("")}
    </div>
  `;
}


document.addEventListener("click", (e) => {
  if (!e.target.closest(".dropdown")) {
    fecharTodosDropdowns();
  }
});

function fecharTodosDropdowns() {
  document
    .querySelectorAll(".dropdown.open")
    .forEach(d => d.classList.remove("open"));
}


function criarTooltipInline(target, textos) {
  removerTooltip(target);

  if (!textos || !textos.length) return;

  const tooltip = document.createElement("div");
  tooltip.className = "dropdown-tooltip";

  const lista = document.createElement("div");
  lista.className = "tooltip-lista";

  if (textos.length > 5) {
    lista.classList.add("duas-colunas");
  }

  textos.forEach(t => {
    const item = document.createElement("div");
    item.className = "tooltip-item";
    item.textContent = t;
    lista.appendChild(item);
  });

  tooltip.appendChild(lista);

  tooltip.style.position = "absolute";
  tooltip.style.top = "100%";
  tooltip.style.left = "0";
  tooltip.style.marginTop = "6px";
  tooltip.style.zIndex = "30";
  tooltip.style.display = "none";

  target.style.position = "relative";
  target.appendChild(tooltip);
}

function removerTooltip(target) {
  const tooltip = target.querySelector(".dropdown-tooltip");
  if (tooltip) tooltip.remove();
}

function limparTooltipSeVazio(target, store) {
  if (store.size === 0) {
    removerTooltip(target);
  }
}
  
 function pacotesQueContemItem(itemId) {
  return CATALOGO_STATE.pacotes
    .filter(p => Array.isArray(p.itens) && p.itens.includes(itemId))
    .map(p => p.id);
} 

  function bindTooltipItensPromocao() {
  document.querySelectorAll(".promo-itens").forEach(el => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();

      fecharTooltipItens();

      const promoId = el.dataset.id;
      const promo = PROMOCOES.find(p => p.id === promoId);
      if (!promo) return;

      const tooltip = document.createElement("div");
      tooltip.className = "tooltip-itens-promocao";

      const itens = [
        ...(promo.aplicacao?.itens || []),
        ...(promo.aplicacao?.pacotes || [])
      ];

      tooltip.innerHTML = `
        <strong>Aplicável em:</strong>
        ${itens.length
          ? itens.map(id => {
  const item =
    CATALOGO_STATE.itens?.find(i => i.id === id) ||
    CATALOGO_STATE.pacotes?.find(p => p.id === id);

  return `<div>${item ? item.nome : id}</div>`;
}).join("")
          : "<div class='muted'>Nenhum</div>"
        }
      `;

      el.appendChild(tooltip);
    });
  });
}

function fecharTooltipItens() {
  document
    .querySelectorAll(".tooltip-itens-promocao")
    .forEach(t => t.remove());
}

document.addEventListener("click", fecharTooltipItens);

  window.excluirPromocao = async function (id) {
  const res = await Swal.fire({
    title: "Excluir promoção?",
    text: "Essa ação não pode ser desfeita",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Excluir"
  });

  if (!res.isConfirmed) return;

  await firebase.firestore().collection("promocoes").doc(id).delete();
  await carregarPromocoes();

  Swal.fire("Excluída", "Promoção removida com sucesso", "success");
};

  window.editarPromocao = function (id) {
    PROMOCAO_EM_EDICAO_ID = id;
    const titulo = document.getElementById("titulo-modal-promocao");
if (titulo) titulo.textContent = "Editar promoção";
  const promo = PROMOCOES.find(p => p.id === id);
  if (!promo) return;

  // Fecha qualquer modal aberto
  document
    .querySelectorAll(".modal.active")
    .forEach(m => m.classList.remove("active"));

  resetarFormulario();

  // === CAMPOS BÁSICOS ===
  document.getElementById("promo-nome").value = promo.nome;
  document.getElementById("promo-inicio").value = promo.periodo.inicio;
  document.getElementById("promo-fim").value = promo.periodo.fim;
  document.getElementById("promo-descricao").value = promo.descricao || "";

  tipoPromocao = promo.tipoImpacto;
  document.getElementById("promo-tipo").value = tipoPromocao;

  esconderTodosBlocos();
  carregarDropdowns();

  // === APLICAÇÃO ===
  (promo.aplicacao?.itens || []).forEach(i => itensSelecionados.add(i));
  (promo.aplicacao?.pacotes || []).forEach(p => pacotesSelecionados.add(p));

  // === TIPO DE PROMOÇÃO ===
  if (tipoPromocao === "desconto") {
    mostrar("bloco-desconto");

    tipoDesconto = promo.impacto.tipo;
    document
      .querySelector(`input[name="promo-desconto-tipo"][value="${tipoDesconto}"]`)
      .checked = true;

    document.getElementById("promo-desconto-valor").value =
      promo.impacto.valor;
  }

  if (tipoPromocao === "horas_extras") {
    mostrar("bloco-horas-extras");

    document.getElementById("promo-horas-extras").value =
      promo.impacto.valor.horas;

    document.getElementById("promo-valor-final").value =
      promo.impacto.valor.valorFinal;
  }

  if (tipoPromocao === "item_gratis") {
    mostrar("bloco-item-gratis");

    itemGratisSelecionado = promo.impacto.itemGratisId;

    const dropItem = document.getElementById("dropdown-item-gratis");
    if (dropItem) {
      const toggle = dropItem.querySelector(".dropdown-toggle");
      const item = CATALOGO_STATE.itens.find(
        i => i.id === itemGratisSelecionado
      );
      if (toggle && item) toggle.textContent = item.nome;
    }

    bloquearSelecionarTodos();
  }

  // === ATUALIZA DROPDOWNS COM ESTADO ===
  carregarDropdowns();

  // === IMAGEM ===
  if (promo.imagemUrl) {
    const preview = document.getElementById("promo-imagem-preview");
    if (preview) {
      preview.innerHTML = `<img src="${promo.imagemUrl}">`;
    }
  }

  // === CONTROLE DE EDIÇÃO ===
  document.getElementById("btn-salvar-promocao").onclick = () =>
  salvarPromocao();

  // Abre modal
  document.getElementById("modal-promocao").classList.add("active");
};

 async function salvarPromocao() {
  await salvarPromocaoCore(PROMOCAO_EM_EDICAO_ID);
}

 async function salvarPromocaoCore(idEdicao = null) {

  const nome = val("promo-nome");
  const inicio = val("promo-inicio");
  const fim = val("promo-fim");

   /* ================= VALIDAÇÕES BÁSICAS ================= */

  if (!nome || !inicio || !fim || !tipoPromocao) {
    Swal.fire("Erro", "Campos obrigatórios não preenchidos", "error");
    return;
  }

  // 🔒 VALIDA PERÍODO (DATA PASSADA / ORDEM)
  const validPeriodo = validarPeriodoPromocao({ inicio, fim });
  if (!validPeriodo.valido) {
    Swal.fire("Erro", validPeriodo.mensagem, "warning");
    return;
  }

  /* ================= REGRAS ESPECÍFICAS ================= */

  // 🔒 ITEM GRÁTIS — SOMENTE PACOTES
  if (tipoPromocao === "item_gratis") {

    if (!itemGratisSelecionado) {
      Swal.fire("Erro", "Selecione um item grátis", "warning");
      return;
    }

    if (!pacotesSelecionados.size) {
      Swal.fire(
        "Erro",
        "Promoção de item grátis deve estar vinculada a pelo menos um pacote",
        "warning"
      );
      return;
    }

    // 🔴 REGRA DOS 65%
    const regra65 = validarItemGratisComPacote({
      itemGratisId: itemGratisSelecionado,
      pacotesIds: [...pacotesSelecionados]
    });

    if (!regra65.valido) {
      Swal.fire("Promoção inválida", regra65.mensagem, "warning");
      return;
    }

    // 🔴 ITEM GRÁTIS NÃO PODE ESTAR CONTIDO NO PACOTE
    const regraContem = validarItemGratisNaoContidoNoPacote({
      itemGratisId: itemGratisSelecionado,
      pacotesIds: [...pacotesSelecionados]
    });

    if (!regraContem.valido) {
      Swal.fire("Promoção inválida", regraContem.mensagem, "warning");
      return;
    }
  }

  // 🔒 DESCONTO
  if (tipoPromocao === "desconto") {

    if (!tipoDesconto) {
      Swal.fire("Erro", "Selecione o tipo de desconto", "warning");
      return;
    }

    const valorDesconto = Number(val("promo-desconto-valor"));
    if (!valorDesconto || valorDesconto <= 0) {
      Swal.fire("Erro", "Valor de desconto inválido", "warning");
      return;
    }

    // 🔴 BLOQUEIO DE EMPILHAMENTO DE DESCONTO
    const validDesconto = validarConflitosDesconto({
  promocaoNova: {
    tipoImpacto: "desconto",
    periodo: { inicio, fim },
    aplicacao: {
      itens: [...itensSelecionados],
      pacotes: [...pacotesSelecionados]
    }
  },
  promocoesExistentes: PROMOCOES.filter(p =>
    p.id !== PROMOCAO_EM_EDICAO_ID
  )
})

    if (!validDesconto.valido) {
      Swal.fire("Promoção inválida", validDesconto.mensagem, "warning");
      return;
    }
  }

  // 🔒 HORAS EXTRAS
  if (tipoPromocao === "horas_extras") {

    const horas = Number(val("promo-horas-extras"));
    if (!horas || horas <= 0) {
      Swal.fire("Erro", "Informe a quantidade de horas extras", "warning");
      return;
    }

    const valorFinal = Number(val("promo-valor-final"));
    if (!valorFinal || valorFinal <= 0) {
      Swal.fire("Erro", "Informe o valor final da promoção", "warning");
      return;
    }
  }

  /* ================= PAYLOAD FINAL ================= */

  const payload = {
    nome,
    status: "ativa",

    tipoImpacto: tipoPromocao,

    impacto: {
      tipo: tipoDesconto || null,

      valor:
        tipoPromocao === "desconto"
          ? Number(val("promo-desconto-valor"))
          : tipoPromocao === "horas_extras"
            ? {
                horas: Number(val("promo-horas-extras")),
                valorFinal: Number(val("promo-valor-final"))
              }
            : null,

      itemGratisId:
        tipoPromocao === "item_gratis"
          ? itemGratisSelecionado
          : null
    },

    aplicacao: {
      itens:
        tipoPromocao === "item_gratis"
          ? []
          : [...itensSelecionados],
      pacotes: [...pacotesSelecionados]
    },

    periodo: { inicio, fim },

    descricao: val("promo-descricao"),
    imagemUrl: null,

    criadoEm: firebase.firestore.FieldValue.serverTimestamp(),
    atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
  };

  /* ================= FIRESTORE ================= */

 if (idEdicao) {
  const { criadoEm, ...payloadUpdate } = payload;

  await firebase
    .firestore()
    .collection("promocoes")
    .doc(idEdicao)
    .update({
      ...payloadUpdate,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

  Swal.fire("Atualizada", "Promoção atualizada com sucesso", "success");
}else {
    payload.criadoEm =
      firebase.firestore.FieldValue.serverTimestamp();

    await firebase
      .firestore()
      .collection("promocoes")
      .add(payload);

    Swal.fire("Sucesso", "Promoção criada com sucesso", "success");
  }

  fecharModalPromocaoIsolado();
  await carregarPromocoes();
}

 window.abrirMenuPromocao = function (event, promocaoId) {
  event.stopPropagation();

  fecharMenusPromocao();

  const btn = event.currentTarget;
  const rect = btn.getBoundingClientRect();

  const menu = document.createElement("div");
  menu.className = "menu-flutuante-promocao";
  menu.dataset.id = promocaoId;

  menu.style.position = "fixed";
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.left = `${rect.left - 120}px`;
  menu.style.zIndex = "999";

  menu.innerHTML = `
    <div class="menu-item" onclick="editarPromocao('${promocaoId}')">
      ✏️ Editar
    </div>
    <div class="menu-item" onclick="alternarStatusPromocao('${promocaoId}')">
      🔁 Ativar / Suspender
    </div>
    <div class="menu-item danger" onclick="excluirPromocao('${promocaoId}')">
      🗑️ Excluir
    </div>
  `;

  document.body.appendChild(menu);
}

 window.fecharMenusPromocao = function () {
  document
    .querySelectorAll(".menu-flutuante-promocao")
    .forEach(m => m.remove());
}

document.addEventListener("click", fecharMenusPromocao);

  window.alternarStatusPromocao = async function (id) {
  const promo = PROMOCOES.find(p => p.id === id);
  if (!promo) return;

  const novoStatus = promo.status === "ativa" ? "suspensa" : "ativa";

  await firebase
    .firestore()
    .collection("promocoes")
    .doc(id)
    .update({
      status: novoStatus,
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp()
    });

  Swal.fire(
    "Atualizado",
    `Promoção ${novoStatus === "ativa" ? "ativada" : "suspensa"} com sucesso`,
    "success"
  );

  await carregarPromocoes();
}
})();
