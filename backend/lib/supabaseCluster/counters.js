/** Estado em memória: próximo backend de leitura por userKey. */
const nextByUser = new Map();

/**
 * Consome e inverte o próximo backend para o userKey.
 * @returns {'primary'|'replica'}
 */
export function consumeNextBackend(userKey, { hasReplica = true } = {}) {
  const key = String(userKey || 'anonymous').trim() || 'anonymous';
  if (!hasReplica) return 'primary';

  const current = nextByUser.get(key) || 'primary';
  const next = current === 'primary' ? 'replica' : 'primary';
  nextByUser.set(key, next);
  return current;
}

export function peekNextBackend(userKey) {
  const key = String(userKey || 'anonymous').trim() || 'anonymous';
  return nextByUser.get(key) || 'primary';
}

export function resetCounters() {
  nextByUser.clear();
}
