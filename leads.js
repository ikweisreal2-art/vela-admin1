// api/leads.js — Vercel Edge Function
// Stores and retrieves leads using Upstash Redis
// Environment variables auto-added by Vercel when you connected Upstash:
//   KV_REST_API_URL
//   KV_REST_API_TOKEN

export const config = { runtime: 'edge' };

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

async function redisGet(key) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  const res = await fetch(`${url}/get/${key}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await res.json();
  return data.result ? JSON.parse(data.result) : null;
}

async function redisSet(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  await fetch(`${url}/set/${key}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([JSON.stringify(value)])
  });
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // POST — save a new lead
    if (req.method === 'POST') {
      const lead = await req.json();
      lead.id = Date.now();
      lead.date = lead.date || new Date().toISOString();
      lead.status = 'new';

      const existing = await redisGet('vela_leads') || [];
      existing.unshift(lead);
      await redisSet('vela_leads', existing.slice(0, 500));

      return new Response(JSON.stringify({ ok: true, lead }), { headers: CORS });
    }

    // GET — actions
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const action = url.searchParams.get('action');

      if (action === 'get') {
        const leads = await redisGet('vela_leads') || [];
        return new Response(JSON.stringify({ ok: true, leads }), { headers: CORS });
      }

      if (action === 'update') {
        const id = parseInt(url.searchParams.get('id'));
        const status = url.searchParams.get('status');
        const leads = await redisGet('vela_leads') || [];
        const lead = leads.find(l => l.id === id);
        if (lead) lead.status = status;
        await redisSet('vela_leads', leads);
        return new Response(JSON.stringify({ ok: true }), { headers: CORS });
      }

      if (action === 'clear') {
        await redisSet('vela_leads', []);
        return new Response(JSON.stringify({ ok: true }), { headers: CORS });
      }
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers: CORS });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: CORS });
  }
}
