// js/realtime.js - lightweight real-time helpers
window.realtime = {
  listenCollection(path, qFn, onUpdate){
    try{
      let ref = db.collection(path);
      if (qFn) ref = qFn(ref);
      const unsub = ref.onSnapshot(snap=> onUpdate(snap));
      return unsub;
    }catch(e){ console.error('listenCollection error', e); return ()=>{}; }
  }
};