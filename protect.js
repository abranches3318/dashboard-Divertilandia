// dashboard/js/protect.js

if (localStorage.getItem("auth") !== "ok") {
  window.location.href = "./index.html";
}
