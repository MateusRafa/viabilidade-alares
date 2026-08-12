import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'portal-censup-chamados.json');

const SEED_CHAMADOS = [
  {
    id: '5303036a-6e14-4ca1-b5a7-46207c301735',
    agendaCode: '5303036a-6e14-4ca1-b5a7-46207c301735',
    uf: 'SP',
    cidade: 'IBIUNA',
    sistema: 'Hub de Vendas',
    pedido: '1745000',
    dataSituacao: '2026-08-12T10:01:35.000Z',
    pdv: 'WEBDEALER Mondiale',
    motivo: 'Similaridade de endereço',
    situacao: 'Em análise por MATHEUS AMIEL COSTA LIMA',
    endereco: {
      logradouro: 'RUA TRAVESSA JOAQUIM GABRIEL SOARES',
      numero: '4',
      bairro: 'VILA LIMA',
      cidade: 'IBIÚNA',
      uf: 'SP',
      cep: '18150000',
      completo: 'RUA TRAVESSA JOAQUIM GABRIEL SOARES N 4, SG'
    },
    tabulacaoFinal: 'Aprovado Com Portas',
    tabulacaoConfianca: 0.82,
    tabulacaoStatus: 'pendente_revisao',
    viabilidadeResumo: {
      dentroCobertura: true,
      ctosEncontradas: 1,
      portasDisponiveis: 4,
      distanciaCtoMetros: 118,
      projetista: 'Sistema IA'
    },
    analiseIa: {
      modelo: 'regras-v1',
      motivoSugestao: 'Endereço dentro da cobertura com CTO a menos de 250m e portas disponíveis.'
    }
  }
];

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(
      DATA_FILE,
      JSON.stringify({ chamados: SEED_CHAMADOS, feedback: [] }, null, 2),
      'utf8'
    );
  }
}

async function readStore() {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  const parsed = JSON.parse(raw);
  return {
    chamados: Array.isArray(parsed.chamados) ? parsed.chamados : [],
    feedback: Array.isArray(parsed.feedback) ? parsed.feedback : []
  };
}

async function writeStore(store) {
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function formatDataSituacao(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export function buildChamadoPdfHtml(chamado) {
  const end = chamado.endereco || {};
  const resumo = chamado.viabilidadeResumo || {};
  const geradoEm = formatDataSituacao(new Date().toISOString());
  const distancia =
    resumo.distanciaCtoMetros != null
      ? resumo.distanciaCtoMetros >= 1000
        ? `${(resumo.distanciaCtoMetros / 1000).toFixed(2)} km`
        : `${Math.round(resumo.distanciaCtoMetros)} m`
      : '—';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório Pedido ${chamado.pedido || ''}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1f2937; background: #fff; }
    .pdf-header {
      background: linear-gradient(135deg, #7B68EE 0%, #6495ED 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .pdf-header h1 { margin: 0 0 8px; font-size: 20px; }
    .pdf-header .sub { opacity: 0.92; font-size: 14px; }
    .section { margin-bottom: 24px; }
    .section h2 {
      font-size: 16px;
      color: #7B68EE;
      border-bottom: 2px solid #7B68EE;
      padding-bottom: 6px;
      margin: 0 0 12px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 20px;
    }
    .item label {
      display: block;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #6b7280;
      margin-bottom: 4px;
    }
    .item span { font-size: 14px; font-weight: 600; }
    .highlight {
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 8px;
      padding: 14px 16px;
    }
    .stats { display: flex; flex-wrap: wrap; gap: 12px; }
    .stat {
      flex: 1 1 140px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 12px;
    }
    .stat strong { display: block; font-size: 22px; color: #7B68EE; }
    .stat span { font-size: 12px; color: #6b7280; }
    .footer { font-size: 11px; color: #9ca3af; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1>Relatório de Análise de Viabilidade Técnica</h1>
    <div class="sub">Alares Engenharia — Pedido ${chamado.pedido || '—'}</div>
    <div class="sub">Gerado em: ${geradoEm}</div>
  </div>

  <div class="section">
    <h2>Informações do Chamado</h2>
    <div class="grid">
      <div class="item"><label>Pedido</label><span>${chamado.pedido || '—'}</span></div>
      <div class="item"><label>Sistema</label><span>${chamado.sistema || '—'}</span></div>
      <div class="item"><label>Cidade</label><span>${end.cidade || chamado.cidade || '—'}</span></div>
      <div class="item"><label>UF</label><span>${end.uf || chamado.uf || '—'}</span></div>
      <div class="item" style="grid-column: 1 / -1"><label>Endereço</label><span>${end.completo || '—'}</span></div>
      <div class="item"><label>Bairro</label><span>${end.bairro || '—'}</span></div>
      <div class="item"><label>CEP</label><span>${end.cep || '—'}</span></div>
      <div class="item"><label>Motivo</label><span>${chamado.motivo || '—'}</span></div>
      <div class="item"><label>PDV</label><span>${chamado.pdv || '—'}</span></div>
    </div>
  </div>

  <div class="section highlight">
    <h2>Tabulação Final</h2>
    <div class="item"><label>Sugestão da IA</label><span>${chamado.tabulacaoFinal || '—'}</span></div>
    ${
      chamado.analiseIa?.motivoSugestao
        ? `<p style="margin: 12px 0 0; font-size: 13px; color: #4b5563;">${chamado.analiseIa.motivoSugestao}</p>`
        : ''
    }
  </div>

  <div class="section">
    <h2>Resumo da Viabilidade</h2>
    <div class="stats">
      <div class="stat">
        <strong>${resumo.dentroCobertura ? 'Sim' : 'Não'}</strong>
        <span>Dentro da cobertura</span>
      </div>
      <div class="stat">
        <strong>${resumo.ctosEncontradas ?? '—'}</strong>
        <span>CTOs em 250m</span>
      </div>
      <div class="stat">
        <strong>${resumo.portasDisponiveis ?? '—'}</strong>
        <span>Portas disponíveis</span>
      </div>
      <div class="stat">
        <strong>${distancia}</strong>
        <span>Distância CTO mais próxima</span>
      </div>
    </div>
  </div>

  <div class="footer">Portal CENSUP — prévia do relatório de tabulação automática.</div>
</body>
</html>`;
}

function filterChamados(chamados, { q = '' } = {}) {
  const query = (q || '').trim().toLowerCase();
  if (!query) return chamados;
  return chamados.filter((item) => {
    const haystack = [
      item.pedido,
      item.cidade,
      item.uf,
      item.sistema,
      item.pdv,
      item.motivo,
      item.situacao,
      item.tabulacaoFinal,
      item.endereco?.completo
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export async function listChamados({ q = '', page = 1, limit = 10 } = {}) {
  const store = await readStore();
  const filtered = filterChamados(store.chamados, { q });
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const start = (safePage - 1) * safeLimit;
  const items = filtered.slice(start, start + safeLimit).map((item) => ({
    ...item,
    dataSituacaoLabel: formatDataSituacao(item.dataSituacao)
  }));

  return {
    chamados: items,
    total: filtered.length,
    page: safePage,
    limit: safeLimit,
    totalPages: Math.max(1, Math.ceil(filtered.length / safeLimit))
  };
}

export async function getChamadoById(id) {
  const store = await readStore();
  const chamado = store.chamados.find((item) => item.id === id);
  if (!chamado) {
    const err = new Error('Chamado não encontrado');
    err.statusCode = 404;
    throw err;
  }

  return {
    ...chamado,
    dataSituacaoLabel: formatDataSituacao(chamado.dataSituacao),
    pdfHtml: buildChamadoPdfHtml(chamado)
  };
}

export async function upsertChamado(payload) {
  const store = await readStore();
  const id = payload.id || crypto.randomUUID();
  const existingIndex = store.chamados.findIndex((item) => item.id === id);
  const now = new Date().toISOString();
  const next = {
    ...(existingIndex >= 0 ? store.chamados[existingIndex] : {}),
    ...payload,
    id,
    updatedAt: now,
    createdAt: existingIndex >= 0 ? store.chamados[existingIndex].createdAt || now : now
  };

  if (existingIndex >= 0) {
    store.chamados[existingIndex] = next;
  } else {
    store.chamados.unshift(next);
  }

  await writeStore(store);
  return next;
}

export async function registerFeedback(id, { usuario, correto, tabulacaoCorrigida = null }) {
  const store = await readStore();
  const index = store.chamados.findIndex((item) => item.id === id);
  if (index < 0) {
    const err = new Error('Chamado não encontrado');
    err.statusCode = 404;
    throw err;
  }

  const chamado = store.chamados[index];
  const feedbackEntry = {
    id: crypto.randomUUID(),
    chamadoId: id,
    pedido: chamado.pedido,
    usuario,
    correto: correto === true,
    tabulacaoSugerida: chamado.tabulacaoFinal,
    tabulacaoCorrigida: correto === true ? chamado.tabulacaoFinal : tabulacaoCorrigida,
    createdAt: new Date().toISOString()
  };

  if (correto === true) {
    chamado.tabulacaoStatus = 'aprovada';
  } else if (tabulacaoCorrigida) {
    chamado.tabulacaoFinal = tabulacaoCorrigida;
    chamado.tabulacaoStatus = 'corrigida';
  }

  chamado.updatedAt = feedbackEntry.createdAt;
  store.chamados[index] = chamado;
  store.feedback.unshift(feedbackEntry);
  await writeStore(store);

  return {
    chamado: await getChamadoById(id),
    feedback: feedbackEntry
  };
}
