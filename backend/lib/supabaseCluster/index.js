/**

 * Cluster dual Supabase — leitura alternada + dual-write / mirror.

 * Escopo: todas as tabelas da Viabilidade (CTOs, cobertura, projetistas, VI ALA…).

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

export {

  CLUSTER_TABLES,

  CLUSTER_ALL_RPCS,

  CLUSTER_APP_RPCS,

  CLUSTER_COVERAGE_RPCS

} from './tables.js';

export {

  initClusterMode,

  getClusterMode,

  setClusterMode,

  getClusterModeInfo,

  CLUSTER_MODES,

  DEFAULT_CLUSTER_MODE

} from './mode.js';



import { getPrimaryClient, getReplicaClient, getClientsStatus } from './clients.js';

import { isClusterEnabled, isClusterAvailable, getReadStrategy } from './flags.js';

import { getReadClient } from './router.js';

import { getClusterMode } from './mode.js';



/**

 * Cliente ativo para operações sem contexto de request (respeita modo admin).

 */

export function getActiveSupabaseClient() {

  const primary = getPrimaryClient();

  const replica = getReplicaClient();

  const mode = getClusterMode();



  if (!isClusterEnabled() || !replica) {

    return primary;

  }



  if (mode === 'replica') return replica || primary;

  return primary;

}



/** Há algum backend utilizável (primary ou réplica conforme modo). */

export function isActiveDbAvailable() {

  return Boolean(getActiveSupabaseClient());

}



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

    if (cluster) {

      res.setHeader('X-Cluster-Mode', getClusterMode());

    }

  }

  return { db: client, backend, cluster, userKey, mode: getClusterMode() };

}



/** Status completo do cluster para API admin. */

export function getClusterStatus() {

  const status = getClientsStatus();

  const modeInfo = {

    mode: getClusterMode(),

    enabled: isClusterEnabled(),

    available: isClusterAvailable(),

    strategy: getReadStrategy()

  };

  return { ...status, ...modeInfo };

}



/** Log de boot do cluster. */

export function logClusterBoot() {

  const enabled = isClusterEnabled();

  const status = getClientsStatus();

  const strategy = getReadStrategy();

  const mode = getClusterMode();



  if (!enabled) {

    console.log('🔹 [Cluster] SUPABASE_CLUSTER_ENABLED=false — só primary (comportamento atual)');

    return;

  }



  if (isClusterAvailable()) {

    console.log(

      `✅ [Cluster] Ativo modo=${mode} (${strategy}) primary=${status.primaryUrl} replica=${status.replicaUrl}`

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

