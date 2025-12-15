// js/swal-global.js

// cria container global para SweetAlert se não existir
(function setupSwalContainer() {
  if (!document.getElementById('swal-root')) {
    const container = document.createElement('div');
    container.id = 'swal-root';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '2147483647'; // acima de tudo
    container.style.pointerEvents = 'none'; // permite clicar nos elementos por trás
    document.body.appendChild(container);
  }
})();

// sobrescreve Swal.fire globalmente para usar o container dedicado
(function overrideSwal() {
  if (!Swal) return;

  const originalFire = Swal.fire;
  Swal.fire = function(options) {
    options = options || {};
    options.target = document.getElementById('swal-root'); // força SweetAlert no container
    options.customClass = options.customClass || {};
    options.customClass.popup = 'swal-high-z';
    options.backdrop = true;

    // garante que interações funcionem dentro do alerta
    const didOpenOriginal = options.didOpen;
    options.didOpen = function(popup) {
      if (popup) popup.style.pointerEvents = 'auto';
      if (typeof didOpenOriginal === 'function') didOpenOriginal(popup);
    };

    return originalFire.call(this, options);
  };
})();
