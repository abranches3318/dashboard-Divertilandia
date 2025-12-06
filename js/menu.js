// js/menu.js - SPA navigation
if (!firebase || !db) console.warn('firebase/db not ready (menu.js)');
const Menu = {
  init() {
    document.querySelectorAll('.menu-item').forEach(el=>{
      el.addEventListener('click',()=> {
        document.querySelectorAll('.menu-item').forEach(m=>m.classList.remove('active'));
        el.classList.add('active');
        const page = el.dataset.page;
        window.loadPage && window.loadPage(page);
      });
    });
    // initial load
    window.loadPage = loadPage;
    loadPage('home');
    // load user info
    firebase.auth().onAuthStateChanged(u=> {
      if (!u) { window.location.href='index.html'; return; }
      document.getElementById('userName').textContent = u.displayName || u.email || 'Admin';
      document.getElementById('userPhoto').src = u.photoURL || ('https://ui-avatars.com/api/?name='+encodeURIComponent(u.displayName||u.email)+'&background=111827&color=fff');
    });
  }
};
function loadPage(page){
  const map = {
    'home':'pages/home.html','items':'pages/items.html','pacotes':'pages/pacotes.html',
    'conversas':'pages/conversas.html','financeiro':'pages/financeiro.html','usuarios':'pages/usuarios.html',
    'notificacoes':'pages/notificacoes.html'
  };
  const file = map[page];
  const target = document.getElementById('pageContent');
  if(!file){ target.innerHTML='<div class="card">Página não encontrada</div>'; return; }
  fetch(file).then(r=>r.text()).then(html=>{ target.innerHTML = html; // load module script if exists
    const mod = 'js/'+(page==='home'?'home':page)+'.js';
    if(!document.querySelector('script[src="'+mod+'"]')){
      const s=document.createElement('script'); s.src=mod; document.body.appendChild(s);
    }
  }).catch(e=>{ target.innerHTML='<div class="card">Erro ao carregar</div>'; console.error(e); });
}
document.addEventListener('DOMContentLoaded', ()=> Menu.init());