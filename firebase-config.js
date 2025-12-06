// firebase-config.js

const firebaseConfig = {
  apiKey: "AIzaSyCi6kRFPaEzyPq5oVGKn6tIsNmT6QpWgBg",
  authDomain: "dashdivert.firebaseapp.com",
  projectId: "dashdivert",
  storageBucket: "dashdivert.firebasestorage.app",
  messagingSenderId: "1055393730382",
  appId: "1:1055393730382:web:81147d937b3ee3db59981f",
  measurementId: "G-9YPFN6EV44"
};

// Evita inicialização duplicada
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const storage = firebase.storage();

