import { getPrimaryClient, getReplicaClient } from './clients.js';
import { consumeNextBackend } from './counters.js';
import { isClusterEnabled, isClusterAvailable } from './flags.js';

/**
 * Cliente de leitura: alterna primary/replica por userKey quando cluster ativo.
 * @returns {{ client: import('@supabase/supabase-js').SupabaseClient|null, backend: 'primary'|'replica', cluster: boolean }}
 */
export function getReadClient({ userKey, route } = {}) {
  const primary = getPrimaryClient();
  const replica = getReplicaClient();

  if (!isClusterEnabled() || !isClusterAvailable() || !replica) {
    return { client: primary, backend: 'primary', cluster: false };
  }

  const backend = consumeNextBackend(userKey, { hasReplica: true });
  const client = backend === 'replica' ? replica : primary;

  console.log(
    `[Cluster] read user=${userKey || 'anonymous'} backend=${backend} route=${route || '-'}`
  );

  return { client, backend, cluster: true };
}
