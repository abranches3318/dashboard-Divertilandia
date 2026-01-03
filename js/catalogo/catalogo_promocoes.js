// ============================
// CATÁLOGO — PROMOÇÕES
// ============================
//
// Status possíveis da promoção:
// rascunho | agendada | ativa | pausada | expirada
//

// ---------- STATE LOCAL ----------
let PROMOCAO_EDITANDO_ID = null;
let MENU_PROMOCAO_ATUAL = null;

// ---------- CONTEXTO ----------
const COLECAO_PROMOCOES = "promocoes";

// ============================
// INIT
// ============================

document.addEventListener("DOMContentLoaded", async () => {
  criarMenuPromocao();
  bindEventosPromocoes();

  await carregarPromocoes();
  renderPromocoes();
});

// ============================
// RENDER
// ============================
// Render alinhado ao objeto REAL da promoção:
// - alvos[] como fonte da verdade
// - valorFinal pode ser fixo ou null (variável)
// - não depende de origem ou beneficio fixos
//
function renderPromocoes() {
  const container = document.getElementById("lista-promocoes");
  if (!container) return;

  let html = `
    <div class="itens-header">
      <div></div>
      <div>Promoção</div>
      <div class="col-valor">Valor</div>
      <div class="col-status">Status</div>
      <div></div>
    </div>
  `;

  const promocoes = CATALOGO_STATE.promocoes || [];

  if (!promocoes.length) {
    html += `
      <div class="itens-lista">
        <p style="opacity:.6; padding:15px;">Nenhuma promoção cadastrada.</p>
      </div>
    `;
  } else {
    html += `
      <div class="itens-lista">
        ${promocoes.map(p => `
          <div class="item-row">
            <div class="item-thumb">
              <div class="item-thumb-wrapper">
                <img src="${p.fotos?.[0]?.url || "../img/imageplaceholder.jpg"}">
              </div>
            </div>

            <div class="item-info">
              <div class="item-nome">${p.nome}</div>
              <div class="item-quantidade">
                ${p.alvos?.length || 0} alvo(s) · até ${formatarData(p.periodo.fim)}
              </div>
            </div>

            <div class="item-valor">
              ${p.valorFinal !== null
                ? `R$ ${Number(p.valorFinal).toFixed(2)}`
                : "Variável"}
            </div>

            <div class="item-status ${p.status}">
              ${p.status}
            </div>

            <button class="item-acoes" onclick="abrirMenuPromocao(event,'${p.id}')">⋮</button>
          </div>
        `).join("")}
      </div>
    `;
  }

  container.innerHTML = html;
}

// ============================
// MENU FLUTUANTE
// ============================

function criarMenuPromocao() {
  if (document.getElementById("menu-promocao-flutuante")) return;

  const menu = document.createElement("div");
  menu.id = "menu-promocao-flutuante";
  menu.className = "menu-acoes";
  menu.style.display = "none";
  menu.innerHTML = `
    <button onclick="editarPromocao()">✏️ Editar</button>
    <button class="excluir" onclick="excluirPromocao()">🗑️ Excluir</button>
  `;

  document.body.appendChild(menu);

  document.addEventListener("click", () => {
    menu.style.display = "none";
    MENU_PROMOCAO_ATUAL = null;
  });
}

function abrirMenuPromocao(e, id) {
  e.stopPropagation();
  MENU_PROMOCAO_ATUAL = id;

  const menu = document.getElementById("menu-promocao-flutuante");
  const rect = e.target.getBoundingClientRect();

  menu.style.top = `${rect.bottom + window.scrollY + 6}px`;
  menu.style.left = `${rect.right - 160}px`;
  menu.style.display = "block";
}

// ============================
// MODAL
// ============================

function abrirModalNovaPromocao() {
  PROMOCAO_EDITANDO_ID = null;

  limparContextoModal();
  prepararModalPacote();

  document.getElementById("modal-item-titulo").textContent = "Nova Promoção";

  setValorSeguro("item-nome", "");
  setValorSeguro("item-preco", "");
  setValorSeguro("item-descricao", "");
  setValorSeguro("item-status", "ativo");

  // Promoção não usa quantidade
  document.getElementById("item-quantidade")
    ?.parentElement
    ?.style.setProperty("display", "none");

  montarBlocosPromocao();

  document.getElementById("modal-item").classList.add("active");
}

function editarPromocao() {
  const promo = CATALOGO_STATE.promocoes.find(
    p => p.id === MENU_PROMOCAO_ATUAL
  );
  if (!promo) return;

  // -----------------------------
  // CONTEXTO DE EDIÇÃO
  // -----------------------------
  PROMOCAO_EDITANDO_ID = promo.id;

  // -----------------------------
  // REIDRATA STATE DA PROMOÇÃO
  // FONTE DA VERDADE PARA SALVAR
  // -----------------------------
  CATALOGO_STATE.promocaoAplicacao = {
    modo: "manual",
    tipo: promo.aplicacao?.tipo || null,
    selecionados: Array.isArray(promo.alvos)
      ? promo.alvos.map(a => ({
          tipo: a.tipo,
          id: a.id,
          nome: a.nome,
          valorOriginal: a.valorOriginal
        }))
      : []
  };

  // -----------------------------
  // PREPARA MODAL
  // -----------------------------
  limparContextoModal();
  prepararModalPacote();

  document.getElementById("modal-item-titulo").textContent =
    "Editar Promoção";

  // -----------------------------
  // CAMPOS PRINCIPAIS
  // -----------------------------
  setValorSeguro("item-nome", promo.nome);
  setValorSeguro("item-preco", promo.valorFinal ?? "");
  setValorSeguro("item-descricao", promo.descricao);
  setValorSeguro("item-status", promo.status);

  // -----------------------------
  // BLOCOS DINÂMICOS
  // -----------------------------
  montarBlocosPromocao(promo);

  // -----------------------------
  // ABRE MODAL
  // -----------------------------
  document.getElementById("modal-item").classList.add("active");
}

// ============================
// BLOCOS DINÂMICOS DO MODAL
// ============================

function montarBlocosPromocao(dados = {}) {
  removerBlocosPromocao();

  const ref = document.getElementById("grupo-descricao");
  if (!ref) return;

  ref.after(criarBlocoPeriodo(dados));
  ref.after(criarBlocoOrigem(dados));
}

function removerBlocosPromocao() {
  document.getElementById("promo-origem-bloco")?.remove();
  document.getElementById("promo-periodo-bloco")?.remove();
}

// =====================================================
// BLOCO: APLICAÇÃO / ORIGEM DA PROMOÇÃO (ALINHADO)
// =====================================================

function criarBlocoOrigem(dados = {}) {
  const div = document.createElement("div");
  div.id = "promo-origem-bloco";
  div.className = "form-group full";

  div.innerHTML = `
    <label>Aplicar promoção em *</label>

    <select id="promo-origem-tipo">
      <option value="">Selecione</option>
      <option value="item">Itens</option>
      <option value="pacote">Pacotes</option>
    </select>

    <div
      id="promo-origem-lista"
      class="grid-botoes"
      style="margin-top:10px"
    ></div>
  `;

  const select = div.querySelector("#promo-origem-tipo");

  // restaura seleção ao editar
  if (dados?.alvos?.length) {
    const tipoInicial = dados.alvos[0].tipo;
    select.value = tipoInicial;
    montarListaOrigem(tipoInicial, dados.alvos);
  }

  select.onchange = () => {
    montarListaOrigem(select.value);
  };

  return div;
}


// -----------------------------------------------------
// Monta lista de itens ou pacotes para seleção múltipla
// -----------------------------------------------------
function montarListaOrigem(tipo, alvosExistentes = []) {
  const lista = document.getElementById("promo-origem-lista");
  if (!lista) return;

  lista.innerHTML = "";

  if (!tipo) return;

  const origem =
    tipo === "item"
      ? CATALOGO_STATE.itens
      : CATALOGO_STATE.pacotes;

  origem.forEach(reg => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-dark btn-sm";
    btn.textContent = reg.nome;

    // verifica se já está selecionado
    const jaSelecionado = CATALOGO_STATE.promocaoAplicacao.selecionados
      .some(s => s.id === reg.id);

    if (jaSelecionado) {
      btn.classList.add("ativo");
    }

    btn.onclick = () => {
      alternarRegistroPromocao(tipo, reg);
      btn.classList.toggle("ativo");
    };

    lista.appendChild(btn);
  });
}


// -----------------------------------------------------
// Alterna inclusão / remoção de item ou pacote
// -----------------------------------------------------
function alternarRegistroPromocao(tipo, reg) {
  const selecionados = CATALOGO_STATE.promocaoAplicacao.selecionados;

  const index = selecionados.findIndex(s => s.id === reg.id);

  if (index >= 0) {
    // remove da promoção
    selecionados.splice(index, 1);
  } else {
    // adiciona à promoção
    selecionados.push({
      tipo,
      id: reg.id,
      nome: reg.nome,
      valorOriginal: reg.valor
    });
  }

  atualizarBloqueioPreco();
  atualizarPreviewImpacto();
}


// =====================================================
// BLOCO PERÍODO (INALTERADO – COMPATÍVEL)
// =====================================================
function criarBlocoPeriodo(dados) {
  const div = document.createElement("div");
  div.id = "promo-periodo-bloco";
  div.className = "form-group full";

  div.innerHTML = `
    <label>Período da promoção</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <input type="date" id="promo-inicio" value="${dados.periodo?.inicio || ""}">
      <input type="date" id="promo-fim" value="${dados.periodo?.fim || ""}">
    </div>
  `;

  return div;
}


// =====================================================
// EXCLUIR PROMOÇÃO (INALTERADO)
// =====================================================
async function excluirPromocao() {
  if (!MENU_PROMOCAO_ATUAL) return;

  const { isConfirmed } = await Swal.fire({
    title: "Excluir promoção?",
    icon: "warning",
    showCancelButton: true
  });

  if (!isConfirmed) return;

  await db
    .collection(COLECAO_PROMOCOES)
    .doc(MENU_PROMOCAO_ATUAL)
    .delete();

  await carregarPromocoes();
  renderPromocoes();

  Swal.fire("Sucesso", "Promoção excluída.", "success");
}


// =====================================================
// CONFLITO PROMOCIONAL (MANTIDO)
// =====================================================
function existeConflitoPromocional(registro, promocaoAtual, promocoesAtivas) {
  return promocoesAtivas.some(p => {
    // desconto não acumula com desconto
    if (
      p.tipoImpacto === "desconto" &&
      promocaoAtual.tipoImpacto === "desconto"
    ) {
      return true;
    }

    // valor fixo não acumula
    if (
      p.tipo === "valor_fixo" &&
      promocaoAtual.tipo !== "diaria"
    ) {
      return true;
    }

    return false;
  });
}


// =====================================================
// CÁLCULO DE VALOR PROMOCIONAL (MANTIDO)
// =====================================================
function calcularValorPromocional(valorBase, promocao) {
  if (promocao.tipoImpacto === "desconto") {
    return valorBase - (valorBase * (promocao.valor / 100));
  }

  if (promocao.tipo === "valor_fixo") {
    return promocao.valor;
  }

  // Promoção diária não altera valor diretamente
  return valorBase;
}


// -----------------------------------------------------
// APLICA PROMOÇÃO EM UM ÚNICO REGISTRO 
// -----------------------------------------------------
function aplicarPromocaoNoRegistro(registro, promocao, promocoesAtivas) {
  // regra: não acumular desconto
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

    const resultado = aplicarPromocaoNoRegistro(
      registro,
      promocao,
      promocoesAtivas
    );

    if (!resultado.aplicado) return;

    impactos.push({
      id: registro.id,
      nome: registro.nome,
      valorOriginal: resultado.valorOriginal,
      valorFinal: resultado.valorFinal,
      economia: resultado.economia
    });

    if (impactos.length > 1) {
      bloqueioPreco = true;
    }
  });

  return {
    registrosImpactados: impactos,
    bloqueioPreco
  };
}


// -----------------------------------------------------
// PREVIEW FINAL DA PROMOÇÃO
// -----------------------------------------------------
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


// -----------------------------------------------------
// UTILITÁRIO: DATA NORMALIZADA
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

  if (inicio < hoje) {
    return { valido: false, mensagem: "Data inicial no passado." };
  }

  if (fim < inicio) {
    return { valido: false, mensagem: "Data final inválida." };
  }

  return { valido: true };
}


// -----------------------------------------------------
// CONFLITO TEMPORAL ENTRE PROMOÇÕES
// -----------------------------------------------------
function periodosConflitam(p1, p2) {
  return (
    normalizarData(p1.inicio) <= normalizarData(p2.fim) &&
    normalizarData(p2.inicio) <= normalizarData(p1.fim)
  );
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
      return {
        valido: false,
        mensagem:
          "Já existe uma promoção de desconto ativa no mesmo período."
      };
    }
  }

  return { valido: true };
}


// -----------------------------------------------------
// VALIDAÇÃO FINAL ANTES DE SALVAR
// -----------------------------------------------------
function validarPromocaoAntesDeSalvar({
  promocao,
  promocoesExistentes
}) {
  const periodo = validarPeriodoPromocao(promocao.periodo);
  if (!periodo.valido) {
    Swal.fire("Erro", periodo.mensagem, "error");
    return false;
  }

  const conflito = validarConflitosTemporais({
    promocaoNova: promocao,
    promocoesExistentes
  });

  if (!conflito.valido) {
    Swal.fire("Conflito", conflito.mensagem, "error");
    return false;
  }

  return true;
}

// -----------------------------------------------------
// STATE AUXILIAR DO MODAL
// -----------------------------------------------------
CATALOGO_STATE.promocaoAplicacao = {
  modo: "manual", // "manual" | "todos"
  tipo: null,     // "item" | "pacote" | "ambos"
  selecionados: [] // [{ tipo, id, nome, valorOriginal }]
};


// -----------------------------------------------------
// BLOCO PRINCIPAL DE APLICAÇÃO ******
// -----------------------------------------------------
function criarBlocoAplicacaoPromocao(dados = {}) {
  const div = document.createElement("div");
  div.id = "promo-aplicacao-bloco";
  div.className = "form-group full";

  div.innerHTML = `
    <label>Aplicação da promoção *</label>

    <div style="display:flex; gap:20px; margin-bottom:10px">
      <label>
        <input type="radio" name="promo-aplicar-modo" value="manual" checked>
        Selecionar manualmente
      </label>

      <label>
        <input type="radio" name="promo-aplicar-modo" value="todos">
        Aplicar em todos
      </label>
    </div>

    <div id="promo-aplicacao-opcoes"></div>
    <div id="promo-aplicacao-preview" style="margin-top:10px; opacity:.8"></div>
  `;

  // listeners
  div.querySelectorAll("input[name='promo-aplicar-modo']").forEach(radio => {
    radio.addEventListener("change", e => {

      // RESET CONTROLADO DO ESTADO
      CATALOGO_STATE.promocaoAplicacao.modo = e.target.value;
      CATALOGO_STATE.promocaoAplicacao.tipo = null;
      CATALOGO_STATE.promocaoAplicacao.selecionados = [];

      renderizarOpcoesAplicacao();
    });
  });

  return div;
}


// -----------------------------------------------------
// Renderiza opções conforme modo escolhido
// -----------------------------------------------------
function renderizarOpcoesAplicacao() {
  const container = document.getElementById("promo-aplicacao-opcoes");
  if (!container) return;

  container.innerHTML = "";

  if (CATALOGO_STATE.promocaoAplicacao.modo === "todos") {
    renderizarModoTodos(container);
  } else {
    renderizarModoManual(container);
  }

  atualizarBloqueioPreco();
  atualizarPreviewImpacto();
}


// -----------------------------------------------------
// MODO: APLICAR EM TODOS (COM POSSIBILIDADE DE EXCEÇÃO)
// -----------------------------------------------------
function renderizarModoTodos(container) {
  container.innerHTML = `
    <label>Aplicar em:</label>
    <select id="promo-aplicar-tipo">
      <option value="">Selecione</option>
      <option value="itens">Todos os itens</option>
      <option value="pacotes">Todos os pacotes</option>
      <option value="ambos">Itens e pacotes</option>
    </select>

    <p style="font-size:12px; opacity:.7; margin-top:5px">
      Após aplicar, você poderá remover itens específicos.
    </p>
  `;

  container.querySelector("#promo-aplicar-tipo").onchange = e => {
    const tipo = e.target.value;
    CATALOGO_STATE.promocaoAplicacao.tipo = tipo;

    let selecionados = [];

    if (tipo === "itens" || tipo === "ambos") {
      selecionados.push(
        ...CATALOGO_STATE.itens.map(i => ({
          tipo: "item",
          id: i.id,
          nome: i.nome,
          valorOriginal: i.valor
        }))
      );
    }

    if (tipo === "pacotes" || tipo === "ambos") {
      selecionados.push(
        ...CATALOGO_STATE.pacotes.map(p => ({
          tipo: "pacote",
          id: p.id,
          nome: p.nome,
          valorOriginal: p.valor
        }))
      );
    }

    CATALOGO_STATE.promocaoAplicacao.selecionados = selecionados;
    atualizarBloqueioPreco();
    atualizarPreviewImpacto();
  };
}


// -----------------------------------------------------
// MODO: SELEÇÃO MANUAL (CHECKBOX)
// -----------------------------------------------------
function renderizarModoManual(container) {
  container.innerHTML = `
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px">
      <div>
        <strong>Itens</strong>
        <div id="promo-lista-itens"></div>
      </div>
      <div>
        <strong>Pacotes</strong>
        <div id="promo-lista-pacotes"></div>
      </div>
    </div>
  `;

  montarListaCheckbox("item", CATALOGO_STATE.itens, "promo-lista-itens");
  montarListaCheckbox("pacote", CATALOGO_STATE.pacotes, "promo-lista-pacotes");
}


// -----------------------------------------------------
// Lista checkbox reutilizável (ANTI DUPLICIDADE)
// -----------------------------------------------------
function montarListaCheckbox(tipo, lista, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  lista.forEach(reg => {
    const label = document.createElement("label");
    label.style.display = "block";
    label.style.cursor = "pointer";

    const chk = document.createElement("input");
    chk.type = "checkbox";

    chk.onchange = () => {

      const existe = CATALOGO_STATE.promocaoAplicacao.selecionados.some(
        s => s.id === reg.id && s.tipo === tipo
      );

      if (chk.checked && !existe) {
        CATALOGO_STATE.promocaoAplicacao.selecionados.push({
          tipo,
          id: reg.id,
          nome: reg.nome,
          valorOriginal: reg.valor
        });
      }

      if (!chk.checked) {
        CATALOGO_STATE.promocaoAplicacao.selecionados =
          CATALOGO_STATE.promocaoAplicacao.selecionados.filter(
            s => !(s.id === reg.id && s.tipo === tipo)
          );
      }

      atualizarBloqueioPreco();
      atualizarPreviewImpacto();
    };

    label.appendChild(chk);
    label.append(` ${reg.nome}`);
    container.appendChild(label);
  });
}


// -----------------------------------------------------
// BLOQUEIO AUTOMÁTICO DO CAMPO PREÇO
// -----------------------------------------------------
function atualizarBloqueioPreco() {
  const campoPreco = document.getElementById("item-preco");
  if (!campoPreco) return;

  campoPreco.disabled =
    CATALOGO_STATE.promocaoAplicacao.selecionados.length !== 1;
}


// -----------------------------------------------------
// PREVIEW DE IMPACTO DA PROMOÇÃO
// -----------------------------------------------------
function atualizarPreviewImpacto() {
  const preview = document.getElementById("promo-aplicacao-preview");
  if (!preview) return;

  const total = CATALOGO_STATE.promocaoAplicacao.selecionados.length;

  if (!total) {
    preview.textContent = "Nenhum item ou pacote selecionado.";
    return;
  }

  preview.innerHTML = `
    Promoção será aplicada em <strong>${total}</strong> registro(s).<br>
    Campo de preço ${total === 1 ? "editável" : "bloqueado"}.
  `;
}


// -----------------------------------------------------
// REMOÇÃO POSTERIOR DE REGISTRO DA PROMOÇÃO
// -----------------------------------------------------
function removerRegistroDaPromocao(id, tipo) {
  CATALOGO_STATE.promocaoAplicacao.selecionados =
    CATALOGO_STATE.promocaoAplicacao.selecionados.filter(
      r => !(r.id === id && r.tipo === tipo)
    );

  atualizarPreviewImpacto();
  atualizarBloqueioPreco();
}


// -----------------------------------------------------
// VALIDAÇÕES DE NEGÓCIO (CRIAÇÃO / EDIÇÃO)
// -----------------------------------------------------
function validarPromocaoAntesSalvar() {

  const nome = document.getElementById("item-nome")?.value.trim();
  if (!nome) throw new Error("Informe o nome da promoção.");

  const inicio = document.getElementById("promo-inicio")?.value;
  const fim = document.getElementById("promo-fim")?.value;
  if (!inicio || !fim) throw new Error("Informe o período da promoção.");

  if (fim < inicio) {
    throw new Error("A data final não pode ser menor que a data inicial.");
  }

  if (!CATALOGO_STATE.promocaoAplicacao.selecionados.length) {
    throw new Error("Selecione ao menos um item ou pacote.");
  }
}


// -----------------------------------------------------
// REGRA: NÃO ACUMULAR DESCONTOS ******
// -----------------------------------------------------
function validarConflitoPromocoes() {

  const selecionados = CATALOGO_STATE.promocaoAplicacao.selecionados;

  selecionados.forEach(sel => {

    const conflito = CATALOGO_STATE.promocoes.find(p =>
      (p.status === "ativa" || p.status === "agendada") &&
      p.tipoImpacto === "desconto" &&
      p.alvos?.some(a => a.id === sel.id && a.tipo === sel.tipo)
    );

    if (conflito && conflito.id !== PROMOCAO_EDITANDO_ID) {
      throw new Error(
        `O ${sel.tipo} "${sel.nome}" já possui uma promoção de desconto no mesmo período.`
      );
    }
  });
}


// -----------------------------------------------------
// MONTAGEM DO MODELO FINAL DA PROMOÇÃO
// -----------------------------------------------------
function montarObjetoPromocao() {
  const aplicacao = CATALOGO_STATE.promocaoAplicacao || {
    modo: "manual",
    tipo: null,
    selecionados: []
  };

  const selecionados = Array.isArray(aplicacao.selecionados)
    ? aplicacao.selecionados
    : [];

  const valorInput = parseFloat(
    document.getElementById("item-preco")?.value || 0
  );

  const agora = new Date();

  return {
    // ---------------------------------------------
    // Identidade básica
    // ---------------------------------------------
    nome: document.getElementById("item-nome")?.value?.trim() || "",
    descricao: document.getElementById("item-descricao")?.value || "",
    status: document.getElementById("item-status")?.value || "rascunho",

    // ---------------------------------------------
    // Tipo de impacto (NORMALIZADO)
    // desconto | valor_fixo | diaria
    // ---------------------------------------------
    tipoImpacto: "desconto",

    // ---------------------------------------------
    // Período
    // ---------------------------------------------
    periodo: {
      inicio: document.getElementById("promo-inicio")?.value || null,
      fim: document.getElementById("promo-fim")?.value || null
    },

    // ---------------------------------------------
    // Aplicação (controle de escopo)
    // ---------------------------------------------
    aplicacao: {
      modo: aplicacao.modo, // manual | todos
      tipo: aplicacao.tipo  // item | pacote | ambos
    },

    // ---------------------------------------------
    // ALVOS EXPLÍCITOS (FONTE DA VERDADE)
    // Persistimos SEM cálculo final
    // ---------------------------------------------
    alvos: selecionados.map(s => ({
      tipo: s.tipo,
      id: s.id,
      nome: s.nome,
      valorOriginal: s.valorOriginal
    })),

    // ---------------------------------------------
    // Valor persistido
    // Regra:
    // - 1 alvo  → pode salvar valorFinal (preview)
    // - N alvos → runtime calcula (NUNCA persistir)
    // ---------------------------------------------
    valorFinal:
      selecionados.length === 1 && !isNaN(valorInput)
        ? valorInput
        : null,

    // ---------------------------------------------
    // Auditoria
    // ---------------------------------------------
    criadoEm: PROMOCAO_EDITANDO_ID ? undefined : agora,
    atualizadoEm: agora
  };
}


// -----------------------------------------------------
// SALVAR PROMOÇÃO (CREATE / UPDATE)
// -----------------------------------------------------
async function salvarPromocao() {
  try {
    // ---------------------------------------------
    // 1. Validações genéricas (campos, datas, etc)
    // ---------------------------------------------
    validarPromocaoAntesSalvar();
    validarConflitoPromocoes();

    // ---------------------------------------------
    // 2. REGRA CRÍTICA:
    // Promoção MANUAL precisa ter alvos selecionados
    // ---------------------------------------------
    const aplicacao = CATALOGO_STATE.promocaoAplicacao;

    if (
      aplicacao?.modo === "manual" &&
      (!Array.isArray(aplicacao.selecionados) ||
        aplicacao.selecionados.length === 0)
    ) {
      throw new Error(
        "Selecione ao menos um item ou pacote para aplicar a promoção."
      );
    }

    // ---------------------------------------------
    // 3. Monta o objeto FINAL da promoção
    // (fonte única de persistência)
    // ---------------------------------------------
    const dados = montarObjetoPromocao();

    // ---------------------------------------------
    // 4. Salva (create ou update)
    // ---------------------------------------------
    await salvarRegistro({
      colecao: COLECAO_PROMOCOES,
      id: PROMOCAO_EDITANDO_ID,
      dados,
      onSucesso: async id => {

        // -----------------------------------------
        // 5. Upload de imagens (se houver)
        // -----------------------------------------
        if (CATALOGO_STATE.imagensTempPacote?.length) {
          const fotos = await uploadImagensRegistro({
            colecao: COLECAO_PROMOCOES,
            registroId: id
          });

          await db
            .collection(COLECAO_PROMOCOES)
            .doc(id)
            .update({ fotos });
        }

        // -----------------------------------------
        // 6. Atualiza listagem e UI
        // -----------------------------------------
        await carregarPromocoes();
        renderPromocoes();

        Swal.fire(
          "Sucesso",
          "Promoção salva com sucesso.",
          "success"
        );

        fecharModalItem();
      }
    });

  } catch (err) {
    // ---------------------------------------------
    // Tratamento centralizado de erro
    // ---------------------------------------------
    Swal.fire("Erro", err.message, "error");
  }
}

// -----------------------------------------------------
// BUSCA PROMOÇÕES ATIVAS PARA DATA
// -----------------------------------------------------
function obterPromocoesAtivas(dataEvento) {
  return CATALOGO_STATE.promocoes.filter(p => {
    if (p.status !== "ativa") return false;
    if (!p.periodo?.inicio || !p.periodo?.fim) return false;

   const inicio = new Date(p.periodo.inicio);
const fim = new Date(p.periodo.fim);
return dataEvento >= inicio && dataEvento <= fim;
  });
}


// -----------------------------------------------------
// VERIFICA SE PROMOÇÃO APLICA AO ITEM
// -----------------------------------------------------
function promocaoAplicaAoAlvo(promocao, alvo) {
  return promocao.alvos?.some(a =>
    a.tipo === alvo.tipo && a.id === alvo.id
  );
}


// -----------------------------------------------------
// APLICA PROMOÇÕES AO ITEM
// - NÃO acumula descontos
// - Sempre calcula a partir do valor ORIGINAL
// - Não altera o item
// -----------------------------------------------------
function aplicarPromocoesAoItem(item, dataEvento) {

  const promocoesAtivas = obterPromocoesAtivas(dataEvento);

  const valorBase = item.valor;
  let valorFinal = valorBase;

  let descontoAplicado = null;
  let outrasPromocoes = [];

  promocoesAtivas.forEach(promocao => {
    if (!promocaoAplicaAoAlvo(promocao, item)) return;

    // -----------------------------
    // DESCONTO (nunca acumula)
    // -----------------------------
    if (promocao.tipoImpacto === "desconto") {
      if (descontoAplicado) return;

      valorFinal = calcularValorPromocional(valorBase, promocao);
      descontoAplicado = promocao;
      return;
    }

    // -----------------------------
    // OUTROS TIPOS (não alteram valor)
    // -----------------------------
    outrasPromocoes.push(promocao);
  });

  return {
    valorOriginal: valorBase,
    valorFinal,
    descontoAplicado,
    outrasPromocoes
  };
}


// -----------------------------------------------------
// REMOVE ALVO (ITEM OU PACOTE) DA PROMOÇÃO
// -----------------------------------------------------
function removerAlvoDaPromocao(promocaoId, alvoId, alvoTipo) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao) return false;

  promocao.alvos = promocao.alvos.filter(alvo =>
    !(alvo.id === alvoId && alvo.tipo === alvoTipo)
  );

  recalcularPreviewPromocao(promocaoId);
  return true;
}


// -----------------------------------------------------
// ADICIONA ALVO NA PROMOÇÃO (COM VALIDAÇÃO)
// -----------------------------------------------------
function adicionarAlvoNaPromocao(promocaoId, novoAlvo) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao) return false;

  // Evita duplicidade
  const jaExiste = promocao.alvos.some(a =>
    a.id === novoAlvo.id && a.tipo === novoAlvo.tipo
  );
  if (jaExiste) return false;

  // REGRA: não permitir dois DESCONTOS no mesmo item
  if (promocao.tipoImpacto === "desconto") {
    const conflito = existeOutroDescontoAtivo(novoAlvo, promocao.id);
    if (conflito) {
      Swal.fire({
        icon: "warning",
        title: "Conflito de promoção",
        text: "Este item já possui uma promoção de desconto ativa."
      });
      return false;
    }
  }

  promocao.alvos.push(novoAlvo);

  recalcularPreviewPromocao(promocaoId);
  return true;
}


// -----------------------------------------------------
// VERIFICA CONFLITO DE DESCONTO 
// -----------------------------------------------------
function existeOutroDescontoAtivo(alvo, ignorarPromocaoId = null) {

  return CATALOGO_STATE.promocoes.some(promo => {
    if (promo.id === ignorarPromocaoId) return false;
    if (promo.status !== "ativa") return false;
    if (promo.tipoImpacto !== "desconto") return false;

    // protege contra desconto sobre desconto
    return promo.alvos?.some(a =>
      a.id === alvo.id && a.tipo === alvo.tipo
    );
  });
}


// -----------------------------------------------------
// REVALIDA PROMOÇÃO APÓS ALTERAÇÃO
// -----------------------------------------------------
function validarIntegridadePromocao(promocaoId) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao) return false;

  // Promoção manual não pode ficar sem alvos
  if (
    promocao.aplicacao?.modo === "manual" &&
    (!promocao.alvos || promocao.alvos.length === 0)
  ) {
    promocao.status = "rascunho";

    Swal.fire({
      icon: "info",
      title: "Promoção desativada",
      text: "A promoção foi movida para rascunho pois não possui mais itens."
    });
  }

  return true;
}


// -----------------------------------------------------
// REPROCESSA PREVIEW DE IMPACTO
// -----------------------------------------------------
function recalcularPreviewPromocao(promocaoId) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao) return;

  let totalAntes = 0;
  let totalDepois = 0;

  promocao.alvos.forEach(alvo => {
    const item = obterItemOuPacote(alvo);
    if (!item) return;

    totalAntes += item.valor;

    const resultado = aplicarPromocoesAoItem(item, promocao);
  totalDepois += resultado.valorFinal;
  });

  promocao.preview = {
    totalAntes,
    totalDepois,
    economia: totalAntes - totalDepois
  };
}


// -----------------------------------------------------
// OBTÉM ITEM OU PACOTE PELO ID
// -----------------------------------------------------
function obterItemOuPacote(alvo) {

  if (alvo.tipo === "item") {
    return CATALOGO_STATE.itens.find(i => i.id === alvo.id);
  }

  if (alvo.tipo === "pacote") {
    return CATALOGO_STATE.pacotes.find(p => p.id === alvo.id);
  }

  return null;
}


// -----------------------------------------------------
// PROCESSA STATUS DAS PROMOÇÕES
// -----------------------------------------------------
function processarCicloPromocoes() {

  const agora = new Date();

  CATALOGO_STATE.promocoes.forEach(promocao => {

    if (promocao.status === "rascunho") return;

    const inicio = promocao.periodo?.inicio
      ? new Date(promocao.periodo.inicio)
      : null;

    const fim = promocao.periodo?.fim
      ? new Date(promocao.periodo.fim)
      : null;

    if (
      promocao.status === "agendada" &&
      inicio &&
      agora >= inicio
    ) {
      ativarPromocao(promocao.id);
    }

    if (
      promocao.status === "ativa" &&
      fim &&
      agora > fim
    ) {
      expirarPromocao(promocao.id);
    }
  });
}


// -----------------------------------------------------
// ATIVA PROMOÇÃO
// -----------------------------------------------------
function ativarPromocao(promocaoId) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao) return;

  promocao.status = "ativa";
  promocao.dataAtivacao = new Date().toISOString();

  aplicarPromocaoNosAlvos(promocao);
}


// -----------------------------------------------------
// EXPIRA PROMOÇÃO
// -----------------------------------------------------
function expirarPromocao(promocaoId) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao) return;

  promocao.status = "expirada";
  promocao.dataExpiracao = new Date().toISOString();

  removerEfeitoPromocao(promocao);
}


// -----------------------------------------------------
// APLICA PROMOÇÃO NOS ITENS / PACOTES
// -----------------------------------------------------
function aplicarPromocaoNosAlvos(promocao) {

  promocao.alvos.forEach(alvo => {

    const item = obterItemOuPacote(alvo);
    if (!item) return;

    // impede desconto sobre desconto
    if (
      promocao.tipoImpacto === "desconto" &&
      existeOutroDescontoAtivo(alvo, promocao.id)
    ) return;

    item.promocoesAtivas ??= [];

    if (!item.promocoesAtivas.some(p => p.id === promocao.id)) {
      item.promocoesAtivas.push({
        id: promocao.id,
        tipoImpacto: promocao.tipoImpacto
      });
    }
  });

  recalcularCatalogo();
}


// -----------------------------------------------------
// REMOVE EFEITO DA PROMOÇÃO
// -----------------------------------------------------
function removerEfeitoPromocao(promocao) {

  promocao.alvos.forEach(alvo => {

    const item = obterItemOuPacote(alvo);
    if (!item?.promocoesAtivas) return;

    item.promocoesAtivas = item.promocoesAtivas.filter(p =>
      p.id !== promocao.id
    );
  });

  recalcularCatalogo();
}


// -----------------------------------------------------
// PAUSA / RETOMA
// -----------------------------------------------------
function pausarPromocao(promocaoId) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao || promocao.status !== "ativa") return;

  promocao.status = "pausada";
  removerEfeitoPromocao(promocao);
}

function retomarPromocao(promocaoId) {

  const promocao = CATALOGO_STATE.promocoes.find(p => p.id === promocaoId);
  if (!promocao || promocao.status !== "pausada") return;

  promocao.status = "ativa";
  aplicarPromocaoNosAlvos(promocao);
}


// -----------------------------------------------------
// RECÁLCULO GERAL
// -----------------------------------------------------
function recalcularCatalogo() {

  CATALOGO_STATE.itens.forEach(calcularPrecoFinalItem);
  CATALOGO_STATE.pacotes.forEach(calcularPrecoFinalPacote);

  renderCatalogo();
}

// ============================
// EVENTOS
// ============================

function bindEventosPromocoes() {
  document.getElementById("btn-nova-promocao")
    ?.addEventListener("click", abrirModalNovaPromocao);
}
