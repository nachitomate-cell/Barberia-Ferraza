// firebase-config.js — Configuración compartida de Firebase
// Requiere que los scripts compat de Firebase estén cargados ANTES de este archivo.

const firebaseConfig = {
  apiKey: "AIzaSyAJ-ACAJlo3_Jk8mP0T3SJ2WpLEmzbQj0g",
  authDomain: "barberiaferraza-edc26.firebaseapp.com",
  projectId: "barberiaferraza-edc26",
  storageBucket: "barberiaferraza-edc26.firebasestorage.app",
  messagingSenderId: "460382362540",
  appId: "1:460382362540:web:4a62e471d6b5c895c93809",
  measurementId: "G-01Y240JZPK"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.firestore();
