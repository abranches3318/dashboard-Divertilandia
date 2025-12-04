// dashboard/js/auth.js

const auth = firebase.auth();
const db = firebase.firestore();

async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    const userRef = db.collection("users").doc(user.uid);
    const docSnap = await userRef.get();

    if (!docSnap.exists) {
      // Novo usuário → cria documento com role "pending" e approved false
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
      auth.signOut(); // Desloga usuário pendente
      return;
    } else {
      const data = docSnap.data();
      if (!data.approved) {
        alert("Usuário não autorizado. Entre em contato com o administrador.");
        auth.signOut(); // Desloga usuário não aprovado
        return;
      }
    }

    // Usuário aprovado → redireciona para dashboard
    window.location.href = "dashboard.html";

  } catch (err) {
    alert("Erro ao fazer login: " + err.message);
  }
}
