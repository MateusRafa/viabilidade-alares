/**
 * Fase 0 — Copia funções RPC de cobertura do B1 → B2 automaticamente.
 * Evita erro de copiar/colar incompleto no SQL Editor.
 *
 * Requer no backend/.env (senha do banco em Settings → Database):
 *   SUPABASE_DB_URL=postgresql://postgres.[ref]:[SENHA]@...supabase.com:5432/postgres
 *   SUPABASE_REPLICA_DB_URL=postgresql://postgres.[ref]:[SENHA]@...supabase.com:5432/postgres
 *
 * Uso:
 *   npm install
 *   npm run cluster:copy-rpcs
 */

import pg from 'pg';
import './loadEnvShim.js';

const { Client } = pg;

const RPC_ORDER = [
  'union_polygons_geojson',
  'simplify_polygon_geojson',
  'calculate_polygon_area_km2',
  'calculate_coverage_polygon_batch',
  'save_coverage_polygon_from_geojson',
  'get_active_coverage_polygon',
  'get_polygon_geojson',
  'check_point_in_coverage',
  'get_coverage_calculation_status',
  'calculate_polygon_for_specific_ctos',
  'exec_sql'
];

function requireEnv(name) {
  const value = (process.env[name] || '').trim();
  if (!value) {
    console.error(`❌ Variável ausente: ${name}`);
    console.error('   Supabase → Project Settings → Database → Connection string (URI)');
    console.error('   Use a senha do banco (não a service_role key da API).');
    process.exit(1);
  }
  return value;
}

async function fetchFunctionDefs(client) {
  const { rows } = await client.query(
    `
    SELECT p.proname AS name, pg_get_functiondef(p.oid) AS ddl
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY($1::text[])
    `,
    [RPC_ORDER]
  );

  const byName = new Map(rows.map((r) => [r.name, r.ddl]));
  const missing = RPC_ORDER.filter((name) => !byName.has(name));
  if (missing.length > 0) {
    throw new Error(`Funções não encontradas no B1: ${missing.join(', ')}`);
  }

  return RPC_ORDER.map((name) => ({ name, ddl: byName.get(name) }));
}

async function main() {
  const primaryUrl = requireEnv('SUPABASE_DB_URL');
  const replicaUrl = requireEnv('SUPABASE_REPLICA_DB_URL');

  if (primaryUrl === replicaUrl) {
    console.error('❌ SUPABASE_DB_URL e SUPABASE_REPLICA_DB_URL são iguais. Abortado.');
    process.exit(1);
  }

  const primary = new Client({ connectionString: primaryUrl, ssl: { rejectUnauthorized: false } });
  const replica = new Client({ connectionString: replicaUrl, ssl: { rejectUnauthorized: false } });

  console.log('🔌 Conectando ao B1 e B2...');
  await primary.connect();
  await replica.connect();

  try {
    const functions = await fetchFunctionDefs(primary);
    console.log(`📦 ${functions.length} funções encontradas no B1. Instalando no B2...\n`);

    for (const fn of functions) {
      process.stdout.write(`  → ${fn.name} ... `);
      await replica.query(fn.ddl);
      console.log('✅');
    }

    console.log('\n✅ RPCs instaladas no B2.');
    console.log('   Próximo: npm run cluster:copy-data -- --confirm');
    console.log('           npm run cluster:verify');
  } finally {
    await primary.end();
    await replica.end();
  }
}

main().catch((err) => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
