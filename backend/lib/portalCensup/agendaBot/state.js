import fs from 'fs/promises';
import path from 'path';
import { getAgendaBotConfig } from './config.js';

const DEFAULT_STATE = {
  running: false,
  sessionReady: false,
  authRequired: false,
  lastPollAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastErrorAt: null,
  processedPedidos: [],
  lastCycle: {
    rowsFound: 0,
    newChamados: 0,
    updatedChamados: 0,
    skipped: 0
  }
};

async function readStateFile() {
  const { stateFile } = getAgendaBotConfig();
  try {
    const raw = await fs.readFile(stateFile, 'utf8');
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

async function writeStateFile(state) {
  const { stateFile } = getAgendaBotConfig();
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), 'utf8');
}

export async function getAgendaBotState() {
  return readStateFile();
}

export async function patchAgendaBotState(patch) {
  const current = await readStateFile();
  const next = { ...current, ...patch };
  await writeStateFile(next);
  return next;
}

export async function markPedidoProcessed(pedido) {
  if (!pedido) return getAgendaBotState();
  const state = await readStateFile();
  const set = new Set(state.processedPedidos || []);
  set.add(String(pedido));
  const processedPedidos = [...set].slice(-5000);
  return patchAgendaBotState({ processedPedidos });
}

export async function isPedidoProcessed(pedido) {
  const state = await readStateFile();
  return (state.processedPedidos || []).includes(String(pedido));
}
