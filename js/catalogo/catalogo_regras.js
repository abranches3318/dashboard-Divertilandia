// ============================
// REGRAS DE NEGÓCIO — PROMOÇÕES
// ============================

// -----------------------------------------------------
// CÁLCULO DE VALOR PROMOCIONAL
// -----------------------------------------------------
function calcularValorPromocional(valorBase, promocao) {
  if (promocao.tipoImpacto === "desconto") {
    return valorBase - (valorBase * (promocao.valor / 100));
  }
  if (promocao.tipo === "valor_fixo") {
    return promocao.valor;
  }
  return valorBase;
}

// -----------------------------------------------------
// APLICA PROMOÇÃO EM UM ÚNICO REGISTRO
// -----------------------------------------------------
function aplicarPromocaoNoRegistro(registro, promocao, promocoesAtivas) {
  const jaTemDesconto = promocoesAtivas.some(p =>
    p.tipoImpacto === "desconto" &&
    p.alvos?.some(a => a.id === registro.id)
  );

  if (jaTemDesconto && promocao.tipoImpacto === "desconto") {
    return { aplicado: false, motivo: "Desconto já existente" };
  }

  const valorOriginal = registro.valor;

  const valorFinal =
    promocao.valorFinal !== null
      ? promocao.valorFinal
      : valorOriginal;

  return {
    aplicado: true,
    valorOriginal,
    valorFinal,
    economia: valorOriginal - valorFinal
  };
}

// -----------------------------------------------------
// APLICA PROMOÇÃO EM MÚLTIPLOS REGISTROS
// -----------------------------------------------------
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

// -----------------------------------------------------
// PREVIEW FINAL DA PROMOÇÃO
// -----------------------------------------------------
function gerarPreviewPromocao(promocao, registros, promocoesAtivasPorRegistro) {
  const impacto = aplicarPromocaoEmLote(registros, promocao, promocoesAtivasPorRegistro);

  const totalOriginal = impacto.registrosImpactados.reduce((s, r) => s + r.valorOriginal, 0);
  const totalFinal = impacto.registrosImpactados.reduce((s, r) => s + r.valorFinal, 0);

  return {
    quantidade: impacto.registrosImpactados.length,
    totalOriginal,
    totalFinal,
    economiaTotal: totalOriginal - totalFinal,
    bloqueioPreco: impacto.bloqueioPreco,
    detalhes: impacto.registrosImpactados
  };
}

// -----------------------------------------------------
// NORMALIZA DATA
// -----------------------------------------------------
function normalizarData(dataStr) {
  const d = new Date(dataStr);
  d.setHours(0, 0, 0, 0);
  return d;
}

// -----------------------------------------------------
// VALIDAÇÃO DE PERÍODO
// -----------------------------------------------------
function validarPeriodoPromocao(periodo) {
  if (!periodo?.inicio || !periodo?.fim) {
    return { valido: false, mensagem: "Informe o período da promoção." };
  }

  const hoje = normalizarData(new Date().toISOString().split("T")[0]);
  const inicio = normalizarData(periodo.inicio);
  const fim = normalizarData(periodo.fim);

  if (inicio < hoje) return { valido: false, mensagem: "Data inicial no passado." };
  if (fim < inicio) return { valido: false, mensagem: "Data final inválida." };

  return { valido: true };
}

// -----------------------------------------------------
// CONFLITO TEMPORAL ENTRE PROMOÇÕES
// -----------------------------------------------------
function periodosConflitam(p1, p2) {
  return normalizarData(p1.inicio) <= normalizarData(p2.fim) &&
         normalizarData(p2.inicio) <= normalizarData(p1.fim);
}

// -----------------------------------------------------
// VALIDA CONFLITOS DE DESCONTO
// -----------------------------------------------------
function validarConflitosTemporais({ promocaoNova, promocoesExistentes }) {
  for (const promo of promocoesExistentes) {
    if (promo.id === promocaoNova.id) continue;
    if (promo.tipoImpacto !== "desconto") continue;

    const intersecao = promo.alvos.some(a =>
      promocaoNova.alvos.some(n => n.id === a.id)
    );
    if (!intersecao) continue;

    if (periodosConflitam(promo.periodo, promocaoNova.periodo)) {
      return { valido: false, mensagem: "Já existe uma promoção de desconto ativa no mesmo período." };
    }
  }
  return { valido: true };
}

// -----------------------------------------------------
// VALIDAR INTEGRIDADE DE PROMOÇÃO
// -----------------------------------------------------
function validarIntegridadePromocao(promocao) {
  if (promocao.aplicacao?.modo === "manual" && (!promocao.alvos || promocao.alvos.length === 0)) {
    promocao.status = "rascunho";
    Swal.fire({
      icon: "info",
      title: "Promoção desativada",
      text: "A promoção foi movida para rascunho pois não possui mais itens."
    });
  }
}

// -----------------------------------------------------
// VERIFICA SE EXISTE DESCONTO ATIVO
// -----------------------------------------------------
function existeOutroDescontoAtivo(alvo, ignorarPromocaoId = null) {
  return CATALOGO_STATE.promocoes.some(promo => {
    if (promo.id === ignorarPromocaoId) return false;
    if (promo.status !== "ativa") return false;
    if (promo.tipoImpacto !== "desconto") return false;
    return promo.alvos?.some(a => a.id === alvo.id && a.tipo === alvo.tipo);
  });
}

// -----------------------------------------------------
// APLICA PROMOÇÃO EM UM ITEM (RETORNO PREVIEW)
// -----------------------------------------------------
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
    if (!promocao.alvos?.some(a => a.id === item.id && a.tipo === item.tipo)) return;

    if (promocao.tipoImpacto === "desconto") {
      if (!descontoAplicado) {
        valorFinal = calcularValorPromocional(valorBase, promocao);
        descontoAplicado = promocao;
      }
    } else {
      outrasPromocoes.push(promocao);
    }
  });

  return { valorOriginal: valorBase, valorFinal, descontoAplicado, outrasPromocoes };
}
