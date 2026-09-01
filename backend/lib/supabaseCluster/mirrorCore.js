import {
  CLUSTER_TABLES,
  buildDeleteQuery,
  getTableOrderColumn,
  stripReplicaPrimaryKey
} from './tables.js';

const PAGE_SIZE = 1000;

export async function fetchAllRows(client, table) {
  const rows = [];
  let from = 0;
  const orderCol = getTableOrderColumn(table);

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

export async function deleteAllRows(client, table) {
  const run = buildDeleteQuery(client, table);
  let total = 0;
  for (let i = 0; i < 500; i++) {
    const { error, count } = await run();
    if (error) throw new Error(`${table} delete: ${error.message}`);
    total += count ?? 0;
    if (!count) break;
  }
  return total;
}

export async function insertBatches(client, table, rows) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += PAGE_SIZE) {
    const batch = rows
      .slice(i, i + PAGE_SIZE)
      .map((row) => stripReplicaPrimaryKey(table, row));
    const { error } = await client.from(table).insert(batch);
    if (error) throw new Error(`${table} insert lote ${i / PAGE_SIZE + 1}: ${error.message}`);
    inserted += batch.length;
  }
  return inserted;
}

/**
 * Espelha tabelas do primary para a réplica.
 * @param {import('@supabase/supabase-js').SupabaseClient} primary
 * @param {import('@supabase/supabase-js').SupabaseClient} replica
 * @param {{ tables?: string[], onTableDone?: (table: string, count: number) => void }} [opts]
 */
export async function mirrorTablesBetween(primary, replica, opts = {}) {
  const allowed = new Set(CLUSTER_TABLES);
  const tables = (opts.tables || CLUSTER_TABLES).filter((t) => allowed.has(t));
  const synced = {};

  for (const table of tables) {
    const rows = await fetchAllRows(primary, table);
    await deleteAllRows(replica, table);
    const inserted = await insertBatches(replica, table, rows);
    synced[table] = inserted;
    opts.onTableDone?.(table, inserted);
  }

  return synced;
}

export { CLUSTER_TABLES, PAGE_SIZE };
