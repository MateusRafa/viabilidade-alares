/**
 * Classifica nível de diagramação (1–3) com base em métricas do PDF.
 * Heurística v1 — calibrar com amostras em data/diagramacao-amostras/
 */

const LABELS = {
  1: 'Sem diagramação',
  2: 'Diagramação incompleta',
  3: 'Diagramada'
};

/**
 * @param {object} metrics - saída de analyzePdfFile (ok: true)
 * @param {string} [fileName]
 */
function idFromFileName(fileName) {
  return fileName
    .replace(/\.pdf$/i, '')
    .replace(/-\d{2}_\d{2}_\d{4}(?:-\d{2}_\d{2}_\d{2})?.*$/i, '')
    .trim();
}

function isCaixaFooterRuim(caixa) {
  if (!caixa || caixa.length < 3) return true;
  if (/^\d+\s/.test(caixa)) return true;
  if (/^[\d.:;\s]+$/.test(caixa)) return true;
  return false;
}

export function classifyDiagramacao(metrics, fileName = '') {
  const { pathOps = 0, paintOps = 0, strokeOps = 0, hasSplitter = false, caixa, nivelTipo } = metrics;

  const submotivos = [];
  let nivel = 3;
  let confianca = 'media';

  // Ordem alinhada às regras de negócio (situações 1–5)

  // 1 — diagrama vazio
  if (pathOps < 35 && paintOps < 12) {
    nivel = 1;
    submotivos.push('diagrama_vazio');
    confianca = 'alta';
  }
  // 2 — cabo/portas sem fusão (sem splitter no desenho)
  else if (!hasSplitter && pathOps >= 35 && paintOps < 32) {
    nivel = 1;
    submotivos.push('cabos_sem_fusao');
    confianca = 'media';
  }
  // 3 — cabo + splitter sem fusão na entrada (ex.: CTO SPLITTER 803)
  // Poucas operações de pintura = quase nenhuma linha ligando blocos
  else if (hasSplitter && paintOps < 32) {
    nivel = 1;
    submotivos.push('splitter_sem_fusao_entrada');
    confianca = paintOps < 22 ? 'alta' : 'media';
  }
  // 5 — splitter alimentado, saídas sem fusão (ex.: CEO TUL01, muita passagem)
  else if (hasSplitter && pathOps >= 100 && paintOps >= 32 && paintOps < 58) {
    nivel = 2;
    submotivos.push('splitter_saidas_sem_fusao');
    confianca = 'media';
  }
  // 4 — incompleta genérica
  else if (pathOps >= 80 && paintOps < 55) {
    nivel = 2;
    submotivos.push('diagramacao_incompleta');
    confianca = 'baixa';
  }
  // 3 — diagramada
  else if (pathOps >= 120 && paintOps >= 55) {
    nivel = 3;
    confianca = pathOps >= 180 ? 'alta' : 'media';
  } else if (pathOps >= 60 && paintOps >= 40) {
    nivel = 3;
    confianca = 'media';
  } else {
    nivel = 1;
    submotivos.push('diagrama_vazio');
    confianca = 'baixa';
  }

  const idCaixa = !isCaixaFooterRuim(caixa) ? caixa : idFromFileName(fileName);

  return {
    nivel_diagramacao: nivel,
    nivel_diagramacao_label: LABELS[nivel] || 'Desconhecido',
    submotivos,
    confianca,
    id_caixa: idCaixa || null,
    nivel_tipo: nivelTipo || null,
    metricas: {
      pathOps,
      paintOps,
      strokeOps,
      hasSplitter
    }
  };
}

export { LABELS };
