import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { analisarLocalizacaoChamado } from './analiseLocalizacao.js';

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

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMapsApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''
  ).trim();
}

function formatCep(cep) {
  const digits = String(cep || '').replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return cep || '—';
}

function buildStaticMapUrl(lat, lng) {
  const key = getMapsApiKey();
  if (!key || lat == null || lng == null) return null;
  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '17',
    size: '640x400',
    scale: '2',
    maptype: 'hybrid',
    markers: `color:0xEA4335|${lat},${lng}`,
    key
  });
  return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
}

export function buildChamadoPdfHtml(chamado) {
  const end = chamado.endereco || {};
  const resumo = chamado.viabilidadeResumo || {};
  const loc = chamado.localizacao || chamado.mapaCoords || {};
  const lat = loc.lat != null ? Number(loc.lat) : null;
  const lng = loc.lng != null ? Number(loc.lng) : null;
  const pedido = chamado.pedido || '—';
  const alaNumber = `ALA-${pedido}`;
  const viAla =
    chamado.viAla ||
    `VI ALA-${String(pedido).replace(/\D/g, '').padStart(7, '0') || '0000000'}`;

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const cidade = end.cidade || chamado.cidade || '—';
  const enderecoCompleto =
    end.completo ||
    [end.logradouro, end.numero, end.bairro, cidade, end.uf, end.cep ? `CEP ${formatCep(end.cep)}` : '']
      .filter(Boolean)
      .join(', ') ||
    '—';
  const numeroEndereco = end.numero || '—';
  const cep = formatCep(end.cep);
  const tabulacao = chamado.tabulacaoFinal || '—';
  const projetista =
    resumo.projetista || chamado.analiseIa?.modelo || currentUserFallback(chamado) || 'Portal CENSUP';

  const ctos = Array.isArray(chamado.ctos) ? chamado.ctos : [];
  const totalCtos = resumo.ctosEncontradas ?? ctos.length;
  const totalPortas =
    resumo.portasDisponiveis ??
    ctos.reduce((sum, cto) => {
      const total = Number(cto.vagas_total ?? cto.totalPortas ?? 0);
      const conectadas = Number(cto.clientes_conectados ?? cto.portasConectadas ?? 0);
      return sum + Math.max(0, total - conectadas);
    }, 0);

  const foraCobertura = resumo.dentroCobertura === false;
  const distCobertura = resumo.distanciaCoberturaMetros;
  let totalEquipamentosTexto = '';
  if (foraCobertura) {
    const distTxt =
      distCobertura != null
        ? distCobertura >= 1000
          ? `${(distCobertura / 1000).toFixed(2)} km`
          : `${Math.round(distCobertura)} m`
        : null;
    totalEquipamentosTexto = distTxt
      ? `<p><strong style="font-weight: bold; color: #F44336;">Fora da área de cobertura:</strong> cerca de <strong style="color:#F44336;">${escapeHtml(distTxt)}</strong> até a mancha mais próxima.</p>`
      : `<p><strong style="font-weight: bold; color: #F44336;">Fora da área de cobertura.</strong></p>`;
  } else if (totalCtos != null && totalCtos > 0) {
    totalEquipamentosTexto = `<p><strong>Total:</strong> <span style="font-weight: bold; color: #000000;">${escapeHtml(totalCtos)}</span> <strong style="font-weight: bold; color: #000000;">${Number(totalCtos) === 1 ? 'Equipamento encontrado' : 'Equipamentos encontrados'} dentro de 250m</strong></p>`;
  } else {
    totalEquipamentosTexto = `<p><strong>Total:</strong> <span style="font-weight: bold; color: #000000;">0</span> <strong style="font-weight: bold; color: #000000;">Equipamentos encontrados dentro de 250m</strong></p>`;
  }

  const mapUrl = buildStaticMapUrl(lat, lng);
  const coordsTxt =
    lat != null && lng != null && !Number.isNaN(lat) && !Number.isNaN(lng)
      ? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      : '—';

  const ctoRows =
    ctos.length > 0
      ? ctos
          .map((cto, index) => {
            const total = Number(cto.vagas_total ?? cto.totalPortas ?? 0);
            const conectadas = Number(cto.clientes_conectados ?? cto.portasConectadas ?? 0);
            const disponiveis = Math.max(0, total - conectadas);
            const distM = Number(cto.distancia_metros ?? cto.distanciaMetros ?? 0);
            const distKm = (distM / 1000).toFixed(3);
            const semPortas = disponiveis === 0;
            const styleColor = semPortas ? ' style="color: #F44336;"' : '';
            return `
          <tr${styleColor}>
            <td${styleColor}>${index + 1}</td>
            <td${styleColor}>${escapeHtml(cto.cidade || cidade)}</td>
            <td${styleColor}>${escapeHtml(cto.pop || '—')}</td>
            <td${styleColor}>${escapeHtml(cto.nome || cto.name || '—')}</td>
            <td${styleColor}>${escapeHtml(cto.id || '—')}</td>
            <td${styleColor}>${escapeHtml(total)}</td>
            <td${styleColor}>${escapeHtml(conectadas)}</td>
            <td${styleColor}>${escapeHtml(disponiveis)}</td>
            <td${styleColor}>${escapeHtml(distM)}m (${escapeHtml(distKm)}km)</td>
          </tr>`;
          })
          .join('')
      : `
          <tr>
            <td colspan="9" style="text-align:center; color:#6b7280; padding: 14px;">
              Nenhum equipamento CTO listado nesta análise ainda.
            </td>
          </tr>`;

  const mapSection = mapUrl
    ? `
              <div class="map-section">
                <h2>Visualização do Mapa</h2>
                <div class="map-wrapper">
                  <div class="map-image-container">
                    <img src="${escapeHtml(mapUrl)}" alt="Mapa com localização do cliente" class="map-image" />
                  </div>
                </div>
              </div>`
    : `
              <div class="map-section">
                <h2>Visualização do Mapa</h2>
                <div class="map-placeholder">
                  Mapa indisponível — execute <strong>Analisar localização</strong> para obter coordenadas.
                </div>
              </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório de Análise de Viabilidade Técnica - ${escapeHtml(viAla)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      padding: 8px;
      background: white !important;
      font-size: 13px;
      line-height: 1.4;
      color: #333;
    }
    .pdf-header {
      background: linear-gradient(135deg, #7B68EE 0%, #6495ED 100%);
      color: white;
      padding: 10px 14px;
      border-radius: 4px 4px 0 0;
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 6px rgba(123, 104, 238, 0.3);
      gap: 12px;
    }
    .pdf-header h1 {
      font-size: 18px;
      font-weight: 700;
      margin: 0;
      color: white;
      line-height: 1.35;
    }
    .pdf-header .date-info {
      font-size: 11px;
      opacity: 0.95;
      text-align: right;
      font-weight: 500;
      line-height: 1.4;
      flex-shrink: 0;
    }
    .report-container {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      align-items: stretch;
    }
    .report-header {
      background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      flex: 0 0 40%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
    }
    .report-header h2,
    .map-section h2,
    .table-container h2 {
      color: #7B68EE;
      margin: 0 0 5px;
      font-size: 14px;
      font-weight: 700;
      padding-bottom: 3px;
      border-bottom: 2px solid #7B68EE;
      line-height: 1.3;
    }
    .map-section h2 { text-align: center; width: 100%; }
    .report-info { display: grid; gap: 3px; margin-bottom: 5px; flex: 1; }
    .report-info-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 3px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .report-info-item:last-child { border-bottom: none; }
    .report-info-label {
      font-weight: 600;
      color: #666;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.2px;
    }
    .report-info-value {
      color: #333;
      font-size: 12px;
      font-weight: 500;
      word-break: break-word;
    }
    .summary-stats {
      margin-top: auto;
      padding-top: 5px;
      border-top: 2px solid #7B68EE;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .summary-stats p { margin: 0; font-size: 11px; color: #333; line-height: 1.35; }
    .summary-stats strong { color: #7B68EE; font-weight: 700; }
    .map-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 0;
    }
    .map-wrapper {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      max-width: 100%;
    }
    .map-image-container {
      display: block;
      width: 100%;
      border: 2px solid #7B68EE;
      border-radius: 4px;
      overflow: hidden;
      box-shadow: 0 1px 4px rgba(123, 104, 238, 0.2);
      line-height: 0;
      background: #f3f4f6;
    }
    .map-image {
      display: block;
      width: 100%;
      height: auto;
      max-height: 340px;
      object-fit: contain;
    }
    .map-placeholder {
      width: 100%;
      min-height: 220px;
      border: 2px dashed #c4b5fd;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 16px;
      color: #6b7280;
      background: #faf5ff;
      font-size: 12px;
    }
    .table-container {
      margin-top: 6px;
      overflow-x: auto;
      background: white;
      border-radius: 4px;
      padding: 6px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.08);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead {
      background: linear-gradient(135deg, #7B68EE 0%, #6495ED 100%);
      color: white;
    }
    th, td {
      padding: 6px 5px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { font-weight: 700; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .watermark {
      margin-top: 14px;
      text-align: center;
      font-size: 13px;
      color: #333;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div class="pdf-header">
    <h1>
      Relatório de Análise de Viabilidade Técnica - ${escapeHtml(viAla)}<br>
      <span style="font-size: 14px; font-weight: 500; opacity: 0.95;">Alares Engenharia - ${escapeHtml(alaNumber)}</span>
    </h1>
    <div class="date-info">
      <div style="margin-bottom: 3px;">Gerado em: ${escapeHtml(dateStr)} às ${escapeHtml(timeStr)}</div>
      <div style="font-size: 10px; opacity: 0.85;">Sistema de Viabilidade Técnica</div>
    </div>
  </div>

  <div class="report-container">
    <div class="report-header">
      <h2>Informações do Relatório</h2>
      <div class="report-info">
        <div class="report-info-item">
          <span class="report-info-label">Número do ALA</span>
          <span class="report-info-value">${escapeHtml(alaNumber)}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Cidade</span>
          <span class="report-info-value">${escapeHtml(cidade)}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Endereço Completo</span>
          <span class="report-info-value">${escapeHtml(enderecoCompleto)}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Número do Endereço</span>
          <span class="report-info-value">${escapeHtml(numeroEndereco)}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">CEP do Endereço</span>
          <span class="report-info-value">${escapeHtml(cep)}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Latitude e Longitude</span>
          <span class="report-info-value">${escapeHtml(coordsTxt)}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Tabulação Final</span>
          <span class="report-info-value">${escapeHtml(tabulacao)}</span>
        </div>
        <div class="report-info-item">
          <span class="report-info-label">Projetista</span>
          <span class="report-info-value">${escapeHtml(projetista)}</span>
        </div>
      </div>
      <div class="summary-stats">
        ${totalEquipamentosTexto}
        <p><strong>Total de Portas Disponíveis:</strong> <span style="font-weight: bold; color: #000000;">${escapeHtml(totalPortas ?? 0)}</span> <strong style="font-weight: bold; color: #000000;">portas</strong></p>
      </div>
    </div>
    ${mapSection}
  </div>

  <div class="table-container">
    <h2>Equipamentos CTO Encontrados</h2>
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Cidade</th>
          <th>POP</th>
          <th>Nome</th>
          <th>ID</th>
          <th>Total de Portas</th>
          <th>Portas Conectadas</th>
          <th>Portas Disponíveis</th>
          <th>Distância</th>
        </tr>
      </thead>
      <tbody>
        ${ctoRows}
      </tbody>
    </table>
  </div>

  <div class="watermark">Setor de Planejamento e Projetos - Engenharia Alares</div>
</body>
</html>`;
}

function currentUserFallback(chamado) {
  return chamado.projetista || chamado.usuarioAnalise || null;
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

export async function findChamadoByPedidoOrCode({ pedido, agendaCode } = {}) {
  const store = await readStore();
  return (
    store.chamados.find((item) => {
      if (agendaCode && item.agendaCode === agendaCode) return true;
      if (pedido && String(item.pedido) === String(pedido)) return true;
      return false;
    }) || null
  );
}

const TABULACAO_PRESERVE_FIELDS = [
  'tabulacaoFinal',
  'tabulacaoConfianca',
  'tabulacaoStatus',
  'viabilidadeResumo',
  'analiseIa'
];

export async function upsertChamadoFromAgenda(payload) {
  const existing = await findChamadoByPedidoOrCode({
    pedido: payload.pedido,
    agendaCode: payload.agendaCode || payload.id
  });

  const id = payload.id || payload.agendaCode || existing?.id;
  const merged = { ...payload, id };

  if (existing) {
    const preserveTabulacao =
      existing.tabulacaoFinal &&
      existing.tabulacaoStatus &&
      existing.tabulacaoStatus !== 'aguardando_analise';

    if (preserveTabulacao) {
      for (const field of TABULACAO_PRESERVE_FIELDS) {
        if (existing[field] !== undefined && existing[field] !== null) {
          merged[field] = existing[field];
        }
      }
    }
  }

  return upsertChamado(merged);
}

export async function upsertChamado(payload) {
  const store = await readStore();
  const pedidoKey = payload.pedido != null ? String(payload.pedido) : null;
  let existingIndex = -1;

  if (payload.id) {
    existingIndex = store.chamados.findIndex((item) => item.id === payload.id);
  }
  if (existingIndex < 0 && payload.agendaCode) {
    existingIndex = store.chamados.findIndex((item) => item.agendaCode === payload.agendaCode);
  }
  if (existingIndex < 0 && pedidoKey) {
    existingIndex = store.chamados.findIndex((item) => String(item.pedido) === pedidoKey);
  }

  const id =
    payload.id ||
    (existingIndex >= 0 ? store.chamados[existingIndex].id : null) ||
    payload.agendaCode ||
    crypto.randomUUID();

  const now = new Date().toISOString();
  const previous = existingIndex >= 0 ? store.chamados[existingIndex] : {};
  const next = {
    ...previous,
    ...payload,
    id,
    endereco: {
      ...(previous.endereco || {}),
      ...(payload.endereco || {})
    },
    mapaReferencias:
      payload.mapaReferencias?.length > 0
        ? payload.mapaReferencias
        : previous.mapaReferencias || [],
    mapaCoords: payload.mapaCoords || previous.mapaCoords || null,
    updatedAt: now,
    createdAt: previous.createdAt || now
  };

  if (existingIndex >= 0) {
    store.chamados[existingIndex] = next;
  } else {
    store.chamados.unshift(next);
  }

  await writeStore(store);
  return next;
}

export async function analisarChamadoById(id, { force = false } = {}) {
  const store = await readStore();
  const index = store.chamados.findIndex((item) => item.id === id);
  if (index < 0) {
    const err = new Error('Chamado não encontrado');
    err.statusCode = 404;
    throw err;
  }

  const chamado = store.chamados[index];
  const jaRevisado =
    chamado.tabulacaoStatus === 'aprovada' || chamado.tabulacaoStatus === 'corrigida';

  if (jaRevisado && !force) {
    return {
      chamado: await getChamadoById(id),
      skipped: true,
      reason: 'Tabulação já revisada pelo usuário'
    };
  }

  store.chamados[index] = {
    ...chamado,
    analiseStatus: 'processando',
    updatedAt: new Date().toISOString()
  };
  await writeStore(store);

  try {
    const result = await analisarLocalizacaoChamado(store.chamados[index]);
    const updated = {
      ...store.chamados[index],
      analiseStatus: result.analiseStatus,
      localizacao: result.localizacao,
      passosAnalise: result.passos,
      viabilidadeResumo: result.viabilidadeResumo,
      tabulacaoFinal: result.tabulacaoFinal ?? store.chamados[index].tabulacaoFinal,
      tabulacaoConfianca: result.tabulacaoConfianca ?? store.chamados[index].tabulacaoConfianca,
      tabulacaoStatus: result.tabulacaoStatus || store.chamados[index].tabulacaoStatus,
      analiseIa: result.analiseIa,
      updatedAt: new Date().toISOString()
    };

    // re-read in case of concurrent writes
    const fresh = await readStore();
    const idx = fresh.chamados.findIndex((item) => item.id === id);
    if (idx >= 0) {
      fresh.chamados[idx] = { ...fresh.chamados[idx], ...updated };
      await writeStore(fresh);
    }

    return {
      chamado: await getChamadoById(id),
      skipped: false,
      result
    };
  } catch (err) {
    const fresh = await readStore();
    const idx = fresh.chamados.findIndex((item) => item.id === id);
    if (idx >= 0) {
      fresh.chamados[idx] = {
        ...fresh.chamados[idx],
        analiseStatus: 'falhou',
        analiseIa: {
          modelo: 'cascata-localizacao-v1',
          motivoSugestao: err.message || 'Falha ao analisar localização'
        },
        updatedAt: new Date().toISOString()
      };
      await writeStore(fresh);
    }
    throw err;
  }
}

/** Dispara análise sem bloquear a resposta do upsert (best-effort). */
export function analisarChamadoEmBackground(id) {
  setTimeout(() => {
    analisarChamadoById(id).catch((err) => {
      console.error('❌ [PortalCENSUP] Análise em background:', err.message || err);
    });
  }, 50);
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
