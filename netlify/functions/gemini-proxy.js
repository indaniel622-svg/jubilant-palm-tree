'use strict';

// Netlify Function: gemini-proxy (minimal, optional Firebase verification)
// - Forwards the request body to GEMINI_ENDPOINT with Authorization: Bearer GEMINI_API_KEY
// - If FIREBASE_SERVICE_ACCOUNT is set, verifies Firebase ID tokens (Authorization: Bearer <ID_TOKEN>)
// - If FIREBASE_SERVICE_ACCOUNT is NOT set, the proxy accepts requests without Firebase auth (use with caution)
// - Lightweight in-memory per-user rate limiting

let admin = null;
let firebaseEnabled = false;

function tryInitFirebase() {
  if (firebaseEnabled) return;
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!svc) return; // not enabled

  try {
    // dynamic require so we don't force firebase-admin in deps unless used
    // eslint-disable-next-line global-require
    const adminModule = require('firebase-admin');
    let parsed;
    try {
      parsed = JSON.parse(svc);
    } catch (err) {
      // try to fix escaped newlines
      parsed = JSON.parse(svc.replace(/\\n/g, '\n'));
    }
    if (!adminModule.apps || !adminModule.apps.length) {
      adminModule.initializeApp({ credential: adminModule.credential.cert(parsed) });
    }
    admin = adminModule;
    firebaseEnabled = true;
    console.log('Firebase Admin initialized in function (verification enabled)');
  } catch (err) {
    console.error('Failed to initialize firebase-admin. If you want Firebase token verification, install firebase-admin and set FIREBASE_SERVICE_ACCOUNT:', err.message);
    throw err; // let caller handle
  }
}

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);
const rateMap = new Map();
function checkRateLimit(key) {
  const now = Date.now();
  const e = rateMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > e.resetAt) {
    e.count = 0;
    e.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  e.count += 1;
  rateMap.set(key, e);
  return { allowed: e.count <= RATE_LIMIT_MAX, info: { count: e.count, remaining: Math.max(0, RATE_LIMIT_MAX - e.count), resetAt: e.resetAt } };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_ENDPOINT) {
      console.error('GEMINI_API_KEY or GEMINI_ENDPOINT missing');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: GEMINI_API_KEY or GEMINI_ENDPOINT not set' }) };
    }

    // Initialize Firebase admin only if FIREBASE_SERVICE_ACCOUNT is present
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        tryInitFirebase();
      } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Failed to initialize firebase-admin. Install firebase-admin and set valid FIREBASE_SERVICE_ACCOUNT.' }) };
      }
    }

    let uid = 'anonymous';
    if (firebaseEnabled) {
      const authHeader = event.headers?.authorization || event.headers?.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Missing Authorization header (Bearer <ID_TOKEN>)' }) };
      }
      const idToken = authHeader.split('Bearer ')[1];
      try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        uid = decoded.uid || decoded.sub || uid;
      } catch (err) {
        console.error('Token verification failed:', err.message);
        return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired ID token' }) };
      }
    } else {
      // Not verifying tokens — use IP-based key for rate limiting if available
      uid = event.headers['x-forwarded-for'] || event.requestContext?.identity?.sourceIp || 'anonymous';
    }

    // Rate limit
    const rl = checkRateLimit(uid);
    if (!rl.allowed) {
      return { statusCode: 429, body: JSON.stringify({ error: 'Rate limit exceeded', details: rl.info }) };
    }

    // Parse body
    let bodyPayload;
    try {
      bodyPayload = event.body ? JSON.parse(event.body) : {};
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    if (!bodyPayload || Object.keys(bodyPayload).length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty payload. Include the request body for the Gemini API.' }) };
    }

    // Forward to GEMINI_ENDPOINT
    const res = await fetch(process.env.GEMINI_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify(bodyPayload)
    });

    const text = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(text); } catch (_) { /* ignore */ }

    return {
      statusCode: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'gemini-proxy', ok: res.ok, status: res.status, uid, rate: rl.info, data: parsed !== null ? parsed : text })
    };
  } catch (err) {
    console.error('gemini-proxy error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
