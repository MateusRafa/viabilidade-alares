import fs from 'fs/promises';
import path from 'path';
import { getAgendaBotConfig } from './config.js';

function decodeSessionEnv(raw) {
  const trimmed = (raw || '').trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.startsWith('{') || decoded.startsWith('[')) {
      return decoded;
    }
  } catch {
    // ignora — tenta parse direto abaixo
  }

  return trimmed;
}

function normalizeToStorageState(parsed) {
  if (Array.isArray(parsed)) {
    return { cookies: parsed, origins: [] };
  }

  if (parsed && Array.isArray(parsed.cookies)) {
    return {
      cookies: parsed.cookies,
      origins: Array.isArray(parsed.origins) ? parsed.origins : []
    };
  }

  throw new Error('JSON de sessão inválido. Use formato Playwright { cookies, origins } ou lista de cookies.');
}

export function parseSessionPayload(rawJson) {
  const decoded = decodeSessionEnv(rawJson);
  if (!decoded) {
    throw new Error('Sessão vazia');
  }

  let parsed;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    throw new Error('JSON de sessão inválido');
  }

  const storageState = normalizeToStorageState(parsed);

  for (const cookie of storageState.cookies) {
    if (!cookie.name || cookie.value == null) {
      throw new Error('Cookie inválido na sessão (name/value obrigatórios)');
    }
    if (!cookie.domain) {
      throw new Error(`Cookie "${cookie.name}" sem domain`);
    }

    // Cookie-Editor / Chrome às vezes omitem path
    if (typeof cookie.path !== 'string' || !cookie.path) {
      cookie.path = '/';
    }

    if (cookie.expires == null && cookie.expirationDate != null) {
      cookie.expires = Math.floor(Number(cookie.expirationDate));
    }
    if (cookie.expires == null && cookie.session) {
      cookie.expires = -1;
    }
    if (cookie.expires == null || Number.isNaN(Number(cookie.expires))) {
      cookie.expires = -1;
    }

    if (cookie.httpOnly == null) cookie.httpOnly = false;
    if (cookie.secure == null) cookie.secure = true;

    // Playwright só aceita Strict | Lax | None
    const sameSiteRaw = String(cookie.sameSite || 'Lax').toLowerCase();
    if (sameSiteRaw === 'no_restriction' || sameSiteRaw === 'none') {
      cookie.sameSite = 'None';
      cookie.secure = true;
    } else if (sameSiteRaw === 'strict') {
      cookie.sameSite = 'Strict';
    } else {
      cookie.sameSite = 'Lax';
    }

    delete cookie.expirationDate;
    delete cookie.hostOnly;
    delete cookie.session;
    delete cookie.storeId;
  }

  return storageState;
}

export async function sessionFileExists(sessionFile) {
  if (typeof sessionFile !== 'string' || !sessionFile) return false;
  try {
    await fs.access(sessionFile);
    return true;
  } catch {
    return false;
  }
}

export async function writeSessionFile(sessionFile, storageState) {
  if (typeof sessionFile !== 'string' || !sessionFile) {
    throw new Error('Caminho da sessão inválido (undefined). Verifique DATA_DIR=/data');
  }
  await fs.mkdir(path.dirname(sessionFile), { recursive: true });
  await fs.writeFile(sessionFile, JSON.stringify(storageState, null, 2), 'utf8');
}

/**
 * Grava sessão a partir de AGENDA_BOT_SESSION_JSON ou AGENDA_BOT_SESSION_B64.
 * Se a variável de ambiente existir, sobrescreve o arquivo (deploy Railway).
 */
export async function hydrateSessionFromEnv() {
  const config = getAgendaBotConfig();
  const raw = process.env.AGENDA_BOT_SESSION_B64 || process.env.AGENDA_BOT_SESSION_JSON;
  if (!raw) return { hydrated: false, source: null };

  const storageState = parseSessionPayload(raw);
  await writeSessionFile(config.sessionFile, storageState);
  return { hydrated: true, source: process.env.AGENDA_BOT_SESSION_B64 ? 'AGENDA_BOT_SESSION_B64' : 'AGENDA_BOT_SESSION_JSON' };
}

export async function saveSessionFromPayload(rawJson) {
  const config = getAgendaBotConfig();
  const storageState = parseSessionPayload(rawJson);
  await writeSessionFile(config.sessionFile, storageState);
  return { sessionFile: config.sessionFile, cookieCount: storageState.cookies.length };
}

export async function ensureAgendaSessionFile() {
  const config = getAgendaBotConfig();
  const envHydration = await hydrateSessionFromEnv();

  const exists = await sessionFileExists(config.sessionFile);
  return {
    ready: exists,
    sessionFile: config.sessionFile,
    envHydration
  };
}
