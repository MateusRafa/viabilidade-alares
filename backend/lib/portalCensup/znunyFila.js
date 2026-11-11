/**
 * Fila do Znuny (Pedidos Disponíveis) publicada por quem deixa a página aberta.
 * A atribuição usa a mesma esteira da Agenda: quem ficou online primeiro.
 * O chamado permanece com o mesmo dono enquanto continuar disponível.
 */
import fs from 'fs';
import path from 'path';
import { pickNextCensupSyncAssignee } from './presenceStore.js';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'portal-censup-znuny-fila.json');
/** Sem publicação nova nesse prazo, a página não está aberta em nenhum Chrome. */
const STALE_MS = 90_000;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function emptyStore() {
  return { updatedAt: null, publishedBy: null, tickets: {} };
}

function readStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) return emptyStore();
    const parsed = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    return {
      updatedAt: parsed?.updatedAt || null,
      publishedBy: parsed?.publishedBy || null,
      tickets: parsed?.tickets && typeof parsed.tickets === 'object' ? parsed.tickets : {}
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store) {
  ensureDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

function normalizeTicket(value) {
  const ticket = String(value || '').replace(/\s+/g, '').trim();
  return /^\d{6,}$/.test(ticket) ? ticket : '';
}

function cleanText(value, max = 240) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function znunyUrl(ticket, raw) {
  const href = String(raw || '').trim();
  if (/^https:\/\/admin\.alares\.space\/znuny\//i.test(href)) return href;
  return `https://admin.alares.space/znuny/index.pl?Action=AgentTicketZoom;TicketNumber=${ticket}`;
}

function toPublic(entry) {
  return {
    ticket: entry.ticket,
    titulo: entry.titulo || '',
    remetente: entry.remetente || '',
    criado: entry.criado || '',
    estado: entry.estado || '',
    tipo: entry.tipo || '',
    url: entry.url || '',
    usuarioFila: entry.usuarioFila || null,
    atribuidoEm: entry.atribuidoEm || null
  };
}

/**
 * Substitui o snapshot pelos pedidos disponíveis agora.
 * Chamado novo entra na sequência. Chamado que já tem dono não troca.
 * Chamado que saiu da lista deixa de aparecer.
 */
export function publishZnunyTickets(items = [], usuario = '') {
  const store = readStore();
  const now = new Date().toISOString();
  const next = {};
  let assigned = 0;

  for (const item of items || []) {
    const ticket = normalizeTicket(item?.ticket);
    if (!ticket || next[ticket]) continue;
    const prev = store.tickets[ticket] || null;
    let usuarioFila = prev?.usuarioFila || null;
    let atribuidoEm = prev?.atribuidoEm || null;
    if (!usuarioFila) {
      const assignee = pickNextCensupSyncAssignee();
      if (assignee) {
        usuarioFila = assignee;
        atribuidoEm = now;
        assigned += 1;
      }
    }
    next[ticket] = {
      ticket,
      titulo: cleanText(item?.titulo),
      remetente: cleanText(item?.remetente),
      criado: cleanText(item?.criado, 40),
      estado: cleanText(item?.estado, 80),
      tipo: cleanText(item?.tipo, 80),
      url: znunyUrl(ticket, item?.url),
      usuarioFila,
      atribuidoEm,
      vistoEm: prev?.vistoEm || now
    };
  }

  const saved = {
    updatedAt: now,
    publishedBy: cleanText(usuario, 120) || null,
    tickets: next
  };
  writeStore(saved);
  const tickets = Object.values(next).map(toPublic);
  return {
    assigned,
    count: tickets.length,
    updatedAt: now,
    fresh: true,
    tickets
  };
}

export function getZnunyFila() {
  const store = readStore();
  const updated = new Date(store.updatedAt || 0).getTime();
  const fresh = Number.isFinite(updated) && updated > 0 && Date.now() - updated <= STALE_MS;
  return {
    fresh,
    updatedAt: store.updatedAt || null,
    publishedBy: fresh ? store.publishedBy : null,
    tickets: fresh ? Object.values(store.tickets).map(toPublic) : []
  };
}
