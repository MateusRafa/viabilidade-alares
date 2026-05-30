import crypto from 'crypto';
import supabase, { isSupabaseAvailable } from '../../supabase.js';
import {
  RELATORIOS_B2B_TABLE,
  RELATORIO_STATUS,
  PAYLOAD_TIPO
} from './constants.js';
import {
  persistFormPayloadAssets,
  hydrateFormPayloadAssets,
  extractSearchMetaFromPayload
} from './payloadAssets.js';

function assertSupabase() {
  if (!supabase || !isSupabaseAvailable()) {
    const err = new Error('Supabase não configurado. Execute o SQL relatorios_b2b.sql e configure as variáveis de ambiente.');
    err.statusCode = 503;
    throw err;
  }
}

function payloadColumnForTipo(tipo) {
  return tipo === PAYLOAD_TIPO.IMPLANTACAO ? 'payload_implantacao' : 'payload_projetos';
}

function rowToListItem(row) {
  return {
    id: row.id,
    status: row.status,
    statusLabel: statusLabel(row.status),
    titulo: row.titulo || '',
    clienteProjeto: row.cliente_projeto || '',
    projetista: row.projetista || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function statusLabel(status) {
  if (status === RELATORIO_STATUS.EM_IMPLANTACAO) return 'Em Implantação';
  if (status === RELATORIO_STATUS.FINALIZADO) return 'Projetos Finalizados';
  return 'Em Análise';
}

export async function listRelatorios({ status, q, limit = 50 } = {}) {
  assertSupabase();

  let query = supabase
    .from(RELATORIOS_B2B_TABLE)
    .select(
      'id, status, titulo, cliente_projeto, projetista, created_at, updated_at'
    )
    .order('updated_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 100));

  if (status && Object.values(RELATORIO_STATUS).includes(status)) {
    query = query.eq('status', status);
  }

  const term = (q || '').trim();
  if (term) {
    const safe = term.replace(/[%_,]/g, ' ').trim();
    if (safe) {
      query = query.or(
        `titulo.ilike.%${safe}%,cliente_projeto.ilike.%${safe}%,projetista.ilike.%${safe}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map(rowToListItem);
}

export async function getRelatorioById(id, { payloadTipo = PAYLOAD_TIPO.PROJETOS } = {}) {
  assertSupabase();

  const { data, error } = await supabase.from(RELATORIOS_B2B_TABLE).select('*').eq('id', id).maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) {
    const err = new Error('Relatório não encontrado');
    err.statusCode = 404;
    throw err;
  }

  const column = payloadColumnForTipo(payloadTipo);
  const rawPayload = data[column] || {};
  const formData = await hydrateFormPayloadAssets(supabase, rawPayload);

  return {
    ...rowToListItem(data),
    payloadTipo,
    formData,
    payloadProjetos: data.payload_projetos || {},
    payloadImplantacao: data.payload_implantacao || {}
  };
}

export async function createRelatorio({
  usuario,
  payload,
  payloadTipo = PAYLOAD_TIPO.PROJETOS,
  status = RELATORIO_STATUS.EM_ANALISE
}) {
  assertSupabase();

  const id = crypto.randomUUID();
  const meta = extractSearchMetaFromPayload(payload);
  const persisted = await persistFormPayloadAssets(supabase, id, payload);
  const column = payloadColumnForTipo(payloadTipo);

  const row = {
    id,
    status,
    titulo: meta.titulo,
    cliente_projeto: meta.cliente_projeto,
    projetista: meta.projetista,
    created_by: usuario || null,
    updated_by: usuario || null,
    [column]: persisted
  };

  const { data, error } = await supabase.from(RELATORIOS_B2B_TABLE).insert(row).select('*').single();

  if (error) throw new Error(error.message);
  return rowToListItem(data);
}

export async function updateRelatorio(id, { usuario, payload, payloadTipo, status }) {
  assertSupabase();

  const { data: existing, error: fetchError } = await supabase
    .from(RELATORIOS_B2B_TABLE)
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (fetchError) throw new Error(fetchError.message);
  if (!existing) {
    const err = new Error('Relatório não encontrado');
    err.statusCode = 404;
    throw err;
  }

  const patch = {
    updated_by: usuario || null,
    updated_at: new Date().toISOString()
  };

  if (status && Object.values(RELATORIO_STATUS).includes(status)) {
    patch.status = status;
  }

  if (payload && payloadTipo) {
    const meta = extractSearchMetaFromPayload(payload);
    patch.titulo = meta.titulo;
    patch.cliente_projeto = meta.cliente_projeto;
    patch.projetista = meta.projetista;
    const column = payloadColumnForTipo(payloadTipo);
    patch[column] = await persistFormPayloadAssets(supabase, id, payload);
  }

  const { data, error } = await supabase
    .from(RELATORIOS_B2B_TABLE)
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return rowToListItem(data);
}
