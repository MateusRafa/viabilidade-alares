// Estilos e geração de HTML do PDF — alinhados ao padrão Viabilidade Alares

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

/** CSS compartilhado — base do relatório Viabilidade Alares */
export const FORMULARIO_PDF_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    padding: 0 8px 0 8px;
    background: white !important;
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: #333;
  }
  .pdf-header {
    background: linear-gradient(135deg, #7B68EE 0%, #6495ED 100%);
    color: white;
    padding: 8px 12px;
    border-radius: 4px 4px 0 0;
    margin-bottom: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 6px rgba(123, 104, 238, 0.3);
  }
  .pdf-header h1 {
    font-size: 20px;
    font-weight: 700;
    margin: 0;
    color: white;
    letter-spacing: 0.2px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.1);
    line-height: 1.4;
  }
  .pdf-header .date-info {
    font-size: 11px;
    opacity: 0.95;
    text-align: right;
    font-weight: 500;
    line-height: 1.4;
  }
  .form-section {
    background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
    padding: 8px;
    border-radius: 4px;
    border: 1px solid #e0e0e0;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    margin-bottom: 6px;
  }
  .form-section h2 {
    color: #7B68EE;
    margin: 0 0 5px 0;
    font-size: 14px;
    font-weight: 700;
    padding-bottom: 3px;
    border-bottom: 2px solid #7B68EE;
    line-height: 1.3;
  }
  .report-info {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3px;
  }
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
    margin-top: 8px;
    text-align: center;
    font-size: 14px;
    color: #333;
    font-weight: 700;
  }
  @page { size: landscape; margin: 0.2cm 0.3cm 0.15cm 0.3cm; }
  @media print {
    * {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    body { background: white !important; padding: 0 4px !important; }
    .pdf-header {
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
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

/**
 * Corpo do documento (sem html/head) — usado na prévia e no PDF final
 */
export function buildPdfBodyHtml(formData, meta = {}) {
  const { dateStr, timeStr } = meta.dateStr ? meta : getFormattedDateTime();
  const tituloCapa = formData.capa.titulo?.trim() || 'Formulário de Engenharia';
  const subtituloCapa = formData.capa.subtitulo?.trim() || 'Alares Engenharia';
  const numeroRef = formData.cabecalho.numeroReferencia?.trim() || '—';
  const tituloPasso = formData.passo1.tituloPasso?.trim() || 'XXXXX';

  return `
    <div class="pdf-header">
      <h1>${escapeHtml(tituloCapa)}<br><span style="font-size: 15px; font-weight: 500; opacity: 0.95;">${escapeHtml(subtituloCapa)} — ${escapeHtml(numeroRef)}</span></h1>
      <div class="date-info">
        <div style="margin-bottom: 3px; line-height: 1.4;">Gerado em: ${escapeHtml(dateStr)} às ${escapeHtml(timeStr)}</div>
        <div style="font-size: 10px; opacity: 0.85; line-height: 1.3;">Formulário de Engenharia</div>
      </div>
    </div>

    <div class="form-section">
      <h2>Capa</h2>
      <div class="report-info">
        ${buildSectionFields([
          { label: 'Título', value: formData.capa.titulo },
          { label: 'Subtítulo', value: formData.capa.subtitulo },
          { label: 'Versão', value: formData.capa.versao }
        ])}
      </div>
    </div>

    <div class="form-section">
      <h2>Cabeçalho</h2>
      <div class="report-info">
        ${buildSectionFields([
          { label: 'Número de referência', value: formData.cabecalho.numeroReferencia },
          { label: 'Cliente', value: formData.cabecalho.cliente },
          { label: 'Local', value: formData.cabecalho.local }
        ])}
      </div>
    </div>

    <div class="form-section">
      <h2>Passo 1° — ${escapeHtml(tituloPasso)}</h2>
      <div class="report-info">
        ${buildSectionFields([
          { label: 'Descrição', value: formData.passo1.descricao },
          { label: 'Responsável técnico', value: formData.passo1.responsavel },
          { label: 'Data', value: formData.passo1.data }
        ])}
      </div>
    </div>

    <div class="watermark">Setor de Planejamento e Projetos - Engenharia Alares</div>
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
