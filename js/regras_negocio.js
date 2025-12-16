// regras_negocio.js
// ================================
// Regras de negócio para estoque
// Baseado EXCLUSIVAMENTE em itemId
// ================================

(function () {

  /**
   * Converte pacote em lista de itemIds
   * @param {Object} pacote
   * @returns {Array<string>}
   */
  function pacoteToItens(pacote) {
    if (!pacote || !Array.isArray(pacote.itens)) return [];
    return [...pacote.itens];
  }

  /**
   * Checa conflito de estoque de forma assíncrona
   * @param {Array<string>} requestedItems
   * @param {Array<Object>} existingBookings
   * @returns {Promise<{ok: boolean, problems?: Array}>}
   */
  async function checkConflitoPorEstoqueAsync(requestedItems, existingBookings) {
    if (!window.db || !Array.isArray(requestedItems)) {
      return { ok: true };
    }

    // ================================
    // 1. Contar uso atual por itemId
    // ================================
    const usageMap = {};

    existingBookings.forEach(ag => {
      if (!Array.isArray(ag.itens_reservados)) return;

      ag.itens_reservados.forEach(itemId => {
        if (!itemId) return;
        usageMap[itemId] = (usageMap[itemId] || 0) + 1;
      });
    });

    // ================================
    // 2. Adicionar novo pedido
    // ================================
    requestedItems.forEach(itemId => {
      if (!itemId) return;
      usageMap[itemId] = (usageMap[itemId] || 0) + 1;
    });

    // ================================
    // 3. Buscar estoque no Firestore
    // ================================
    const problems = [];

    for (const itemId of Object.keys(usageMap)) {
      try {
        const snap = await window.db.collection("itens").doc(itemId).get();
        if (!snap.exists) continue;

        const data = snap.data();
        const disponivel = Number(data.quantidade || 0);
        const reservado = usageMap[itemId];

        if (reservado > disponivel) {
          problems.push({
            itemId,
            item: data.nome || "Item",
            reservado,
            disponivel
          });
        }

      } catch (err) {
        console.warn("Erro ao verificar estoque do item:", itemId, err);
      }
    }

    if (problems.length > 0) {
      return { ok: false, problems };
    }

    return { ok: true };
  }

  // ================================
  // API pública
  // ================================
  window.regrasNegocio = {
    pacoteToItens,
    checkConflitoPorEstoqueAsync
  };

})();
