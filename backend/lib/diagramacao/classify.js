/** Versão das regras — incrementar ao calibrar (usado no relatório de avaliação). */
export const RULE_VERSION = 'v1.2.0';

/**
 * Classifica nível de diagramação (1–3) com base em métricas do PDF.
 *
 * Regras de splitter (SP2–SP16):
 * - CEO/CTO: sem fusão na ENTRADA => nível 1 (sem diagramação).
 * - CTO: entrada fusionada => pode ser nível 3 (saídas ignoradas).
 * - CEO: entrada fusionada + pelo menos 1 saída de splitter preenchida => nível 3.
 * - CEO: entrada ok, sem saída preenchida => nível 2 (incompleta).
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

function resolveNivelTipo(nivelTipo, fileName) {
  if (nivelTipo === 'CEO' || nivelTipo === 'CTO') return nivelTipo;
  if (/\bCTO\b/i.test(fileName)) return 'CTO';
  if (/\bCEO\b/i.test(fileName)) return 'CEO';
  return null;
}

function entradaSplitterFusionada(paintOps, pathOps, strokeOps, tipo) {
  const razaoPintura = pathOps > 0 ? paintOps / pathOps : 0;

  if (tipo === 'CTO') {
    if (pathOps < 55 || paintOps < 26) return false;
    const desconectado =
      pathOps >= 78 && paintOps < 44 && razaoPintura < 0.39 && strokeOps < 28;
    if (desconectado) return false;
    return paintOps >= 34 && pathOps >= 58 && strokeOps >= 12 && razaoPintura >= 0.32;
  }

  if (tipo === 'CEO') {
    // CEO com muita passagem: entrada do splitter costuma ter paint/stroke moderados
    if (pathOps < 80) return false;
    return paintOps >= 45 && strokeOps >= 20;
  }

  return paintOps >= 40 && pathOps >= 65 && strokeOps >= 10;
}

function entradaSplitterFusionadaComContexto(metrics, tipo) {
  const { paintOps = 0, pathOps = 0, strokeOps = 0, hasMidFiberLabel = false } = metrics || {};
  const base = entradaSplitterFusionada(paintOps, pathOps, strokeOps, tipo);
  if (tipo === 'CTO' && hasMidFiberLabel) return true;
  return base;
}

/**
 * CEO: ao menos uma saída de splitter com fusão documentada.
 * Usa faixa estreita ao lado do splitter — NÃO conta passagem para caixas da direita.
 */
function ceoTemSaidaSplitterPreenchida(metrics) {
  const {
    hasSplitterOutputLabel = false,
    labels_saida_splitter = 0,
    labels_passagem_direita = 0,
    paintOps = 0,
    pathOps = 0
  } = metrics;

  if (hasSplitterOutputLabel || labels_saida_splitter > 0) return true;

  // Passagem para caixas da direita ≠ saída de splitter (ex.: TUL01-CE017)
  if (labels_passagem_direita >= 2 && labels_saida_splitter === 0) return false;

  return false;
}

export function classifyDiagramacao(metrics, fileName = '') {
  const {
    pathOps = 0,
    paintOps = 0,
    strokeOps = 0,
    hasSplitter = false,
    hasMidFiberLabel = false,
    hasSplitterOutputLabel = false,
    labels_saida_splitter = 0,
    labels_passagem_direita = 0,
    splitterCount = 0,
    caixa,
    nivelTipo: nivelTipoRaw
  } = metrics;

  const tipo = resolveNivelTipo(nivelTipoRaw, fileName);
  const submotivos = [];
  let nivel = 3;
  let confianca = 'media';

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
  } else if (hasSplitter) {
    const entradaOk = entradaSplitterFusionadaComContexto(
      { paintOps, pathOps, strokeOps, hasMidFiberLabel },
      tipo
    );

    if (!entradaOk) {
      nivel = 1;
      submotivos.push('splitter_sem_fusao_entrada');
      confianca = paintOps < 22 ? 'alta' : 'media';
    } else if (tipo === 'CTO') {
      nivel = 3;
      confianca = paintOps >= 52 ? 'alta' : 'media';
    } else if (tipo === 'CEO') {
      const saidaOk = ceoTemSaidaSplitterPreenchida({
        hasSplitterOutputLabel,
        labels_saida_splitter,
        labels_passagem_direita,
        paintOps,
        pathOps
      });

      if (!saidaOk) {
        nivel = 2;
        submotivos.push('splitter_sem_saida_preenchida');
        confianca = 'media';
      } else {
        nivel = 3;
        confianca = 'alta';
      }
    } else {
      nivel = 3;
      confianca = 'baixa';
    }
  } else if (pathOps >= 80 && paintOps < 55) {
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
    rule_version: RULE_VERSION,
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
      splitterCount,
      hasMidFiberLabel,
      hasSplitterOutputLabel,
      labels_saida_splitter,
      labels_passagem_direita,
      entrada_splitter_ok: hasSplitter
        ? entradaSplitterFusionadaComContexto({ paintOps, pathOps, strokeOps, hasMidFiberLabel }, tipo)
        : null,
      saida_splitter_ok: tipo === 'CEO' && hasSplitter ? ceoTemSaidaSplitterPreenchida(metrics) : null,
      razao_pintura: pathOps > 0 ? Math.round((paintOps / pathOps) * 100) / 100 : 0
    }
  };
}

export { LABELS };
