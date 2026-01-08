/* ================= PROMOÇÕES (ISOLADO) ================= */

(function () {
  let promocoes = [];

  let itensSelecionados = new Set();
  let pacotesSelecionados = new Set();

  document.addEventListener("DOMContentLoaded", () => {
    bindEventosPromocoes();
    renderPromocoes();
  });

  /* ---------- BIND ---------- */
  function bindEventosPromocoes() {
    document.getElementById("btn-nova-promocao")
      ?.addEventListener("click", abrirModalPromocao);

    document.getElementById("btn-salvar-promocao")
      ?.addEventListener("click", salvarPromocao);

    document.getElementById("promo-fechar")
      ?.addEventListener("click", fecharModalPromocao);
  }

  /* ---------- MODAL (ISOLADO) ---------- */
function abrirModalPromocao() {
  console.log("PASSO 1");
  limparFormulario();
  console.log("PASSO 2");
  document.getElementById("modal-promocao").classList.add("active");
  console.log("PASSO 3");
}

 function fecharModalPromocaoIsolado() {
  document.getElementById("modal-promocao").classList.remove("active");
}

  function limparFormulario() {
    document.getElementById("promo-nome").value = "";
    document.getElementById("promo-valor").value = "";
    document.getElementById("promo-inicio").value = "";
    document.getElementById("promo-fim").value = "";

    itensSelecionados.clear();
    pacotesSelecionados.clear();
  }

  /* ---------- DROPDOWNS ---------- */
  function carregarDropdowns() {
    renderLista(
      "lista-itens-promocao",
      window.catalogoItens || [],
      itensSelecionados
    );

    renderLista(
      "lista-pacotes-promocao",
      window.catalogoPacotes || [],
      pacotesSelecionados
    );
  }

  function renderLista(containerId, lista, store) {
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
      checks.forEach(c => {
        c.checked = checkAll.checked;
        checkAll.checked ? store.add(c.value) : store.delete(c.value);
      });
    });

    checks.forEach(c => {
      c.addEventListener("change", () => {
        c.checked ? store.add(c.value) : store.delete(c.value);
        if (!c.checked) checkAll.checked = false;
      });
    });
  }

  /* ---------- SALVAR ---------- */
  function salvarPromocao() {
    const nome = document.getElementById("promo-nome").value.trim();
    const valor = parseFloat(document.getElementById("promo-valor").value);
    const inicio = document.getElementById("promo-inicio").value;
    const fim = document.getElementById("promo-fim").value;

    if (!nome || !inicio || !fim) {
      return Swal.fire("Atenção", "Preencha os campos obrigatórios", "warning");
    }

    promocoes.push({
      id: crypto.randomUUID(),
      nome,
      valor: isNaN(valor) ? null : valor,
      inicio,
      fim,
      itens: [...itensSelecionados],
      pacotes: [...pacotesSelecionados],
      ativo: true
    });

    fecharModalPromocao();
    renderPromocoes();

    Swal.fire("Sucesso", "Promoção criada", "success");
  }

  /* ---------- RENDER ---------- */
  function renderPromocoes() {
    const container = document.getElementById("lista-promocoes");
    if (!container) return;

    if (!promocoes.length) {
      container.innerHTML = `<p class="muted">Nenhuma promoção cadastrada</p>`;
      return;
    }

    container.innerHTML = promocoes.map(p => `
      <div class="promo-card ${p.ativo ? "ativa" : "inativa"}">
        <div>
          <strong>${p.nome}</strong>
          <div class="promo-periodo">${p.inicio} → ${p.fim}</div>
        </div>
        <div class="promo-valor">
          ${p.valor !== null ? `R$ ${p.valor.toFixed(2)}` : "—"}
        </div>
      </div>
    `).join("");
  }

})();
