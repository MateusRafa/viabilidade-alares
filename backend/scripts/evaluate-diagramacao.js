/**
 * Avalia a qualidade do classificador contra ground-truth.csv
 *
 * Uso:
 *   cd backend
 *   node scripts/evaluate-diagramacao.js
 *
 * PDFs procurados em:
 *   - data/diagramacao-amostras/
 *   - data/diagramacao-ground-truth/pdfs/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzePdfFile } from '../lib/diagramacao/analyzePdf.js';
import { classifyDiagramacao, RULE_VERSION } from '../lib/diagramacao/classify.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.join(__dirname, '..', 'data');
const GT_DIR = path.join(DATA_ROOT, 'diagramacao-ground-truth');
const GT_CSV = path.join(GT_DIR, 'ground-truth.csv');
const PDF_DIRS = [
  path.join(DATA_ROOT, 'diagramacao-amostras'),
  path.join(GT_DIR, 'pdfs')
];

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += c;
  }
  out.push(cur.trim());
  return out;
}

function loadGroundTruth() {
  if (!fs.existsSync(GT_CSV)) {
    console.error('Arquivo não encontrado:', GT_CSV);
    process.exit(1);
  }
  const lines = fs.readFileSync(GT_CSV, 'utf8').split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (!cols[0] || cols[0].startsWith('#')) continue;
    const row = {};
    header.forEach((h, idx) => {
      row[h] = cols[idx] ?? '';
    });
    row.nivel_esperado = Number(row.nivel_esperado);
    rows.push(row);
  }
  return rows;
}

function findPdf(fileName) {
  for (const dir of PDF_DIRS) {
    const full = path.join(dir, fileName);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function confusionMatrix(results) {
  const m = { 1: { 1: 0, 2: 0, 3: 0 }, 2: { 1: 0, 2: 0, 3: 0 }, 3: { 1: 0, 2: 0, 3: 0 } };
  for (const r of results) {
    if (r.erro || !r.nivel_esperado || !r.nivel_predito) continue;
    m[r.nivel_esperado][r.nivel_predito]++;
  }
  return m;
}

function pct(n, d) {
  return d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`;
}

async function main() {
  console.log(`\n📊 Avaliação de diagramação — regras ${RULE_VERSION}\n`);

  const gt = loadGroundTruth();
  const results = [];
  let ok = 0;
  let missing = 0;
  let erros = 0;

  for (const row of gt) {
    const pdfPath = findPdf(row.arquivo);
    if (!pdfPath) {
      missing++;
      results.push({
        arquivo: row.arquivo,
        nivel_esperado: row.nivel_esperado,
        erro: 'PDF não encontrado',
        acerto: false
      });
      console.log(`⚠️  ${row.arquivo} — PDF não encontrado`);
      continue;
    }

    try {
      const metrics = await analyzePdfFile(pdfPath);
      if (!metrics.ok) {
        erros++;
        results.push({
          arquivo: row.arquivo,
          nivel_esperado: row.nivel_esperado,
          erro: metrics.erro,
          acerto: false
        });
        console.log(`❌ ${row.arquivo} — ${metrics.erro}`);
        continue;
      }

      const classified = classifyDiagramacao(metrics, row.arquivo);
      const pred = classified.nivel_diagramacao;
      const acertoNivel = pred === row.nivel_esperado;
      const subEsp = (row.submotivo_esperado || '').trim();
      const subPred = (classified.submotivos || []).join(',');
      const acertoSub =
        !subEsp || subPred.split(',').some((s) => s.trim() === subEsp);

      const acerto = acertoNivel && acertoSub;
      if (acerto) ok++;
      else erros++;

      results.push({
        arquivo: row.arquivo,
        nivel_esperado: row.nivel_esperado,
        nivel_predito: pred,
        submotivo_esperado: subEsp || null,
        submotivos_predito: classified.submotivos,
        confianca: classified.confianca,
        acerto,
        acerto_nivel: acertoNivel,
        metricas: classified.metricas
      });

      const icon = acerto ? '✅' : '❌';
      console.log(
        `${icon} ${row.arquivo}\n` +
          `   esperado: ${row.nivel_esperado} | predito: ${pred} | sub: ${subPred || '—'}\n` +
          `   entrada_sp: ${classified.metricas?.entrada_splitter_ok} | saida_sp: ${classified.metricas?.saida_splitter_ok} | passagem→: ${classified.metricas?.labels_passagem_direita}`
      );
    } catch (e) {
      erros++;
      results.push({
        arquivo: row.arquivo,
        nivel_esperado: row.nivel_esperado,
        erro: e.message,
        acerto: false
      });
      console.log(`❌ ${row.arquivo} — ${e.message}`);
    }
  }

  const avaliados = gt.length - missing;
  const matrix = confusionMatrix(results);

  console.log('\n─── Resumo ───');
  console.log(`Total no CSV:     ${gt.length}`);
  console.log(`PDFs encontrados: ${avaliados}`);
  console.log(`PDFs ausentes:    ${missing}`);
  console.log(`Acertos:          ${ok} / ${avaliados} (${pct(ok, avaliados)})`);

  console.log('\n─── Matriz de confusão (linha=esperado, coluna=predito) ───');
  console.log('        pred 1   pred 2   pred 3');
  for (const exp of [1, 2, 3]) {
    console.log(
      `esp ${exp}   ${String(matrix[exp][1]).padStart(6)} ${String(matrix[exp][2]).padStart(8)} ${String(matrix[exp][3]).padStart(8)}`
    );
  }

  const report = {
    geradoEm: new Date().toISOString(),
    rule_version: RULE_VERSION,
    total: gt.length,
    encontrados: avaliados,
    ausentes: missing,
    acertos: ok,
    taxa_acerto: avaliados ? ok / avaliados : 0,
    matriz: matrix,
    resultados: results
  };

  const outJson = path.join(GT_DIR, 'evaluation-report.json');
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

  const csvLines = [
    'arquivo,nivel_esperado,nivel_predito,acerto,submotivo_esperado,submotivos_predito,entrada_splitter_ok,saida_splitter_ok,labels_passagem_direita,erro'
  ];
  for (const r of results) {
    csvLines.push(
      [
        r.arquivo,
        r.nivel_esperado ?? '',
        r.nivel_predito ?? '',
        r.acerto ? 'sim' : 'nao',
        r.submotivo_esperado ?? '',
        (r.submotivos_predito || []).join(';'),
        r.metricas?.entrada_splitter_ok ?? '',
        r.metricas?.saida_splitter_ok ?? '',
        r.metricas?.labels_passagem_direita ?? '',
        r.erro ?? ''
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
  }
  const outCsv = path.join(GT_DIR, 'evaluation-report.csv');
  fs.writeFileSync(outCsv, csvLines.join('\n'), 'utf8');

  console.log(`\n📁 Relatório JSON: ${outJson}`);
  console.log(`📁 Relatório CSV:  ${outCsv}\n`);

  if (missing > 0) {
    console.log('Dica: coloque os PDFs em backend/data/diagramacao-amostras/\n');
  }

  process.exit(avaliados > 0 && ok === avaliados ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
