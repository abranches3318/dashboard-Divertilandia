// js/conversas - wiring to realtime admin messaging
window.sendAdminMsg = async function(){
  const txt = document.getElementById('msg-admin').value || '';
  if(!txt) return alert('Digite a mensagem');
  if(!window.selectedConversation) return alert('Selecione uma conversa');
  try{
    await db.collection('conversas').add({ wa_id: window.selectedConversation, texto: txt, origem: 'admin', timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    document.getElementById('msg-admin').value='';
  }catch(e){ alert('Erro: '+e.message); }
};
function initConvs(){
  const list = document.getElementById('lista-conv');
  if(!list) return;
  db.collection('conversas').orderBy('timestamp','desc').limit(200).get().then(snap=>{
    const map=new Map();
    snap.forEach(d=>{ const dt=d.data(); const k=dt.wa_id||'--'; if(!map.has(k)) map.set(k,dt); });
    list.innerHTML=''; map.forEach((v,k)=>{ const el=document.createElement('div'); el.className='card'; el.style.cursor='pointer'; el.textContent=(v.nome||k)+' — '+(v.texto||''); el.onclick=()=>{ window.selectedConversation=k; loadChat(k); }; list.appendChild(el); });
  });
}
async function loadChat(wa){
  const area=document.getElementById('chat-area'); if(!area) return; area.innerHTML='Carregando...';
  const snap = await db.collection('conversas').where('wa_id','==',wa).orderBy('timestamp','asc').get();
  area.innerHTML=''; snap.forEach(d=>{ const dt=d.data(); const div=document.createElement('div'); div.className='card'; div.innerHTML=`<div class="small">${dt.origem}</div><div>${dt.texto}</div>`; area.appendChild(div); });
}
document.addEventListener('DOMContentLoaded',()=>{ setTimeout(()=>{ if(document.getElementById('lista-conv')) initConvs(); },80); });