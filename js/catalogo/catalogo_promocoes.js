function carregarPromocoes() {
  const el = document.getElementById("catalogo-content");
  el.innerHTML = `
    <div class="catalogo-header">
      <h2>Promoções</h2>
      <p>Promoções aplicadas a itens ou pacotes existentes.</p>
    </div>

    <div class="catalogo-lista">
      <p>Nenhuma promoção ativa.</p>
    </div>
  `;
}
