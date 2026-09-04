import { getPrimaryClient, getReplicaClient } from './clients.js';
import { isClusterEnabled } from './flags.js';
import { CLUSTER_TABLES, mirrorTablesBetween } from './mirrorCore.js';

/**
 * Espelha tabelas do cluster.
 * @param {{ tables?: string[], direction?: 'b1_to_b2' | 'b2_to_b1', signal?: AbortSignal, onProgress?: Function }} [opts]
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

  const direction = opts.direction === 'b2_to_b1' ? 'b2_to_b1' : 'b1_to_b2';
  const source = direction === 'b1_to_b2' ? primary : replica;
  const target = direction === 'b1_to_b2' ? replica : primary;
  const sourceLabel = direction === 'b1_to_b2' ? 'B1' : 'B2';
  const targetLabel = direction === 'b1_to_b2' ? 'B2' : 'B1';

  const tables = (opts.tables || CLUSTER_TABLES).filter((t) => CLUSTER_TABLES.includes(t));
  const synced = {};

  console.log(`🪞 [Cluster] Espelhando ${sourceLabel}→${targetLabel}: ${tables.join(', ')}`);

  try {
    const result = await mirrorTablesBetween(source, target, {
      tables,
      signal: opts.signal,
      onProgress: opts.onProgress,
      onTableDone(table, inserted) {
        synced[table] = inserted;
        console.log(`  ✅ [Cluster] mirror ${table}: ${inserted} linhas (${sourceLabel}→${targetLabel})`);
      }
    });

    Object.assign(synced, result);

    return { success: true, synced, direction, sourceLabel, targetLabel };
  } catch (err) {
    if (err?.name === 'AbortError' || opts.signal?.aborted) {
      return {
        success: false,
        cancelled: true,
        error: 'Sincronização cancelada',
        synced,
        direction,
        sourceLabel,
        targetLabel
      };
    }
    console.error(`❌ [Cluster] mirror ${sourceLabel}→${targetLabel} falhou:`, err.message);
    return { success: false, error: err.message, synced, direction, sourceLabel, targetLabel };
  }
}
