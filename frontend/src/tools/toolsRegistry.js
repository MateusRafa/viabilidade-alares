// ============================================
// Registry de Ferramentas do Portal (com componentes)
// ============================================
// Metadados/permissões: toolsMeta.js (sem imports Svelte)
// ============================================

import {
  portalToolsMeta,
  FAVICON_BY_TOOL,
  mergePermissionsWithRegistry,
  canAccessTool,
  buildPermissionsPayload,
  getToolsForPermissions,
  PORTAL_TOOL_IDS
} from './toolsMeta.js';

export {
  portalToolsMeta,
  FAVICON_BY_TOOL,
  mergePermissionsWithRegistry,
  canAccessTool,
  buildPermissionsPayload,
  getToolsForPermissions,
  PORTAL_TOOL_IDS
};

const TOOL_COMPONENT_FILES = {
  'viabilidade-alares': './ViabilidadeAlares.svelte',
  'analise-cobertura': './AnaliseCobertura.svelte',
  'calculadora-orcamento': './CalculadoraOrcamento.svelte',
  'mapa-consulta': './MapaConsulta.svelte',
  'dashboard-censup': './DashboardCensup.svelte',
  'formulario-engenharia': './FormularioEngenharia.svelte',
  'formulario-engenharia-implantacao': './FormularioEngenhariaImplantacao.svelte',
  'relatorio-de-construcao': './RelatorioDeConstrucao.svelte',
  'dashboard-projetos': './DashboardProjetos.svelte',
  'dashboard-implantacao': './DashboardImplantacao.svelte',
  'ia-auditoria-diagramacao': './IaAuditoriaDiagramacao.svelte',
  'portal-censup': './PortalCensup.svelte',
  'comite-intencao-ampliacao': './ComiteIntencaoAmpliacao.svelte'
};

/** Só as ferramentas do portal — não incluir CensupWorkbench (é entry do embed). */
const toolSvelteModules = import.meta.glob(
  [
    './ViabilidadeAlares.svelte',
    './AnaliseCobertura.svelte',
    './CalculadoraOrcamento.svelte',
    './MapaConsulta.svelte',
    './DashboardCensup.svelte',
    './FormularioEngenharia.svelte',
    './FormularioEngenhariaImplantacao.svelte',
    './RelatorioDeConstrucao.svelte',
    './DashboardProjetos.svelte',
    './DashboardImplantacao.svelte',
    './IaAuditoriaDiagramacao.svelte',
    './PortalCensup.svelte',
    './ComiteIntencaoAmpliacao.svelte'
  ],
  { eager: true }
);

function resolveToolComponent(toolId) {
  const file = TOOL_COMPONENT_FILES[toolId];
  if (!file) return null;
  return toolSvelteModules[file]?.default ?? null;
}

/**
 * Registry completo (metadados + componente Svelte)
 */
export const toolsRegistry = portalToolsMeta.map((meta) => ({
  ...meta,
  faviconImage: FAVICON_BY_TOOL[meta.id],
  component: resolveToolComponent(meta.id)
}));

/**
 * Busca uma ferramenta pelo ID
 */
export function getToolById(toolId) {
  return toolsRegistry.find((tool) => tool.id === toolId) || null;
}

/**
 * Retorna todas as ferramentas disponíveis
 */
export function getAvailableTools() {
  return toolsRegistry.filter(
    (tool) => tool.available && tool.component && tool.portalVisible !== false
  );
}

/**
 * Verifica se uma ferramenta existe e está disponível
 */
export function isToolAvailable(toolId) {
  const tool = getToolById(toolId);
  return tool && tool.available && tool.component;
}
