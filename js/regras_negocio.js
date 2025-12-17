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
  // Pacote → itens
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

      for (const itemId of itensSolicitados) {
        const snap = await firebase.firestore().collection("item").doc(itemId).get();
        if (!snap.exists) {
          return {
            ok: false,
            problems: [{ item: itemId, reason: "ITEM_NAO_EXISTE" }]
          };
        }

        const item = snap.data();
        const qtd = Number(item.quantidade || 0);

        if (qtd <= 0) {
          return {
            ok: false,
            problems: [{ item: item.nome, reason: "SEM_ESTOQUE" }]
          };
        }

        // -----------------------------------------
        // Reservas existentes desse item
        // -----------------------------------------
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

        // 👉 SEM NENHUMA RESERVA NO DIA → estoque livre
        if (reservas.length === 0) {
          continue; // passa para o próximo item
        }

        // -----------------------------------------
        // Monta linhas (1 por unidade física)
        // -----------------------------------------
        const linhas = Array.from({ length: qtd }, () => []);
        reservas.sort((a, b) => a.ini - b.ini);

        for (const r of reservas) {
          for (const linha of linhas) {
            if (linha.length === 0 || linha[linha.length - 1].fim <= r.ini) {
              linha.push(r);
              break;
            }
          }
        }

        // -----------------------------------------
        // Avaliação do novo agendamento
        // -----------------------------------------
        let existeFolga = false;
        let existeAlerta = false;
        let existeInviavel = false;
        let existeLinhaSemConflito = false;

        for (const linha of linhas) {
          let conflita = false;
          let menorDiffLinha = null;

          for (const r of linha) {
            if (intervalosConflitam(iniNovo, fimNovo, r.ini, r.fim)) {
              conflita = true;
              break;
            }

            let diff = null;
            if (fimNovo <= r.ini) diff = r.ini - fimNovo;
            if (iniNovo >= r.fim) diff = iniNovo - r.fim;

            if (diff !== null) {
              menorDiffLinha =
                menorDiffLinha === null ? diff : Math.min(menorDiffLinha, diff);
            }
          }

          if (!conflita) {
            existeLinhaSemConflito = true;

            if (menorDiffLinha === null || menorDiffLinha >= 90) {
              existeFolga = true;
            } else if (menorDiffLinha >= 60) {
              existeAlerta = true;
            } else {
              existeInviavel = true;
            }
          }
        }

        // -----------------------------------------
        // DECISÃO FINAL (CORRIGIDA DEFINITIVA)
        // -----------------------------------------

        // Existe unidade com folga total
        if (existeFolga) {
          continue;
        }

        // Existe unidade, mas logística curta
        if (existeAlerta) {
          return {
            ok: true,
            warning: true,
            warningItem: item.nome
          };
        }

        // Existe unidade, mas logística inviável
        if (existeLinhaSemConflito && existeInviavel) {
          return {
            ok: false,
            problems: [{
              item: item.nome,
              reason: "INTERVALO_MENOR_1H"
            }]
          };
        }

        // Todas as unidades ocupadas no horário
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
      console.error("checkConflitoPorEstoqueAsync:", err);
      return { ok: false, error: true };
    }
  };

  // -----------------------------------------------------
  // Export
  // -----------------------------------------------------

  window.regrasNegocio = regrasNegocio;

})();

