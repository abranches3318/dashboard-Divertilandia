/* ================= PROMOÇÕES (ISOLADO, DETERMINÍSTICO) ================= */

(function () {

  /* ================= ESTADO ================= */

  let promocoes = [];

  let itensSelecionados = new Set();
  let pacotesSelecionados = new Set();

  let tipoPromocao = null;
  let tipoDesconto = null;

  /* ================= INIT ================= */

  document.addEventListener("DOMContentLoaded", () => {
    bindEventosFixos();
    renderPromocoes();
  });

  /* ================= EVENTOS FIXOS ================= */

  function bindEventosFixos() {

    document.getElementById("btn-nova-promocao")
      ?.addEventListener("click", abrirModalPromocao);

    document.getElementById("btn-salvar-promocao")
      ?.addEventListener("click", salvarPromocao);

    document.getElementById("promo-tipo")
      ?.addEventListener("change", onTipoPromocaoChange);

    document.querySelectorAll("input[name='promo-desconto-tipo']")
      .forEach(r =>
        r.addEventListener("change", onTipoDescontoChange)
      );
  }

  /* ================= MODAL ================= */

  function abrirModalPromocao() {

    document.querySelectorAll(".modal.active")
      .forEach(m => m.classList.remove("active"));

    resetarFormulario();
    carregarDropdowns();

    document.getElementById("modal-promocao")
      .classList.add("active");
  }

  window.fecharModalPromocaoIsolado = function () {
    document.getElementById("modal-promocao")
      .classList.remove("active");

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

    tipoPromocao = null;
    tipoDesconto = null;

    esconderTodosBlocos();
    resetarRadios();
  }

  /* ================= CONTROLE DE TIPO ================= */

  function onTipoPromocaoChange(e) {
    tipoPromocao = e.target.value;

    esconderTodosBlocos();
    desbloquearSelecionarTodos();

    if (tipoPromocao === "item_gratis") {
      document.getElementById("bloco-item-gratis").style.display = "block";
      bloquearSelecionarTodos();
    }

    if (tipoPromocao === "desconto") {
      document.getElementById("bloco-desconto").style.display = "block";
    }

    if (tipoPromocao === "horas_extras") {
      document.getElementById("bloco-horas-extras").style.display = "block";
    }
  }

  function onTipoDescontoChange(e) {
    tipoDesconto = e.target.value;

    const campo = document.getElementById("campo-desconto-valor");
    campo.style.display = "block";

    const input = document.getElementById("promo-desconto-valor");
    input.placeholder = tipoDesconto === "percentual"
      ? "Ex: 10 (%)"
      : "Ex: 50 (R$)";
  }

  function esconderTodosBlocos() {
    document.querySelectorAll(".promo-bloco")
      .forEach(b => b.style.display = "none");

    document.getElementById("campo-desconto-valor").style.display = "none";
  }

  function resetarRadios() {
    document.querySelectorAll("input[type='radio']")
      .forEach(r => r.checked = false);
  }

  /* ================= DROPDOWNS ================= */

  function carregarDropdowns() {

    renderDropdown(
      "dropdown-itens-promocao",
      window.catalogoItens || [],
      itensSelecionados,
      "item"
    );

    renderDropdown(
      "dropdown-pacotes-promocao",
      window.catalogoPacotes || [],
      pacotesSelecionados,
      "pacote"
    );

    renderDropdown(
      "dropdown-item-gratis",
      window.catalogoItens || [],
      null,
      "item_gratis"
    );
  }

  function renderDropdown(containerId, lista, store, tipo) {

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <label class="check-all-line">
        <input type="checkbox" class="check-all">
        Selecionar todos
      </label>
      <div class="lista-checks">
        ${lista.map(i => `
          <label>
            <input type="checkbox" value="${i.id}">
            ${i.nome}
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
        store?.[checkAll.checked ? "add" : "delete"](c.value);
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

        if (store) {
          c.checked ? store.add(c.value) : store.delete(c.value);
        }

        if (!c.checked) checkAll.checked = false;
      });
    });
  }

  function bloquearSelecionarTodos() {
    document.querySelectorAll(".check-all")
      .forEach(c => c.disabled = true);
  }

  function desbloquearSelecionarTodos() {
    document.querySelectorAll(".check-all")
      .forEach(c => c.disabled = false);
  }

  /* ================= SALVAR ================= */

  function salvarPromocao() {

    const nome = val("promo-nome");
    const inicio = val("promo-inicio");
    const fim = val("promo-fim");

    const hoje = new Date().toISOString().split("T")[0];

    if (!nome || !inicio || !fim || !tipoPromocao)
      return Swal.fire("Erro", "Preencha os campos obrigatórios", "error");

    if (inicio < hoje)
      return Swal.fire("Erro", "Data inicial não pode ser passada", "error");

    if (fim < hoje || fim < inicio)
      return Swal.fire("Erro", "Data final inválida", "error");

    if (inicio > hoje)
      Swal.fire("Info", "Promoção será agendada", "info");

    promocoes.push({
      id: crypto.randomUUID(),
      nome,
      tipo: tipoPromocao,
      tipoDesconto,
      descontoValor: val("promo-desconto-valor"),
      horasExtras: val("promo-horas-extras"),
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
