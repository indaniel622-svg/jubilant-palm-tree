export async function askGemini(prompt: string, options?: Record<string, any>) {
  const res = await fetch('/.netlify/functions/gemini-proxy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Frontend must include Firebase ID token for verification on the server
      // e.g. Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({ prompt, options })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini proxy error: ${res.status} - ${errText}`);
  }

  const payload = await res.json();
  // The function wraps the Gemini response under `data` (see implementation)
  if (payload && payload.data) return payload.data;
  return payload;
}
