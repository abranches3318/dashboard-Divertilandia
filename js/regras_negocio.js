// =====================================================
// regras_negocio.js
// Regras de negócio de estoque e conflitos de agendamento
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
    return arr
      .map(v => String(v).trim())
      .filter(v => v.length > 0);
  }

  // -----------------------------------------------------
  // Pacote → itens (ARRAY DE itemId)
  // -----------------------------------------------------

  regrasNegocio.pacoteToItens = function (pacoteDoc) {
    if (!pacoteDoc || !Array.isArray(pacoteDoc.itens)) return [];
    return normalizarArray(pacoteDoc.itens);
  };

  // -----------------------------------------------------
  // Checagem de conflito por estoque + logística
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
      if (itensSolicitados.length === 0) return { ok: true };
      if (!Array.isArray(existingBookings)) return { ok: true };

      const iniNovo = parseHora(novoHorarioIni);
      const fimNovo = parseHora(novoHorarioFim);

      if (iniNovo === null || fimNovo === null) {
        return { ok: false, error: "HORARIO_INVALIDO" };
      }

      // =================================================
      // REGRA LOGÍSTICA (ANTES DO ESTOQUE)
      // =================================================

      let alertaLogistico = false;

      for (const ag of existingBookings) {
        if (currentId && ag.id === currentId) continue;

        const iniAg = parseHora(ag.horario);
        const fimAg = parseHora(ag.hora_fim);
        if (iniAg === null || fimAg === null) continue;

        const diffInicio = Math.abs(iniNovo - fimAg);
        const diffFim = Math.abs(iniAg - fimNovo);

        const menorDiferenca = Math.min(diffInicio, diffFim);

        // < 1h → BLOQUEIA
        if (menorDiferenca < 60) {
          return {
            ok: false,
            problems: [{
              reason: "INTERVALO_MENOR_1H"
            }]
          };
        }

        // >= 1h e < 1h30 → ALERTA
       if (menorDiferenca >= 60 && menorDiferenca <= 90) {
          alertaLogistico = true;
        }
      }

      // =================================================
      // ESTOQUE (LÓGICA ORIGINAL — NÃO ALTERADA)
      // =================================================

      for (const itemId of itensSolicitados) {
        const snap = await firebase
          .firestore()
          .collection("item")
          .doc(itemId)
          .get();

        if (!snap.exists) {
          return {
            ok: false,
            problems: [{ item: itemId, reason: "ITEM_NAO_EXISTE" }]
          };
        }

        const itemData = snap.data();
        const quantidadeTotal = Number(itemData.quantidade || 0);

        if (quantidadeTotal <= 0) {
          return {
            ok: false,
            problems: [{
              item: itemData.nome || itemId,
              reason: "SEM_ESTOQUE"
            }]
          };
        }

        let conflitos = 0;

        for (const ag of existingBookings) {
          if (!Array.isArray(ag.itens_reservados)) continue;
          if (!ag.itens_reservados.includes(itemId)) continue;
          if (currentId && ag.id === currentId) continue;

          const iniAg = parseHora(ag.horario);
          const fimAg = parseHora(ag.hora_fim);
          if (iniAg === null || fimAg === null) continue;

          if (intervalosConflitam(iniNovo, fimNovo, iniAg, fimAg)) {
            conflitos++;
          }
        }

        if (conflitos + 1 > quantidadeTotal) {
          return {
            ok: false,
            problems: [{
              item: itemData.nome || itemId,
              reason: "ESTOQUE_INSUFICIENTE",
              quantidade: quantidadeTotal,
              usados: conflitos
            }]
          };
        }
      }

      // ALERTA LOGÍSTICO (SE APLICÁVEL)
      if (alertaLogistico) {
        return {
          ok: true,
          warning: true
        };
      }

      return { ok: true };

    } catch (err) {
      console.error("checkConflitoPorEstoqueAsync:", err);
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
