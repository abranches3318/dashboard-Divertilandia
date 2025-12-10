// js/regras_negocio.js
// Regras de negócio: inventário básico e verificação de conflitos
// Exporta window.regrasNegocio com funções sincronas e assíncronas.

(function () {
  // Estoque atual — conforme você informou:
  // nomes: pula_pula, toboga, toboguinho, piscina_bolinhas, algodao_doce, pipoca, barraca_simples, barraca_dupla
  // quantidade total por item (ajuste conforme seu estoque real ou carregue do DB)
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
  // Implementação: contamos algodao_doce e pipoca, tentamos alocar barracas duplex primeiro, depois simples.
  function expandirItensComBarracas(itensArray) {
    const counts = contarItensLista(itensArray);
    const algodao = counts["algodao_doce"] || 0;
    const pipoca = counts["pipoca"] || 0;
    let need_simple = 0;
    let need_dupla = 0;

    // Cada dupla pode cobrir 1 algodao + 1 pipoca
    const pares = Math.min(algodao, pipoca);
    // use duplas quando for mais eficiente (preferir dupla quando disponível)
    // but we don't know available stock here; this function just suggests required barracas
    // strategy: allocate as many duplas quanto o número de pares
    need_dupla = pares;
    // restantes cobertos por simples
    const restante_alg = algodao - pares;
    const restante_pip = pipoca - pares;
    need_simple = restante_alg + restante_pip;

    // produce expanded items array (adds barracas)
    const expanded = [...(itensArray || [])];

    // add dupla then simples
    for (let i = 0; i < need_dupla; i++) expanded.push("barraca_dupla");
    for (let i = 0; i < need_simple; i++) expanded.push("barraca_simples");

    return {
      expandedList: expanded,
      need_dupla,
      need_simple
    };
  }

  // Verifica se um pedido / agendamento conflita com estoque disponível, considerando
  // já os agendamentos existentes no mesmo período. Essa função NÃO altera DB.
  // Parâmetros:
  // - requestedItems: array de strings (nomes dos itens do pacote + itens explícitos)
  // - existingBookings: lista de agendamentos do mesmo intervalo (cada agendamento tem .itens array OR pacoteId resolved to items)
  // - estoque (opcional): objeto de quantidades
  function checkConflitoPorEstoque(requestedItems, existingBookings = [], estoque = null) {
    estoque = estoque || estoquePadrao;
    // expandir requested com barracas implicitas
    const { expandedList } = expandirItensComBarracas(requestedItems);
    const needCounts = contarItensLista(expandedList);

    // coletar somatório de todos os itens reservados no mesmo período
    const reservedCounts = {};
    existingBookings.forEach(b => {
      // b.itens expected to be array of strings OR b.pacoteItens pre-resolved
      const arr = b.itens || b.pacoteItens || [];
      const { expandedList: exp } = expandirItensComBarracas(arr);
      const c = contarItensLista(exp);
      Object.keys(c).forEach(k => {
        reservedCounts[k] = (reservedCounts[k] || 0) + c[k];
      });
    });

    // agora comparar: for each needed item, reserved + needed <= estoque
    const problems = [];
    Object.keys(needCounts).forEach(item => {
      const need = needCounts[item] || 0;
      const reserved = reservedCounts[item] || 0;
      const available = estoque[item] != null ? estoque[item] : 0;
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

  // Função auxilia para resolver itens de um pacote: dado documento pacote (com campo itens array),
  // retorna a lista plana de strings (itens) — protege de variações de nomes de campo.
  function pacoteToItens(pacoteDoc) {
    if (!pacoteDoc) return [];
    if (Array.isArray(pacoteDoc.itens)) return pacoteDoc.itens.slice();
    // legacy: maybe items stored in pacoteDoc.items
    if (Array.isArray(pacoteDoc.items)) return pacoteDoc.items.slice();
    return [];
  }

  // Exportar
  window.regrasNegocio = {
    estoquePadrao,
    contarItensLista,
    expandirItensComBarracas,
    checkConflitoPorEstoque,
    pacoteToItens
  };
})();
