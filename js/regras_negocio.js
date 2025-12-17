// =====================================================
// regras_negocio.js
// Regras de negócio de estoque e conflitos de agendamento
// Baseado EXCLUSIVAMENTE em IDs (itemId)
// Compatível com agendamentos.js atual
// =====================================================

(function () {
  "use strict";

  // Namespace global seguro
  const regrasNegocio = {};

  // -----------------------------------------------------
  // Utils
  // -----------------------------------------------------

  function parseHora(h) {
    // aceita "HH:MM"
    if (!h || typeof h !== "string") return null;
    const [hh, mm] = h.split(":").map(n => parseInt(n, 10));
    if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
    return hh * 60 + mm;
  }

  function intervalosConflitam(aIni, aFim, bIni, bFim) {
    // [aIni, aFim) conflita com [bIni, bFim)
    return aIni < bFim && bIni < aFim;
  }

  function normalizarItensArray(arr) {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter(Boolean)
      .map(v => String(v).trim())
      .filter(v => v.length > 0);
  }

  // -----------------------------------------------------
  // Pacote → itens (sempre retorna ARRAY DE itemId)
  // -----------------------------------------------------

  regrasNegocio.pacoteToItens = function pacoteToItens(pacoteDoc) {
    if (!pacoteDoc) return [];

    // Após migração: pacote.itens = [itemId, itemId]
    if (Array.isArray(pacoteDoc.itens)) {
      return normalizarItensArray(pacoteDoc.itens);
    }

    return [];
  };

  // -----------------------------------------------------
  // Checagem principal de conflito por estoque (ASYNC)
  // -----------------------------------------------------
  // requestedItems: [itemId]
  // existingBookings: docs de agendamentos da MESMA DATA
  // -----------------------------------------------------

  regrasNegocio.checkConflitoPorEstoqueAsync = async function (
    requestedItems,
    existingBookings
  ) {
    try {
      const itensSolicitados = normalizarItensArray(requestedItems);
      if (itensSolicitados.length === 0) {
        return { ok: true };
      }

      if (!Array.isArray(existingBookings) || existingBookings.length === 0) {
        return { ok: true };
      }

      // Agrupa reservas por itemId
      const mapaReservas = {};

      for (const ag of existingBookings) {
        if (!ag || !Array.isArray(ag.itens_reservados)) continue;

        const ini = parseHora(ag.horario);
        const fim = parseHora(ag.hora_fim);
        if (ini === null || fim === null) continue;

        for (const itemId of ag.itens_reservados) {
          if (!mapaReservas[itemId]) mapaReservas[itemId] = [];
          mapaReservas[itemId].push({ ini, fim, ag });
        }
      }

      // Para cada item solicitado, validar estoque
      for (const itemId of itensSolicitados) {
        // busca item no Firestore
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
            problems: [{ item: itemData.nome || itemId, reason: "SEM_ESTOQUE" }]
          };
        }

        const reservas = mapaReservas[itemId] || [];

        // Se não há reservas, ok
        if (reservas.length === 0) continue;

        // Contar conflitos simultâneos
        for (const r of reservas) {
          let simultaneos = 1; // inclui o novo

          for (const r2 of reservas) {
            if (r === r2) continue;
            if (intervalosConflitam(r.ini, r.fim, r2.ini, r2.fim)) {
              simultaneos++;
            }
          }

          if (simultaneos > quantidadeTotal) {
            return {
              ok: false,
              problems: [
                {
                  item: itemData.nome || itemId,
                  reason: "ESTOQUE_INSUFICIENTE",
                  quantidade: quantidadeTotal
                }
              ]
            };
          }
        }
      }

      return { ok: true };
    } catch (err) {
      console.error("checkConflitoPorEstoqueAsync:", err);
      return { ok: false, error: true };
    }
  };

  // -----------------------------------------------------
  // Duplicidade (mesmo endereço + data + horário)
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
  // Exporta no window
  // -----------------------------------------------------

  window.regrasNegocio = regrasNegocio;
})();
