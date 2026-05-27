/**
 * Fase 0 — diagnóstico rápido dos PDFs em backend/data/diagramacao-amostras/
 * Uso: node scripts/poc-diagramacao-pdf.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega pdfjs-dist em ambientes diferentes:
// 1) padrão (quando você instalar dependências no backend)
// 2) fallback (quando você instalar no frontend)
async function loadPdfjs() {
  try {
    const mod = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return mod;
  } catch (e1) {
    const fallbackPath = path.join(
      __dirname,
      '..',
      '..',
      'frontend',
      'node_modules',
      'pdfjs-dist',
      'legacy',
      'build',
      'pdf.mjs'
    );
    const modUrl = pathToFileURL(fallbackPath).toString();
    const mod = await import(modUrl);
    return mod;
  }
}

const SAMPLES_DIR = path.join(__dirname, '..', 'data', 'diagramacao-amostras');

const PATH_OPS = new Set([
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200
]);

async function analyzePdf(filePath) {
  const pdfjsLib = await loadPdfjs();
  const buf = fs.readFileSync(filePath);
  const header = buf.slice(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    return { ok: false, erro: 'Arquivo não é PDF válido' };
  }

  const data = new Uint8Array(buf);
  const pdf = await pdfjsLib.getDocument({ data, useSystemFonts: true, verbosity: 0 }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();
  const opList = await page.getOperatorList();

  const textItems = textContent.items.length;
  const textChars = textContent.items.reduce((n, it) => n + (it.str?.length || 0), 0);
  let pathOps = 0;
  let paintOps = 0;
  for (const fn of opList.fnArray) {
    if (PATH_OPS.has(fn)) pathOps++;
    if (fn === 22 || fn === 23 || fn === 24 || fn === 25) paintOps++;
  }

  const diagramH = viewport.height * 0.72;
  let textInDiagram = 0;
  for (const it of textContent.items) {
    if (it.transform && it.transform[5] > diagramH) textInDiagram++;
  }

  const tipo =
    pathOps > 50 && textItems > 10
      ? 'vetorial (bom para parser)'
      : pathOps < 10 && textItems < 5
        ? 'provavel imagem/raster'
        : 'misto — validar manualmente';

  return {
    ok: true,
    paginas: pdf.numPages,
    largura: Math.round(viewport.width),
    altura: Math.round(viewport.height),
    itens_texto: textItems,
    caracteres_texto: textChars,
    texto_area_diagrama: textInDiagram,
    operadores_path: pathOps,
    operadores_pintura: paintOps,
    tipo_detectado: tipo
  };
}

async function main() {
  if (!fs.existsSync(SAMPLES_DIR)) {
    console.error('Pasta não encontrada:', SAMPLES_DIR);
    process.exit(1);
  }

  const files = fs.readdirSync(SAMPLES_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`\n📁 ${SAMPLES_DIR}`);
  console.log(`📄 ${files.length} PDF(s) encontrado(s)\n`);

  if (files.length === 0) {
    console.error('Nenhum PDF na pasta.');
    process.exit(1);
  }

  for (const file of files.sort()) {
    const full = path.join(SAMPLES_DIR, file);
    const kb = Math.round(fs.statSync(full).size / 1024);
    process.stdout.write(`\n━━━ ${file} (${kb} KB) ━━━\n`);
    try {
      const r = await analyzePdf(full);
      if (!r.ok) {
        console.log('  ❌', r.erro);
        continue;
      }
      console.log('  ✅ PDF aberto');
      console.log(`  Páginas: ${r.paginas} | ${r.largura}×${r.altura} pt`);
      console.log(`  Texto: ${r.itens_texto} itens, ${r.caracteres_texto} caracteres (${r.texto_area_diagrama} na área do diagrama)`);
      console.log(`  Gráfico: ${r.operadores_path} ops de path, ${r.operadores_pintura} ops de pintura`);
      console.log(`  → ${r.tipo_detectado}`);
    } catch (err) {
      console.log('  ❌ Erro:', err.message);
    }
  }
  console.log('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
