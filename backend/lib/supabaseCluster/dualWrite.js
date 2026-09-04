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
 * Clientes de escrita: apenas o backend ativo (sem espelho em segundo plano).
 */
export function getWriteClients() {
  const primary = getPrimaryClient();
  const replica = getReplicaClient();
  const mode = getClusterMode();

  if (!isClusterEnabled() || !replica) {
    return primary ? [{ label: 'primary', client: primary }] : [];
  }

  if (mode === 'replica') {
    return replica ? [{ label: 'replica', client: replica }] : [];
  }

  // primary (e legado alternate) → só B1
  return primary ? [{ label: 'primary', client: primary }] : [];
}

/**
 * Executa fn(client, label) em todos os write clients.
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
