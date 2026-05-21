// PDF multipágina B2B — capa, cabeçalho, passos + identidade Alares

import { BRAND, TOTAL_PDF_PAGES } from './formularioPdfBranding.js';

export { BRAND, TOTAL_PDF_PAGES } from './formularioPdfBranding.js';

/** Campos da página 2 — ordem fixa do documento */
export const CABECALHO_FIELDS = [
  { key: 'operacao', label: 'Operação', placeholder: 'Ex: Alares' },
  { key: 'objetivo', label: 'Objetivo', placeholder: 'Ex: 200MBS PTP' },
  { key: 'cliente', label: 'Cliente', placeholder: 'Ex: Sicred Cambará' },
  { key: 'endereco', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade - UF, CEP' },
  {
    key: 'coordenadaAbordagem',
    label: 'Coordenada do ponto de abordagem (cliente)',
    placeholder: 'Ex: -23.041665, -50.073588'
  },
  { key: 'projetista', label: 'Projetista', placeholder: 'Nome do projetista' },
  {
    key: 'supervisorPlanejamento',
    label: 'Supervisor Planejamento e Engenharia de Redes FTTx',
    placeholder: 'Nome do supervisor'
  },
  { key: 'contatoConsultor', label: 'Nome e Contato do consultor', placeholder: 'Nome e telefone/e-mail' },
  { key: 'contatoCliente', label: 'Nome e Contato do cliente', placeholder: 'Nome e telefone/e-mail' },
  { key: 'contrato', label: 'Contrato', placeholder: 'Ex: 3933511' },
  { key: 'ordemJira', label: 'Ordem Jira', placeholder: 'Ex: ENGT-46557' },
  { key: 'ativacaoPortaSw', label: 'Ativação de porta SW', placeholder: 'Ex: ENGT-47714' },
  { key: 'osProjetoTecB2b', label: 'O.S de Projeto tec. B2B', placeholder: 'Ex: 39048036' },
  { key: 'supervisorRedeExterna', label: 'Supervisor de Rede Externa', placeholder: 'Nome do supervisor' },
  { key: 'projetoOzmap', label: 'Projeto ozmap', placeholder: 'Ex: PR - Cambará - Webby' },
  {
    key: 'metragemFibra',
    label: 'Metragem total percorrida pela fibra',
    placeholder: 'Ex: 650m'
  },
  {
    key: 'observacoesAdicionais',
    label: 'Observações adicionais',
    placeholder: 'Texto livre',
    multiline: true
  }
];

function emptyCabecalho() {
  return Object.fromEntries(CABECALHO_FIELDS.map(({ key }) => [key, '']));
}

/** Estado inicial do formulário (Capa, Cabeçalho, Passo 1) */
export function defaultFormData() {
  return {
    capa: {
      titulo: '',
      clienteProjeto: '',
      data: '',
      cidade: ''
    },
    cabecalho: emptyCabecalho(),
    passo1: {
      tituloPasso: 'XXXXX',
      descricao: '',
      imagemDataUrl: '',
      imagemNome: ''
    }
  };
}

export const PDF_PAGES = [
  { id: 'capa', number: 1, title: 'Capa', formKey: 'capa' },
  { id: 'cabecalho', number: 2, title: 'Informações do projeto', formKey: 'cabecalho' },
  { id: 'passo1', number: 3, title: 'Passo 1°', formKey: 'passo1' }
];

export const CAPA_RODAPE_FIXO = BRAND.rodape;
export const CAPA_LOGO_PATH = BRAND.logoPath;

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** URL segura em atributos src/style (preserva data: URLs) */
function attrUrl(value) {
  if (value == null || value === '') return '';
  return String(value).replace(/"/g, '&quot;');
}

function displayValue(value) {
  const text = (value ?? '').toString().trim();
  return text ? escapeHtml(text) : '<span class="empty-value">—</span>';
}

/** Preserva quebras de linha e parágrafos (espaços em branco do textarea) */
function displayMultilineValue(value) {
  const text = (value ?? '').toString();
  if (!text.trim()) return '<span class="empty-value">—</span>';
  return escapeHtml(text);
}

const RICH_HTML_ALLOWED = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'BR',
  'P',
  'DIV',
  'UL',
  'OL',
  'LI',
  'SPAN'
]);

/** Remove tags/atributos perigosos; mantém negrito, itálico, listas e quebras */
export function sanitizeRichHtml(html) {
  const raw = (html ?? '').toString();
  if (!raw.trim()) return '';

  if (typeof DOMParser === 'undefined') {
    return escapeHtml(raw).replace(/\n/g, '<br>');
  }

  const doc = new DOMParser().parseFromString(raw, 'text/html');

  function walk(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return escapeHtml(node.textContent || '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const tag = node.tagName;
    if (!RICH_HTML_ALLOWED.has(tag)) {
      return Array.from(node.childNodes).map(walk).join('');
    }

    const inner = Array.from(node.childNodes).map(walk).join('');
    if (tag === 'BR') return '<br>';
    return `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`;
  }

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join('')
    .trim();
}

function hasRichMarkup(value) {
  return /<[a-z][\s\S]*>/i.test(String(value || ''));
}

/** Descrição: HTML sanitizado (negrito etc.) ou texto simples com quebras */
function displayDescricaoValue(value) {
  const raw = (value ?? '').toString();
  if (!raw.trim()) return '<span class="empty-value">—</span>';
  if (!hasRichMarkup(raw)) {
    return displayMultilineValue(raw);
  }
  const safe = sanitizeRichHtml(raw);
  return safe || '<span class="empty-value">—</span>';
}

export function getFormattedDateTime() {
  const now = new Date();
  return {
    dateStr: now.toLocaleDateString('pt-BR'),
    timeStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
}

export function resolveAssetUrl(path, baseUrl = '') {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const base = (baseUrl || '').replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${clean}` : clean;
}

/** Carrega asset público como data URL (prévia em iframe srcdoc + impressão) */
export async function loadAssetDataUrl(paths, baseUrl = '') {
  const list = (Array.isArray(paths) ? paths : [paths]).filter(Boolean);
  for (const path of list) {
    const url = resolveAssetUrl(path, baseUrl);
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const blob = await res.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
        reader.onerror = () => resolve('');
        reader.readAsDataURL(blob);
      });
      if (dataUrl) return dataUrl;
    } catch {
      /* tenta próximo */
    }
  }
  return '';
}

/** Logo da capa — Imagem1.svg com fallback PNG */
export async function loadLogoDataUrl(baseUrl = '') {
  return loadAssetDataUrl([BRAND.logoPath, BRAND.logoPathPngFallback], baseUrl);
}

/** Fundo de ondas da capa — Imagem2.svg com fallback leve */
export async function loadCapaOndasDataUrl(baseUrl = '') {
  return loadAssetDataUrl([BRAND.capaOndasPath, '/images/capa-ondas.svg'], baseUrl);
}

function getLogoUrl(options = {}) {
  if (options.logoDataUrl) return options.logoDataUrl;
  return resolveAssetUrl(BRAND.logoPath, options.baseUrl || '');
}

function getCapaOndasUrl(options = {}) {
  if (options.capaOndasDataUrl) return options.capaOndasDataUrl;
  return resolveAssetUrl(BRAND.capaOndasPath, options.baseUrl || '');
}

function getClientLabel(formData) {
  return (
    formData.capa?.clienteProjeto?.trim() ||
    formData.cabecalho?.cliente?.trim() ||
    ''
  );
}

function buildBrandLayers(logoUrl, variant = 'inner') {
  const capaClass = variant === 'capa' ? ' brand-layer-capa' : '';
  const logoBg = logoUrl
    ? `background-image: url('${logoUrl.replace(/'/g, '%27')}');`
    : '';

  return `
    <div class="pdf-brand-waves${capaClass}" aria-hidden="true"></div>
    <div class="pdf-watermark-text" aria-hidden="true">
      <span>${escapeHtml(BRAND.marcaAgua)}</span>
    </div>
    ${
      logoUrl
        ? `<div class="pdf-watermark-logo${capaClass}" style="${logoBg}" aria-hidden="true"></div>`
        : ''
    }
    <div class="pdf-watermark-confidential" aria-hidden="true">${escapeHtml(BRAND.avisoConfidencial)}</div>
  `;
}

function buildInnerPageHeader(logoUrl, clientLabel, sectionTitle) {
  const clientHtml = clientLabel
    ? `<span class="page-header-client">${escapeHtml(clientLabel)}</span>`
    : '';

  return `
    <header class="page-header-bar">
      <div class="page-header-left">
        ${logoUrl ? `<img class="page-header-logo" src="${attrUrl(logoUrl)}" alt="${escapeHtml(BRAND.nome)}" />` : ''}
        <span class="page-header-brand">${escapeHtml(BRAND.subtituloMarca)}</span>
      </div>
      <div class="page-header-right">
        ${clientHtml}
        <span class="page-header-section">${escapeHtml(sectionTitle)}</span>
      </div>
    </header>
  `;
}

function buildInnerPageFooter(pageNum) {
  return `
    <footer class="page-footer-bar">
      <span class="page-footer-brand">${escapeHtml(BRAND.rodape)}</span>
      <span class="page-footer-pagina">Página ${pageNum} de ${TOTAL_PDF_PAGES}</span>
    </footer>
  `;
}

/** Rodapé páginas 2 e 3 — texto como na capa + só "Página N" */
function buildArtworkPageFooter(pageNum) {
  return `
    <footer class="artwork-page-footer">
      <p class="capa-rodape">${escapeHtml(BRAND.rodape)}</p>
      <span class="artwork-page-num">Página ${pageNum}</span>
    </footer>
  `;
}

/** CSS — documento B2B */
export const FORMULARIO_PDF_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    background: #e8ecf4 !important;
    margin: 0;
    padding: 12px 0;
    font-size: 13px;
    line-height: 1.4;
    color: ${BRAND.cores.texto};
  }
  .pdf-document {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
  }
  .pdf-page {
    width: 100%;
    min-height: 277mm;
    background: white;
    padding: 0;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .pdf-page + .pdf-page { margin-top: 12px; }

  /* —— Camadas de marca (todas as páginas) —— */
  .pdf-brand-waves {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.28;
    background:
      radial-gradient(ellipse 120% 80% at 10% 20%, rgba(180, 190, 210, 0.4) 0%, transparent 55%),
      radial-gradient(ellipse 100% 70% at 90% 60%, rgba(190, 200, 215, 0.35) 0%, transparent 50%),
      radial-gradient(ellipse 90% 60% at 50% 95%, rgba(175, 185, 200, 0.3) 0%, transparent 45%);
  }
  .pdf-brand-waves.brand-layer-capa { opacity: 0.45; }
  .pdf-watermark-text {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    overflow: hidden;
  }
  .pdf-watermark-text span {
    font-size: 72pt;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: ${BRAND.cores.primaria};
    opacity: 0.045;
    transform: rotate(-32deg);
    user-select: none;
    white-space: nowrap;
  }
  .pdf-watermark-logo {
    position: absolute;
    left: 50%;
    top: 48%;
    width: 280px;
    height: 120px;
    transform: translate(-50%, -50%);
    z-index: 0;
    pointer-events: none;
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
    opacity: 0.055;
  }
  .pdf-watermark-logo.brand-layer-capa {
    width: 320px;
    height: 140px;
    opacity: 0.04;
  }
  .pdf-watermark-confidential {
    position: absolute;
    bottom: 22mm;
    right: 14mm;
    z-index: 0;
    font-size: 7pt;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${BRAND.cores.secundaria};
    opacity: 0.55;
    pointer-events: none;
  }
  .pdf-page-capa .pdf-watermark-confidential {
    display: none;
  }
  .capa-ondas-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center bottom;
    z-index: 0;
    pointer-events: none;
    opacity: 1;
  }
  .pdf-page-capa .pdf-brand-waves.brand-layer-capa,
  .pdf-page-capa .pdf-watermark-logo,
  .pdf-page-capa .pdf-watermark-text {
    display: none;
  }

  /* —— Páginas 2 e 3 — visual alinhado à capa (Imagem1 + Imagem2) —— */
  .pdf-page-cabecalho,
  .pdf-page-passo1 {
    padding: 18mm 16mm 14mm;
  }
  .page-shell-artwork {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    flex: 1;
  }
  .page-shell-artwork .capa-logo-wrap {
    margin-bottom: 6mm;
  }
  .page-top-client {
    margin: 0 0 8mm;
    font-size: 10pt;
    font-weight: 700;
    color: ${BRAND.cores.primaria};
    text-transform: uppercase;
    letter-spacing: 0.02em;
    line-height: 1.35;
  }
  .page-body-artwork {
    flex: 1;
    padding: 0;
  }
  .artwork-page-footer {
    position: relative;
    z-index: 2;
    margin-top: auto;
    padding-top: 6mm;
  }
  .artwork-page-footer .capa-rodape {
    margin-top: 0;
    padding-top: 0;
  }
  .artwork-page-num {
    position: absolute;
    right: 0;
    bottom: 0;
    font-size: 9.5pt;
    font-weight: 600;
    color: ${BRAND.cores.secundaria};
    letter-spacing: 0.02em;
  }

  /* —— Cabeçalho / rodapé páginas internas —— */
  .page-header-bar {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10mm 14mm 4mm;
    border-bottom: 2px solid ${BRAND.cores.accent};
    background: linear-gradient(180deg, #fafbff 0%, #ffffff 100%);
  }
  .page-header-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .page-header-logo {
    height: 32px;
    width: auto;
    max-width: 140px;
    object-fit: contain;
    object-position: left center;
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
  }
  .page-header-brand {
    font-size: 8pt;
    font-weight: 600;
    color: ${BRAND.cores.secundaria};
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.2;
  }
  .page-header-right {
    text-align: right;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .page-header-client {
    font-size: 9pt;
    font-weight: 700;
    color: ${BRAND.cores.primaria};
    text-transform: uppercase;
    letter-spacing: 0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 95mm;
  }
  .page-header-section {
    font-size: 8pt;
    font-weight: 600;
    color: ${BRAND.cores.secundaria};
  }
  .page-body-inner {
    position: relative;
    z-index: 1;
    flex: 1;
    padding: 8mm 14mm 6mm;
    display: flex;
    flex-direction: column;
  }
  .page-footer-bar {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 4mm 14mm 10mm;
    border-top: 1px solid rgba(123, 104, 238, 0.25);
    background: #fafbff;
  }
  .page-footer-brand {
    font-size: 8pt;
    font-weight: 600;
    color: ${BRAND.cores.secundaria};
  }
  .page-footer-pagina {
    font-size: 8pt;
    font-weight: 600;
    color: ${BRAND.cores.primaria};
  }

  .page-title {
    color: ${BRAND.cores.accent};
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 10px;
    padding-bottom: 5px;
    border-bottom: 2px solid ${BRAND.cores.accent};
    line-height: 1.3;
  }
  .page-content { flex: 1; }
  .report-info {
    display: grid;
    grid-template-columns: 1fr;
    gap: 6px;
  }
  .report-info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 0;
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
  .report-info-value-multiline {
    white-space: pre-wrap;
    word-break: break-word;
    line-height: 1.45;
  }
  .report-info-rich {
    white-space: normal;
  }
  .report-info-rich strong,
  .report-info-rich b {
    font-weight: 700;
  }
  .report-info-rich em,
  .report-info-rich i {
    font-style: italic;
  }
  .report-info-rich u {
    text-decoration: underline;
  }
  .report-info-rich ul,
  .report-info-rich ol {
    margin: 0.35em 0 0.35em 1.2em;
    padding: 0;
  }
  .report-info-rich p,
  .report-info-rich div {
    margin: 0 0 0.5em;
  }
  .report-info-rich p:last-child,
  .report-info-rich div:last-child {
    margin-bottom: 0;
  }
  .empty-value { color: #aaa; font-style: italic; }

  .passo1-imagem-wrap {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #f0f0f0;
  }
  .passo1-imagem {
    display: block;
    max-width: 100%;
    max-height: 140mm;
    width: auto;
    height: auto;
    object-fit: contain;
    object-position: left top;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    background: #fff;
  }

  /* —— Capa —— */
  .pdf-page-capa {
    padding: 18mm 16mm 14mm;
    display: flex;
    flex-direction: column;
  }
  .capa-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    flex: 1;
  }
  .capa-logo-wrap { margin-bottom: 10mm; }
  .capa-logo {
    height: 64px;
    width: auto;
    max-width: 280px;
    object-fit: contain;
    object-position: left center;
    display: block;
    image-rendering: auto;
  }
  .capa-main-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 6mm 4mm 0;
  }
  .capa-titulo {
    font-size: 17pt;
    font-weight: 700;
    color: ${BRAND.cores.primaria};
    line-height: 1.35;
    max-width: 95%;
    margin: 0 0 10px;
  }
  .capa-cliente {
    font-size: 12pt;
    font-weight: 400;
    color: #111;
    text-transform: uppercase;
    letter-spacing: 0.02em;
    line-height: 1.4;
    max-width: 95%;
  }
  .capa-meta-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10mm 0 14mm;
    gap: 4px;
  }
  .capa-data, .capa-cidade {
    font-size: 13pt;
    font-weight: 700;
    color: #111;
    line-height: 1.35;
  }
  .capa-rodape {
    margin-top: auto;
    text-align: center;
    font-size: 9.5pt;
    font-weight: 600;
    color: ${BRAND.cores.secundaria};
    padding-top: 6mm;
    letter-spacing: 0.02em;
  }

  @page {
    size: A4 portrait;
    margin: 10mm;
  }
  @media print {
    * {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html,
    body {
      margin: 0 !important;
      padding: 0 !important;
      background: white !important;
    }
    .pdf-document {
      width: 100% !important;
      max-width: none !important;
      margin: 0 !important;
    }
    .pdf-page {
      width: 100% !important;
      min-height: 277mm !important;
      margin: 0 !important;
      page-break-after: always !important;
      break-after: page !important;
      page-break-inside: avoid !important;
      break-inside: avoid-page !important;
      box-shadow: none !important;
    }
    .pdf-page:last-child {
      page-break-after: auto !important;
      break-after: auto !important;
    }
    .pdf-page + .pdf-page {
      margin-top: 0 !important;
    }
    .pdf-watermark-text span { opacity: 0.04; }
    .pdf-watermark-logo { opacity: 0.05; }
  }
`;

function buildSectionFields(items) {
  return items
    .map(({ label, value, multiline, rich }) => {
      if (rich) {
        const valueHtml = displayDescricaoValue(value);
        const isEmpty = valueHtml.includes('empty-value');
        const valueClass = isEmpty
          ? 'report-info-value report-info-value-multiline'
          : 'report-info-value report-info-value-multiline report-info-rich';
        const tag = isEmpty ? 'span' : 'div';
        return `
      <div class="report-info-item">
        <span class="report-info-label">${escapeHtml(label)}</span>
        <${tag} class="${valueClass}">${valueHtml}</${tag}>
      </div>`;
      }

      const valueClass = multiline
        ? 'report-info-value report-info-value-multiline'
        : 'report-info-value';
      const valueHtml = multiline ? displayMultilineValue(value) : displayValue(value);
      return `
      <div class="report-info-item">
        <span class="report-info-label">${escapeHtml(label)}</span>
        <span class="${valueClass}">${valueHtml}</span>
      </div>`;
    })
    .join('');
}

function buildPageCapa(formData, options = {}) {
  const logoUrl = getLogoUrl(options);
  const ondasUrl = getCapaOndasUrl(options);
  const tituloDefault = 'Planejamento e Engenharia de Redes FTTx';
  const ondasImg = ondasUrl
    ? `<img class="capa-ondas-svg" src="${attrUrl(ondasUrl)}" alt="" aria-hidden="true" />`
    : '';

  return `
    <div class="pdf-page pdf-page-capa" data-pdf-page="1">
      ${ondasImg}
      ${buildBrandLayers(logoUrl, 'capa')}
      <div class="capa-inner">
        <div class="capa-logo-wrap">
          ${logoUrl ? `<img class="capa-logo" src="${attrUrl(logoUrl)}" alt="${escapeHtml(BRAND.nome)}" />` : ''}
        </div>
        <div class="capa-main-block">
          <h1 class="capa-titulo">${displayValue(formData.capa.titulo?.trim() || tituloDefault)}</h1>
          <p class="capa-cliente">${displayValue(formData.capa.clienteProjeto)}</p>
        </div>
        <div class="capa-meta-block">
          <p class="capa-data">${displayValue(formData.capa.data)}</p>
          <p class="capa-cidade">${displayValue(formData.capa.cidade)}</p>
        </div>
        <footer class="capa-rodape">${escapeHtml(BRAND.rodape)}</footer>
      </div>
    </div>
  `;
}

function buildPageCabecalho(formData, options = {}) {
  const logoUrl = getLogoUrl(options);
  const ondasUrl = getCapaOndasUrl(options);
  const clientLabel = getClientLabel(formData);
  const ondasImg = ondasUrl
    ? `<img class="capa-ondas-svg" src="${attrUrl(ondasUrl)}" alt="" aria-hidden="true" />`
    : '';
  const clientBlock = clientLabel
    ? `<p class="page-top-client">${escapeHtml(clientLabel)}</p>`
    : '';

  return `
    <div class="pdf-page pdf-page-cabecalho" data-pdf-page="2">
      ${ondasImg}
      <div class="page-shell-artwork">
        <div class="capa-logo-wrap">
          ${logoUrl ? `<img class="capa-logo" src="${attrUrl(logoUrl)}" alt="${escapeHtml(BRAND.nome)}" />` : ''}
        </div>
        ${clientBlock}
        <div class="page-body-inner page-body-artwork">
          <h2 class="page-title">Informações do projeto</h2>
          <div class="page-content">
            <div class="report-info">
              ${buildSectionFields(
                CABECALHO_FIELDS.map(({ key, label }) => ({
                  label,
                  value: formData.cabecalho[key]
                }))
              )}
            </div>
          </div>
        </div>
        ${buildArtworkPageFooter(2)}
      </div>
    </div>
  `;
}

function buildPasso1ImageBlock(passo1 = {}) {
  const src = passo1.imagemDataUrl?.trim();
  if (!src) {
    return `
      <div class="passo1-imagem-wrap">
        <span class="report-info-label">Imagem</span>
        <span class="report-info-value">${displayValue('')}</span>
      </div>`;
  }
  return `
    <div class="passo1-imagem-wrap">
      <span class="report-info-label">Imagem</span>
      <img
        class="passo1-imagem"
        src="${attrUrl(src)}"
        alt="${escapeHtml(passo1.imagemNome || 'Imagem do passo 1')}"
      />
    </div>`;
}

function buildPagePasso1(formData, options = {}) {
  const logoUrl = getLogoUrl(options);
  const ondasUrl = getCapaOndasUrl(options);
  const clientLabel = getClientLabel(formData);
  const tituloPasso = formData.passo1.tituloPasso?.trim() || 'XXXXX';
  const ondasImg = ondasUrl
    ? `<img class="capa-ondas-svg" src="${attrUrl(ondasUrl)}" alt="" aria-hidden="true" />`
    : '';
  const clientBlock = clientLabel
    ? `<p class="page-top-client">${escapeHtml(clientLabel)}</p>`
    : '';

  return `
    <div class="pdf-page pdf-page-passo1" data-pdf-page="3">
      ${ondasImg}
      <div class="page-shell-artwork">
        <div class="capa-logo-wrap">
          ${logoUrl ? `<img class="capa-logo" src="${attrUrl(logoUrl)}" alt="${escapeHtml(BRAND.nome)}" />` : ''}
        </div>
        ${clientBlock}
        <div class="page-body-inner page-body-artwork">
          <h2 class="page-title">Passo 1° — ${escapeHtml(tituloPasso)}</h2>
          <div class="page-content">
            <div class="report-info">
              ${buildSectionFields([
                { label: 'Descrição', value: formData.passo1.descricao, rich: true }
              ])}
              ${buildPasso1ImageBlock(formData.passo1)}
            </div>
          </div>
        </div>
        ${buildArtworkPageFooter(3)}
      </div>
    </div>
  `;
}

export function buildPdfBodyHtml(formData, meta = {}, options = {}) {
  return `
    <div class="pdf-document">
      ${buildPageCapa(formData, options)}
      ${buildPageCabecalho(formData, options)}
      ${buildPagePasso1(formData, options)}
    </div>
  `;
}

export function buildFullPdfHtml(formData, meta = {}, options = {}) {
  const fileBase =
    formData.cabecalho.ordemJira?.trim() ||
    formData.cabecalho.contrato?.trim() ||
    formData.cabecalho.cliente?.trim() ||
    'Formulario-Engenharia';
  const title = `${fileBase} - Engenharia`;
  const baseUrl = options.baseUrl || '';
  const baseTag = baseUrl
    ? `<base href="${escapeHtml(baseUrl.replace(/\/$/, '') + '/')}">`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    ${baseTag}
    <title>${escapeHtml(title)}</title>
    <style>${FORMULARIO_PDF_STYLES}</style>
  </head>
  <body>
    ${buildPdfBodyHtml(formData, meta, options)}
  </body>
</html>`;
}

function waitForPrintImages(doc, timeoutMs = 12000) {
  const pending = Array.from(doc.querySelectorAll('img')).filter((img) => !img.complete);

  if (!pending.length) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let done = 0;
    let settled = false;
    const finishAll = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const finishOne = () => {
      done += 1;
      if (done >= pending.length) finishAll();
    };
    const timer = setTimeout(finishAll, timeoutMs);

    pending.forEach((img) => {
      img.onload = finishOne;
      img.onerror = finishOne;
    });
  });
}

const PDF_PRINT_HINT =
  'Na impressão: destino "Salvar como PDF", margens "Padrão" (ou "Nenhuma") e desmarque "Cabeçalhos e rodapés" do navegador.';

/** Imprime o mesmo HTML da prévia (iframe oculto, sem pop-up). */
export function printPdfHtml(html, options = {}) {
  if (typeof document === 'undefined') {
    return Promise.resolve({ success: false, error: 'no_document' });
  }

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('title', 'Impressão do formulário');
  iframe.style.cssText =
    'position:fixed;left:-9999px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none';
  document.body.appendChild(iframe);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      setTimeout(() => iframe.remove(), 8000);
      resolve(result);
    };

    const runPrint = async () => {
      try {
        const doc = iframe.contentDocument;
        const win = iframe.contentWindow;
        if (!doc?.body || !win) {
          finish({ success: false, error: 'iframe_failed' });
          return;
        }
        if (options.title) doc.title = options.title;
        await waitForPrintImages(doc);
        win.focus();
        win.print();
        finish({ success: true, printHint: PDF_PRINT_HINT });
      } catch (err) {
        console.error('Erro ao imprimir PDF:', err);
        finish({ success: false, error: 'print_failed' });
      }
    };

    iframe.onload = () => setTimeout(runPrint, 200);
    iframe.onerror = () => finish({ success: false, error: 'iframe_failed' });
    iframe.srcdoc = html;
  });
}

/** Imprime a partir do iframe de prévia (WYSIWYG) ou replica o HTML em iframe oculto. */
export async function printEngineeringPdf(previewIframe, html, options = {}) {
  if (previewIframe?.contentWindow?.document?.body) {
    try {
      await waitForPrintImages(previewIframe.contentDocument);
      previewIframe.contentWindow.focus();
      previewIframe.contentWindow.print();
      return { success: true, printHint: PDF_PRINT_HINT };
    } catch (err) {
      console.warn('Impressão pela prévia falhou, usando cópia do HTML:', err);
    }
  }

  if (html) {
    return printPdfHtml(html, options);
  }

  return { success: false, error: 'no_html' };
}

export async function openPdfPrintWindow(formData, options = {}) {
  const baseUrl =
    options.baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const html =
    options.html ||
    buildFullPdfHtml(formData, {}, {
      baseUrl,
      logoDataUrl: options.logoDataUrl,
      capaOndasDataUrl: options.capaOndasDataUrl
    });
  const fileName =
    options.fileName ||
    `${formData.cabecalho.ordemJira?.trim() || formData.cabecalho.contrato?.trim() || formData.cabecalho.cliente?.trim() || 'Formulario'} - Engenharia.pdf`;

  const previewResult = await printEngineeringPdf(options.previewIframe, html, {
    title: fileName.replace('.pdf', '')
  });
  if (previewResult.success) return previewResult;

  const iframeResult = await printPdfHtml(html, {
    title: fileName.replace('.pdf', '')
  });
  if (iframeResult.success) return iframeResult;

  const printWindow = window.open('', '_blank');
  if (!printWindow || !printWindow.document) {
    return { success: false, error: 'popup_blocked' };
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = fileName.replace('.pdf', '');

  const runPrint = async () => {
    if (printWindow.closed) return;
    try {
      if (printWindow.document?.body) {
        await waitForPrintImages(printWindow.document);
      }
      printWindow.focus();
      printWindow.print();
    } catch (err) {
      console.error('Erro ao imprimir PDF:', err);
    }
  };

  if (printWindow.document.readyState === 'complete') {
    setTimeout(runPrint, 500);
  } else {
    printWindow.onload = () => setTimeout(runPrint, 500);
  }

  return { success: true, printHint: PDF_PRINT_HINT };
}
