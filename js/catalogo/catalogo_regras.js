// ============================
// REGRAS DE NEGÓCIO — PROMOÇÕES
// ============================

/*
ESTE ARQUIVO:
✔ NÃO mexe em UI
✔ NÃO acessa DOM
✔ OPERA somente sobre dados
✔ REFLETE o modelo REAL salvo no Firestore
*/

/* =====================================================
   UTILITÁRIOS
===================================================== */

function normalizarData(dataStr) {
  const d = new Date(dataStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function hojeNormalizado() {
  const h = new Date();
  h.setHours(0, 0, 0, 0);
  return h;
}

function formatarDataBR(dataStr) {
  if (!dataStr) return "—";

  const d = new Date(dataStr);
  if (isNaN(d)) return "—";

  const dia = String(d.getDate()).padStart(2, "0");
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const ano = d.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

/* =====================================================
   VALIDAÇÃO DE PERÍODO
===================================================== */

function validarPeriodoPromocao(periodo) {
  if (!periodo?.inicio || !periodo?.fim) {
    return {
      valido: false,
      mensagem: "Informe o período da promoção."
    };
  }

  const inicio = normalizarData(periodo.inicio);
  const fim = normalizarData(periodo.fim);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // 🔒 NORMALIZA AQUI

  if (inicio < hoje) {
    return {
      valido: false,
      mensagem: "A data inicial não pode ser anterior ao dia atual."
    };
  }

  if (fim < inicio) {
    return {
      valido: false,
      mensagem: "A data final não pode ser menor que a inicial."
    };
  }

  return { valido: true };
}

/* =====================================================
   EXTRAÇÃO DE ALVOS (MODELO ATUAL)
===================================================== */

function extrairAlvos(promocao) {
  return [
    ...(promocao.aplicacao?.itens || []).map(id => ({
      id,
      tipo: "item"
    })),
    ...(promocao.aplicacao?.pacotes || []).map(id => ({
      id,
      tipo: "pacote"
    }))
  ];
}

/* =====================================================
   CONFLITO TEMPORAL
===================================================== */

function periodosConflitam(p1, p2) {
  return (
    normalizarData(p1.inicio) <= normalizarData(p2.fim) &&
    normalizarData(p2.inicio) <= normalizarData(p1.fim)
  );
}

/* =====================================================
   BLOQUEIO DE EMPILHAMENTO DE DESCONTO
===================================================== */

function validarConflitosDesconto({
  promocaoNova,
  promocoesExistentes
}) {
  if (promocaoNova.tipoImpacto !== "desconto") {
    return { valido: true };
  }

  const novosAlvos = extrairAlvos(promocaoNova);

  for (const promo of promocoesExistentes) {
    if (promo.id === promocaoNova.id) continue;
    if (promo.status !== "ativa") continue;
    if (promo.tipoImpacto !== "desconto") continue;

    if (!periodosConflitam(promo.periodo, promocaoNova.periodo)) {
      continue;
    }

    const alvosExistentes = extrairAlvos(promo);

    const conflito = alvosExistentes.some(a =>
      novosAlvos.some(n =>
        n.id === a.id && n.tipo === a.tipo
      )
    );

    if (conflito) {
      return {
        valido: false,
        mensagem: "Já existe um desconto ativo para este item ou pacote no mesmo período."
      };
    }
  }

  return { valido: true };
}

/* =====================================================
   REGRA: ITEM GRÁTIS ≤ 65% DO PACOTE
===================================================== */

function validarItemGratisComPacote({ itemGratisId, pacotesIds }) {
  const item = CATALOGO_STATE.itens.find(i => i.id === itemGratisId);
  if (!item) {
    return { valido: false, mensagem: "Item grátis inválido." };
  }

  for (const pacoteId of pacotesIds) {
    const pacote = CATALOGO_STATE.pacotes.find(p => p.id === pacoteId);
    if (!pacote) continue;

    const limite = pacote.valor * 0.65;

    if (item.valor > limite) {
      return {
        valido: false,
        mensagem: `O item "${item.nome}" excede 65% do valor do pacote "${pacote.nome}".`
      };
    }
  }

  return { valido: true };
}

/* =====================================================
   REGRA: ITEM GRÁTIS NÃO PODE ESTAR CONTIDO NO PACOTE
===================================================== */

function validarItemGratisNaoContidoNoPacote({
  itemGratisId,
  pacotesIds
}) {
  for (const pacoteId of pacotesIds) {
    const pacote = CATALOGO_STATE.pacotes.find(p => p.id === pacoteId);
    if (!pacote || !Array.isArray(pacote.itens)) continue;

    const contem = pacote.itens.some(
      i => i.itemId === itemGratisId
    );

    if (contem) {
      const item = CATALOGO_STATE.itens.find(i => i.id === itemGratisId);
      return {
        valido: false,
        mensagem: `O pacote "${pacote.nome}" já contém o item "${item?.nome || "selecionado"}".`
      };
    }
  }

  return { valido: true };
}

/* =====================================================
   EXPORTAÇÃO GLOBAL (LEGADO)
===================================================== */

window.validarPeriodoPromocao = validarPeriodoPromocao;
window.validarConflitosDesconto = validarConflitosDesconto;
window.validarItemGratisComPacote = validarItemGratisComPacote;
window.validarItemGratisNaoContidoNoPacote = validarItemGratisNaoContidoNoPacote;
