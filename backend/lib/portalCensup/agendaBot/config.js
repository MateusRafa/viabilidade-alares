import path from 'path';

const DEFAULT_BASE = 'https://agenda-afn.go.akamai-access.com';

export function getAgendaBotConfig() {
  const baseUrl = (process.env.AGENDA_BOT_BASE_URL || DEFAULT_BASE).replace(/\/$/, '');
  const listPath = process.env.AGENDA_BOT_LIST_PATH || '/arrastadinhas';
  const pollMs = Math.max(parseInt(process.env.AGENDA_BOT_POLL_MS || '30000', 10), 5000);
  const headless = (process.env.AGENDA_BOT_HEADLESS || 'true').toLowerCase() !== 'false';
  const enabled = (process.env.AGENDA_BOT_ENABLED || 'false').toLowerCase() === 'true';
  const dataDir = process.env.DATA_DIR || path.join(process.cwd(), 'data');

  return {
    enabled,
    baseUrl,
    listUrl: `${baseUrl}${listPath.startsWith('/') ? listPath : `/${listPath}`}`,
    pollMs,
    headless,
    sessionFile: path.join(dataDir, 'agenda-bot-session.json'),
    stateFile: path.join(dataDir, 'agenda-bot-state.json'),
    browserTimeoutMs: parseInt(process.env.AGENDA_BOT_TIMEOUT_MS || '45000', 10)
  };
}
