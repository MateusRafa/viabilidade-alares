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
  const atualizadaMatch = footerText.match(
    /Caixa\s+atualizada\s+em\s+[\d/:.\s]+\s*:?\s*(.+?)(?=Lat\/Lng|Status|Nível|Poste|Observação|$)/i
  );
  if (atualizadaMatch) {
    caixa = atualizadaMatch[1].trim();
  } else {
    const caixaMatch = footerText.match(/Caixa[^:]*:\s*(.+?)(?=Lat\/Lng|Status|Nível|$)/i);
    if (caixaMatch) {
      caixa = caixaMatch[1].replace(/atualizada em.*$/i, '').trim();
    }
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

  const hasMidFiberLabel = textItems.some((it) => {
    if (!it?.transform) return false;
    const txt = (it.str || '').trim();
    if (!/^L\d+\s*-\s*F\d+$/i.test(txt)) return false;
    const x = it.transform[4];
    const y = it.transform[5];
    const inDiagram = y > diagramThreshold;
    const inMiddleBand = x > viewport.width * 0.32 && x < viewport.width * 0.78;
    return inDiagram && inMiddleBand;
  });

  // Indício de saída de splitter preenchida: rótulo de fibra no quadrante superior direito,
  // onde normalmente aparecem as derivações do splitter para outros blocos.
  const hasUpperRightFiberLabel = textItems.some((it) => {
    if (!it?.transform) return false;
    const txt = (it.str || '').trim();
    if (!/^L\d+\s*-\s*F\d+$/i.test(txt)) return false;
    const x = it.transform[4];
    const y = it.transform[5];
    const inDiagram = y > diagramThreshold;
    const inUpperBand = y > pageH * 0.80;
    const inRightBand = x > viewport.width * 0.56;
    return inDiagram && inUpperBand && inRightBand;
  });

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
  const splitterRegex =
    /splitter|sp\s*[-_]?\s*(2|4|6|8|10|16)|0?1\s*x\s*(2|4|6|8|10|16)/i;
  const hasSplitter = splitterRegex.test(fullText + ' ' + diagramTexts);

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
    hasMidFiberLabel,
    hasUpperRightFiberLabel,
    nivelTipo: footer.nivelTipo,
    caixa: footer.caixa,
    projeto: footer.projeto,
    footerText: footer.footerText.slice(0, 800)
  };
}
