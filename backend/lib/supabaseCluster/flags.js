import { getPrimaryClient, getReplicaClient } from './clients.js';

export function isClusterEnabled() {
  const raw = (process.env.SUPABASE_CLUSTER_ENABLED || '').trim().toLowerCase();
  return raw === '1' || raw === 'true' || raw === 'yes';
}

export function getReadStrategy() {
  return (process.env.SUPABASE_CLUSTER_READ_STRATEGY || 'alternate_per_user').trim();
}

/** Cluster utilizável: flag on + primary + replica configurados. */
export function isClusterAvailable() {
  if (!isClusterEnabled()) return false;
  return Boolean(getPrimaryClient() && getReplicaClient());
}
