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
export function classifyDiagramacao(metrics, fileName = '') {
  const { pathOps = 0, paintOps = 0, strokeOps = 0, hasSplitter = false, caixa, nivelTipo } = metrics;

  const submotivos = [];
  let nivel = 3;
  let confianca = 'media';

  // Nível 1 — sem diagramação
  if (pathOps < 35 && paintOps < 12) {
    nivel = 1;
    submotivos.push('diagrama_vazio');
    confianca = 'alta';
  } else if (!hasSplitter && pathOps >= 35 && pathOps < 120 && paintOps < 28) {
    nivel = 1;
    submotivos.push('cabos_sem_fusao');
    confianca = 'media';
  } else if (hasSplitter && pathOps < 100 && paintOps < 35) {
    nivel = 1;
    submotivos.push('splitter_sem_fusao_entrada');
    confianca = 'media';
  } else if (hasSplitter && pathOps >= 100 && paintOps < 55) {
    // Muito desenho + splitter, pouca pintura nas saídas → incompleta (ex.: SP8 sem saídas)
    nivel = 2;
    submotivos.push('splitter_saidas_sem_fusao');
    confianca = 'media';
  } else if (pathOps >= 120 && paintOps >= 55) {
    nivel = 3;
    confianca = pathOps >= 180 ? 'alta' : 'media';
  } else if (pathOps >= 80) {
    nivel = 2;
    submotivos.push('diagramacao_incompleta');
    confianca = 'baixa';
  } else {
    nivel = 1;
    submotivos.push('diagrama_vazio');
    confianca = 'baixa';
  }

  const idCaixa =
    caixa ||
    fileName
      .replace(/\.pdf$/i, '')
      .replace(/-\d{2}_\d{2}_\d{4}.*$/i, '')
      .trim();

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
