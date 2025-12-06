// js/notifications.js - simple notifications handler
function openNotifications(){ loadPage('notificacoes'); }
function updateNotifBadge(count){
  const badge = document.getElementById('notifBadge');
  if(!badge) return;
  if(count>0){ badge.style.display='inline-block'; badge.textContent = count>99?'99+':String(count); }
  else badge.style.display='none';
}
firebase && firebase.auth && firebase.auth().onAuthStateChanged(u=>{
  if(!u) return;
  try{
    const q = db.collection('conversas').where('origem','==','cliente').where('lido_admin','==',false);
    q.onSnapshot(snap=>{
      updateNotifBadge(snap.size);
    });
  }catch(e){ console.error(e); }
});
