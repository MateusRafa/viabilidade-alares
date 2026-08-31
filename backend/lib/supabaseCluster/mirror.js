import { getPrimaryClient, getReplicaClient } from './clients.js';
import { isClusterEnabled } from './flags.js';

const PAGE_SIZE = 1000;
const DEFAULT_TABLES = [
  'coverage_calculation_progress',
  'coverage_polygons',
  'condominios',
  'ctos'
];

async function fetchAllRows(client, table) {
  const rows = [];
  let from = 0;
  const orderCol = table === 'coverage_calculation_progress' ? 'calculation_id' : 'id';

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client
      .from(table)
      .select('*')
      .order(orderCol, { ascending: true })
      .range(from, to);
    if (error) throw new Error(`${table} leitura @${from}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

async function deleteAll(client, table) {
  const strategies = {
    ctos: () => client.from(table).delete({ count: 'exact' }).gte('id', 0),
    condominios: () => client.from(table).delete({ count: 'exact' }).gte('id', 0),
    coverage_polygons: () => client.from(table).delete({ count: 'exact' }).gte('id', 0),
    coverage_calculation_progress: () =>
      client.from(table).delete({ count: 'exact' }).neq('calculation_id', '')
  };
  const run = strategies[table] || (() => client.from(table).delete({ count: 'exact' }).gte('id', 0));
  let total = 0;
  for (let i = 0; i < 500; i++) {
    const { error, count } = await run();
    if (error) throw new Error(`${table} delete: ${error.message}`);
    total += count ?? 0;
    if (!count) break;
  }
  return total;
}

async function insertBatches(client, table, rows) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += PAGE_SIZE) {
    const batch = rows.slice(i, i + PAGE_SIZE);
    const { error } = await client.from(table).insert(batch);
    if (error) throw new Error(`${table} insert lote ${i / PAGE_SIZE + 1}: ${error.message}`);
    inserted += batch.length;
  }
  return inserted;
}

/**
 * Espelha tabelas do cluster B1 → B2 (após upload/calculate no primary).
 * @param {{ tables?: string[] }} [opts]
 * @returns {Promise<{ success: boolean, synced?: Record<string, number>, error?: string, skipped?: boolean }>}
 */
export async function mirrorClusterTables(opts = {}) {
  if (!isClusterEnabled()) {
    return { success: true, skipped: true, reason: 'cluster disabled' };
  }

  const primary = getPrimaryClient();
  const replica = getReplicaClient();
  if (!primary || !replica) {
    return { success: false, error: 'Primary ou réplica não configurados' };
  }

  const tables = (opts.tables || DEFAULT_TABLES).filter((t) => DEFAULT_TABLES.includes(t));
  const synced = {};

  console.log(`🪞 [Cluster] Espelhando B1→B2: ${tables.join(', ')}`);

  try {
    for (const table of tables) {
      const rows = await fetchAllRows(primary, table);
      await deleteAll(replica, table);
      const inserted = await insertBatches(replica, table, rows);
      synced[table] = inserted;
      console.log(`  ✅ [Cluster] mirror ${table}: ${inserted} linhas`);
    }
    return { success: true, synced };
  } catch (err) {
    console.error('❌ [Cluster] mirror falhou:', err.message);
    return { success: false, error: err.message, synced };
  }
}
