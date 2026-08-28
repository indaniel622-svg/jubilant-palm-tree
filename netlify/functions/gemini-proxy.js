'use strict';

// Netlify Function: gemini-proxy (improved)
// - Verifies Firebase ID token (requires FIREBASE_SERVICE_ACCOUNT in env)
// - Forwards the request body to GEMINI_ENDPOINT with Authorization: Bearer GEMINI_API_KEY
// - Performs lightweight per-user rate limiting (in-memory, per-function-instance)
// - Expects the client to send the payload that the Gemini API expects (body forwarded as-is)

const admin = require('firebase-admin');

// In-memory rate limiter: map uid -> { count, resetAt }
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10); // 1 minute
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '60', 10); // 60 requests per window
const rateMap = new Map();

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
    // Try to fix escaped newlines
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

function checkRateLimit(uid) {
  const now = Date.now();
  const entry = rateMap.get(uid) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_LIMIT_WINDOW_MS;
  }
  entry.count += 1;
  rateMap.set(uid, entry);
  return {
    allowed: entry.count <= RATE_LIMIT_MAX,
    count: entry.count,
    remaining: Math.max(0, RATE_LIMIT_MAX - entry.count),
    resetAt: entry.resetAt
  };
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Ensure GEMINI config exists
    if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_ENDPOINT) {
      console.error('Missing GEMINI_API_KEY or GEMINI_ENDPOINT in environment');
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: GEMINI_API_KEY or GEMINI_ENDPOINT not set' }) };
    }

    // Initialize Firebase Admin and verify token
    try {
      initFirebaseAdmin();
    } catch (err) {
      console.error('Firebase init error:', err.message);
      return { statusCode: 500, body: JSON.stringify({ error: 'Server misconfiguration: FIREBASE_SERVICE_ACCOUNT not set or invalid' }) };
    }

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

    const uid = decoded.uid || decoded.sub || 'anonymous';

    // Rate limit per uid
    const rl = checkRateLimit(uid);
    if (!rl.allowed) {
      return { statusCode: 429, body: JSON.stringify({ error: 'Rate limit exceeded', details: { remaining: rl.remaining, resetAt: rl.resetAt } }) };
    }

    // Parse and validate body
    let bodyPayload;
    try {
      bodyPayload = event.body ? JSON.parse(event.body) : {};
    } catch (err) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
    }

    // Basic validation: ensure there's something to send (client controls exact schema)
    if (!bodyPayload || Object.keys(bodyPayload).length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Empty payload. Include the request body for the Gemini API.' }) };
    }

    // Forward request to GEMINI_ENDPOINT
    const geminiEndpoint = process.env.GEMINI_ENDPOINT;

    const res = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GEMINI_API_KEY}`
      },
      body: JSON.stringify(bodyPayload)
    });

    const responseBody = await res.text();
    let parsedResponse = null;
    try {
      parsedResponse = JSON.parse(responseBody);
    } catch (err) {
      // Non-JSON response, return raw text
    }

    // Return structured wrapper with some metadata
    return {
      statusCode: res.ok ? 200 : 502,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'gemini-proxy',
        ok: res.ok,
        status: res.status,
        uid,
        rate: { count: rl.count, remaining: rl.remaining, resetAt: rl.resetAt },
        data: parsedResponse !== null ? parsedResponse : responseBody
      })
    };
  } catch (err) {
    console.error('gemini-proxy error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error' }) };
  }
};
