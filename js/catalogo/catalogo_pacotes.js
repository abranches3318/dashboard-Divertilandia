function carregarPacotes() {
  const el = document.getElementById("catalogo-content");
  el.innerHTML = `
    <div class="catalogo-header">
      <h2>Pacotes</h2>
      <button class="btn btn-primary">Novo pacote</button>
    </div>

    <div class="catalogo-lista">
      <p>Nenhum pacote carregado.</p>
    </div>
  `;
}
