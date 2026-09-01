import { getPrimaryClient, getReplicaClient } from './clients.js';

import { consumeNextBackend } from './counters.js';

import { isClusterEnabled, isClusterAvailable } from './flags.js';

import { getClusterMode } from './mode.js';



/**

 * Cliente de leitura conforme modo admin do cluster.

 * @returns {{ client: import('@supabase/supabase-js').SupabaseClient|null, backend: 'primary'|'replica', cluster: boolean }}

 */

export function getReadClient({ userKey, route } = {}) {

  const primary = getPrimaryClient();

  const replica = getReplicaClient();

  const mode = getClusterMode();



  if (!isClusterEnabled() || !isClusterAvailable() || !replica) {

    return { client: primary, backend: 'primary', cluster: false };

  }



  if (mode === 'primary') {

    return { client: primary, backend: 'primary', cluster: true };

  }



  if (mode === 'replica') {

    return { client: replica, backend: 'replica', cluster: true };

  }



  const backend = consumeNextBackend(userKey, { hasReplica: true });

  const client = backend === 'replica' ? replica : primary;



  console.log(

    `[Cluster] read user=${userKey || 'anonymous'} backend=${backend} route=${route || '-'}`

  );



  return { client, backend, cluster: true };

}

