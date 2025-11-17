// firebase-config.js (versão garantida para funcionar)

// === CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyAU37VnyGc3-syWG3B7-W5SfGRI9gHH-UM",
  authDomain: "formulario-cnes.firebaseapp.com",
  projectId: "formulario-cnes",
  storageBucket: "formulario-cnes.firebasestorage.app",
  messagingSenderId: "569871876446",
  appId: "1:569871876446:web:d5689e401c35eb4cda0fcf",
  measurementId: "G-8FFZ8BKD2V"
};

// === INICIALIZA FIREBASE ===
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase inicializado no ADMIN!");
}

// === FIRESTORE ===
window.db = firebase.firestore();

// === COLEÇÃO ===
window.collection = window.db.collection("profissionais_cnes");

console.log("📌 Firestore conectado à coleção: profissionais_cnes");
