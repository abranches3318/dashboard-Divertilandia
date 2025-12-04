// dashboard/js/auth.js

const auth = firebase.auth();

function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();

  auth.signInWithPopup(provider)
    .then(() => {
      window.location.href = "dashboard.html";
    })
    .catch(err => {
      alert("Erro ao fazer login: " + err.message);
    });
}
