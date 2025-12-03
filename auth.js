// dashboard/js/auth.js

async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  try {
    const result = await auth.signInWithPopup(provider);

    const user = result.user;

    // Salva sessão local
    localStorage.setItem("auth", "ok");
    localStorage.setItem("user_name", user.displayName);
    localStorage.setItem("user_email", user.email);
    localStorage.setItem("user_photo", user.photoURL);

    window.location.href = "./dashboard.html";

  } catch (error) {
    console.error("Erro no login Google:", error);
    alert("Erro no login. Tente novamente!");
  }
}
