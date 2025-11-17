// firebase-config.js
// Carregue este arquivo APÓS os scripts:
//   firebase-app.js
//   firebase-firestore.js
// e ANTES do admin.js ou script.js

const firebaseConfig = {
  apiKey: "AIzaSyAU37VnyGc3-syWG3-syWG3B7-W5SfGRI9gHH-UM",
  authDomain: "formulario-cnes.firebaseapp.com",
  projectId: "formulario-cnes",
  storageBucket: "formulario-cnes.firebasestorage.app",
  messagingSenderId: "569871876446",
  appId: "1:569871876446:web:d5689e401c35eb4cda0fcf",
  measurementId: "G-8FFZ8BKD2V"
};

(function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.error("Firebase não foi carregado.");
    return;
  }

  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log("🔥 Firebase inicializado.");
    }

    // Firestore global
    window.db = firebase.firestore();

    // Coleção usada PELO FORMULÁRIO
    window.cnesCollection = window.db.collection("profissionais_cnes");

    // Coleção usada PELO ADMIN
    window.collection = window.db.collection("profissionais_cnes");

    console.log("📌 Coleções prontas:", {
      cnesCollection: !!window.cnesCollection,
      collection: !!window.collection
    });

  } catch (err) {
    console.error("Erro ao inicializar Firebase:", err);
  }
})();
