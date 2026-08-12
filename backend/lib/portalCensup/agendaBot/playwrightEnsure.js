/**
 * Garante que o Chromium do Playwright existe (build Railway ou Volume /data).
 */
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { getAgendaBotConfig } from './config.js';

const execFileAsync = promisify(execFile);

let ensurePromise = null;

function looksLikeBrowserInstalled(browsersPath) {
  if (typeof browsersPath !== 'string' || !browsersPath) return false;
  if (!fs.existsSync(browsersPath)) return false;
  try {
    const entries = fs.readdirSync(browsersPath);
    return entries.some(
      (name) =>
        name.startsWith('chromium') ||
        name.startsWith('chromium_headless_shell')
    );
  } catch {
    return false;
  }
}

export function resolvePlaywrightBrowsersPath() {
  const config = getAgendaBotConfig();
  const fallback = config.browsersPath || path.join(config.dataDir || '/data', 'ms-playwright');

  const candidates = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    config.browsersPath,
    process.env.DATA_DIR && !/^[a-z][a-z0-9+.-]*:\/\//i.test(process.env.DATA_DIR)
      ? path.join(process.env.DATA_DIR, 'ms-playwright')
      : null,
    path.join(process.cwd() || '/app', 'ms-playwright'),
    '/app/ms-playwright',
    fallback
  ].filter((p) => typeof p === 'string' && p.trim() !== '');

  for (const candidate of candidates) {
    if (looksLikeBrowserInstalled(candidate)) {
      return candidate;
    }
  }

  return candidates[0] || fallback;
}

async function runPlaywrightInstall(browsersPath) {
  if (typeof browsersPath !== 'string' || !browsersPath) {
    throw new Error('Caminho do Playwright inválido (undefined)');
  }

  fs.mkdirSync(browsersPath, { recursive: true });
  console.log(`📥 [AgendaBot] Baixando Chromium do Playwright em ${browsersPath}…`);

  const env = {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: browsersPath,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0'
  };

  const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';

  await execFileAsync(npxBin, ['--yes', 'playwright', 'install', 'chromium'], {
    env,
    cwd: process.cwd() || '/app',
    maxBuffer: 20 * 1024 * 1024,
    timeout: 10 * 60 * 1000
  });

  console.log('✅ [AgendaBot] Chromium instalado.');
}

/**
 * Define PLAYWRIGHT_BROWSERS_PATH e instala Chromium se estiver ausente.
 */
export async function ensurePlaywrightBrowsers() {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      const browsersPath = resolvePlaywrightBrowsersPath();
      if (typeof browsersPath !== 'string' || !browsersPath) {
        throw new Error('Não foi possível resolver PLAYWRIGHT_BROWSERS_PATH');
      }

      process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;
      if (!process.env.PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL) {
        process.env.PLAYWRIGHT_CHROMIUM_USE_HEADLESS_SHELL = '0';
      }

      if (looksLikeBrowserInstalled(browsersPath)) {
        console.log(`✅ [AgendaBot] Chromium já presente em ${browsersPath}`);
        return browsersPath;
      }

      await runPlaywrightInstall(browsersPath);

      if (!looksLikeBrowserInstalled(browsersPath)) {
        throw new Error(
          `Playwright instalou, mas Chromium não foi encontrado em ${browsersPath}`
        );
      }

      return browsersPath;
    })().catch((err) => {
      ensurePromise = null;
      throw err;
    });
  }

  return ensurePromise;
}
