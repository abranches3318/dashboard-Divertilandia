// =====================================================
// regras_negocio.js
// Regras de negócio de estoque + logística
// Baseado EXCLUSIVAMENTE em itemId
// COMPATÍVEL com agendamentos.js atual
// =====================================================

(function () {
  "use strict";

  const regrasNegocio = {};

  // -----------------------------------------------------
  // Utils
  // -----------------------------------------------------

  function parseHora(h) {
    if (!h || typeof h !== "string") return null;
    const [hh, mm] = h.split(":").map(n => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  }

  function intervalosConflitam(aIni, aFim, bIni, bFim) {
    return aIni < bFim && bIni < aFim;
  }

  function normalizarArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.map(v => String(v).trim()).filter(Boolean);
  }

  // -----------------------------------------------------
  // Pacote → itens (itemId)
  // -----------------------------------------------------

  regrasNegocio.pacoteToItens = function (pacoteDoc) {
    if (!pacoteDoc || !Array.isArray(pacoteDoc.itens)) return [];
    return normalizarArray(pacoteDoc.itens);
  };

  // -----------------------------------------------------
  // Checagem de conflito por estoque + logística (FINAL)
  // -----------------------------------------------------

  regrasNegocio.checkConflitoPorEstoqueAsync = async function (
    requestedItems,
    existingBookings,
    currentId = null,
    novoHorarioIni,
    novoHorarioFim
  ) {
    try {
      const itensSolicitados = normalizarArray(requestedItems);
      if (!Array.isArray(existingBookings)) return { ok: true };

      const iniNovo = parseHora(novoHorarioIni);
      const fimNovo = parseHora(novoHorarioFim);

      if (iniNovo === null || fimNovo === null) {
  return { ok: false, error: "HORARIO_INVALIDO" };
}

// NORMALIZA AGENDAMENTO QUE CRUZA MEIA-NOITE
let iniNovoNorm = iniNovo;
let fimNovoNorm = fimNovo;

if (fimNovoNorm <= iniNovoNorm) {
  fimNovoNorm += 1440; // +24h
}

      // ==========================================
      // ACUMULADORES GLOBAIS (CORREÇÃO CRÍTICA)
      // ==========================================
      let bloqueio = null;
      let alerta = null;

      // ==========================================
      // LOOP POR ITEM (SEM RETURNS FATAIS)
      // ==========================================
      for (const itemId of itensSolicitados) {
        const snap = await firebase
          .firestore()
          .collection("item")
          .doc(itemId)
          .get();

        if (!snap.exists) {
          temEstoqueIndisponivel = true;
          itemReferencia = itemId;
          continue;
        }

        const item = snap.data();
        const qtd = Number(item.quantidade || 0);

        if (qtd <= 0) {
          temEstoqueIndisponivel = true;
          itemReferencia = item.nome || itemId;
          continue;
        }

        // -----------------------------------------
        // Monta linhas de tempo (1 por unidade)
        // -----------------------------------------
        const linhas = Array.from({ length: qtd }, () => []);

        const reservas = existingBookings
       .filter(a => {
  if (currentId && a.id === currentId) return false;

  const itens = Array.isArray(a.itens_reservados)
    ? a.itens_reservados
    : (typeof a.itens_reservados === "string"
        ? [a.itens_reservados]
        : []);

  return itens.includes(itemId);
})
          .map(a => {
  let ini = parseHora(a.horario);
  let fim = parseHora(a.hora_fim);

  // NORMALIZA AGENDAMENTO QUE CRUZA MEIA-NOITE
  if (ini !== null && fim !== null && fim <= ini) {
    fim += 1440; // +24h
  }

            if (fim < iniNovoNorm - 1440) {
    ini += 1440;
    fim += 1440;
  }

  return { ini, fim };
})
          .filter(r => r.ini !== null && r.fim !== null);

        reservas.sort((a, b) => a.ini - b.ini);

        for (const r of reservas) {
          for (const linha of linhas) {
            if (
              linha.length === 0 ||
              linha[linha.length - 1].fim <= r.ini
            ) {
              linha.push(r);
              break;
            }
          }
        }

        // -----------------------------------------
        // Avaliação por unidade
        // -----------------------------------------
        let existeFolga = false;
        let existeAlerta = false;
        let existeInviavel = false;
        let existeLinhaSemConflito = false;

        for (const linha of linhas) {
          let conflita = false;
          let menorDiff = null;

          for (const r of linha) {
  if (intervalosConflitam(iniNovoNorm, fimNovoNorm, r.ini, r.fim)) {
    conflita = true;
    break;
  }

  let diff = null;
  if (fimNovoNorm <= r.ini) diff = r.ini - fimNovoNorm;
  if (iniNovoNorm >= r.fim) diff = iniNovoNorm - r.fim;

  if (diff !== null) {
    menorDiff = menorDiff === null ? diff : Math.min(menorDiff, diff);
  }
}

          if (!conflita) {
            existeLinhaSemConflito = true;

            if (menorDiff === null || menorDiff >= 90) {
              existeFolga = true;
            } else if (menorDiff >= 60) {
              existeAlerta = true;
            } else {
              existeInviavel = true;
            }
          }
        }

       // -----------------------------------------
// Consolida resultado deste ITEM (CORRIGIDO)
// -----------------------------------------

// ❌ BLOQUEIO ABSOLUTO — este item não pode ser atendido
if (
  !existeLinhaSemConflito || 
  (existeLinhaSemConflito && existeInviavel)
) {
  bloqueio = {
    item: item.nome,
    reason: existeLinhaSemConflito
      ? "INTERVALO_MENOR_1H"
      : "ESTOQUE_INDISPONIVEL"
  };
  break; // NENHUM outro item pode salvar este
}

// ⚠️ ALERTA — só marca se ainda não houver alerta
if (existeAlerta && !alerta) {
  alerta = {
    item: item.nome
  };
}

      // ==========================================
// DECISÃO FINAL GLOBAL (DEFINITIVA — CORRIGIDA)
// ==========================================

// ❌ BLOQUEIO ABSOLUTO (qualquer item)
if (bloqueio) {
  return {
    ok: false,
    problems: [{
      item: bloqueio.item,
      reason: bloqueio.reason
    }]
  };
}

// ⚠️ ALERTA GLOBAL (nenhum item bloqueou)
if (alerta) {
  return {
    ok: true,
    warning: true,
    warningItem: alerta.item
  };
}

// ✔ TODOS os itens OK
return { ok: true };
        
  // -----------------------------------------------------
  // Checagem de duplicidade (inalterada)
  // -----------------------------------------------------

  regrasNegocio.checarDuplicidade = function (existingBookings, formData) {
    if (!Array.isArray(existingBookings)) return false;

    const ini = parseHora(formData.horario);
    if (ini === null) return false;

    return existingBookings.some(ag => {
      if (formData.id && ag.id === formData.id) return false;
      if (ag.data !== formData.data) return false;
      if (!ag.endereco || !formData.endereco) return false;

      const e1 = ag.endereco;
      const e2 = formData.endereco;

      const mesmoEndereco =
        String(e1.rua).trim().toLowerCase() ===
          String(e2.rua).trim().toLowerCase() &&
        String(e1.numero) === String(e2.numero) &&
        String(e1.bairro).trim().toLowerCase() ===
          String(e2.bairro).trim().toLowerCase();

      if (!mesmoEndereco) return false;

      const iniAg = parseHora(ag.horario);
      if (iniAg === null) return false;

      return ini === iniAg;
    });
  };

  // -----------------------------------------------------
  // Export
  // -----------------------------------------------------

  window.regrasNegocio = regrasNegocio;

})();
