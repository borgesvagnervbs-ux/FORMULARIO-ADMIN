// firebase-config.js
// Carregue este arquivo APÓS os scripts:
//   https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js
//   https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js
// e ANTES do script.js que usa cnesCollection

// --- Substitua pelos seus valores do Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyAU37VnyGc3-syWG3B7-W5SfGRI9gHH-UM",
  authDomain: "formulario-cnes.firebaseapp.com",
  projectId: "formulario-cnes",
  storageBucket: "formulario-cnes.firebasestorage.app",
  messagingSenderId: "569871876446",
  appId: "1:569871876446:web:d5689e401c35eb4cda0fcf",
  measurementId: "G-8FFZ8BKD2V"
};

(function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('Firebase não foi carregado. Verifique se os scripts firebase-app.js e firebase-firestore.js estão incluídos antes deste arquivo.');
    return;
  }

  try {
    if (!firebase.apps || !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
      console.log('Firebase inicializado (v8 compat).');
    } else {
      console.log('Firebase já estava inicializado.');
    }

    // expõe globalmente para outros scripts usarem
    window.db = firebase.firestore();
    window.cnesCollection = window.db.collection("profissionais_cnes");
    console.log('cnesCollection pronta:', window.cnesCollection && true);
  } catch (err) {
    console.error('Erro ao inicializar Firebase:', err);
  }
})();
