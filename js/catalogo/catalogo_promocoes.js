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
    renderPromocoes();
  });

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

    if (tipoPromocao === "item_gratis") {
      mostrar("bloco-item-gratis");
      bloquearSelecionarTodos();
    }

    if (tipoPromocao === "desconto") {
      mostrar("bloco-desconto");
    }

    if (tipoPromocao === "horas_extras") {
      mostrar("bloco-horas-extras");
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

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="dropdown-toggle">Selecionar</div>
      <div class="dropdown-menu">
        ${permitirSelecionarTodos ? `
          <label class="check-all-line">
            <input type="checkbox" class="check-all"> Selecionar todos
          </label>
        ` : ""}
        ${lista.map(i => `
          <label>
            <input type="checkbox" value="${i.id}">
            ${i.nome}
          </label>
        `).join("")}
      </div>
    `;

    bindDropdown(container, store, permitirSelecionarTodos);
  }

  /* ===== DROPDOWN ITEM GRÁTIS (SINGLE) ===== */

  function renderDropdownItemGratis(containerId, lista) {

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div class="dropdown-toggle">Selecionar item grátis</div>
      <div class="dropdown-menu">
        ${lista.map(i => `
          <label>
            <input type="radio" name="item-gratis" value="${i.id}">
            ${i.nome}
          </label>
        `).join("")}
      </div>
    `;

    const toggle = container.querySelector(".dropdown-toggle");
    const menu = container.querySelector(".dropdown-menu");

    toggle.addEventListener("click", () => {
      menu.classList.toggle("open");
    });

    menu.querySelectorAll("input[type='radio']").forEach(r => {
      r.addEventListener("change", () => {
        itemGratisSelecionado = r.value;
        toggle.textContent =
          lista.find(i => i.id === r.value)?.nome || "Selecionado";
        menu.classList.remove("open");
      });
    });
  }

  /* ===== DROPDOWN CORE ===== */

  function bindDropdown(container, store, permitirSelecionarTodos) {

    const toggle = container.querySelector(".dropdown-toggle");
    const menu = container.querySelector(".dropdown-menu");

    toggle.addEventListener("click", () => {
      menu.classList.toggle("open");
    });

    const checkAll = container.querySelector(".check-all");
    const checks = container.querySelectorAll("input[type='checkbox']:not(.check-all)");

    if (checkAll) {
      checkAll.addEventListener("change", () => {
        checks.forEach(c => {
          c.checked = checkAll.checked;
          checkAll.checked
            ? store.add(c.value)
            : store.delete(c.value);
        });
      });
    }

    checks.forEach(c => {
      c.addEventListener("change", () => {
        c.checked
          ? store.add(c.value)
          : store.delete(c.value);

        if (checkAll && !c.checked) checkAll.checked = false;
      });
    });
  }

  function bloquearSelecionarTodos() {
    document
      .querySelectorAll(".check-all")
      .forEach(c => c.disabled = true);
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

  function salvarPromocao() {

    const nome = val("promo-nome");
    const inicio = val("promo-inicio");
    const fim = val("promo-fim");
    const hoje = new Date().toISOString().split("T")[0];

    if (!nome || !inicio || !fim || !tipoPromocao) {
      Swal.fire("Erro", "Campos obrigatórios não preenchidos", "error");
      return;
    }

    if (inicio < hoje) {
      Swal.fire("Erro", "Data inicial inválida", "error");
      return;
    }

    if (fim < inicio) {
      Swal.fire("Erro", "Data final inválida", "error");
      return;
    }

    PROMOCOES.push({
      id: crypto.randomUUID(),
      nome,
      tipo: tipoPromocao,
      tipoDesconto,
      descontoValor: val("promo-desconto-valor"),
      horasExtras: val("promo-horas-extras"),
      itemGratis: itemGratisSelecionado,
      itens: [...itensSelecionados],
      pacotes: [...pacotesSelecionados],
      inicio,
      fim,
      status: val("promo-status"),
      descricao: val("promo-descricao")
    });

    fecharModalPromocaoIsolado();
    renderPromocoes();

    Swal.fire("Sucesso", "Promoção criada", "success");
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
      <div class="promo-card ativa">
        <strong>${p.nome}</strong>
        <div>${p.inicio} → ${p.fim}</div>
      </div>
    `).join("");
  }

})();
