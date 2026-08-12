import path from 'path';

const DEFAULT_BASE = 'https://agenda-afn.go.akamai-access.com';

/**
 * DATA_DIR deve ser pasta no disco. Rejeita connection strings (ex.: postgresql://).
 */
export function resolveDataDir() {
  const raw = String(process.env.DATA_DIR || '').trim();
  const cwd = (() => {
    try {
      return process.cwd() || '/app';
    } catch {
      return '/app';
    }
  })();

  if (!raw || /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
    if (raw && /^[a-z][a-z0-9+.-]*:\/\//i.test(raw)) {
      console.warn(
        '⚠️ [AgendaBot] DATA_DIR parece uma URL/connection string. Usando pasta local ./data. Defina DATA_DIR=/data'
      );
    }
    return path.resolve(cwd, 'data');
  }

  return path.resolve(raw);
}

export function getAgendaBotConfig() {
  const baseUrl = (process.env.AGENDA_BOT_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const listPath = process.env.AGENDA_BOT_LIST_PATH || '/arrastadinhas';
  const pollMs = Math.max(parseInt(process.env.AGENDA_BOT_POLL_MS || '30000', 10) || 30000, 5000);
  const headless = (process.env.AGENDA_BOT_HEADLESS || 'true').toLowerCase() !== 'false';
  const enabled = (process.env.AGENDA_BOT_ENABLED || 'false').toLowerCase() === 'true';
  const dataDir = resolveDataDir();

  return {
    enabled,
    baseUrl,
    listUrl: `${baseUrl}${listPath.startsWith('/') ? listPath : `/${listPath}`}`,
    pollMs,
    headless,
    dataDir,
    sessionFile: path.join(dataDir, 'agenda-bot-session.json'),
    stateFile: path.join(dataDir, 'agenda-bot-state.json'),
    browsersPath: path.join(dataDir, 'ms-playwright'),
    browserTimeoutMs: parseInt(process.env.AGENDA_BOT_TIMEOUT_MS || '45000', 10) || 45000
  };
}
