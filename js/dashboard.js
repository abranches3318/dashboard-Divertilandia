// js/dashboard.js
// inicialização do dashboard — autenticação, resumo e carregamento do calendário

// garante que firebase exista
if (typeof firebase === 'undefined') {
  console.error('dashboard.js: firebase não encontrado. Certifique-se que firebase-config.js foi carregado.');
} else {
  // tornar db/auth acessíveis sem redeclarações
  window.db = window.db || (firebase.firestore ? firebase.firestore() : null);
  window.auth = window.auth || (firebase.auth ? firebase.auth() : null);
}

(async function () {
  // segurança: só continuar quando DOM estiver pronto
  document.addEventListener('DOMContentLoaded', () => {
    // fallback: se auth ainda não definido, tentamos ter paciência
    if (!window.auth || !window.db) {
      console.warn('dashboard.js: auth ou db não definidos ainda. Scripts carregados fora de ordem?');
    }

    // variável global de cache
    window.dashboardState = window.dashboardState || { agendamentosCache: [] };

    // onAuthStateChanged
    if (window.auth && typeof window.auth.onAuthStateChanged === 'function') {
      window.auth.onAuthStateChanged(async user => {
        if (!user) {
          // se chegar aqui sem login, redirecionar ao index
          if (!location.pathname.endsWith('index.html')) location.href = 'index.html';
          return;
        }

        // set display user
        const elUser = document.getElementById('user-name');
        if (elUser) elUser.textContent = user.displayName || user.email || 'Usuário';

        // carregar dados de dashboard
        await carregarResumo();
        await carregarCalendario();
      });
    } else {
      // se auth não existir, ainda tentamos carregar (útil em dev)
      carregarResumo();
      carregarCalendario();
    }

    // Helpers públicos
    window.abrirAgendamento = window.abrirAgendamento || function (id) {
      // preferir função do agendamentos.js, caso exista
      if (typeof window.openAgendamentoModal === 'function') return window.openAgendamentoModal(id);
      // senao, tentar navegar para página ver-agendamento (se existir)
      const url = `paginas/ver-agendamento.html?id=${id}`;
      window.open(url, '_blank');
    };

    // Expor função para criar novo agendamento (usada por calendar dateClick)
    window.novoAgendamento = window.novoAgendamento || function (date) {
      // se agendamentos.js implementa novoAgendamento, chama-la
      if (typeof window.abrirModalNovoAgendamento === 'function') {
        return window.abrirModalNovoAgendamento(date);
      }
      // fallback: mostrar swal para criar rápido
      Swal.fire('Novo agendamento', 'Função de criação rápida ainda não disponível.', 'info');
    };
  });

  // ============================
  // CARREGAR RESUMO
  // ============================
  async function carregarResumo() {
    try {
      const db = window.db;
      if (!db) return;

      const hoje = new Date();
      const isoHoje = hoje.toISOString().slice(0,10);

      // contato simples: contar agendamentos no dia (baseado em campo string 'data' ou timestamp)
      const snap = await db.collection('agendamentos').get();
      let countHoje = 0;
      let receitaMes = 0;
      let tarefasPendentes = 0;

      snap.forEach(doc => {
        const d = doc.data();
        const dateStr = d.data?.toDate ? d.data.toDate().toISOString().slice(0,10) : (d.data ? (new Date(d.data).toISOString().slice(0,10)) : null);
        if (dateStr === isoHoje) countHoje++;
      });

      // receita mensal: somar valor_final de agendamentos concluídos do mês corrente
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0, 23,59,59);
      const snapMes = await db.collection('agendamentos').get();
      snapMes.forEach(doc=>{
        const d = doc.data();
        // tenta considerar campo data timestamp ou string
        const dateObj = d.data?.toDate ? d.data.toDate() : (d.data ? new Date(d.data) : null);
        if (!dateObj) return;
        if (dateObj >= inicioMes && dateObj <= fimMes && (d.status === 'concluido' || d.status === 'confirmado')) {
          receitaMes += Number(d.valor_final || d.valor || 0);
        }
      });

      // tarefas pendentes (se coleção existir)
      try {
        const tSnap = await db.collection('tarefas').where('status','==','pendente').get();
        tarefasPendentes = tSnap.size || 0;
      } catch(e){ /* ignore if no collection */ }

      const elHoje = document.getElementById('ag-hoje'); if (elHoje) elHoje.textContent = countHoje;
      const elRec = document.getElementById('receita-mes'); if (elRec) elRec.textContent = 'R$ ' + receitaMes.toFixed(2);
      const elTarefas = document.getElementById('tarefas-pendentes'); if (elTarefas) elTarefas.textContent = tarefasPendentes;
    } catch (err) {
      console.error('Erro ao carregar resumo:', err);
    }
  }

  // ============================
  // CARREGAR CALENDÁRIO: pega agendamentos e chama window.renderCalendar
  // ============================
  async function carregarCalendario() {
    try {
      const db = window.db;
      if (!db) return;
      const snap = await db.collection('agendamentos').get();
      const eventos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      window.dashboardState = window.dashboardState || {};
      window.dashboardState.agendamentosCache = eventos;

      // chamar renderCalendar (calendar.js)
      if (typeof window.renderCalendar === 'function') {
        window.renderCalendar(eventos);
      } else {
        console.warn('dashboard.js: renderCalendar não definido (calendar.js não carregado ou com erro).');
      }
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
    }
  }

})();
