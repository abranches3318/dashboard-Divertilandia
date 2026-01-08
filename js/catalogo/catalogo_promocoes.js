/* ================= PROMOÇÕES (ISOLADO E CONTROLADO) ================= */

(function () {

  let promocoes = [];

  let itensSelecionados = new Set();
  let pacotesSelecionados = new Set();

  let tipoPromocao = null;

  document.addEventListener("DOMContentLoaded", () => {
    bindEventos();
    renderPromocoes();
  });

  /* ================= EVENTOS ================= */

  function bindEventos() {
    document.getElementById("btn-nova-promocao")
      ?.addEventListener("click", abrirModalPromocao);

    document.getElementById("btn-salvar-promocao")
      ?.addEventListener("click", salvarPromocao);
  }

  /* ================= MODAL ================= */

  function abrirModalPromocao() {
    document.querySelectorAll(".modal.active")
      .forEach(m => m.classList.remove("active"));

    limparFormulario();
    montarEstruturaDinamica();

    document.getElementById("modal-promocao")
      .classList.add("active");
  }

  window.fecharModalPromocaoIsolado = function () {
    document.getElementById("modal-promocao")
      .classList.remove("active");

    limparFormulario();
  };

  function limparFormulario() {
    ["promo-nome", "promo-valor", "promo-inicio", "promo-fim"]
      .forEach(id => document.getElementById(id).value = "");

    itensSelecionados.clear();
    pacotesSelecionados.clear();
    tipoPromocao = null;

    document.querySelectorAll(".promo-extra")
      .forEach(el => el.remove());
  }

  /* ================= ESTRUTURA DINÂMICA ================= */

  function montarEstruturaDinamica() {
    const body = document.querySelector("#modal-promocao .modal-body");

    /* Tipo de promoção */
    body.insertAdjacentHTML("beforeend", `
      <div class="form-group promo-extra">
        <label>Tipo de promoção *</label>
        <select id="promo-tipo">
          <option value="">Selecione</option>
          <option value="item_gratis">Item grátis</option>
          <option value="desconto">Desconto</option>
          <option value="horas_extras">Horas extras</option>
        </select>
      </div>
    `);

    document.getElementById("promo-tipo")
      .addEventListener("change", onTipoChange);

    carregarDropdowns();
  }

  function onTipoChange(e) {
    tipoPromocao = e.target.value;

    document.querySelectorAll(".tipo-extra")
      .forEach(el => el.remove());

    if (tipoPromocao === "item_gratis") montarItemGratis();
    if (tipoPromocao === "desconto") montarDesconto();
    if (tipoPromocao === "horas_extras") montarHorasExtras();
  }

  /* ================= TIPOS ================= */

  function montarItemGratis() {
    bloquearSelecionarTodos();

    document.querySelector("#modal-promocao .modal-body")
      .insertAdjacentHTML("beforeend", `
        <div class="form-group tipo-extra">
          <label>Item gratuito *</label>
          <select id="item-gratis">
            ${(window.catalogoItens || []).map(i =>
              `<option value="${i.id}">${i.nome}</option>`
            ).join("")}
          </select>
        </div>
      `);
  }

  function montarDesconto() {
    document.querySelector("#modal-promocao .modal-body")
      .insertAdjacentHTML("beforeend", `
        <div class="form-group tipo-extra">
          <label>Tipo de desconto</label>
          <label><input type="radio" name="tipo-desconto" value="fixo"> Valor fixo</label>
          <label><input type="radio" name="tipo-desconto" value="percentual"> Porcentagem</label>
        </div>
      `);
  }

  function montarHorasExtras() {
    document.querySelector("#modal-promocao .modal-body")
      .insertAdjacentHTML("beforeend", `
        <div class="form-group tipo-extra">
          <label>Horas extras *</label>
          <input type="number" id="promo-horas" min="1">
        </div>
      `);
  }

  /* ================= DROPDOWNS ================= */

  function carregarDropdowns() {
    renderLista(
      "lista-itens-promocao",
      window.catalogoItens || [],
      itensSelecionados,
      "item"
    );

    renderLista(
      "lista-pacotes-promocao",
      window.catalogoPacotes || [],
      pacotesSelecionados,
      "pacote"
    );
  }

  function renderLista(containerId, lista, store, tipo) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <label>
        <input type="checkbox" class="check-all"> Selecionar todos
      </label>
      <div class="lista-checks">
        ${lista.map(item => `
          <label>
            <input type="checkbox" value="${item.id}">
            ${item.nome}
          </label>
        `).join("")}
      </div>
    `;

    const checkAll = container.querySelector(".check-all");
    const checks = container.querySelectorAll("input[type=checkbox]:not(.check-all)");

    checkAll.addEventListener("change", () => {
      if (tipoPromocao === "item_gratis" && tipo === "pacote") {
        Swal.fire("Atenção", "Item grátis permite apenas um pacote", "warning");
        checkAll.checked = false;
        return;
      }

      checks.forEach(c => {
        c.checked = checkAll.checked;
        checkAll.checked ? store.add(c.value) : store.delete(c.value);
      });
    });

    checks.forEach(c => {
      c.addEventListener("change", () => {
        if (tipoPromocao === "item_gratis" && tipo === "pacote") {
          if (pacotesSelecionados.size >= 1 && c.checked) {
            c.checked = false;
            Swal.fire("Atenção", "Somente um pacote permitido", "warning");
            return;
          }
        }

        c.checked ? store.add(c.value) : store.delete(c.value);
        if (!c.checked) checkAll.checked = false;
      });
    });
  }

  function bloquearSelecionarTodos() {
    document.querySelectorAll(".check-all")
      .forEach(c => c.disabled = true);
  }

  /* ================= SALVAR ================= */

  function salvarPromocao() {
    const nome = promoVal("promo-nome");
    const inicio = promoVal("promo-inicio");
    const fim = promoVal("promo-fim");

    const hoje = new Date().toISOString().split("T")[0];

    if (inicio < hoje)
      return Swal.fire("Erro", "Data inicial inválida", "error");

    if (fim < hoje || fim < inicio)
      return Swal.fire("Erro", "Data final inválida", "error");

    if (inicio > hoje)
      Swal.fire("Info", "Promoção será agendada", "info");

    promocoes.push({
      id: crypto.randomUUID(),
      nome,
      tipo: tipoPromocao,
      inicio,
      fim,
      itens: [...itensSelecionados],
      pacotes: [...pacotesSelecionados],
      ativo: true
    });

    fecharModalPromocaoIsolado();
    renderPromocoes();

    Swal.fire("Sucesso", "Promoção criada", "success");
  }

  function promoVal(id) {
    return document.getElementById(id).value.trim();
  }

  /* ================= LISTA ================= */

  function renderPromocoes() {
    const c = document.getElementById("lista-promocoes");
    if (!c) return;

    c.innerHTML = promocoes.length
      ? promocoes.map(p => `
        <div class="promo-card ativa">
          <strong>${p.nome}</strong>
          <div class="promo-periodo">${p.inicio} → ${p.fim}</div>
        </div>
      `).join("")
      : `<p class="muted">Nenhuma promoção cadastrada</p>`;
  }

})();
