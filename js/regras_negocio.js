// js/regras_negocio.js
// Regras de negócio: inventário básico e verificação de conflitos
// Exporta window.regrasNegocio com funções síncronas e assíncronas.

(function () {
  // Estoque padrão — fallback se Firestore não estiver disponível
  const estoquePadrao = {
    "pula_pula_305": 4,
    "pula_pula_244": 1,
    "toboguinho": 1,
    "toboga": 1,
    "piscina_bolinhas": 2,
    "algodao_doce": 3,
    "pipoca": 3,
    "barraca_simples": 4,
    "barraca_dupla": 1
  };

  // Função que recebe lista de itens (strings) e retorna objeto counts {item: qty}
  function contarItensLista(itensArray) {
    const counts = {};
    (itensArray || []).forEach(it => {
      const key = String(it).trim();
      if (!key) return;
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }

  // Função que converte itens "implícitos" (ex.: selecionar algodao_doce implica barraca)
  // Regras:
  // - cada algodao_doce ou pipoca precisa 1 barraca simples (ou barraca dupla comporta 1 algodao+1pipoca)
  function expandirItensComBarracas(itensArray) {
    const counts = contarItensLista(itensArray);
    // NOTE: espera que os itens sejam enviados como IDs padronizados: 'algodao_doce', 'pipoca'
    const algodao = counts["algodao_doce"] || 0;
    const pipoca = counts["pipoca"] || 0;
    let need_simple = 0;
    let need_dupla = 0;

    // Cada dupla pode cobrir 1 algodao + 1 pipoca
    const pares = Math.min(algodao, pipoca);
    need_dupla = pares;
    const restante_alg = algodao - pares;
    const restante_pip = pipoca - pares;
    need_simple = restante_alg + restante_pip;

    // produce expanded items array (adds barracas)
    const expanded = [...(itensArray || [])];

    for (let i = 0; i < need_dupla; i++) expanded.push("barraca_dupla");
    for (let i = 0; i < need_simple; i++) expanded.push("barraca_simples");

    return {
      expandedList: expanded,
      need_dupla,
      need_simple
    };
  }

  // Função que verifica conflito de estoque de forma síncrona (usa estoque passado)
  function checkConflitoPorEstoqueSync(requestedItems, existingBookings = [], estoque = null) {
    estoque = estoque || estoquePadrao;
    const { expandedList } = expandirItensComBarracas(requestedItems);
    const needCounts = contarItensLista(expandedList);

    const reservedCounts = {};
    existingBookings.forEach(b => {
      const arr = b.itens || b.pacoteItens || [];
      const { expandedList: exp } = expandirItensComBarracas(arr);
      const c = contarItensLista(exp);
      Object.keys(c).forEach(k => {
        reservedCounts[k] = (reservedCounts[k] || 0) + c[k];
      });
    });

    const problems = [];
    Object.keys(needCounts).forEach(item => {
      const need = needCounts[item] || 0;
      const reserved = reservedCounts[item] || 0;
      const available = (estoque && estoque[item] != null) ? estoque[item] : 0;
      if (reserved + need > available) {
        problems.push({
          item,
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

  // Versão assíncrona: tenta construir estoque real a partir da coleção 'item' no Firestore,
  // usando campo `quantidade`. Se não encontrar db, usa estoquePadrao.
  async function checkConflitoPorEstoqueAsync(requestedItems, existingBookings = [], estoqueOverride = null) {
    let estoqueLocal = estoquePadrao;
    try {
      if (estoqueOverride && typeof estoqueOverride === "object") {
        estoqueLocal = estoqueOverride;
      } else if (window.db && window.db.collection) {
        // build estoque from Firestore items collection using doc.id as key and doc.quantidade
        const snap = await window.db.collection("item").get();
        const map = {};
        snap.docs.forEach(d => {
          const data = d.data() || {};
          // prefer explicit quantidade field; fallback to 0
          const q = typeof data.quantidade === "number" ? data.quantidade : (Number(data.quantidade) || 0);
          map[d.id] = q;
        });
        // also merge user-defined default for barracas if present
        estoqueLocal = Object.assign({}, estoquePadrao, map);
      } else {
        estoqueLocal = estoquePadrao;
      }
    } catch (err) {
      console.warn("regras_negocio: falha ao construir estoque do Firestore, usando padrão.", err);
      estoqueLocal = estoquePadrao;
    }

    // Now call sync checker with computed estoqueLocal
    return checkConflitoPorEstoqueSync(requestedItems, existingBookings, estoqueLocal);
  }

  // Função auxilia para resolver itens de um pacote: dado documento pacote (com campo itens array),
  // retorna a lista plana de strings (itens) — protege de variações de nomes de campo.
  function pacoteToItens(pacoteDoc) {
    if (!pacoteDoc) return [];
    if (Array.isArray(pacoteDoc.itens)) return pacoteDoc.itens.slice();
    if (Array.isArray(pacoteDoc.items)) return pacoteDoc.items.slice();
    return [];
  }

  // Exportar
  window.regrasNegocio = {
    estoquePadrao,
    contarItensLista,
    expandirItensComBarracas,
    // manter a função sync para compatibilidade (se você já estiver a usando em outro lugar)
    checkConflitoPorEstoque: checkConflitoPorEstoqueSync,
    // nova função assíncrona que puxa quantidades reais do Firestore quando possível
    checkConflitoPorEstoqueAsync,
    pacoteToItens
  };
})();
