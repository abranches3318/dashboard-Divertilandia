// js users - list users
async function loadUsers(){
  const el = document.getElementById('users-list'); if(!el) return; el.innerHTML='Carregando...';
  const snap = await db.collection('users').orderBy('criado_em','desc').get();
  el.innerHTML=''; snap.forEach(d=>{ const dt=d.data(); const div=document.createElement('div'); div.className='card'; div.innerHTML=`<strong>${dt.nome||dt.email}</strong><div class="small">role: ${dt.role||'—'} — approved: ${dt.approved}</div>`; el.appendChild(div); });
}
document.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ if(document.getElementById('users-list')) loadUsers(); },80); });