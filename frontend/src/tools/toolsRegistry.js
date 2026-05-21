// ============================================
// Registry de Ferramentas do Portal
// ============================================
// Este arquivo centraliza o registro de todas as ferramentas
// disponíveis no portal. Para adicionar uma nova ferramenta:
// 1. Crie o componente da ferramenta em tools/
// 2. Importe e registre aqui
// ============================================

import ViabilidadeAlares from './ViabilidadeAlares.svelte';
import AnaliseCobertura from './AnaliseCobertura.svelte';
import CalculadoraOrcamento from './CalculadoraOrcamento.svelte';
import MapaConsulta from './MapaConsulta.svelte';
import DashboardCensup from './DashboardCensup.svelte';
import FormularioEngenharia from './FormularioEngenharia.svelte';

/**
 * Registry de todas as ferramentas disponíveis no portal
 * Cada ferramenta deve ter:
 * - id: identificador único
 * - title: nome da ferramenta
 * - description: descrição curta
 * - icon: emoji ou ícone (usado como fallback se faviconImage não estiver definido)
 * - faviconImage: (opcional) caminho para imagem PNG que será usada como favicon (ex: '/favicons/ferramenta.png')
 * - color: cor principal (hex)
 * - component: componente Svelte
 * - available: se está disponível
 */
export const toolsRegistry = [
  {
    id: 'viabilidade-alares',
    title: 'Viabilidade Alares - Engenharia',
    description: 'Análise de viabilidade técnica para identificação de CTOs próximas a endereços de clientes',
    icon: '🔍',
    faviconImage: '/favicons/alares.png',
    color: '#7B68EE',
    component: ViabilidadeAlares,
    available: true
  },
  {
    id: 'analise-cobertura',
    title: 'Consulta de Alívio de Rede',
    description: 'Consulta de CTOs para análise de alívio de rede e infraestrutura',
    icon: '📡',
    color: '#6495ED',
    component: AnaliseCobertura,
    available: true
  },
  {
    id: 'calculadora-orcamento',
    title: 'Calculadora de Orçamento',
    description: 'Cálculo de orçamentos para projetos de engenharia',
    icon: '🧮',
    color: '#10B981',
    component: CalculadoraOrcamento,
    available: true
  },
  {
    id: 'mapa-consulta',
    title: 'Mapa de Consulta',
    description: 'Visualização e consulta de informações em mapa interativo',
    icon: '🗺️',
    color: '#F59E0B',
    component: MapaConsulta,
    available: true
  },
  {
    id: 'dashboard-censup',
    title: 'Dashboard CENSUP',
    description: 'Dashboard para visualização e análise de dados CENSUP',
    icon: '📊',
    color: '#6366F1',
    component: DashboardCensup,
    available: true
  },
  {
    id: 'formulario-engenharia',
    title: 'Formulário de Engenharia',
    description: 'Formulário com prévia em tempo real e geração de PDF no padrão Alares',
    icon: '📋',
    color: '#7B68EE',
    component: FormularioEngenharia,
    available: true
  }
];

/**
 * Mescla permissões salvas com todas as ferramentas do registry.
 * Ferramentas novas (sem chave salva) ficam habilitadas por padrão.
 */
export function mergePermissionsWithRegistry(permissions = {}) {
  const merged = { ...(permissions || {}) };
  toolsRegistry.forEach((tool) => {
    if (merged[tool.id] === undefined) {
      merged[tool.id] = true;
    }
  });
  return merged;
}

/**
 * Busca uma ferramenta pelo ID
 * @param {string} toolId - ID da ferramenta
 * @returns {object|null} - Objeto da ferramenta ou null se não encontrada
 */
export function getToolById(toolId) {
  return toolsRegistry.find(tool => tool.id === toolId) || null;
}

/**
 * Retorna todas as ferramentas disponíveis
 * @returns {array} - Array de ferramentas disponíveis
 */
export function getAvailableTools() {
  return toolsRegistry.filter(tool => tool.available);
}

/**
 * Verifica se uma ferramenta existe e está disponível
 * @param {string} toolId - ID da ferramenta
 * @returns {boolean} - true se existe e está disponível
 */
export function isToolAvailable(toolId) {
  const tool = getToolById(toolId);
  return tool && tool.available;
}

