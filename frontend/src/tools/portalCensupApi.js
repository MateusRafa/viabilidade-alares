import { getApiUrl } from '../config.js';

function authHeaders(usuario) {
  return {
    'Content-Type': 'application/json',
    'X-Usuario': usuario || ''
  };
}

export async function fetchPortalCensupChamados(usuario, { q = '', page = 1, limit = 10 } = {}) {
  const params = new URLSearchParams({
    q,
    page: String(page),
    limit: String(limit)
  });

  const response = await fetch(getApiUrl(`/api/portal-censup/chamados?${params}`), {
    headers: authHeaders(usuario)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Erro ao carregar chamados (${response.status})`);
  }

  return data;
}

export async function fetchPortalCensupChamadoById(usuario, id) {
  const response = await fetch(getApiUrl(`/api/portal-censup/chamados/${encodeURIComponent(id)}`), {
    headers: authHeaders(usuario)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Erro ao carregar chamado (${response.status})`);
  }

  return data.chamado;
}

export async function sendPortalCensupFeedback(usuario, id, { correto, tabulacaoCorrigida }) {
  const response = await fetch(getApiUrl(`/api/portal-censup/chamados/${encodeURIComponent(id)}/feedback`), {
    method: 'POST',
    headers: authHeaders(usuario),
    body: JSON.stringify({ correto, tabulacaoCorrigida })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    throw new Error(data.error || `Erro ao registrar feedback (${response.status})`);
  }

  return data;
}

export async function fetchTabulacoesList() {
  const response = await fetch(getApiUrl('/api/tabulacoes'));
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.success) {
    return [
      'Aprovado Com Portas',
      'Aprovado Com Alívio de Rede/Cleanup',
      'Aprovado Prédio Não Cabeado',
      'Aprovado - Endereço não Localizado',
      'Fora da Área de Cobertura',
      'MDU não adequada'
    ];
  }
  return data.tabulacoes || [];
}
