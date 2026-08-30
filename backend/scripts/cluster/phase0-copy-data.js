/**
 * Fase 0 — Copia dados do Primary (B1) para a Réplica (B2).
 *
 * ATENÇÃO: apaga ctos, condominios, coverage_polygons e coverage_calculation_progress na RÉPLICA.
 *
 * Uso:
 *   node scripts/cluster/phase0-copy-data.js --confirm
 *   node scripts/cluster/phase0-copy-data.js --confirm --tables=ctos,condominios
 */

import './loadEnvShim.js';
import {
  createClusterClient,
  getPrimaryConfig,
  getReplicaConfig,
  maskUrl
} from './clusterClients.js';

const PAGE_SIZE = 1000;
const COPY_ORDER = ['coverage_calculation_progress', 'coverage_polygons', 'condominios', 'ctos'];
const DELETE_ORDER = [...COPY_ORDER];

function parseArgs(argv) {
  const confirm = argv.includes('--confirm');
  const tablesArg = argv.find((a) => a.startsWith('--tables='));
  const tables = tablesArg
    ? tablesArg.split('=')[1].split(',').map((t) => t.trim()).filter(Boolean)
    : COPY_ORDER;
  return { confirm, tables: tables.filter((t) => COPY_ORDER.includes(t)) };
}

async function fetchAllRows(client, table) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client.from(table).select('*').range(from, to);
    if (error) throw new Error(`${table} leitura @${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
    process.stdout.write(`\r  📥 ${table}: ${rows.length} linhas lidas...`);
  }
  if (rows.length > 0) process.stdout.write('\n');
  return rows;
}

async function deleteAll(client, table) {
  const strategies = {
    ctos: () => client.from(table).delete({ count: 'exact' }).not('id_cto', 'is', null),
    condominios: () => client.from(table).delete({ count: 'exact' }).not('id', 'is', null),
    coverage_polygons: () => client.from(table).delete({ count: 'exact' }).gte('id', 0),
    coverage_calculation_progress: () =>
      client.from(table).delete({ count: 'exact' }).not('calculation_id', 'is', null)
  };

  const run = strategies[table] || (() => client.from(table).delete({ count: 'exact' }).gte('id', 0));
  const { error, count } = await run();
  if (error) throw new Error(`${table} delete: ${error.message}`);
  return count ?? 0;
}

async function insertBatches(client, table, rows) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += PAGE_SIZE) {
    const batch = rows.slice(i, i + PAGE_SIZE);
    const { error } = await client.from(table).insert(batch);
    if (error) throw new Error(`${table} insert lote ${i / PAGE_SIZE + 1}: ${error.message}`);
    inserted += batch.length;
    process.stdout.write(`\r  📤 ${table}: ${inserted}/${rows.length} inseridas...`);
  }
  process.stdout.write('\n');
  return inserted;
}

async function copyTable(primary, replica, table) {
  console.log(`\n🔄 Copiando ${table}...`);
  const rows = await fetchAllRows(primary, table);
  console.log(`  📊 ${rows.length} linhas no primary`);

  console.log(`  🗑️ Limpando réplica...`);
  const deleted = await deleteAll(replica, table);
  console.log(`  🗑️ ${deleted} linha(s) removida(s) na réplica`);

  const inserted = await insertBatches(replica, table, rows);
  console.log(`  ✅ ${table}: ${inserted} linhas copiadas`);
  return inserted;
}

async function main() {
  const { confirm, tables } = parseArgs(process.argv.slice(2));

  if (!confirm) {
    console.log('⚠️  Este script APAGA dados na RÉPLICA e recopia do PRIMARY.');
    console.log('    Para executar: npm run cluster:copy-data -- --confirm');
    process.exit(1);
  }

  const primaryCfg = getPrimaryConfig();
  const replicaCfg = getReplicaConfig();

  if (!primaryCfg.url || !replicaCfg.url) {
    console.error('❌ Configure SUPABASE_URL e SUPABASE_REPLICA_URL no backend/.env');
    process.exit(1);
  }

  if (primaryCfg.url === replicaCfg.url) {
    console.error('❌ PRIMARY e REPLICA apontam para a mesma URL. Abortado.');
    process.exit(1);
  }

  console.log('📦 Fase 0 — Cópia de dados Primary → Réplica');
  console.log(`   Primary: ${maskUrl(primaryCfg.url)}`);
  console.log(`   Réplica: ${maskUrl(replicaCfg.url)}`);
  console.log(`   Tabelas: ${tables.join(', ')}`);

  const primary = createClusterClient(primaryCfg);
  const replica = createClusterClient(replicaCfg);

  for (const table of tables) {
    await copyTable(primary, replica, table);
  }

  console.log('\n✅ Cópia concluída. Rode: npm run cluster:verify');
}

main().catch((err) => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
