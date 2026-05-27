/**
 * Extrai métricas e texto de um PDF de diagramação (template Alares).
 */
import fs from 'fs';

let pdfjsLibPromise = null;

async function getPdfjs() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLibPromise;
}

function extractFooterFields(textItems, pageHeight) {
  const footerThreshold = pageHeight * 0.28;
  const footerLines = textItems
    .filter((it) => it.transform && it.transform[5] <= footerThreshold)
    .map((it) => (it.str || '').trim())
    .filter(Boolean);

  const footerText = footerLines.join(' ');

  let nivelTipo = null;
  if (/\bCEO\b/i.test(footerText)) nivelTipo = 'CEO';
  else if (/\bCTO\b/i.test(footerText)) nivelTipo = 'CTO';

  let caixa = null;
  const caixaMatch = footerText.match(/Caixa[^:]*:?\s*(.+?)(?=Lat\/Lng|Status|Nível|$)/i);
  if (caixaMatch) {
    caixa = caixaMatch[1].replace(/atualizada em.*$/i, '').trim();
  }

  let projeto = null;
  const projMatch = footerText.match(/Projeto:\s*(.+?)(?=Caixa|Lat\/Lng|$)/i);
  if (projMatch) projeto = projMatch[1].trim();

  return { footerText, nivelTipo, caixa, projeto };
}

/**
 * @param {string} filePath
 * @returns {Promise<object>}
 */
export async function analyzePdfFile(filePath) {
  const pdfjsLib = await getPdfjs();
  const buf = fs.readFileSync(filePath);
  const header = buf.slice(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    return {
      ok: false,
      erro: 'Arquivo não é PDF válido'
    };
  }

  const data = new Uint8Array(buf);
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const opList = await page.getOperatorList();

  const pageH = viewport.height;
  const diagramThreshold = pageH * 0.72;

  const textItems = textContent.items.map((it) => ({
    str: it.str || '',
    transform: it.transform
  }));

  const diagramTexts = textItems
    .filter((it) => it.transform && it.transform[5] > diagramThreshold)
    .map((it) => it.str)
    .join(' ');

  const fullText = textItems.map((it) => it.str).join(' ');

  let pathOps = 0;
  let paintOps = 0;
  let strokeOps = 0;
  for (const fn of opList.fnArray) {
    if (fn >= 20 && fn <= 64) pathOps++;
    if (fn === 22 || fn === 23 || fn === 24 || fn === 25) paintOps++;
    if (fn === 28 || fn === 30) strokeOps++;
  }

  const footer = extractFooterFields(textItems, pageH);
  const hasSplitter = /splitter|01x08|01X08|SP8/i.test(fullText + diagramTexts);

  return {
    ok: true,
    paginas: pdf.numPages,
    largura: Math.round(viewport.width),
    altura: Math.round(pageH),
    pathOps,
    paintOps,
    strokeOps,
    textItems: textItems.length,
    textoDiagrama: diagramTexts.slice(0, 500),
    hasSplitter,
    nivelTipo: footer.nivelTipo,
    caixa: footer.caixa,
    projeto: footer.projeto,
    footerText: footer.footerText.slice(0, 800)
  };
}
