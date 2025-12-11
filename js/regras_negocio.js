// js/regras_negocio.js
// Regras de negócio: inventário — agora lê dados do Firestore quando disponível.
// Exporta window.regrasNegocio com funções síncronas e assíncronas.

(function () {
  // fallback local (apenas backup, usado se Firestore não fornecer dados)
  const estoquePadrao = {
    "pula_pula": 5,
    "toboga": 1,
    "toboguinho": 1,
    "piscina_bolinhas": 2,
    "algodao_doce": 3,
    "pipoca": 3,
    "barraca_simples": 5,
    "barraca_dupla": 1
  };

  // ============================================================
  // CORREÇÃO ESSENCIAL: normalização + mapeamento real
  // ============================================================
  function normalizeName(s) {
    if (!s) return "";

    let norm = String(s)
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

    // MAPEAMENTO — garante que todas variações caiam nos itens corretos
    // ---------------------------------------------------------------

    // pula-pula grande / pequeno / medidas
    if (norm.includes("pula_pula") || norm.includes("pula__pula") || norm.includes("pula_pula_3") || norm.includes("pula_pula_2")) {
      return "pula_pula";
    }

    // piscina de bolinhas
    if (
      norm.includes("piscina") ||
      norm.includes("bolinha") ||
      norm.includes("bolinhas")
    ) {
      return "piscina_bolinhas";
    }

    // algodão doce
    if (norm.includes("algodao") || norm.includes("algodao_doce") || norm.includes("algodao__doce") || norm.includes("doce")) {
      return "algodao_doce";
    }

    // pipoca
    if (norm.includes("pipoca")) {
      return "pipoca";
    }

    // toboguinho
    if (norm.includes("toboguinho") || norm.includes("tobo_guinho")) {
      return "toboguinho";
    }

    // tobogã
    if (norm.includes("toboga")) {
      return "toboga";
    }

    // barracas
    if (norm.includes("barraca_dupla") || norm.includes("dupla")) {
      return "barraca_dupla";
    }

    if (norm.includes("barraca_simples") || norm.includes("simples") || norm.includes("barraca")) {
      return "barraca_simples";
    }

    // fallback: retorna norm
    return norm;
  }

  // Conta itens por nome (entrada: array de strings)
  function contarItensLista(itensArray) {
    const counts = {};
    (itensArray || []).forEach(it => {
      const key = String(it || "").trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  // converte listagens que incluem algodao/pipoca para incluir barracas necessárias
  function expandirItensComBarracas(itensArray) {
    const counts = contarItensLista(itensArray);
    const algodao =
      counts["Algodão doce"] || counts["Algodao doce"] || counts["algodao_doce"] ||
      counts["algodao doce"] || counts["algodao"] || 0;

    const pipoca = counts["Pipoca"] || counts["pipoca"] || 0;

    let need_simple = 0;
    let need_dupla = 0;
    const pares = Math.min(algodao, pipoca);
    need_dupla = pares;

    const restante_alg = Math.max(0, algodao - pares);
    const restante_pip = Math.max(0, pipoca - pares);
    need_simple = restante_alg + restante_pip;

    const expanded = [...(itensArray || [])];
    for (let i = 0; i < need_dupla; i++) expanded.push("barraca_dupla");
    for (let i = 0; i < need_simple; i++) expanded.push("barraca_simples");

    return { expandedList: expanded, need_dupla, need_simple };
  }

  // Converte um documento pacote (do Firestore) para lista de nomes de itens (strings).
  // O seu pacote tem campo `itens` que é array de nomes (strings) — conforme você confirmou.
  function pacoteToItens(pacoteDoc) {
    if (!pacoteDoc) return [];
    if (Array.isArray(pacoteDoc.itens)) return pacoteDoc.itens.slice();
    if (Array.isArray(pacoteDoc.items)) return pacoatDoc.items.slice();
    return [];
  }

  // Constrói mapa de estoque a partir da coleção `item` no Firestore
  async function buildEstoqueFromFirestore() {
    if (!window.db) return null;
    try {
      const snap = await db.collection("item").get();
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data() || {};
        const nome = data.nome || data.name || "";
        const quantRaw =
          data.quantidade != null ? data.quantidade :
            (data.quant || data.quantity || 0);

        const quant = Number.isFinite(Number(quantRaw)) ? Number(quantRaw) : 0;

        const key = normalizeName(nome);
        map[key] = {
          nomeOriginal: nome,
          quantidade: quant
        };
      });
      return map;
    } catch (err) {
      console.warn("regras_negocio.buildEstoqueFromFirestore erro:", err);
      return null;
    }
  }

  async function carregarItensDoPacotePorId(pacoteId) {
    if (!window.db || !pacoteId) return [];
    try {
      const id = String(pacoteId).replace(/^pacote_/, "");
      const doc = await db.collection("pacotes").doc(id).get();
      if (!doc.exists) return [];
      const data = doc.data() || {};
      return pacoteToItens(data);
    } catch (err) {
      console.error("carregarItensDoPacotePorId:", err);
      return [];
    }
  }

  // ============================================================
  // CHECK DE ESTOQUE (NÃO ALTERADO — APENAS NORMALIZAÇÃO FUNCIONANDO)
  // ============================================================
  async function checkConflitoPorEstoque(requestedItems, existingBookings = [], options = {}) {
    const fetchFromFirestore = options.fetchFromFirestore !== false;

    const { expandedList: reqExpanded } = expandirItensComBarracas(requestedItems);
    const needCounts = contarItensLista(reqExpanded);

    const reservedCounts = {};
    for (const b of existingBookings || []) {
      let arr = [];
      if (Array.isArray(b.itens) && b.itens.length) arr = b.itens;
      else if (Array.isArray(b.pacoteItens) && b.pacoteItens.length) arr = b.pacoteItens;
      else if (b.pacoteId) {
        const pid = String(b.pacoteId).replace(/^pacote_/, "");
        const pacItens = await carregarItensDoPacotePorId(pid);
        arr = pacItens;
      }

      const { expandedList: exp } = expandirItensComBarracas(arr);
      const c = contarItensLista(exp);

      Object.keys(c).forEach(k => {
        reservedCounts[k] = (reservedCounts[k] || 0) + c[k];
      });
    }

    let estoqueMap = null;
    if (fetchFromFirestore && window.db) {
      estoqueMap = await buildEstoqueFromFirestore();
    }

    const problems = [];

    Object.keys(needCounts).forEach(itemName => {
      const need = needCounts[itemName] || 0;

      const norm = normalizeName(itemName);

      let available = null;

      if (estoqueMap && estoqueMap[norm]) {
        available = Number(estoqueMap[norm].quantidade || 0);
      } else if (estoqueMap) {
        const foundKey = Object.keys(estoqueMap)
          .find(k => k === norm || k.includes(norm) || norm.includes(k));

        if (foundKey) available = Number(estoqueMap[foundKey].quantidade || 0);
      }

      if (available == null) {
        available = estoquePadrao[norm] != null ? estoquePadrao[norm] : 0;
      }

      let reserved = 0;

      if (reservedCounts[itemName]) {
        reserved = reservedCounts[itemName];
      } else {
        const rcKey = Object.keys(reservedCounts)
          .find(k => normalizeName(k) === norm);

        if (rcKey) reserved = reservedCounts[rcKey] || 0;
      }

      if ((reserved + need) > available) {
        problems.push({
          item: itemName,
          need,
          reserved,
          available,
          availableRemaining: Math.max(0, available - reserved)
        });
      }
    });

    return {
      ok: problems.length === 0,
      problems,
      needCounts,
      reservedCounts
    };
  }

  // Export
  window.regrasNegocio = {
    estoquePadrao,
    normalizeName,
    contarItensLista,
    expandirItensComBarracas,
    checkConflitoPorEstoque,
    pacoteToItens,
    buildEstoqueFromFirestore,
    carregarItensDoPacotePorId
  };
})();
