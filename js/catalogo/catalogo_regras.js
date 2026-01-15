// ============================
// REGRAS DE NEGÓCIO — PROMOÇÕES
// ============================

/*
  Este arquivo NÃO contém lógica de interface.
  Apenas regras puras de negócio, reutilizáveis.
*/

/* =====================================================
   CÁLCULO DE VALOR PROMOCIONAL
===================================================== */

function calcularValorPromocional(valorBase, promocao) {
  if (promocao.tipoImpacto === "desconto") {
    if (promocao.impacto?.tipo === "percentual") {
      return valorBase - (valorBase * (promocao.impacto.valor / 100));
    }

    if (promocao.impacto?.tipo === "fixo") {
      return Math.max(0, valorBase - promocao.impacto.valor);
    }
  }

  if (promocao.tipoImpacto === "horas_extras") {
    if (promocao.impacto?.valorFinal != null) {
      return promocao.impacto.valorFinal;
    }
  }

  return valorBase;
}

/* =====================================================
   APLICA PROMOÇÃO EM UM ÚNICO REGISTRO
===================================================== */

function aplicarPromocaoNoRegistro(registro, promocao, promocoesAtivas) {
  const jaTemDesconto = promocoesAtivas.some(p =>
    p.tipoImpacto === "desconto" &&
    p.aplicacao?.alvos?.some(a => a.id === registro.id)
  );

  if (jaTemDesconto && promocao.tipoImpacto === "desconto") {
    return { aplicado: false, motivo: "Desconto já existente" };
  }

  const valorOriginal = registro.valor;
  const valorFinal = calcularValorPromocional(valorOriginal, promocao);

  return {
    aplicado: true,
    valorOriginal,
    valorFinal,
    economia: valorOriginal - valorFinal
  };
}

/* =====================================================
   APLICA PROMOÇÃO EM LOTE
===================================================== */

function aplicarPromocaoEmLote(registros, promocao, promocoesAtivasPorRegistro) {
  const impactos = [];
  let bloqueioPreco = false;

  registros.forEach(registro => {
    const promocoesAtivas = promocoesAtivasPorRegistro[registro.id] || [];
    const resultado = aplicarPromocaoNoRegistro(registro, promocao, promocoesAtivas);

    if (!resultado.aplicado) return;

    impactos.push({
      id: registro.id,
      nome: registro.nome,
      valorOriginal: resultado.valorOriginal,
      valorFinal: resultado.valorFinal,
      economia: resultado.economia
    });

    if (impactos.length > 1) bloqueioPreco = true;
  });

  return { registrosImpactados: impactos, bloqueioPreco };
}

/* =====================================================
   PREVIEW FINAL DA PROMOÇÃO
===================================================== */

function gerarPreviewPromocao(promocao, registros, promocoesAtivasPorRegistro) {
  const impacto = aplicarPromocaoEmLote(
    registros,
    promocao,
    promocoesAtivasPorRegistro
  );

  const totalOriginal = impacto.registrosImpactados.reduce(
    (s, r) => s + r.valorOriginal, 0
  );

  const totalFinal = impacto.registrosImpactados.reduce(
    (s, r) => s + r.valorFinal, 0
  );

  return {
    quantidade: impacto.registrosImpactados.length,
    totalOriginal,
    totalFinal,
    economiaTotal: totalOriginal - totalFinal,
    bloqueioPreco: impacto.bloqueioPreco,
    detalhes: impacto.registrosImpactados
  };
}

/* =====================================================
   DATAS
===================================================== */

function normalizarData(dataStr) {
  const d = new Date(dataStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

function validarPeriodoPromocao(periodo) {
  if (!periodo?.inicio || !periodo?.fim) {
    return { valido: false, mensagem: "Período inválido." };
  }

  const hoje = normalizarData(new Date().toISOString().split("T")[0]);
  const inicio = normalizarData(periodo.inicio);
  const fim = normalizarData(periodo.fim);

  if (inicio < hoje) {
    return { valido: false, mensagem: "Data inicial no passado." };
  }

  if (fim < inicio) {
    return { valido: false, mensagem: "Data final inválida." };
  }

  return { valido: true };
}

function periodosConflitam(p1, p2) {
  return (
    normalizarData(p1.inicio) <= normalizarData(p2.fim) &&
    normalizarData(p2.inicio) <= normalizarData(p1.fim)
  );
}

/* =====================================================
   CONFLITO DE DESCONTOS
===================================================== */

function validarConflitosTemporais({ promocaoNova, promocoesExistentes }) {
  for (const promo of promocoesExistentes) {
    if (promo.id === promocaoNova.id) continue;
    if (promo.tipoImpacto !== "desconto") continue;

    const intersecao = promo.aplicacao?.alvos?.some(a =>
      promocaoNova.aplicacao?.alvos?.some(n => n.id === a.id)
    );

    if (!intersecao) continue;

    if (periodosConflitam(promo.periodo, promocaoNova.periodo)) {
      return {
        valido: false,
        mensagem: "Já existe um desconto ativo no mesmo período."
      };
    }
  }

  return { valido: true };
}

/* =====================================================
   REGRA — ITEM GRÁTIS × PACOTE
===================================================== */

/*
  - Item grátis NÃO pode pertencer a um pacote selecionado
  - Item grátis ≤ 65% do valor do pacote
*/

function validarItemGratisComPacote({ itemGratisId, pacotesIds }) {
  const item = CATALOGO_STATE.itens.find(i => i.id === itemGratisId);
  if (!item) {
    return { valido: false, mensagem: "Item grátis inválido." };
  }

  for (const pacoteId of pacotesIds) {
    const pacote = CATALOGO_STATE.pacotes.find(p => p.id === pacoteId);
    if (!pacote) continue;

    // 🔒 Não pode conter o item
    const contemItem = pacote.itens?.some(i => i.id === item.id);
    if (contemItem) {
      return {
        valido: false,
        mensagem: `O pacote "${pacote.nome}" já contém o item "${item.nome}".`
      };
    }

    // 🔒 Regra dos 65%
    if (item.valor > pacote.valor * 0.65) {
      return {
        valido: false,
        mensagem: `O item grátis "${item.nome}" excede 65% do valor do pacote "${pacote.nome}".`
      };
    }
  }

  return { valido: true };
}

/* =====================================================
   APLICA PROMOÇÕES A UM ITEM (PREVIEW)
===================================================== */

function aplicarPromocoesAoItem(item, dataEvento) {
  const promocoesAtivas = CATALOGO_STATE.promocoes.filter(p => {
    if (p.status !== "ativa") return false;
    if (!p.periodo?.inicio || !p.periodo?.fim) return false;

    const inicio = new Date(p.periodo.inicio);
    const fim = new Date(p.periodo.fim);

    return dataEvento >= inicio && dataEvento <= fim;
  });

  let valorBase = item.valor;
  let valorFinal = valorBase;
  let descontoAplicado = null;
  const outrasPromocoes = [];

  promocoesAtivas.forEach(promocao => {
    const aplica =
      promocao.aplicacao?.itens?.includes(item.id) ||
      promocao.aplicacao?.pacotes?.includes(item.pacoteId);

    if (!aplica) return;

    if (promocao.tipoImpacto === "desconto" && !descontoAplicado) {
      valorFinal = calcularValorPromocional(valorBase, promocao);
      descontoAplicado = promocao;
    } else {
      outrasPromocoes.push(promocao);
    }
  });

  return {
    valorOriginal: valorBase,
    valorFinal,
    descontoAplicado,
    outrasPromocoes
  };
}
