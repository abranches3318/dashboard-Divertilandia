// dashboard/js/auth.js

// Garante que o Firebase já foi carregado
if (!firebase.apps.length) {
  console.error("Firebase não foi inicializado. Verifique firebase-config.js");
}

// Usar as instâncias globais criadas no firebase-config.js
const auth = firebase.auth();
const db = firebase.firestore();

// Tornar a função acessível ao HTML
window.loginGoogle = async function () {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const userRef = db.collection("users").doc(user.uid);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      // Novo usuário → cria com role pending
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
      await auth.signOut();
      return;
    }

    const data = docSnap.data();

    if (!data.approved) {
      alert("Usuário não autorizado. Entre em contato com o administrador.");
      await auth.signOut();
      return;
    }

    // Usuário aprovado → segue
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("Erro loginGoogle:", err);
    alert("Erro ao fazer login: " + err.message);
  }
};
