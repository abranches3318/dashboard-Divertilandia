// =====================================================
// regras_negocio.js
// Regras de negócio de estoque + logística por UNIDADE
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
  // Pacote → itens
  // -----------------------------------------------------

  regrasNegocio.pacoteToItens = function (pacoteDoc) {
    if (!pacoteDoc || !Array.isArray(pacoteDoc.itens)) return [];
    return normalizarArray(pacoteDoc.itens);
  };

  // -----------------------------------------------------
  // Estoque + Logística (POR UNIDADE)
  // -----------------------------------------------------
  // requestedItems: [itemId]
  // existingBookings: agendamentos da mesma data
  // currentId: id do agendamento sendo editado (ou null)
  // novoHorarioIni / novoHorarioFim: "HH:MM"
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

      let alertaLogistico = false;

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

        // =================================================
        // 1️⃣ CONFLITO DE ESTOQUE (SIMULTANEIDADE)
        // =================================================

        let conflitosSimultaneos = 0;

        for (const ag of existingBookings) {
          if (!Array.isArray(ag.itens_reservados)) continue;
          if (!ag.itens_reservados.includes(itemId)) continue;
          if (currentId && ag.id === currentId) continue;

          const iniAg = parseHora(ag.horario);
          const fimAg = parseHora(ag.hora_fim);
          if (iniAg === null || fimAg === null) continue;

          if (intervalosConflitam(iniNovo, fimNovo, iniAg, fimAg)) {
            conflitosSimultaneos++;
          }
        }

        if (conflitosSimultaneos + 1 > quantidadeTotal) {
          return {
            ok: false,
            problems: [{
              item: itemData.nome || itemId,
              reason: "ESTOQUE_INSUFICIENTE",
              quantidade: quantidadeTotal
            }]
          };
        }

        // =================================================
        // 2️⃣ LOGÍSTICA POR UNIDADE
        // =================================================
        // Cada unidade só pode ser reutilizada após
        // (hora_fim + 60 minutos)
        // =================================================

        const disponibilidades = [];

        for (const ag of existingBookings) {
          if (!Array.isArray(ag.itens_reservados)) continue;
          if (!ag.itens_reservados.includes(itemId)) continue;
          if (currentId && ag.id === currentId) continue;

          const fimAg = parseHora(ag.hora_fim);
          if (fimAg === null) continue;

          // +60 min logística
          disponibilidades.push(fimAg + 60);
        }

        // Se há menos reservas que estoque,
        // existem unidades livres desde o início do dia
        while (disponibilidades.length < quantidadeTotal) {
          disponibilidades.push(0);
        }

        disponibilidades.sort((a, b) => a - b);

        const primeiraDisponivel = disponibilidades[0];
        const diff = iniNovo - primeiraDisponivel;

        // ❌ BLOQUEIA
        if (diff < 60) {
          return {
            ok: false,
            problems: [{
              item: itemData.nome || itemId,
              reason: "INTERVALO_MENOR_1H"
            }]
          };
        }

        // ⚠️ ALERTA
        if (diff >= 60 && diff < 90) {
          alertaLogistico = true;
        }
      }

      // =================================================
      // RESULTADO FINAL
      // =================================================

      if (alertaLogistico) {
        return { ok: true, warning: true };
      }

      return { ok: true };

    } catch (err) {
      console.error("checkConflitoPorEstoqueAsync:", err);
      return { ok: false, error: true };
    }
  };

  // -----------------------------------------------------
  // Duplicidade (endereço + data + horário)
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
