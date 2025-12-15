// js/regras_negocio.js
// Regras de negócio — controle de estoque e conflitos
// Fonte principal: Firestore (coleção "item")

(function () {

  /* =======================
     ESTOQUE FALLBACK
     ======================= */
  const estoquePadrao = {
    pula_pula: 5,
    toboguinho: 1,
    toboga: 1,
    piscina_bolinhas: 2,
    algodao_doce: 3,
    pipoca: 3,
    barraca_simples: 5,
    barraca_dupla: 1
  };

  /* =======================
     NORMALIZAÇÃO DE NOMES
     ======================= */
  function normalizeName(str) {
    if (!str) return "";

    const norm = String(str)
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (norm.includes("pula")) return "pula_pula";
    if (norm.includes("piscina")) return "piscina_bolinhas";
    if (norm.includes("algodao")) return "algodao_doce";
    if (norm.includes("pipoca")) return "pipoca";
    if (norm.includes("toboguinho")) return "toboguinho";
    if (norm.includes("toboga")) return "toboga";
    if (norm.includes("barraca") && norm.includes("dupla")) return "barraca_dupla";
    if (norm.includes("barraca")) return "barraca_simples";

    return norm;
  }

  /* =======================
     CONTADORES
     ======================= */
  function contarItensLista(arr = []) {
    const map = {};
    arr.forEach(n => {
      const k = normalizeName(n);
      if (!k) return;
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  }

  /* =======================
     BARRACAS AUTOMÁTICAS
     ======================= */
  function expandirItensComBarracas(itens = []) {
    const counts = contarItensLista(itens);

    const algodao = counts.algodao_doce || 0;
    const pipoca = counts.pipoca || 0;

    const pares = Math.min(algodao, pipoca);
    const simples = (algodao - pares) + (pipoca - pares);

    const expanded = [...itens];
    for (let i = 0; i < pares; i++) expanded.push("barraca_dupla");
    for (let i = 0; i < simples; i++) expanded.push("barraca_simples");

    return expanded;
  }

  /* =======================
     PACOTES
     ======================= */
  function pacoteToItens(pacoteDoc) {
    if (!pacoteDoc) return [];
    if (Array.isArray(pacoteDoc.itens)) return pacoteDoc.itens.slice();
    if (Array.isArray(pacoteDoc.items)) return pacoteDoc.items.slice();
    return [];
  }

  async function carregarItensDoPacotePorId(pacoteId) {
    if (!window.db || !pacoteId) return [];
    const id = String(pacoteId).replace(/^pacote_/, "");
    const doc = await db.collection("pacotes").doc(id).get();
    if (!doc.exists) return [];
    return pacoteToItens(doc.data());
  }

  /* =======================
     ESTOQUE FIRESTORE
     ======================= */
  async function buildEstoqueFromFirestore() {
    if (!window.db) return null;

    const snap = await db.collection("item").get();
    const map = {};

    snap.docs.forEach(d => {
      const data = d.data() || {};
      const nome = data.nome || data.name || "";
      const qtd = Number(data.quantidade ?? data.quant ?? 0);
      const key = normalizeName(nome);

      map[key] = qtd;
    });

    return map;
  }

  /* =======================
     CHECK DE CONFLITO
     ======================= */
  async function checkConflitoPorEstoque(
    requestedItems = [],
    existingBookings = []
  ) {
    const estoqueFirestore = await buildEstoqueFromFirestore();
    const requestedExpanded = expandirItensComBarracas(requestedItems);
    const needCounts = contarItensLista(requestedExpanded);

    const reservedCounts = {};

    for (const ag of existingBookings) {
      let itens = [];

      if (Array.isArray(ag.itens)) {
        itens = ag.itens;
      } else if (ag.pacoteId) {
        itens = await carregarItensDoPacotePorId(ag.pacoteId);
      }

      const expanded = expandirItensComBarracas(itens);
      const counts = contarItensLista(expanded);

      Object.keys(counts).forEach(k => {
        reservedCounts[k] = (reservedCounts[k] || 0) + counts[k];
      });
    }

    const problemas = [];

    Object.keys(needCounts).forEach(k => {
      const need = needCounts[k];
      const reserved = reservedCounts[k] || 0;

      const available =
        estoqueFirestore?.[k] ??
        estoquePadrao[k] ??
        0;

      if ((reserved + need) > available) {
        problemas.push({
          item: k,
          need,
          reserved,
          available
        });
      }
    });

    return {
      ok: problemas.length === 0,
      problemas
    };
  }

  /* =======================
     EXPORT
     ======================= */
  window.regrasNegocio = {
    normalizeName,
    contarItensLista,
    expandirItensComBarracas,
    checkConflitoPorEstoque,
    pacoteToItens,
    carregarItensDoPacotePorId,
    buildEstoqueFromFirestore,
    estoquePadrao
  };

})();
