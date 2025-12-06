// js financeiro - basic stats
window.modFinance = (function(){
  async function init(){ try{ const snap = await db.collection('orcamentos').where('status','==','confirmado').get(); let total=0; snap.forEach(d=> total+=Number(d.data()?.preco||0)); document.getElementById('fin-receita').textContent=total.toLocaleString('pt-BR',{style:'currency',currency:'BRL'}); }catch(e){console.error(e);} }
  return {init};
})(); document.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ if(document.getElementById('fin-receita')) window.modFinance.init(); },80); });