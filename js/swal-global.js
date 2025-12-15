// js/swal-global.js
(function setupGlobalSwal() {
  if (!Swal) return;

  const _originalFire = Swal.fire;
  Swal.fire = function(options = {}) {
    options.customClass = options.customClass || {};
    options.customClass.popup = 'swal-high-z';
    options.target = document.body; // garante que o popup vai no body

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
