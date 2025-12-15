// ---------- SWEETALERT GLOBAL CONFIGURAÇÃO ----------
(function setupGlobalSwal() {
  if (!Swal) return;

  const _originalFire = Swal.fire;
  Swal.fire = function(options = {}) {
    options.customClass = options.customClass || {};
    options.customClass.popup = 'swal-high-z';

    // força SweetAlert no body, fora de qualquer modal
    options.target = document.body;

    const didOpenOriginal = options.didOpen;
    options.didOpen = function(popup) {
      // garante z-index máximo do popup
      if (popup) {
        popup.style.zIndex = '2147483647';
        popup.style.position = 'fixed';
      }
      // garante z-index máximo do backdrop
      const backdrop = document.querySelector('.swal2-backdrop');
      if (backdrop) backdrop.style.zIndex = '2147483646';

      if (typeof didOpenOriginal === 'function') didOpenOriginal(popup);
    };

    return _originalFire.call(this, options);
  };
})();
