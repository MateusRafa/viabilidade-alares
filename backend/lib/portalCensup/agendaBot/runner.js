/**
 * Loop do Bot da Agenda — poll a cada 30s e grava chamados no Portal CENSUP.
 */
import { chromium } from 'playwright';
import { getAgendaBotConfig } from './config.js';
import { getAgendaBotState, patchAgendaBotState, markPedidoProcessed } from './state.js';
import {
  buildChamadoPayload,
  clickAtualizar,
  openDetailFromRow,
  readPageAuthSignals,
  scrapeDetailFields,
  scrapeListRows,
  waitForListTable
} from './scraper.js';
import { ensureAgendaSessionFile, saveSessionFromPayload, sessionFileExists as sessionExistsOnDisk } from './sessionStore.js';
import { ensurePlaywrightBrowsers } from './playwrightEnsure.js';
import { findChamadoByPedidoOrCode, reconcileChamadosComAgenda, upsertChamadoFromAgenda } from '../chamadosService.js';

let browser = null;
let context = null;
let page = null;
let pollTimer = null;
let cycleRunning = false;
let shouldRun = false;

async function closeBrowser() {
  try {
    if (page) await page.close().catch(() => {});
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
  } finally {
    page = null;
    context = null;
    browser = null;
  }
}

async function launchChromium(headless) {
  const launchOptions = {
    headless,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  };

  try {
    return await chromium.launch(launchOptions);
  } catch (err) {
    const msg = err?.message || String(err);
    if (!/Executable doesn't exist|browserType\.launch/i.test(msg)) {
      throw err;
    }

    console.warn('⚠️ [AgendaBot] Chromium ausente — tentando instalar no Volume…');
    await ensurePlaywrightBrowsers();
    return chromium.launch(launchOptions);
  }
}

async function ensureBrowser() {
  const config = getAgendaBotConfig();
  if (typeof config.sessionFile !== 'string' || !config.sessionFile) {
    throw new Error('sessionFile inválido. Defina DATA_DIR=/data no Railway.');
  }

  await ensureAgendaSessionFile();
  const hasSession = await sessionExistsOnDisk(config.sessionFile);

  if (!hasSession) {
    await patchAgendaBotState({
      sessionReady: false,
      authRequired: true,
      lastError:
        'Sessão da Agenda não configurada. Cole a sessão no Portal CENSUP ou defina AGENDA_BOT_SESSION_JSON no Railway.',
      lastErrorAt: new Date().toISOString()
    });
    throw new Error('Sessão da Agenda não encontrada');
  }

  if (browser && context && page) return { browser, context, page, config };

  await ensurePlaywrightBrowsers();

  browser = await launchChromium(config.headless);
  context = await browser.newContext({
    storageState: config.sessionFile,
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR'
  });
  page = await context.newPage();
  page.setDefaultTimeout(config.browserTimeoutMs);

  await patchAgendaBotState({ sessionReady: true, authRequired: false });
  return { browser, context, page, config };
}

async function saveSessionSnapshot() {
  const config = getAgendaBotConfig();
  if (!context) return;
  try {
    await context.storageState({ path: config.sessionFile });
  } catch (err) {
    console.warn('⚠️ [AgendaBot] Não foi possível salvar sessão:', err.message);
  }
}

async function runSingleCycle() {
  if (cycleRunning) {
    console.log('⏭️ [AgendaBot] Ciclo anterior ainda em execução, pulando tick.');
    return;
  }

  cycleRunning = true;
  const startedAt = new Date().toISOString();
  const cycleStats = { rowsFound: 0, newChamados: 0, updatedChamados: 0, skipped: 0, archivedFromAgenda: 0 };

  await patchAgendaBotState({
    lastPollAt: startedAt,
    lastError: null,
    lastCycle: cycleStats
  });

  try {
    const { page: activePage, config } = await ensureBrowser();

    console.log(`🔄 [AgendaBot] Atualizando fila: ${config.listUrl}`);
    await activePage.goto(config.listUrl, { waitUntil: 'domcontentloaded' });
    await activePage.waitForTimeout(1200);

    const auth = await readPageAuthSignals(activePage);
    console.log(`🔎 [AgendaBot] URL atual: ${auth.url} | title: ${auth.title}`);

    if (auth.isLogin) {
      const tip =
        'A sessão não autenticou no servidor (comum no Akamai Access quando o IP do Railway é diferente do seu Chrome). ' +
        'Exporte TODOS os cookies do Cookie-Editor (JSON) com a Agenda já aberta e cole de novo. ' +
        `URL vista pelo bot: ${auth.url}`;
      await patchAgendaBotState({
        authRequired: true,
        sessionReady: false,
        lastError: tip,
        lastErrorAt: new Date().toISOString(),
        lastAuthProbe: {
          url: auth.url,
          title: auth.title,
          bodyPreview: auth.bodyPreview,
          at: new Date().toISOString()
        }
      });
      await closeBrowser();
      await stopAgendaBot();
      return;
    }

    await clickAtualizar(activePage);
    await waitForListTable(activePage, config.browserTimeoutMs);

    const rows = await scrapeListRows(activePage, config.baseUrl);
    cycleStats.rowsFound = rows.length;
    console.log(`📋 [AgendaBot] ${rows.length} chamado(s) na fila.`);

    for (const row of rows) {
      const pedido = String(row.pedido || '').trim();
      if (!pedido) continue;

      const existing = await findChamadoByPedidoOrCode({ pedido, agendaCode: row.agendaCode });
      if (
        existing?.origem === 'agenda-bot' &&
        existing?.endereco?.completo &&
        existing.tabulacaoStatus !== 'aguardando_analise'
      ) {
        cycleStats.skipped += 1;
        await markPedidoProcessed(pedido);
        continue;
      }

      try {
        const detailUrl = await openDetailFromRow(activePage, row, config.baseUrl);
        await activePage.waitForTimeout(600);
        const detail = await scrapeDetailFields(activePage);
        const payload = buildChamadoPayload(row, detail, detailUrl);
        const saved = await upsertChamadoFromAgenda(payload);

        if (existing) {
          cycleStats.updatedChamados += 1;
          console.log(`♻️ [AgendaBot] Chamado atualizado: pedido ${saved.pedido}`);
        } else {
          cycleStats.newChamados += 1;
          console.log(`✅ [AgendaBot] Novo chamado: pedido ${saved.pedido}`);
        }

        await markPedidoProcessed(pedido);
        await activePage.goto(config.listUrl, { waitUntil: 'domcontentloaded' });
        await activePage.waitForTimeout(400);
      } catch (rowErr) {
        console.error(`❌ [AgendaBot] Erro no pedido ${pedido}:`, rowErr.message);
        await activePage.goto(config.listUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    }

    const activePedidos = rows.map((row) => String(row.pedido || '').trim()).filter(Boolean);
    const reconcileResult = await reconcileChamadosComAgenda(activePedidos);
    cycleStats.archivedFromAgenda = reconcileResult?.updated || 0;
    if (cycleStats.archivedFromAgenda > 0) {
      console.log(
        `🗂️ [AgendaBot] ${cycleStats.archivedFromAgenda} chamado(s) sumiram da Agenda e foram ocultados no Portal.`
      );
    }

    await saveSessionSnapshot();

    await patchAgendaBotState({
      lastSuccessAt: new Date().toISOString(),
      authRequired: false,
      lastError: null,
      lastCycle: cycleStats
    });

    console.log(
      `✅ [AgendaBot] Ciclo concluído — novos: ${cycleStats.newChamados}, atualizados: ${cycleStats.updatedChamados}, ignorados: ${cycleStats.skipped}, arquivados: ${cycleStats.archivedFromAgenda}`
    );
  } catch (err) {
    console.error('❌ [AgendaBot] Erro no ciclo:', err.message);
    await patchAgendaBotState({
      lastError: err.message,
      lastErrorAt: new Date().toISOString(),
      lastCycle: cycleStats
    });

    if (/sessão|session|login|expir/i.test(err.message)) {
      await closeBrowser();
    }
  } finally {
    cycleRunning = false;
  }
}

function scheduleNextPoll() {
  if (!shouldRun) return;
  const { pollMs } = getAgendaBotConfig();
  pollTimer = setTimeout(async () => {
    if (!shouldRun) return;
    await runSingleCycle();
    scheduleNextPoll();
  }, pollMs);
}

export async function startAgendaBot({ runImmediately = true } = {}) {
  if (shouldRun) {
    return getAgendaBotStatus();
  }

  shouldRun = true;
  await patchAgendaBotState({ running: true, lastError: null });

  console.log('🤖 [AgendaBot] Bot iniciado.');

  if (runImmediately) {
    await runSingleCycle();
  }

  scheduleNextPoll();
  return getAgendaBotStatus();
}

export async function stopAgendaBot() {
  shouldRun = false;
  if (pollTimer) {
    clearTimeout(pollTimer);
    pollTimer = null;
  }
  await closeBrowser();
  await patchAgendaBotState({ running: false });
  console.log('🛑 [AgendaBot] Bot parado.');
  return getAgendaBotStatus();
}

export async function syncAgendaBotOnce() {
  await runSingleCycle();
  return getAgendaBotStatus();
}

export async function getAgendaBotStatus() {
  const config = getAgendaBotConfig();
  const state = await getAgendaBotState();
  const sessionInfo = await ensureAgendaSessionFile();
  const hasSession = sessionInfo.ready;

  return {
    enabled: config.enabled,
    running: shouldRun || state.running,
    sessionReady: hasSession,
    authRequired: state.authRequired || !hasSession,
    sessionSource: sessionInfo.envHydration?.source || (hasSession ? 'file' : null),
    pollIntervalMs: config.pollMs,
    listUrl: config.listUrl,
    lastPollAt: state.lastPollAt,
    lastSuccessAt: state.lastSuccessAt,
    lastError: state.lastError,
    lastErrorAt: state.lastErrorAt,
    lastCycle: state.lastCycle,
    lastAuthProbe: state.lastAuthProbe || null,
    processedCount: (state.processedPedidos || []).length
  };
}

export async function bootstrapAgendaBotIfEnabled() {
  const config = getAgendaBotConfig();
  if (!config.enabled) {
    console.log('ℹ️ [AgendaBot] Desabilitado (AGENDA_BOT_ENABLED=false).');
    return null;
  }

  const sessionInfo = await ensureAgendaSessionFile();
  if (sessionInfo.envHydration?.hydrated) {
    console.log(`✅ [AgendaBot] Sessão carregada de ${sessionInfo.envHydration.source}`);
  }

  if (!sessionInfo.ready) {
    console.warn('⚠️ [AgendaBot] AGENDA_BOT_ENABLED=true mas sessão não encontrada.');
    console.warn('⚠️ [AgendaBot] Faça login no Chrome e cole a sessão no Portal CENSUP ou no Railway (AGENDA_BOT_SESSION_JSON).');
    await patchAgendaBotState({
      authRequired: true,
      sessionReady: false,
      lastError: 'Configure a sessão da Agenda (Portal CENSUP ou variável AGENDA_BOT_SESSION_JSON)'
    });
    return getAgendaBotStatus();
  }

  return startAgendaBot({ runImmediately: true });
}

export async function importAgendaSession(rawJson) {
  const result = await saveSessionFromPayload(rawJson);
  await patchAgendaBotState({
    sessionReady: true,
    authRequired: false,
    lastError: null
  });
  return result;
}
