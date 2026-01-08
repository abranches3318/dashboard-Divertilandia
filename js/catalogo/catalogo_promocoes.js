/* ================= PROMOÇÕES (ISOLADO) ================= */

(function () {
  // Store em memória (leve, sem observers globais)
  let promocoes = [];

  /* ---------- INIT ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindEventosPromocoes();
    carregarPromocoes();
  });

  /* ---------- BIND ---------- */
  function bindEventosPromocoes() {
    const btnNova = document.getElementById("btn-nova-promocao");
    const btnSalvar = document.getElementById("btn-salvar-promocao");

    btnNova?.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      abrirModalPromocao();
    });

    btnSalvar?.addEventListener("click", salvarPromocao);
  }

  /* ---------- MODAL ---------- */
function abrirModalPromocao() {
  limparFormulario();
  abrirModalSeguro("modal-promocao");
}



function fecharModalPromocaoIsolado() {
  fecharModalSeguro("modal-promocao");
}
  
  function limparFormulario() {
    document.getElementById("promo-nome").value = "";
    document.getElementById("promo-valor").value = "";
    document.getElementById("promo-inicio").value = "";
    document.getElementById("promo-fim").value = "";
  }

  /* ---------- CRUD ---------- */
  async function salvarPromocao() {
    const nome = document.getElementById("promo-nome").value.trim();
    const valor = parseFloat(document.getElementById("promo-valor").value);
    const inicio = document.getElementById("promo-inicio").value;
    const fim = document.getElementById("promo-fim").value;

    if (!nome || !inicio || !fim) {
      return Swal.fire("Atenção", "Preencha os campos obrigatórios", "warning");
    }

    const promocao = {
      id: crypto.randomUUID(),
      nome,
      valor: isNaN(valor) ? null : valor,
      inicio,
      fim,
      ativo: true,
      criadoEm: new Date().toISOString()
    };

    promocoes.push(promocao);

    fecharModalPromocaoIsolado();;
    renderPromocoes();

    Swal.fire("Sucesso", "Promoção criada", "success");
  }

  /* ---------- RENDER ---------- */
  function renderPromocoes() {
    const container = document.getElementById("lista-promocoes");
    if (!container) return;

    if (promocoes.length === 0) {
      container.innerHTML = `<p class="muted">Nenhuma promoção cadastrada</p>`;
      return;
    }

    container.innerHTML = promocoes
      .map(
        (p) => `
        <div class="promo-card ${p.ativo ? "ativa" : "inativa"}">
          <div>
            <strong>${p.nome}</strong>
            <div class="promo-periodo">${p.inicio} → ${p.fim}</div>
          </div>
          <div class="promo-valor">
            ${p.valor !== null ? `R$ ${p.valor.toFixed(2)}` : "—"}
          </div>
        </div>
      `
      )
      .join("");
  }

  /* ---------- LOAD (placeholder) ---------- */
  function carregarPromocoes() {
    // futuro: firestore
    renderPromocoes();
  }

})();
