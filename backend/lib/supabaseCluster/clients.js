import { createClient } from '@supabase/supabase-js';

function trimEnv(name) {
  return (process.env[name] || '').trim();
}

export function getPrimaryConfig() {
  return {
    label: 'primary',
    url: trimEnv('SUPABASE_URL'),
    serviceKey: trimEnv('SUPABASE_SERVICE_KEY')
  };
}

export function getReplicaConfig() {
  return {
    label: 'replica',
    url: trimEnv('SUPABASE_REPLICA_URL'),
    serviceKey: trimEnv('SUPABASE_REPLICA_SERVICE_KEY')
  };
}

export function createClusterClient(config) {
  if (!config?.url || !config?.serviceKey) return null;
  return createClient(config.url, config.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  });
}

export function maskUrl(url) {
  if (!url) return '(não configurado)';
  try {
    const host = new URL(url).hostname;
    return host.replace(/^([^.]+)/, (m) => `${m.slice(0, 4)}***`);
  } catch {
    return '(URL inválida)';
  }
}

let primaryClient = null;
let replicaClient = null;
let initDone = false;

function initClients() {
  if (initDone) return;
  initDone = true;

  const primaryCfg = getPrimaryConfig();
  const replicaCfg = getReplicaConfig();

  primaryClient = createClusterClient(primaryCfg);
  if (primaryCfg.url && primaryCfg.url === replicaCfg.url) {
    console.warn('⚠️ [Cluster] REPLICA_URL igual à PRIMARY — réplica ignorada');
    replicaClient = null;
  } else {
    replicaClient = createClusterClient(replicaCfg);
  }
}

export function getPrimaryClient() {
  initClients();
  return primaryClient;
}

export function getReplicaClient() {
  initClients();
  return replicaClient;
}

export function getClientsStatus() {
  initClients();
  return {
    primary: Boolean(primaryClient),
    replica: Boolean(replicaClient),
    primaryUrl: maskUrl(getPrimaryConfig().url),
    replicaUrl: maskUrl(getReplicaConfig().url)
  };
}
