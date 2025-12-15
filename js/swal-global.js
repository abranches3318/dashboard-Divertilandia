// ---------- SWEETALERT GLOBAL CONFIG DEFINITIVA ----------
(function setupGlobalSwal() {
  if (!Swal) return; // só se SweetAlert estiver carregado

  // 1. Cria container no document.documentElement (fora do body)
  if (!document.getElementById('swal-global-container')) {
    const container = document.createElement('div');
    container.id = 'swal-global-container';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.zIndex = '2147483647'; // sempre acima de modais
    document.documentElement.appendChild(container); // note: fora do body
  }

  // 2. Sobrescreve Swal.fire globalmente
  const _originalFire = Swal.fire;
  Swal.fire = function(options) {
    options = options || {};
    options.customClass = options.customClass || {};
    options.customClass.popup = 'swal-high-z'; // classe para CSS se quiser customizar

    // força SweetAlert dentro do container global
    options.target = document.getElementById('swal-global-container');
    options.backdrop = true;

    // garante z-index correto ao abrir
    const didOpenOriginal = options.didOpen;
    options.didOpen = function(popup) {
      if (popup) popup.style.zIndex = '2147483647';
      const backdrop = document.querySelector('.swal2-backdrop');
      if (backdrop) backdrop.style.zIndex = '2147483646';
      if (typeof didOpenOriginal === 'function') didOpenOriginal(popup);
    };

    return _originalFire.call(this, options);
  };
})();
