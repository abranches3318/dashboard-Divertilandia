/* ================= PROMOÇÕES — ISOLADO E DETERMINÍSTICO ================= */

(function () {




  
  /* ================= ESTADO ================= */

  let PROMOCOES = [];

  let itensSelecionados = new Set();
  let pacotesSelecionados = new Set();
  let itemGratisSelecionado = null;

  let tipoPromocao = null;
  let tipoDesconto = null;

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

  dropdown.innerHTML = `
    <div class="dropdown-toggle">Selecionar item grátis</div>
    <div class="dropdown-menu">
      ${lista.map(i => `
        <label>
          <input type="radio" name="item-gratis" value="${i.id}">
          <span>${i.nome}</span>
        </label>
      `).join("")}
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
  menu.querySelectorAll("input[type='radio']").forEach(radio => {
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

  removerTooltip(toggle); // 🔥 mata qualquer tooltip antigo

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

  toggle.onmouseenter = () => {
    criarTooltipInline(toggle, nomes);
  };

  toggle.onmouseleave = () => {
    removerTooltip(toggle);
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
      promocoesExistentes: PROMOCOES
    });

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

  await firebase
    .firestore()
    .collection("promocoes")
    .add(payload);

  fecharModalPromocaoIsolado();
  await carregarPromocoes();

  Swal.fire("Sucesso", "Promoção criada com sucesso", "success");
}

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : null;
  }

  /* ================= LISTAGEM ================= */

 function renderPromocoes() {

  const c = document.getElementById("lista-promocoes");
  if (!c) return;

  if (!PROMOCOES.length) {
    c.innerHTML = `<p class="muted">Nenhuma promoção cadastrada</p>`;
    return;
  }

  c.innerHTML = PROMOCOES.map(p => `
    <div class="promo-card ${p.status}">
      <strong>${p.nome}</strong>
      <div>${p.periodo.inicio} → ${p.periodo.fim}</div>
      <small>${p.tipoImpacto.replace("_", " ")}</small>
    </div>
  `).join("");
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

  target.style.position = "relative";

  tooltip.style.position = "absolute";
  tooltip.style.top = "100%";
  tooltip.style.left = "0";
  tooltip.style.marginTop = "6px";
  tooltip.style.zIndex = "30";

  target.appendChild(tooltip);

  target.addEventListener("mouseleave", () => {
    removerTooltip(target);
  });
}

function removerTooltip(target) {
  const tooltip = target.querySelector(".dropdown-tooltip");
  if (tooltip) tooltip.remove();
}

function limparTooltipSeVazio(target, store) {
  if (!store || store.size !== 0) return;
  removerTooltip(target);
}
  
 function pacotesQueContemItem(itemId) {
  return CATALOGO_STATE.pacotes
    .filter(p => Array.isArray(p.itens) && p.itens.includes(itemId))
    .map(p => p.id);
} 
  
})();
