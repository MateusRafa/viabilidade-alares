import { getPortalCensupSupabase, isPortalCensupSupabaseAvailable } from './supabaseCensup.js';
import crypto from 'crypto';

const TABLE = 'chamados';

const CORE_KEYS = new Set([
  'id',
  'agendaCode',
  'pedido',
  'uf',
  'cidade',
  'sistema',
  'pdv',
  'motivo',
  'situacao',
  'dataSituacao',
  'endereco',
  'mapaCoords',
  'mapaReferencias',
  'origem',
  'agendaUrl',
  'filaStatus',
  'tabulacaoStatus',
  'tabulacaoFinal',
  'pdfPath',
  'createdAt',
  'updatedAt',
  'dataSituacaoLabel',
  'persistedToSupabase',
  'supabaseError',
  'pdfHtml'
]);

function parseDataSituacao(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function chamadoToRow(chamado) {
  const extras = {};
  for (const [key, value] of Object.entries(chamado || {})) {
    if (!CORE_KEYS.has(key) && value !== undefined) extras[key] = value;
  }

  return {
    id: chamado.id,
    agenda_code: chamado.agendaCode || null,
    pedido: chamado.pedido != null ? String(chamado.pedido) : null,
    uf: chamado.uf || null,
    cidade: chamado.cidade || null,
    sistema: chamado.sistema || null,
    pdv: chamado.pdv || null,
    motivo: chamado.motivo || null,
    situacao: chamado.situacao || null,
    data_situacao: parseDataSituacao(chamado.dataSituacao),
    endereco: chamado.endereco && typeof chamado.endereco === 'object' ? chamado.endereco : {},
    mapa_coords: chamado.mapaCoords || null,
    mapa_referencias: Array.isArray(chamado.mapaReferencias) ? chamado.mapaReferencias : [],
    origem: chamado.origem || 'extensao',
    agenda_url: chamado.agendaUrl || null,
    fila_status: chamado.filaStatus || 'na_fila',
    tabulacao_status: chamado.tabulacaoStatus || 'aguardando_analise',
    tabulacao_final: chamado.tabulacaoFinal || null,
    pdf_path: chamado.pdfPath || null,
    extras,
    updated_at: new Date().toISOString(),
    created_at: chamado.createdAt || new Date().toISOString()
  };
}

export function rowToChamado(row) {
  if (!row) return null;
  const extras = row.extras && typeof row.extras === 'object' ? row.extras : {};
  return {
    ...extras,
    id: row.id,
    agendaCode: row.agenda_code,
    pedido: row.pedido,
    uf: row.uf,
    cidade: row.cidade,
    sistema: row.sistema,
    pdv: row.pdv,
    motivo: row.motivo,
    situacao: row.situacao,
    dataSituacao: row.data_situacao,
    endereco: row.endereco || {},
    mapaCoords: row.mapa_coords,
    mapaReferencias: row.mapa_referencias || [],
    origem: row.origem,
    agendaUrl: row.agenda_url,
    filaStatus: row.fila_status,
    tabulacaoStatus: row.tabulacao_status,
    tabulacaoFinal: row.tabulacao_final,
    pdfPath: row.pdf_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function client() {
  const supabaseCensup = getPortalCensupSupabase();
  if (!supabaseCensup) {
    const err = new Error('Cliente Supabase CENSUP indisponível');
    err.code = 'CENSUP_SUPABASE_UNAVAILABLE';
    throw err;
  }
  return supabaseCensup;
}

function throwIfError(error, action) {
  if (!error) return;
  const parts = [error.message || `Falha ao ${action} no Supabase CENSUP`];
  if (error.code) parts.push(`code=${error.code}`);
  if (error.details) parts.push(error.details);
  if (error.hint) parts.push(error.hint);
  const err = new Error(parts.join(' — '));
  err.cause = error;
  err.code = error.code;
  throw err;
}

export async function dbFindChamado({ id, pedido, agendaCode } = {}) {
  if (!isPortalCensupSupabaseAvailable()) return null;

  if (id && isUuid(id)) {
    const { data, error } = await client().from(TABLE).select('*').eq('id', id).maybeSingle();
    throwIfError(error, 'buscar chamado por id');
    if (data) return rowToChamado(data);
  }

  if (agendaCode) {
    const { data, error } = await client()
      .from(TABLE)
      .select('*')
      .eq('agenda_code', agendaCode)
      .maybeSingle();
    throwIfError(error, 'buscar chamado por agenda_code');
    if (data) return rowToChamado(data);
  }

  const pedidoKey = pedido || (id && !isUuid(id) ? id : null);
  if (pedidoKey) {
    const { data, error } = await client()
      .from(TABLE)
      .select('*')
      .eq('pedido', String(pedidoKey))
      .maybeSingle();
    throwIfError(error, 'buscar chamado por pedido');
    if (data) return rowToChamado(data);
  }

  return null;
}

export async function dbListAllChamados() {
  if (!isPortalCensupSupabaseAvailable()) return [];

  const { data, error } = await client()
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  throwIfError(error, 'listar todos os chamados');
  return (data || []).map(rowToChamado);
}

export async function dbListChamadosNaFila({ q = '', page = 1, limit = 10, filaStatus = 'na_fila' } = {}) {
  if (!isPortalCensupSupabaseAvailable()) return null;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  const query = (q || '').trim();
  const status = filaStatus === 'finalizada' ? 'finalizada' : 'na_fila';

  let builder = client()
    .from(TABLE)
    .select('*', { count: 'exact' })
    .eq('fila_status', status)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (query) {
    const like = `%${query}%`;
    builder = builder.or(
      [
        `pedido.ilike.${like}`,
        `cidade.ilike.${like}`,
        `uf.ilike.${like}`,
        `sistema.ilike.${like}`,
        `pdv.ilike.${like}`,
        `motivo.ilike.${like}`,
        `situacao.ilike.${like}`,
        `tabulacao_final.ilike.${like}`
      ].join(',')
    );
  }

  const { data, error, count } = await builder;
  throwIfError(error, 'listar fila');

  return {
    chamados: (data || []).map(rowToChamado),
    total: count || 0,
    page: safePage,
    limit: safeLimit
  };
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(value || '')
  );
}

export async function dbReconcileChamadosComAgenda(activePedidos = new Set()) {
  if (!isPortalCensupSupabaseAvailable()) return { updated: 0 };

  const activeSet =
    activePedidos instanceof Set
      ? activePedidos
      : new Set(
          (activePedidos || []).map((pedido) => String(pedido || '').trim()).filter(Boolean)
        );

  const { data, error } = await client()
    .from(TABLE)
    .select('id, pedido, fila_status')
    .in('fila_status', ['na_fila', 'finalizada']);
  throwIfError(error, 'listar chamados para reconciliação com Agenda');

  const toArchive = (data || []).filter((row) => {
    const pedido = String(row.pedido || '').trim();
    return pedido && !activeSet.has(pedido);
  });

  if (!toArchive.length) return { updated: 0 };

  const ids = toArchive.map((row) => row.id);
  const now = new Date().toISOString();
  const { error: updateError } = await client()
    .from(TABLE)
    .update({ fila_status: 'executada_agenda', updated_at: now })
    .in('id', ids);
  throwIfError(updateError, 'arquivar chamados executados na Agenda');

  console.log(`✅ [PortalCENSUP][Supabase] ${ids.length} chamado(s) arquivado(s) — executados na Agenda.`);
  return { updated: ids.length };
}

export async function dbUpsertChamado(chamado) {
  if (!isPortalCensupSupabaseAvailable()) return null;

  const existing = await dbFindChamado({
    id: isUuid(chamado.id) ? chamado.id : null,
    pedido: chamado.pedido,
    agendaCode: chamado.agendaCode
  });

  const id = existing?.id || (isUuid(chamado.id) ? chamado.id : crypto.randomUUID());
  const row = chamadoToRow({
    ...chamado,
    id,
    createdAt: existing?.createdAt || chamado.createdAt
  });
  if (!row.created_at) row.created_at = new Date().toISOString();

  if (existing) {
    const { id: _ignoreId, created_at: _ignoreCreated, ...patch } = row;
    const { data, error } = await client()
      .from(TABLE)
      .update(patch)
      .eq('id', existing.id)
      .select('*')
      .single();
    throwIfError(error, 'atualizar chamado');
    return rowToChamado(data);
  }

  const { data, error } = await client().from(TABLE).insert(row).select('*').single();
  throwIfError(error, 'inserir chamado');
  return rowToChamado(data);
}
