// Estilos e geração de HTML do PDF — estrutura multipágina (1 capa, 2 cabeçalho, 3 passo 1)

export const PDF_PAGES = [
  { id: 'capa', number: 1, title: 'Capa', formKey: 'capa' },
  { id: 'cabecalho', number: 2, title: 'Cabeçalho', formKey: 'cabecalho' },
  { id: 'passo1', number: 3, title: 'Passo 1°', formKey: 'passo1' }
];

export const CAPA_RODAPE_FIXO = 'Planejamento e Projetos - Engenharia Alares';
export const CAPA_LOGO_PATH = '/images/alares-logo.png';

export const defaultFormData = () => ({
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
});

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function displayValue(value) {
  const text = (value ?? '').toString().trim();
  return text ? escapeHtml(text) : '<span class="empty-value">—</span>';
}

export function getFormattedDateTime() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return { dateStr, timeStr };
}

/** CSS compartilhado — documento multipágina (layout das páginas será refinado depois) */
export const FORMULARIO_PDF_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    background: #e8ecf4 !important;
    margin: 0;
    padding: 12px 0;
    font-size: 13px;
    line-height: 1.4;
    color: #333;
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
    padding: 14mm 12mm;
    position: relative;
    display: flex;
    flex-direction: column;
  }
  .pdf-page + .pdf-page {
    margin-top: 12px;
  }
  .page-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #7B68EE;
    margin-bottom: 8px;
    padding-bottom: 4px;
    border-bottom: 1px solid rgba(123, 104, 238, 0.25);
  }
  .page-title {
    color: #7B68EE;
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 12px;
    padding-bottom: 6px;
    border-bottom: 2px solid #7B68EE;
    line-height: 1.3;
  }
  .page-content {
    flex: 1;
  }
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
    line-height: 1.3;
  }
  .report-info-value {
    color: #333;
    font-size: 12px;
    font-weight: 500;
    word-break: break-word;
    line-height: 1.4;
  }
  .empty-value { color: #aaa; font-style: italic; }
  .watermark {
    margin-top: auto;
    padding-top: 16px;
    text-align: center;
    font-size: 12px;
    color: #333;
    font-weight: 700;
  }
  /* ——— Página 1: Capa (modelo Word) ——— */
  .pdf-page-capa {
    padding: 18mm 16mm 14mm;
    overflow: hidden;
  }
  .pdf-page-capa .page-badge,
  .pdf-page-capa .page-title {
    display: none;
  }
  .capa-waves-bg {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.45;
    background:
      radial-gradient(ellipse 120% 80% at 10% 20%, rgba(180, 190, 210, 0.35) 0%, transparent 55%),
      radial-gradient(ellipse 100% 70% at 90% 60%, rgba(190, 200, 215, 0.3) 0%, transparent 50%),
      radial-gradient(ellipse 90% 60% at 50% 90%, rgba(175, 185, 200, 0.25) 0%, transparent 45%);
  }
  .capa-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    flex: 1;
  }
  .capa-logo-wrap {
    margin-bottom: 8mm;
  }
  .capa-logo {
    height: 42px;
    width: auto;
    max-width: 200px;
    object-fit: contain;
    object-position: left center;
    display: block;
  }
  .capa-main-block {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 8mm 4mm 0;
    margin-top: -8mm;
  }
  .capa-titulo {
    font-size: 17pt;
    font-weight: 700;
    color: #1a4a7a;
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
    margin: 0;
  }
  .capa-meta-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 10mm 0 16mm;
    gap: 4px;
  }
  .capa-data,
  .capa-cidade {
    font-size: 13pt;
    font-weight: 700;
    color: #111;
    line-height: 1.35;
    margin: 0;
  }
  .capa-rodape {
    margin-top: auto;
    text-align: center;
    font-size: 9.5pt;
    font-weight: 500;
    color: #8a9bb5;
    line-height: 1.45;
    padding-top: 8mm;
  }
  @page {
    size: A4 portrait;
    margin: 12mm;
  }
  @media print {
    * {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body {
      background: white !important;
      padding: 0 !important;
    }
    .pdf-document {
      max-width: none;
    }
    .pdf-page {
      min-height: 0;
      height: auto;
      margin: 0 !important;
      padding: 0;
      page-break-after: always;
      break-after: page;
    }
    .pdf-page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .page-badge {
      display: none;
    }
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

function resolveAssetUrl(path, baseUrl = '') {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const base = (baseUrl || '').replace(/\/$/, '');
  const clean = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${clean}` : clean;
}

function buildPageCapa(formData, options = {}) {
  const baseUrl = options.baseUrl || '';
  const logoUrl = resolveAssetUrl(CAPA_LOGO_PATH, baseUrl);
  const tituloDefault = 'Planejamento e Engenharia de Redes FTTx';

  return `
    <div class="pdf-page pdf-page-capa" data-pdf-page="1">
      <div class="capa-waves-bg" aria-hidden="true"></div>
      <div class="capa-inner">
        <div class="capa-logo-wrap">
          <img class="capa-logo" src="${escapeHtml(logoUrl)}" alt="Alares" />
        </div>
        <div class="capa-main-block">
          <h1 class="capa-titulo">${displayValue(formData.capa.titulo?.trim() || tituloDefault)}</h1>
          <p class="capa-cliente">${displayValue(formData.capa.clienteProjeto)}</p>
        </div>
        <div class="capa-meta-block">
          <p class="capa-data">${displayValue(formData.capa.data)}</p>
          <p class="capa-cidade">${displayValue(formData.capa.cidade)}</p>
        </div>
        <footer class="capa-rodape">${escapeHtml(CAPA_RODAPE_FIXO)}</footer>
      </div>
    </div>
  `;
}

function buildPageCabecalho(formData) {
  return `
    <div class="pdf-page pdf-page-cabecalho" data-pdf-page="2">
      <div class="page-badge">Página 2</div>
      <h2 class="page-title">Cabeçalho</h2>
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
  `;
}

function buildPagePasso1(formData) {
  const tituloPasso = formData.passo1.tituloPasso?.trim() || 'XXXXX';

  return `
    <div class="pdf-page pdf-page-passo1" data-pdf-page="3">
      <div class="page-badge">Página 3</div>
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
      <div class="watermark">Setor de Planejamento e Projetos - Engenharia Alares</div>
    </div>
  `;
}

/**
 * Corpo do documento (sem html/head) — 3 páginas: Capa, Cabeçalho, Passo 1
 */
export function buildPdfBodyHtml(formData, meta = {}, options = {}) {
  return `
    <div class="pdf-document">
      ${buildPageCapa(formData, options)}
      ${buildPageCabecalho(formData)}
      ${buildPagePasso1(formData)}
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
<html>
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

/**
 * Abre janela de impressão (Salvar como PDF) — mesmo fluxo da Viabilidade Alares
 */
export function openPdfPrintWindow(formData, options = {}) {
  const baseUrl =
    options.baseUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  const html = buildFullPdfHtml(formData, {}, { baseUrl });
  const fileName = options.fileName || `${formData.cabecalho.numeroReferencia?.trim() || 'Formulario'} - Engenharia.pdf`;

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
    setTimeout(tryPrint, 300);
  } else {
    printWindow.onload = () => setTimeout(tryPrint, 300);
  }

  return { success: true };
}
