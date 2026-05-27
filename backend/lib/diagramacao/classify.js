/**
 * Classifica nível de diagramação (1–3) com base em métricas do PDF.
 *
 * Regras de splitter:
 * - CTO: só importa fusão na ENTRADA do splitter; saídas (1–8) são ignoradas.
 * - CEO: entrada fusionada + pelo menos indício de fusão nas saídas (heurística por paintOps/pathOps).
 */

const LABELS = {
  1: 'Sem diagramação',
  2: 'Diagramação incompleta',
  3: 'Diagramada'
};

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

/** CEO ou CTO — rodapé ou nome do arquivo */
function resolveNivelTipo(nivelTipo, fileName) {
  if (nivelTipo === 'CEO' || nivelTipo === 'CTO') return nivelTipo;
  if (/\bCTO\b/i.test(fileName)) return 'CTO';
  if (/\bCEO\b/i.test(fileName)) return 'CEO';
  return null;
}

/** Heurística: existe linha de fusão até a entrada do splitter */
function entradaSplitterFusionada(paintOps, pathOps) {
  return paintOps >= 30 && pathOps >= 40;
}

/**
 * CEO: splitter com entrada ok, mas saídas (1–8) sem nenhuma fusão documentada
 */
function ceoSplitterSaidasSemFusao(paintOps, pathOps) {
  return pathOps >= 90 && paintOps >= 30 && paintOps < 52;
}

/**
 * @param {object} metrics - saída de analyzePdfFile (ok: true)
 * @param {string} [fileName]
 */
export function classifyDiagramacao(metrics, fileName = '') {
  const {
    pathOps = 0,
    paintOps = 0,
    strokeOps = 0,
    hasSplitter = false,
    caixa,
    nivelTipo: nivelTipoRaw
  } = metrics;

  const tipo = resolveNivelTipo(nivelTipoRaw, fileName);
  const submotivos = [];
  let nivel = 3;
  let confianca = 'media';

  // —— Sem splitter no desenho ——
  if (pathOps < 35 && paintOps < 12) {
    nivel = 1;
    submotivos.push('diagrama_vazio');
    confianca = 'alta';
  } else if (!hasSplitter && pathOps >= 35 && paintOps < 32) {
    nivel = 1;
    submotivos.push('cabos_sem_fusao');
    confianca = 'media';
  } else if (!hasSplitter && paintOps >= 32) {
    nivel = 3;
    confianca = pathOps >= 120 ? 'alta' : 'media';
  }
  // —— Com splitter ——
  else if (hasSplitter) {
    const entradaOk = entradaSplitterFusionada(paintOps, pathOps);

    if (!entradaOk) {
      // CTO e CEO: sem fusão na entrada → não diagramado
      nivel = 1;
      submotivos.push('splitter_sem_fusao_entrada');
      confianca = paintOps < 22 ? 'alta' : 'media';
    } else if (tipo === 'CTO') {
      // CTO: saídas do splitter não entram na avaliação
      nivel = 3;
      confianca = 'media';
    } else if (tipo === 'CEO' && ceoSplitterSaidasSemFusao(paintOps, pathOps)) {
      // CEO: entrada ok, mas nenhuma saída do SP8 com fusão (ex.: TUL01-CE017)
      nivel = 2;
      submotivos.push('splitter_saidas_sem_fusao');
      confianca = 'media';
    } else if (tipo === 'CEO') {
      nivel = 3;
      confianca = paintOps >= 52 ? 'alta' : 'media';
    } else {
      // Tipo desconhecido: conservador — exige mais pintura (como CEO)
      if (ceoSplitterSaidasSemFusao(paintOps, pathOps)) {
        nivel = 2;
        submotivos.push('splitter_saidas_sem_fusao');
      } else {
        nivel = 3;
      }
      confianca = 'baixa';
    }
  }
  // —— Diagrama com desenho, sem splitter ——
  else if (pathOps >= 80 && paintOps < 55) {
    nivel = 2;
    submotivos.push('diagramacao_incompleta');
    confianca = 'baixa';
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
    nivel_tipo: tipo || nivelTipoRaw || null,
    metricas: {
      pathOps,
      paintOps,
      strokeOps,
      hasSplitter,
      entrada_splitter_ok: hasSplitter ? entradaSplitterFusionada(paintOps, pathOps) : null
    }
  };
}

export { LABELS };
