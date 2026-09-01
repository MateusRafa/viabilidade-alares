import { getPrimaryClient, getReplicaClient } from './clients.js';

import { isClusterEnabled } from './flags.js';

import { CLUSTER_TABLES, mirrorTablesBetween } from './mirrorCore.js';



/**

 * Espelha tabelas do cluster B1 → B2.

 * @param {{ tables?: string[] }} [opts]

 * @returns {Promise<{ success: boolean, synced?: Record<string, number>, error?: string, skipped?: boolean, reason?: string }>}

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



  const tables = (opts.tables || CLUSTER_TABLES).filter((t) => CLUSTER_TABLES.includes(t));

  const synced = {};



  console.log(`🪞 [Cluster] Espelhando B1→B2: ${tables.join(', ')}`);



  try {

    const result = await mirrorTablesBetween(primary, replica, {

      tables,

      onTableDone(table, inserted) {

        synced[table] = inserted;

        console.log(`  ✅ [Cluster] mirror ${table}: ${inserted} linhas`);

      }

    });

    Object.assign(synced, result);

    return { success: true, synced };

  } catch (err) {

    console.error('❌ [Cluster] mirror falhou:', err.message);

    return { success: false, error: err.message, synced };

  }

}

