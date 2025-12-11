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

  // Normaliza nomes vindos do Firestore para uma chave simples (lower + remove acentos/espacos/pontuação)
  function normalizeName(s) {
    if (!s) return "";
    return String(s).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9]+/g, '_') // non-alphanum => underscore
      .replace(/^_+|_+$/g, '');
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
    const algodao = counts["Algodão doce"] || counts["Algodao doce"] || counts["algodao_doce"] || counts["algodao doce"] || counts["algodao"] || 0;
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
    if (Array.isArray(pacoteDoc.items)) return pacoteDoc.items.slice();
    return [];
  }

  // Constrói mapa de estoque a partir da coleção `item` no Firestore
  // Retorna objeto { normalizedName: { nomeOriginal, quantidade } }
  async function buildEstoqueFromFirestore() {
    if (!window.db) return null;
    try {
      const snap = await db.collection("item").get();
      const map = {};
      snap.docs.forEach(d => {
        const data = d.data() || {};
        const nome = data.nome || data.name || "";
        const quant = Number(data.quantidade != null ? data.quantidade : (data.quant || data.quantity || 0));
        const key = normalizeName(nome);
        map[key] = { nomeOriginal: nome, quantidade: Number.isFinite(quant) ? quant : 0 };
      });
      return map;
    } catch (err) {
      console.warn("regras_negocio.buildEstoqueFromFirestore erro:", err);
      return null;
    }
  }

  // Resolve pacotes por ID usando Firestore (retorna array de nomes)
  async function carregarItensDoPacotePorId(pacoteId) {
    if (!window.db || !pacoteId) return [];
    try {
      const doc = await db.collection("pacotes").doc(pacoteId).get();
      if (!doc.exists) return [];
      const data = doc.data() || {};
      return pacoteToItens(data);
    } catch (err) {
      console.error("carregarItensDoPacotePorId:", err);
      return [];
    }
  }

  // Main: checa conflito de estoque
  // requestedItems: array de strings (nomes)
  // existingBookings: array de objetos { itens: [names] } ou agendamento docs (cada um com .itens ou pacoteId)
  // options:
  //   - fetchFromFirestore: true|false (default true)
  async function checkConflitoPorEstoque(requestedItems, existingBookings = [], options = {}) {
    const fetchFromFirestore = options.fetchFromFirestore !== false;
    // prepare requested expanded
    const { expandedList: reqExpanded } = expandirItensComBarracas(requestedItems);
    const needCounts = contarItensLista(reqExpanded);

    // compute reserved from existingBookings
    const reservedCounts = {};
    for (const b of existingBookings || []) {
      let arr = [];
      if (Array.isArray(b.itens) && b.itens.length) arr = b.itens;
      else if (Array.isArray(b.pacoteItens) && b.pacoteItens.length) arr = b.pacoteItens;
      else if (b.pacoteId) {
        // attempt to resolve package by id (if passed as 'pacote_<id>' or raw id)
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

    // Build estoque map (prefer firestore)
    let estoqueMap = null;
    if (fetchFromFirestore && window.db) {
      estoqueMap = await buildEstoqueFromFirestore(); // may be null on error
    }

    const problems = [];
    // For each needed item, find its available quantity.
    Object.keys(needCounts).forEach(itemName => {
      const need = needCounts[itemName] || 0;
      // try to find in firestore map by normalized name matching strategies
      let available = null;

      // Strategy:
      // 1) try direct normalized match of itemName
      // 2) try some common variants (remove hyphens, spaces)
      const norm = normalizeName(itemName);
      if (estoqueMap && estoqueMap[norm]) {
        available = Number(estoqueMap[norm].quantidade || 0);
      } else if (estoqueMap) {
        // try to find by fuzzy: search keys where normalized contains same words
        const foundKey = Object.keys(estoqueMap).find(k => k === norm || k.includes(norm) || norm.includes(k));
        if (foundKey) available = Number(estoqueMap[foundKey].quantidade || 0);
      }

      // fallback to fallback local estoquePadrao using normalized keys
      if (available == null) {
        const normKey = norm; // normalized
        const fallbackVal = estoquePadrao[normKey] != null ? estoquePadrao[normKey] : 0;
        available = fallbackVal;
      }

      // reserved for that item: try to find reservedCounts keys matching this item (string equality first, else normalized)
      let reserved = 0;
      if (reservedCounts[itemName]) reserved = reservedCounts[itemName];
      else {
        // match by normalized
        const rcKey = Object.keys(reservedCounts).find(k => normalizeName(k) === norm);
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
