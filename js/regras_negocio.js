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
      if (itensSolicitados.length === 0) return { ok: true };
      if (!Array.isArray(existingBookings)) return { ok: true };

      const iniNovo = parseHora(novoHorarioIni);
      const fimNovo = parseHora(novoHorarioFim);

      if (iniNovo === null || fimNovo === null || fimNovo <= iniNovo) {
        return { ok: false, error: "HORARIO_INVALIDO" };
      }

      // =================================================
      // PROCESSA ITEM POR ITEM
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

        // -------------------------------------------------
        // Coleta reservas do item
        // -------------------------------------------------

        const reservas = [];

        for (const ag of existingBookings) {
          if (currentId && ag.id === currentId) continue;
          if (!Array.isArray(ag.itens_reservados)) continue;
          if (!ag.itens_reservados.includes(itemId)) continue;

          const iniAg = parseHora(ag.horario);
          const fimAg = parseHora(ag.hora_fim);
          if (iniAg === null || fimAg === null) continue;

          reservas.push({ ini: iniAg, fim: fimAg });
        }

        // -------------------------------------------------
        // Se não há reservas, está livre
        // -------------------------------------------------

        if (reservas.length === 0) continue;

        // -------------------------------------------------
        // Se ainda há estoque sobrando SEM conflito de horário
        // -------------------------------------------------

        let conflitosHorario = 0;
        for (const r of reservas) {
          if (intervalosConflitam(iniNovo, fimNovo, r.ini, r.fim)) {
            conflitosHorario++;
          }
        }

        if (conflitosHorario < quantidadeTotal) {
          // Ainda existe unidade totalmente livre
          continue;
        }

        // =================================================
        // A PARTIR DAQUI: ESTOQUE TOTALMENTE COMPROMETIDO
        // → APLICA REGRA LOGÍSTICA
        // =================================================

        let melhorIntervalo = null;

        for (const r of reservas) {
          // antes
          if (fimNovo <= r.ini) {
            const diff = r.ini - fimNovo;
            melhorIntervalo =
              melhorIntervalo === null ? diff : Math.min(melhorIntervalo, diff);
          }

          // depois
          if (iniNovo >= r.fim) {
            const diff = iniNovo - r.fim;
            melhorIntervalo =
              melhorIntervalo === null ? diff : Math.min(melhorIntervalo, diff);
          }
        }

        // Nenhuma unidade comporta o agendamento
        if (melhorIntervalo === null) {
          return {
            ok: false,
            problems: [{
              item: itemData.nome || itemId,
              reason: "ESTOQUE_INSUFICIENTE"
            }]
          };
        }

        // < 60 min → BLOQUEIA
        if (melhorIntervalo < 60) {
          return {
            ok: false,
            problems: [{
              item: itemData.nome || itemId,
              reason: "INTERVALO_MENOR_1H"
            }]
          };
        }

        // 60–89 min → ALERTA
        if (melhorIntervalo < 90) {
          return {
            ok: true,
            warning: true
          };
        }

        // ≥ 90 min → OK
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

