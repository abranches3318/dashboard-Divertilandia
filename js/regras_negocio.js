// =====================================================
// regras_negocio.js
// Regras de negócio de estoque + logística (CORRETO)
// Baseado EXCLUSIVAMENTE em IDs (itemId)
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
  // Pacote → itens (ARRAY DE itemId)
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
    if (iniNovo === null || fimNovo === null || fimNovo <= iniNovo) {
      return { ok: false, error: "HORARIO_INVALIDO" };
    }

    for (const itemId of itensSolicitados) {
      const snap = await firebase.firestore().collection("item").doc(itemId).get();
      if (!snap.exists) {
        return { ok: false, problems: [{ item: itemId, reason: "ITEM_NAO_EXISTE" }] };
      }

      const item = snap.data();
      const qtd = Number(item.quantidade || 0);
      if (qtd <= 0) {
        return { ok: false, problems: [{ item: item.nome, reason: "SEM_ESTOQUE" }] };
      }

      // -----------------------------------------
      // Monta linhas de tempo (1 por unidade)
      // -----------------------------------------
      const linhas = Array.from({ length: qtd }, () => []);

      const reservas = existingBookings
        .filter(a =>
          (!currentId || a.id !== currentId) &&
          Array.isArray(a.itens_reservados) &&
          a.itens_reservados.includes(itemId)
        )
        .map(a => ({
          ini: parseHora(a.horario),
          fim: parseHora(a.hora_fim)
        }))
        .filter(r => r.ini !== null && r.fim !== null);

      // Distribui reservas nas linhas
      reservas.sort((a, b) => a.ini - b.ini);
      for (const r of reservas) {
        let alocada = false;
        for (const linha of linhas) {
          if (
            linha.length === 0 ||
            linha[linha.length - 1].fim <= r.ini
          ) {
            linha.push(r);
            alocada = true;
            break;
          }
        }
        if (!alocada) {
          // todas ocupadas nesse horário
        }
      }

      // -----------------------------------------
      // Verifica se alguma linha aceita o novo
      // -----------------------------------------
      let menorIntervalo = null;

      for (const linha of linhas) {
        let conflito = false;
        let diff = null;

        for (const r of linha) {
          if (intervalosConflitam(iniNovo, fimNovo, r.ini, r.fim)) {
            conflito = true;
            break;
          }

          if (fimNovo <= r.ini) {
            diff = r.ini - fimNovo;
          }

          if (iniNovo >= r.fim) {
            diff = iniNovo - r.fim;
          }
        }

        if (!conflito) {
          // unidade totalmente livre
          if (diff === null || diff >= 90) {
            return { ok: true };
          }

          if (diff >= 60) {
            menorIntervalo = diff;
          }
        }
      }

      // Se nenhuma unidade aceita o novo agendamento
// precisamos decidir SE é estoque ou logística
if (menorIntervalo !== null) {
  // existe unidade, mas logística curta
  if (menorIntervalo >= 60) {
    return {
      ok: true,
      warning: true,
      warningItem: item.nome
    };
  }

  // logística inviável
  return {
    ok: false,
    problems: [{
      item: item.nome,
      reason: "INTERVALO_MENOR_1H"
    }]
  };
}

// nenhuma unidade livre em nenhum momento → estoque indisponível
return {
  ok: false,
  problems: [{
    item: item.nome,
    reason: "ESTOQUE_INDISPONIVEL"
  }]
};

    }

    return { ok: true };

  } catch (err) {
    console.error(err);
    return { ok: false, error: true };
  }
};
  // -----------------------------------------------------
  // Checagem de duplicidade
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

