import {
  CLUSTER_TABLES,
  buildDeleteQuery,
  getTableOrderColumn,
  stripReplicaPrimaryKey
} from './tables.js';

const PAGE_SIZE = 1000;

function assertNotAborted(signal) {
  if (signal?.aborted) {
    const err = new Error('Sincronização cancelada');
    err.name = 'AbortError';
    throw err;
  }
}

export async function fetchAllRows(client, table, signal) {
  const rows = [];
  let from = 0;
  const orderCol = getTableOrderColumn(table);

  while (true) {
    assertNotAborted(signal);
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

export async function deleteAllRows(client, table, signal) {
  const run = buildDeleteQuery(client, table);
  let total = 0;
  for (let i = 0; i < 500; i++) {
    assertNotAborted(signal);
    const { error, count } = await run();
    if (error) throw new Error(`${table} delete: ${error.message}`);
    total += count ?? 0;
    if (!count) break;
  }
  return total;
}

export async function insertBatches(client, table, rows, signal, onBatch) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  const totalBatches = Math.ceil(rows.length / PAGE_SIZE) || 1;
  for (let i = 0; i < rows.length; i += PAGE_SIZE) {
    assertNotAborted(signal);
    const batch = rows
      .slice(i, i + PAGE_SIZE)
      .map((row) => stripReplicaPrimaryKey(table, row));
    const { error } = await client.from(table).insert(batch);
    if (error) throw new Error(`${table} insert lote ${i / PAGE_SIZE + 1}: ${error.message}`);
    inserted += batch.length;
    const batchIndex = Math.floor(i / PAGE_SIZE) + 1;
    onBatch?.({ inserted, total: rows.length, batchIndex, totalBatches });
  }
  return inserted;
}

/**
 * Espelha tabelas do source para o target, com progresso e cancelamento.
 */
export async function mirrorTablesBetween(source, target, opts = {}) {
  const allowed = new Set(CLUSTER_TABLES);
  const tables = (opts.tables || CLUSTER_TABLES).filter((t) => allowed.has(t));
  const synced = {};
  const signal = opts.signal;
  const totalTables = tables.length || 1;

  for (let i = 0; i < tables.length; i++) {
    assertNotAborted(signal);
    const table = tables[i];
    const basePercent = (i / totalTables) * 100;

    opts.onProgress?.({
      table,
      tableIndex: i + 1,
      tableTotal: totalTables,
      phase: 'read',
      percent: Math.round(basePercent),
      message: `Lendo ${table} (${i + 1}/${totalTables})…`
    });

    const rows = await fetchAllRows(source, table, signal);

    assertNotAborted(signal);
    opts.onProgress?.({
      table,
      tableIndex: i + 1,
      tableTotal: totalTables,
      phase: 'delete',
      percent: Math.round(basePercent + (1 / totalTables) * 25),
      message: `Limpando ${table} no destino…`
    });
    await deleteAllRows(target, table, signal);

    assertNotAborted(signal);
    opts.onProgress?.({
      table,
      tableIndex: i + 1,
      tableTotal: totalTables,
      phase: 'insert',
      percent: Math.round(basePercent + (1 / totalTables) * 40),
      message: `Copiando ${table} (${rows.length} linhas)…`
    });

    const inserted = await insertBatches(target, table, rows, signal, ({ inserted: done, total }) => {
      const frac = total > 0 ? done / total : 1;
      const percent = Math.round(basePercent + (1 / totalTables) * (40 + frac * 55));
      opts.onProgress?.({
        table,
        tableIndex: i + 1,
        tableTotal: totalTables,
        phase: 'insert',
        percent: Math.min(99, percent),
        message: `Copiando ${table}: ${done}/${total}`
      });
    });

    synced[table] = inserted;
    opts.onTableDone?.(table, inserted);
    opts.onProgress?.({
      table,
      tableIndex: i + 1,
      tableTotal: totalTables,
      phase: 'table_done',
      percent: Math.round(((i + 1) / totalTables) * 100),
      message: `${table} concluída (${inserted} linhas)`
    });
  }

  return synced;
}

export { CLUSTER_TABLES, PAGE_SIZE };
