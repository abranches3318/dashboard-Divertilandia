// ============================
// catalogo_promocoes.js
// STORE + CRUD (ISOLADO)
// ============================

(() => {
  const COLECAO = "promocoes";

  let PROMOCOES = [];
  let PROMO_EDITANDO_ID = null;

  // ============================
  // INIT
  // ============================
  document.addEventListener("DOMContentLoaded", () => {
    bindEventos();
    carregarPromocoes();
  });

  // ============================
  // STORE (LEVE)
  // ============================
  function getTodas() {
    return PROMOCOES.slice();
  }

  function getAtivas() {
    const agora = Date.now();

    return PROMOCOES.filter(p => {
      if (p.statusManual !== "ativa") return false;

      const ini = new Date(p.inicio).getTime();
      const fim = new Date(p.fim).getTime();

      return agora >= ini && agora <= fim;
    });
  }

  window.PromocoesStore = {
    getTodas,
    getAtivas
  };

  // ============================
  // LOAD
  // ============================
  async function carregarPromocoes() {
    const snap = await db.collection(COLECAO)
      .orderBy("createdAt", "desc")
      .get();

    PROMOCOES = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    renderPromocoes();
  }

  // ============================
  // RENDER
  // ============================
  function renderPromocoes() {
    const container = document.getElementById("lista-promocoes");
    if (!container) return;

    if (!PROMOCOES.length) {
      container.innerHTML =
        `<p style="opacity:.6;padding:15px;">Nenhuma promoção cadastrada.</p>`;
      return;
    }

    container.innerHTML = PROMOCOES.map(p => `
      <div class="promo-row">
        <div class="promo-info">
          <strong>${p.nome}</strong>
          <small>${formatarPeriodo(p.inicio, p.fim)}</small>
        </div>

        <div class="promo-status ${statusCalculado(p)}">
          ${statusCalculado(p)}
        </div>

        <button class="promo-acoes"
          onclick="editarPromocao('${p.id}')">✏️</button>
      </div>
    `).join("");
  }

  function statusCalculado(p) {
    const agora = Date.now();
    const ini = new Date(p.inicio).getTime();
    const fim = new Date(p.fim).getTime();

    if (p.statusManual !== "ativa") return "inativa";
    if (agora < ini) return "agendada";
    if (agora > fim) return "encerrada";
    return "ativa";
  }

  function formatarPeriodo(i, f) {
    return `${new Date(i).toLocaleDateString("pt-BR")}
      → ${new Date(f).toLocaleDateString("pt-BR")}`;
  }

  // ============================
  // MODAL
  // ============================
  function abrirModal() {
    PROMO_EDITANDO_ID = null;
    limparModal();
    abrirModalSeguro("modal-promocao");
  }

  function limparModal() {
    set("promo-nome", "");
    set("promo-valor", "");
    set("promo-inicio", "");
    set("promo-fim", "");
  }

  function set(id, v) {
    const el = document.getElementById(id);
    if (el) el.value = v;
  }

  // ============================
  // SAVE
  // ============================
  async function salvar() {
    try {
      const nome = val("promo-nome");
      const inicio = val("promo-inicio");
      const fim = val("promo-fim");

      if (!nome || !inicio || !fim) {
        throw new Error("Preencha todos os campos obrigatórios.");
      }

      const dados = {
        nome,
        inicio,
        fim,
        statusManual: "ativa",

        desconto: {
          percentual: null,
          valorFixo: Number(val("promo-valor")) || null
        },

        beneficios: {
          horasExtras: 0,
          brindes: []
        },

        alvos: [],
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (PROMO_EDITANDO_ID) {
        await db.collection(COLECAO)
          .doc(PROMO_EDITANDO_ID)
          .update(dados);
      } else {
        await db.collection(COLECAO).add(dados);
      }

      fecharModalSeguro("modal-promocao");
      await carregarPromocoes();
      Swal.fire("Sucesso", "Promoção salva.", "success");

    } catch (e) {
      Swal.fire("Erro", e.message, "error");
    }
  }

  function val(id) {
    return document.getElementById(id)?.value.trim();
  }

  // ============================
  // EVENTS
  // ============================
  function bindEventos() {
    document.getElementById("btn-nova-promocao")
      ?.addEventListener("click", abrirModal);

    document.getElementById("btn-salvar-promocao")
      ?.addEventListener("click", salvar);
  }

})();
