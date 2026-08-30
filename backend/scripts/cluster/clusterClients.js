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
  if (!config.url || !config.serviceKey) {
    return null;
  }
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
