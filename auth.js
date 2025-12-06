// dashboard/js/auth.js

// auth já pode ser declarado, pois firebase-config.js ainda não declarou "auth"
const auth = firebase.auth(); 

async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const userRef = db.collection("users").doc(user.uid);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      await userRef.set({
        uid: user.uid,
        nome: user.displayName,
        email: user.email,
        role: "pending",
        approved: false,
        ultima_interacao: null,
        criado_em: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Usuário criado! Aguarde aprovação do administrador.");
      auth.signOut();
      return;
    } else {
      const data = docSnap.data();
      if (!data.approved) {
        alert("Usuário não autorizado. Entre em contato com o administrador.");
        auth.signOut();
        return;
      }
    }

    window.location.href = "dashboard.html";

  } catch (err) {
    alert("Erro ao fazer login: " + err.message);
  }
}

// *** Expor globalmente para o HTML enxergar ***
window.loginGoogle = loginGoogle;
