/**
 * seed-barberos-rest.js
 * Crea documentos en Firestore via REST API usando el token OAuth2 del Firebase CLI.
 * Ejecutar con:  node seed-barberos-rest.js
 */
const { execSync } = require('child_process');
const https = require('https');

const PROJECT_ID = 'barberiaferraza-edc26';
const BASE_URL   = `firestore.googleapis.com`;
const COLLECTION = 'barberos';

const BARBEROS = [
  { uid: 'MRbgFWo4dtUoauZea2YhkYXcjtJ3', nombre: 'Barbero 1', activo: true },
  { uid: 'oQicdNhcCwbTFXU7NyNyfNeeXqZ2', nombre: 'Barbero 2', activo: true },
];

// Obtener token OAuth2 del Firebase CLI
function getToken() {
  try {
    const out = execSync('firebase login:token 2>&1 || firebase --token "" projects:list 2>&1', { encoding: 'utf8' });
    // Intentar via firebase-tools token interno
    const tokenPath = require('path').join(
      process.env.APPDATA || process.env.HOME, 
      '.config', 'configstore', 'firebase-tools.json'
    );
    const config = JSON.parse(require('fs').readFileSync(tokenPath, 'utf8'));
    // El token está en tokens.access_token o tokens.refresh_token
    return config?.tokens?.access_token || null;
  } catch(e) {
    return null;
  }
}

function firestoreValue(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') return { integerValue: String(val) };
  return { stringValue: String(val) };
}

function buildDoc(barbero) {
  const fields = {};
  for (const [k, v] of Object.entries(barbero)) {
    fields[k] = firestoreValue(v);
  }
  return { fields };
}

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function seed() {
  const token = getToken();
  if (!token) {
    console.error('❌ No se pudo obtener el token de Firebase CLI.');
    console.log('\n👉 Ejecuta manualmente en la consola de Firebase:\n');
    console.log('   Ve a: https://console.firebase.google.com/project/barberiaferraza-edc26/firestore');
    console.log('   Crea la colección "barberos" con estos documentos:\n');
    for (const b of BARBEROS) {
      console.log(`   Documento ID: ${b.uid}`);
      console.log(`   Campos: uid="${b.uid}", nombre="${b.nombre}", activo=true\n`);
    }
    return;
  }

  for (const barbero of BARBEROS) {
    const path = `/v1/projects/${PROJECT_ID}/databases/(default)/documents/${COLLECTION}/${barbero.uid}`;
    const options = {
      hostname: BASE_URL,
      path,
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    };
    
    const res = await request(options, buildDoc(barbero));
    if (res.status === 200 || res.status === 201) {
      console.log(`✅ Barbero creado/actualizado: ${barbero.uid}`);
    } else {
      console.error(`❌ Error para ${barbero.uid}: ${res.status}`, JSON.stringify(res.body, null, 2));
    }
  }
}

seed().catch(console.error);
