/**
 * Cluster dual Supabase — leitura alternada + dual-write / mirror.
 * Escopo: ctos, condominios, coverage_* (Viabilidade).
 */

export { isClusterEnabled, isClusterAvailable, getReadStrategy } from './flags.js';
export {
  getPrimaryClient,
  getReplicaClient,
  getClientsStatus,
  maskUrl
} from './clients.js';
export { getReadClient } from './router.js';
export { getWriteClients, dualWrite, ClusterWriteError } from './dualWrite.js';
export { mirrorClusterTables } from './mirror.js';
export { resetCounters, peekNextBackend } from './counters.js';

import { getClientsStatus } from './clients.js';
import { isClusterEnabled, isClusterAvailable, getReadStrategy } from './flags.js';
import { getReadClient } from './router.js';

/**
 * Extrai chave de usuário para alternância de leitura.
 */
export function extractUserKey(req) {
  if (!req) return 'anonymous';
  const header =
    req.headers?.['x-projetista'] ||
    req.headers?.['x-user'] ||
    '';
  const fromHeader = String(header).trim();
  if (fromHeader) return fromHeader;

  const fromBody = String(req.body?.projetista || req.body?.user || '').trim();
  if (fromBody) return fromBody;

  const fromQuery = String(req.query?.projetista || '').trim();
  if (fromQuery) return fromQuery;

  const forwarded = req.headers?.['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : '') ||
    req.ip ||
    req.socket?.remoteAddress ||
    'anonymous';
  return ip;
}

/**
 * Resolve cliente de leitura e define header X-Cluster-Backend.
 */
export function resolveReadDbForRequest(req, res) {
  const userKey = extractUserKey(req);
  const { client, backend, cluster } = getReadClient({
    userKey,
    route: req?.path || '-'
  });
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('X-Cluster-Backend', backend);
  }
  return { db: client, backend, cluster, userKey };
}

/** Log de boot do cluster. */
export function logClusterBoot() {
  const enabled = isClusterEnabled();
  const status = getClientsStatus();
  const strategy = getReadStrategy();

  if (!enabled) {
    console.log('🔹 [Cluster] SUPABASE_CLUSTER_ENABLED=false — só primary (comportamento atual)');
    return;
  }

  if (isClusterAvailable()) {
    console.log(
      `✅ [Cluster] Ativo (${strategy}) primary=${status.primaryUrl} replica=${status.replicaUrl}`
    );
  } else {
    console.warn(
      '⚠️ [Cluster] ENABLED=true mas réplica incompleta — fallback para primary apenas'
    );
    console.warn(
      `   primary=${status.primary ? 'OK' : 'ausente'} replica=${status.replica ? 'OK' : 'ausente'}`
    );
  }
}
