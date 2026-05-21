// PDF multipágina B2B — capa, cabeçalho, passos + identidade Alares

import { BRAND, TOTAL_PDF_PAGES } from './formularioPdfBranding.js';

export { BRAND, TOTAL_PDF_PAGES } from './formularioPdfBranding.js';

/** Estado inicial do formulário (Capa, Cabeçalho, Passo 1) */
export function defaultFormData() {
  return {
    capa: {
      titulo: '',
      clienteProjeto: '',
      data: '',
      cidade: ''
    },
    cabecalho: {
      numeroReferencia: '',
      cliente: '',
      local: ''
    },
    passo1: {
      tituloPasso: 'XXXXX',
      descricao: '',
      responsavel: '',
      data: ''
    }
  };
}

export const PDF_PAGES = [
  { id: 'capa', number: 1, title: 'Capa', formKey: 'capa' },
  { id: 'cabecalho', number: 2, title: 'Cabeçalho', formKey: 'cabecalho' },
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
    bottom: 28mm;
    right: 16mm;
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
  .empty-value { color: #aaa; font-style: italic; }

  /* —— Capa —— */
  .pdf-page-capa {
    padding: 18mm 16mm 14mm;
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

  @page { size: A4 portrait; margin: 10mm; }
  @media print {
    * {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body { background: white !important; padding: 0 !important; }
    .pdf-document { max-width: none; }
    .pdf-page {
      min-height: 0;
      margin: 0 !important;
      page-break-after: always;
      break-after: page;
    }
    .pdf-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .pdf-watermark-text span { opacity: 0.04; }
    .pdf-watermark-logo { opacity: 0.05; }
  }
`;

function buildSectionFields(items) {
  return items
    .map(
      ({ label, value }) => `
      <div class="report-info-item">
        <span class="report-info-label">${escapeHtml(label)}</span>
        <span class="report-info-value">${displayValue(value)}</span>
      </div>`
    )
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
  const clientLabel = getClientLabel(formData);

  return `
    <div class="pdf-page pdf-page-cabecalho pdf-page-inner" data-pdf-page="2">
      ${buildBrandLayers(logoUrl, 'inner')}
      ${buildInnerPageHeader(logoUrl, clientLabel, 'Cabeçalho')}
      <div class="page-body-inner">
        <h2 class="page-title">Informações do projeto</h2>
        <div class="page-content">
          <div class="report-info">
            ${buildSectionFields([
              { label: 'Número de referência', value: formData.cabecalho.numeroReferencia },
              { label: 'Cliente', value: formData.cabecalho.cliente },
              { label: 'Local', value: formData.cabecalho.local }
            ])}
          </div>
        </div>
      </div>
      ${buildInnerPageFooter(2)}
    </div>
  `;
}

function buildPagePasso1(formData, options = {}) {
  const logoUrl = getLogoUrl(options);
  const clientLabel = getClientLabel(formData);
  const tituloPasso = formData.passo1.tituloPasso?.trim() || 'XXXXX';

  return `
    <div class="pdf-page pdf-page-passo1 pdf-page-inner" data-pdf-page="3">
      ${buildBrandLayers(logoUrl, 'inner')}
      ${buildInnerPageHeader(logoUrl, clientLabel, `Passo 1° — ${tituloPasso}`)}
      <div class="page-body-inner">
        <h2 class="page-title">Passo 1° — ${escapeHtml(tituloPasso)}</h2>
        <div class="page-content">
          <div class="report-info">
            ${buildSectionFields([
              { label: 'Descrição', value: formData.passo1.descricao },
              { label: 'Responsável técnico', value: formData.passo1.responsavel },
              { label: 'Data', value: formData.passo1.data }
            ])}
          </div>
        </div>
      </div>
      ${buildInnerPageFooter(3)}
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
  const fileBase = formData.cabecalho.numeroReferencia?.trim() || 'Formulario-Engenharia';
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

export function openPdfPrintWindow(formData, options = {}) {
  const baseUrl =
    options.baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const html = buildFullPdfHtml(formData, {}, {
    baseUrl,
    logoDataUrl: options.logoDataUrl,
    capaOndasDataUrl: options.capaOndasDataUrl
  });
  const fileName =
    options.fileName ||
    `${formData.cabecalho.numeroReferencia?.trim() || 'Formulario'} - Engenharia.pdf`;

  const printWindow = window.open('', '_blank');
  if (!printWindow || !printWindow.document) {
    return { success: false, error: 'popup_blocked' };
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.document.title = fileName.replace('.pdf', '');

  const tryPrint = () => {
    if (printWindow.closed) return;
    try {
      printWindow.print();
    } catch (err) {
      console.error('Erro ao imprimir PDF:', err);
    }
  };

  if (printWindow.document.readyState === 'complete') {
    setTimeout(tryPrint, 400);
  } else {
    printWindow.onload = () => setTimeout(tryPrint, 400);
  }

  return { success: true };
}
