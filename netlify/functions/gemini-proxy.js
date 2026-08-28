'use strict';

// Netlify Function: gemini-proxy
// - Verifica el ID token de Firebase (requiere FIREBASE_SERVICE_ACCOUNT en env)
// - Usa GEMINI_API_KEY en env para llamar a la API de Gemini (no usar VITE_ prefix)
// - El cliente debe enviar el Firebase ID token en Authorization: Bearer <ID_TOKEN>

const fetch = globalThis.fetch;
const admin = require('firebase-admin');

// Initialize Firebase Admin once per cold start
function initFirebaseAdmin() {
  if (admin.apps && admin.apps.length) return;
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svc) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is required for token verification');
  }
  let parsed;
  try {
    parsed = JSON.parse(svc);
  } catch (err) {
    // If the service account was stored with newlines escaped, try to replace
    try {
      parsed = JSON.parse(svc.replace(/\\n/g, '\n'));
    } catch (err2) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }
  }
  admin.initializeApp({
    credential: admin.credential.cert(parsed)
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Require that GEMINI_API_KEY is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('Missing GEMINI_API_KEY in environment');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: GEMINI_API_KEY not set' }) };
    }

    // Initialize Firebase Admin and require verification
    try {
      initFirebaseAdmin();
    } catch (err) {
      console.error('Firebase init error:', err.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: FIREBASE_SERVICE_ACCOUNT not set or invalid' }) };
    }

    // Validate Authorization header (Firebase ID token)
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header (Bearer <ID_TOKEN>)' }) };
    }
    const idToken = authHeader.split('Bearer ')[1];

    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.error('Token verification failed:', err);
      return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired ID token' }) };
    }

    // Parse body
    const body = event.body ? JSON.parse(event.body) : {};
    const { prompt, options } = body;
    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing prompt' }) };
    }

    // Build request to Gemini API
    // TODO: Reemplaza la URL y el payload según la API real de Gemini que uses.
    const geminiEndpoint = process.env.GEMINI_ENDPOINT || 'https://api.gemini.example/v1/generate';

    const res = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify({ prompt, ...(options || {}) })
    });

    const data = await res.json();

    return {
      statusCode: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'gemini-proxy', ok: res.ok, status: res.status, data })
    };
  } catch (err) {
    console.error('gemini-proxy error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
