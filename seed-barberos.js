/**
 * seed-barberos.js
 * Crea (o actualiza) los documentos de barberos en Firestore.
 * Ejecutar con:  node seed-barberos.js
 */
const admin = require('firebase-admin');

// Usa Application Default Credentials (autenticación via firebase CLI)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: 'barberiaferraza-edc26',
});

const db = admin.firestore();

const BARBEROS = [
  {
    uid: 'MRbgFWo4dtUoauZea2YhkYXcjtJ3',
    nombre: 'Barbero 1',
    local: 'ferraza',
    activo: true,
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  },
  {
    uid: 'oQicdNhcCwbTFXU7NyNyfNeeXqZ2',
    nombre: 'Barbero 2',
    local: 'ferraza',
    activo: true,
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  },
];

async function seed() {
  const batch = db.batch();

  for (const barbero of BARBEROS) {
    const ref = db.collection('barberos').doc(barbero.uid);
    batch.set(ref, barbero, { merge: true });
    console.log(`→ Preparando barbero: ${barbero.uid}`);
  }

  await batch.commit();
  console.log('✅ Colección "barberos" creada/actualizada con éxito.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
