import supabaseCensup, { isPortalCensupSupabaseAvailable } from './supabaseCensup.js';

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
  'dataSituacaoLabel'
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

function throwIfError(error, action) {
  if (!error) return;
  const err = new Error(error.message || `Falha ao ${action} no Supabase CENSUP`);
  err.cause = error;
  err.code = error.code;
  throw err;
}

export async function dbFindChamado({ id, pedido, agendaCode } = {}) {
  if (!isPortalCensupSupabaseAvailable()) return null;

  if (id) {
    const { data, error } = await supabaseCensup.from(TABLE).select('*').eq('id', id).maybeSingle();
    throwIfError(error, 'buscar chamado por id');
    if (data) return rowToChamado(data);
  }

  if (agendaCode) {
    const { data, error } = await supabaseCensup
      .from(TABLE)
      .select('*')
      .eq('agenda_code', agendaCode)
      .maybeSingle();
    throwIfError(error, 'buscar chamado por agenda_code');
    if (data) return rowToChamado(data);
  }

  if (pedido) {
    const { data, error } = await supabaseCensup
      .from(TABLE)
      .select('*')
      .eq('pedido', String(pedido))
      .maybeSingle();
    throwIfError(error, 'buscar chamado por pedido');
    if (data) return rowToChamado(data);
  }

  return null;
}

export async function dbListChamadosNaFila({ q = '', page = 1, limit = 10 } = {}) {
  if (!isPortalCensupSupabaseAvailable()) return null;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const from = (safePage - 1) * safeLimit;
  const to = from + safeLimit - 1;
  const query = (q || '').trim();

  let builder = supabaseCensup
    .from(TABLE)
    .select('*', { count: 'exact' })
    .eq('fila_status', 'na_fila')
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

export async function dbUpsertChamado(chamado) {
  if (!isPortalCensupSupabaseAvailable()) return null;

  const row = chamadoToRow(chamado);
  if (!row.created_at) row.created_at = new Date().toISOString();

  const { data, error } = await supabaseCensup.from(TABLE).upsert(row, { onConflict: 'id' }).select('*').single();
  throwIfError(error, 'salvar chamado');
  return rowToChamado(data);
}
