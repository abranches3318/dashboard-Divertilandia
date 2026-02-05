// =====================================================
// INIT FINANCEIRO — CRIA TODAS AS COLEÇÕES NECESSÁRIAS
// EXECUTAR UMA ÚNICA VEZ
// =====================================================

(async function initFinanceiro() {
  if (!firebase || !firebase.firestore) {
    console.error("Firebase não inicializado");
    return;
  }

  const db = firebase.firestore();

  try {

    // -------------------------------------------------
    // 1. CATEGORIAS FINANCEIRAS
    // -------------------------------------------------
    const categorias = [
      { nome: "Aluguel", tipo: "entrada" },
      { nome: "Manutenção", tipo: "saida" },
      { nome: "Marketing", tipo: "saida" },
      { nome: "Transporte", tipo: "saida" },
      { nome: "Monitores", tipo: "saida" },
      { nome: "Outros", tipo: "saida" }
    ];

    for (const cat of categorias) {
      await db.collection("financeiro_categorias").add({
        nome: cat.nome,
        tipo: cat.tipo,
        ativa: true,
        criadoEm: Date.now()
      });
    }

    // -------------------------------------------------
    // 2. DOCUMENTO INICIAL — LANÇAMENTOS
    // -------------------------------------------------
    await db.collection("financeiro_lancamentos").add({
      tipo: "entrada",
      valor: 0,
      categoria: "Inicial",
      origem: "Sistema",
      descricao: "Documento inicial para criar coleção",
      data: new Date().toISOString().slice(0, 10),
      timestamp: Date.now(),
      status: "confirmado"
    });

    // -------------------------------------------------
    // 3. RESUMO FINANCEIRO (MENSAL)
    // -------------------------------------------------
    const hoje = new Date();
    const anoMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;

    await db.collection("financeiro_resumos").doc(anoMes).set({
      periodo: anoMes,
      entradas: 0,
      saidas: 0,
      lucro: 0,
      eventos: 0,
      atualizadoEm: Date.now()
    });

    console.log("✅ FINANCEIRO INICIALIZADO COM SUCESSO");

  } catch (err) {
    console.error("❌ Erro ao inicializar financeiro:", err);
  }
})();
