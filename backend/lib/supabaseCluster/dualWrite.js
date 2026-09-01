import { getPrimaryClient, getReplicaClient } from './clients.js';

import { isClusterEnabled } from './flags.js';

import { getClusterMode } from './mode.js';



export class ClusterWriteError extends Error {

  constructor(failures) {

    const msg = failures

      .map((f) => `${f.label}: ${f.error?.message || f.error || 'erro'}`)

      .join(' | ');

    super(`Cluster dual-write falhou: ${msg}`);

    this.name = 'ClusterWriteError';

    this.failures = failures;

  }

}



/**

 * Clientes de escrita conforme modo admin.

 * @returns {Array<{ label: string, client: import('@supabase/supabase-js').SupabaseClient }>}

 */

export function getWriteClients() {

  const primary = getPrimaryClient();

  const replica = getReplicaClient();

  const mode = getClusterMode();



  if (!isClusterEnabled() || !replica) {

    return primary ? [{ label: 'primary', client: primary }] : [];

  }



  if (mode === 'primary') {

    return primary ? [{ label: 'primary', client: primary }] : [];

  }



  if (mode === 'replica') {

    return replica ? [{ label: 'replica', client: replica }] : [];

  }



  const list = [];

  if (primary) list.push({ label: 'primary', client: primary });

  if (replica) list.push({ label: 'replica', client: replica });

  return list;

}



/**

 * Executa fn(client, label) em todos os write clients em paralelo.

 * Se qualquer um falhar, lança ClusterWriteError.

 * @param {(client: any, label: string) => Promise<any>} fn

 */

export async function dualWrite(fn) {

  const clients = getWriteClients();

  if (clients.length === 0) {

    throw new Error('Nenhum cliente Supabase disponível para escrita');

  }



  const settled = await Promise.allSettled(

    clients.map(({ client, label }) => Promise.resolve(fn(client, label)))

  );



  const failures = [];

  const values = [];



  settled.forEach((result, i) => {

    const label = clients[i].label;

    if (result.status === 'fulfilled') {

      values.push({ label, value: result.value });

    } else {

      failures.push({ label, error: result.reason });

      console.error(`❌ [Cluster] dualWrite ${label}:`, result.reason?.message || result.reason);

    }

  });



  if (failures.length > 0) {

    throw new ClusterWriteError(failures);

  }



  return values;

}

