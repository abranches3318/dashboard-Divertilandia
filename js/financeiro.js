function abrirFinanceiro(secao) {
  document.querySelectorAll('.catalogo-section').forEach(s => {
    s.classList.remove('active');
  });

  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
  });

  document.getElementById(secao).classList.add('active');

  const btnIndex = {
    visao: 0,
    entradas: 1,
    saidas: 2,
    balanco: 3,
    comparativos: 4,
    relatorios: 5
  };

  document.querySelectorAll('.tab-btn')[btnIndex[secao]].classList.add('active');
}
