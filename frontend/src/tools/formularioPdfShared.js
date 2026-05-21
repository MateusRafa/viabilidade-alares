// Estilos e geração de HTML do PDF — estrutura multipágina (1 capa, 2 cabeçalho, 3 passo 1)

export const PDF_PAGES = [
  { id: 'capa', number: 1, title: 'Capa', formKey: 'capa' },
  { id: 'cabecalho', number: 2, title: 'Cabeçalho', formKey: 'cabecalho' },
  { id: 'passo1', number: 3, title: 'Passo 1°', formKey: 'passo1' }
];

export const defaultFormData = () => ({
  capa: {
    titulo: '',
    subtitulo: '',
    versao: ''
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
  .page-footer-note {
    margin-top: auto;
    padding-top: 12px;
    font-size: 10px;
    color: #888;
    text-align: right;
  }
  .watermark {
    margin-top: auto;
    padding-top: 16px;
    text-align: center;
    font-size: 12px;
    color: #333;
    font-weight: 700;
  }
  /* Capa — placeholder de layout (refinar depois) */
  .pdf-page-capa .capa-titulo-principal {
    font-size: 22px;
    font-weight: 700;
    color: #4c1d95;
    margin: 24px 0 8px;
    line-height: 1.3;
  }
  .pdf-page-capa .capa-subtitulo {
    font-size: 14px;
    color: #5b21b6;
    margin-bottom: 24px;
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

function buildPageCapa(formData, meta) {
  const { dateStr, timeStr } = meta;
  const titulo = formData.capa.titulo?.trim() || 'Formulário de Engenharia';
  const subtitulo = formData.capa.subtitulo?.trim() || 'Alares Engenharia';

  return `
    <div class="pdf-page pdf-page-capa" data-pdf-page="1">
      <div class="page-badge">Página 1</div>
      <h1 class="page-title">Capa</h1>
      <div class="page-content">
        <p class="capa-titulo-principal">${displayValue(titulo)}</p>
        <p class="capa-subtitulo">${displayValue(subtitulo)}</p>
        <div class="report-info">
          ${buildSectionFields([
            { label: 'Título', value: formData.capa.titulo },
            { label: 'Subtítulo', value: formData.capa.subtitulo },
            { label: 'Versão', value: formData.capa.versao }
          ])}
        </div>
      </div>
      <div class="page-footer-note">Gerado em ${escapeHtml(dateStr)} às ${escapeHtml(timeStr)}</div>
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
export function buildPdfBodyHtml(formData, meta = {}) {
  const dateMeta = meta.dateStr ? meta : getFormattedDateTime();

  return `
    <div class="pdf-document">
      ${buildPageCapa(formData, dateMeta)}
      ${buildPageCabecalho(formData)}
      ${buildPagePasso1(formData)}
    </div>
  `;
}

export function buildFullPdfHtml(formData, meta = {}) {
  const fileBase = formData.cabecalho.numeroReferencia?.trim() || 'Formulario-Engenharia';
  const title = `${fileBase} - Engenharia`;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <style>${FORMULARIO_PDF_STYLES}</style>
  </head>
  <body>
    ${buildPdfBodyHtml(formData, meta)}
  </body>
</html>`;
}

/**
 * Abre janela de impressão (Salvar como PDF) — mesmo fluxo da Viabilidade Alares
 */
export function openPdfPrintWindow(formData, options = {}) {
  const html = buildFullPdfHtml(formData);
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
