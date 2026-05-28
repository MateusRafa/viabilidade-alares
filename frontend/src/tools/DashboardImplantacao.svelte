<script>
  import { onMount } from 'svelte';
  import RelatoriosStatusQuadros from './RelatoriosStatusQuadros.svelte';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  /** Abre outra ferramenta do portal (ex.: formulario-engenharia). */
  export let onOpenTool = null;
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  const FORMULARIO_TOOL_ID = 'formulario-engenharia';
  const RETURN_TOOL_ID = 'dashboard-implantacao';

  let searchQuery = '';
  let recentRelatorios = [];

  function abrirFormularioPdf() {
    if (typeof onOpenTool === 'function') {
      onOpenTool(FORMULARIO_TOOL_ID, { returnTo: RETURN_TOOL_ID });
      return;
    }
    alert('Não foi possível abrir o formulário. Recarregue a página e tente novamente.');
  }

  onMount(() => {
    if (onSettingsRequest && typeof onSettingsRequest === 'function') {
      onSettingsRequest(() => {});
    }
    if (onSettingsHover && typeof onSettingsHover === 'function') {
      onSettingsHover(() => {});
    }
  });
</script>

<div class="relatorios-dashboard">
  <header class="dashboard-header">
    <div class="dashboard-header-text">
      <h1>Dashboard Implantação</h1>
      <p>
        Setor de Implantação — relatórios enviados por Projetos aguardando Relatório de Construção
      </p>
    </div>
    <button type="button" class="btn-primary" on:click={abrirFormularioPdf}>
      Gerar PDF
    </button>
  </header>

  <section class="search-section" aria-label="Pesquisar relatórios">
    <label class="search-label" for="search-relatorios-implantacao">Pesquisar relatórios</label>
    <input
      id="search-relatorios-implantacao"
      type="search"
      class="search-input"
      placeholder="Cliente, projeto, projetista…"
      bind:value={searchQuery}
      autocomplete="off"
    />
  </section>

  <RelatoriosStatusQuadros relatorios={recentRelatorios} {searchQuery} />

  {#if currentUser}
    <p class="session-hint">Sessão: {currentUser}</p>
  {/if}
</div>

<style>
  .relatorios-dashboard {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f0f2f8;
    padding: 1.25rem 1.5rem;
    box-sizing: border-box;
    gap: 1.25rem;
  }

  .dashboard-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    flex-shrink: 0;
  }

  .dashboard-header-text h1 {
    margin: 0 0 0.35rem;
    font-size: 1.35rem;
    font-weight: 700;
    color: #4c1d95;
  }

  .dashboard-header-text p {
    margin: 0;
    font-size: 0.9rem;
    color: #6b7280;
    max-width: 40rem;
    line-height: 1.45;
  }

  .btn-primary {
    padding: 0.65rem 1.1rem;
    background: linear-gradient(135deg, #7b68ee 0%, #6495ed 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(123, 104, 238, 0.3);
    white-space: nowrap;
  }

  .btn-primary:hover {
    filter: brightness(1.06);
  }

  .search-section {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .search-label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #5b21b6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .search-input {
    width: 100%;
    max-width: 32rem;
    box-sizing: border-box;
    padding: 0.6rem 0.85rem;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 0.95rem;
    font-family: inherit;
    background: white;
  }

  .search-input:focus {
    outline: none;
    border-color: #7b68ee;
    box-shadow: 0 0 0 3px rgba(123, 104, 238, 0.15);
  }

  .session-hint {
    margin: 0;
    font-size: 0.75rem;
    color: #9ca3af;
    flex-shrink: 0;
  }
</style>
