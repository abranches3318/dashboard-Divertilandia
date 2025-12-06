// js items module - basic CRUD for collection 'item'
window.modItens = (function(){
  async function openNew(){ const nome = prompt('Nome do item:'); if(!nome)return; await db.collection('item').add({nome, criado_em: firebase.firestore.FieldValue.serverTimestamp(), status:'ativo'}); render(); }
  async function render(){
    const el = document.getElementById('items-list'); if(!el) return; el.innerHTML='Carregando...';
    const snap = await db.collection('item').orderBy('nome').get();
    el.innerHTML=''; snap.forEach(d=>{
      const dt=d.data(); const card=document.createElement('div'); card.className='card'; card.innerHTML=`<strong>${dt.nome}</strong><div class=small>${dt.descricao||''}</div>`; el.appendChild(card);
    });
  }
  window.modItensRender=render;
  return {openNew, render};
})(); document.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ if(document.getElementById('items-list')) window.modItens.render(); },80); });