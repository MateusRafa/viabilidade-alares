/**
 * Diagnóstico local: testa a API REST do projeto CENSUP sem imprimir chaves.
 * Uso: node scripts/test-portal-censup-supabase.mjs
 */
import '../loadEnv.js';

const url = (process.env.PORTAL_CENSUP_SUPABASE_URL || '').trim().replace(/\/$/, '');
const key = (process.env.PORTAL_CENSUP_SUPABASE_SERVICE_KEY || '').trim();

function maskKey(value) {
  if (!value) return '(vazia)';
  if (value.startsWith('sb_secret_')) return `sb_secret_… (${value.length} chars)`;
  if (value.startsWith('sb_publishable_')) return `sb_publishable_… (${value.length} chars)`;
  if (value.startsWith('eyJ')) return `jwt… (${value.length} chars)`;
  return `outro (${value.length} chars, prefixo ${value.slice(0, 6)})`;
}

async function probe(label, headers) {
  const endpoint = `${url}/rest/v1/chamados?select=id,pedido&limit=1`;
  const res = await fetch(endpoint, { headers });
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    /* keep text */
  }
  const snippet =
    typeof body === 'string' ? body.slice(0, 240) : JSON.stringify(body).slice(0, 240);
  console.log(`\n[${label}] HTTP ${res.status}`);
  console.log(snippet);
  return { status: res.status, body };
}

async function tryInsert(headers) {
  const endpoint = `${url}/rest/v1/chamados`;
  const row = {
    pedido: `__probe_${Date.now()}`,
    uf: 'CE',
    cidade: 'FORTALEZA',
    sistema: 'probe',
    origem: 'probe',
    fila_status: 'na_fila',
    tabulacao_status: 'aguardando_analise',
    endereco: { completo: 'probe' },
    extras: { probe: true }
  };
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify(row)
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  console.log(`\n[insert] HTTP ${res.status}`);
  console.log(typeof parsed === 'string' ? parsed.slice(0, 400) : JSON.stringify(parsed).slice(0, 400));

  const inserted = Array.isArray(parsed) ? parsed[0] : parsed;
  if (res.ok && inserted?.id) {
    const del = await fetch(`${url}/rest/v1/chamados?id=eq.${inserted.id}`, {
      method: 'DELETE',
      headers
    });
    console.log(`[cleanup] HTTP ${del.status}`);
  }
}

if (!url || !key) {
  console.log('URL ou KEY ausente no .env');
  process.exit(1);
}

console.log('URL host:', new URL(url).host);
console.log('KEY:', maskKey(key));

const both = { apikey: key, Authorization: `Bearer ${key}` };
const apikeyOnly = { apikey: key };

await probe('apikey+Authorization', both);
await probe('apikey-only', apikeyOnly);
await tryInsert(both);
await tryInsert(apikeyOnly);
