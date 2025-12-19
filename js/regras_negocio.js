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
        fimNovoNorm += 1440;
      }

      // ==========================================
      // ACUMULADORES GLOBAIS
      // ==========================================
      let itensComFolga = 0;
      let itensComAlerta = 0;
      let itensComInviavel = 0;
      let itensSemEstoque = 0;

      let itemReferencia = null;
      const totalItens = itensSolicitados.length;

      // ==========================================
      // LOOP POR ITEM (CADA ITEM É INDEPENDENTE)
      // ==========================================
      for (const itemId of itensSolicitados) {

        const snap = await firebase
          .firestore()
          .collection("item")
          .doc(itemId)
          .get();

        if (!snap.exists) {
          itensSemEstoque++;
          itemReferencia = itemId;
          continue;
        }

        const item = snap.data();
        const qtd = Number(item.quantidade || 0);

        if (qtd <= 0) {
          itensSemEstoque++;
          itemReferencia = item.nome || itemId;
          continue;
        }

        // -----------------------------------------
        // Monta linhas de tempo (1 por unidade)
        // -----------------------------------------
        const linhas = Array.from({ length: qtd }, () => []);

        const STATUS_ATIVOS = ["confirmado", "pendente"];

const reservas = existingBookings
  .filter(a => {
    if (currentId && a.id === currentId) return false;

    // 🔒 SOMENTE status ativos bloqueiam estoque
    if (!STATUS_ATIVOS.includes(a.status)) return false;

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

            if (ini !== null && fim !== null && fim <= ini) {
              fim += 1440;
            }

            if (fim < iniNovoNorm - 1440) {
              ini += 1440;
              fim += 1440;
            }

            return { ini, fim };
          })
          .filter(r => r.ini !== null && r.fim !== null);

        // ==========================================
// 🔒 ULTIMO BLOCO: BLOQUEIO GLOBAL POR ITEM (SATURAÇÃO)
// ==========================================

// conta quantas reservas CONFLITANTES existem
let conflitosGlobais = 0;

for (const r of reservas) {
  if (intervalosConflitam(iniNovoNorm, fimNovoNorm, r.ini, r.fim)) {
    conflitosGlobais++;
  }
}

// se já atingiu o estoque total do item, bloqueia
if (conflitosGlobais >= qtd) {
  itensSemEstoque++;
  itemReferencia = item.nome;
  continue; // ⛔ NÃO avalia por unidade
}

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
// Avaliação por unidade (LÓGICA FINAL)
// -----------------------------------------
let existeFolga = false;
let existeAlerta = false;

for (const linha of linhas) {
  let conflita = false;
  let menorDiff = null;

  for (const r of linha) {
    // Sobreposição direta → unidade inviável
    if (intervalosConflitam(iniNovoNorm, fimNovoNorm, r.ini, r.fim)) {
      conflita = true;
      break;
    }

    // Calcula intervalo mínimo
    let diff = null;
    if (fimNovoNorm <= r.ini) diff = r.ini - fimNovoNorm;
    if (iniNovoNorm >= r.fim) diff = iniNovoNorm - r.fim;

    if (diff !== null) {
      menorDiff = menorDiff === null ? diff : Math.min(menorDiff, diff);
    }
  }

  // Unidade inutilizável
  if (conflita) continue;

  // Classificação da unidade
  if (menorDiff === null || menorDiff >= 90) {
    existeFolga = true;
  } else if (menorDiff >= 60) {
    existeAlerta = true;
  }
}

        // -----------------------------------------
// 🔒 NOVA REGRA — CONSUMO DE UNIDADE CRÍTICA
// -----------------------------------------

if (temFolga || temAlerta) {

  let reservasFuturasCriticas = 0;

  for (const r of reservas) {
    // reserva começa depois do novo agendamento
    if (r.ini >= fimNovoNorm) {
      const diff = r.ini - fimNovoNorm;

      // janela logística crítica
      if (diff < 90) {
        reservasFuturasCriticas++;
      }
    }
  }

  // se o futuro já consome todas as unidades
  if (reservasFuturasCriticas >= qtd) {
    temFolga = false;
    temAlerta = false;
    temInviavel = true;
  }
}

// -----------------------------------------
// Consolidação FINAL do item
// -----------------------------------------

if (existeFolga) {
  itensComFolga++;
  continue;
}

if (existeAlerta) {
  itensComAlerta++;
  itemReferencia = item.nome;
  continue;
}

// Nenhuma unidade atende
itensComInviavel++;
itemReferencia = item.nome;

         } 
      
      // ==========================================
      // DECISÃO FINAL GLOBAL
      // ==========================================

      if (itensSemEstoque > 0) {
        return {
          ok: false,
          problems: [{
            item: itemReferencia,
            reason: "ESTOQUE_INDISPONIVEL"
          }]
        };
      }

      if (itensComInviavel > 0) {
        return {
          ok: false,
          problems: [{
            item: itemReferencia,
            reason: "INTERVALO_MENOR_1H"
          }]
        };
      }

      if (
        itensComFolga + itensComAlerta === totalItens &&
        itensComAlerta > 0
      ) {
        return {
          ok: true,
          warning: true,
          warningItem: itemReferencia
        };
      }

      if (itensComFolga === totalItens) {
        return { ok: true };
      }

      return {
        ok: false,
        problems: [{
          item: itemReferencia,
          reason: "ESTOQUE_INDISPONIVEL"
        }]
      };

    } catch (err) {
      console.error("checkConflitoPorEstoqueAsync:", err);
      return { ok: false, error: true };
    }
  };

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
