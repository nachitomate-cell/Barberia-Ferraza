// firebase-config.js — Configuración de Firebase para Fabián Barraza
// Rellena con las credenciales del proyecto en Firebase Console.
// Pasos: Firebase Console → Tu proyecto → Configuración → Aplicación web

const firebaseConfig = {
  apiKey: "AIzaSyB3nCbWV0cY0nRuw4aOEK7y-NZwD0EwgaM",
  authDomain: "fabian-barraza.firebaseapp.com",
  projectId: "fabian-barraza",
  storageBucket: "fabian-barraza.firebasestorage.app",
  messagingSenderId: "460376713559",
  appId: "1:460376713559:web:7a461668b17d8698507612",
  measurementId: "G-6C9PKGSMF9"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.firestore();
let storage;
try {
  storage = firebase.storage();
} catch(e) {
  console.warn('[Firebase] Storage SDK no disponible en esta página');
}
