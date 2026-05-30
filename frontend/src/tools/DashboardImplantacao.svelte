<script>
  import { onMount, tick } from 'svelte';
  import Loading from '../Loading.svelte';
  import RelatoriosStatusQuadros from './RelatoriosStatusQuadros.svelte';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  /** Abre outra ferramenta do portal (ex.: formulario-engenharia). */
  export let onOpenTool = null;
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  const FORMULARIO_TOOL_ID = 'formulario-engenharia-implantacao';
  const RETURN_TOOL_ID = 'dashboard-implantacao';
  const TRANSITION_LOADING_MS = 500;

  let searchQuery = '';
  let recentRelatorios = [];
  let showSearch = false;
  let searchInputEl;
  let isTransitionLoading = false;
  let loadingMessage = '';

  async function abrirFormularioPdf() {
    if (isTransitionLoading) return;

    if (typeof onOpenTool !== 'function') {
      alert('Não foi possível abrir o formulário. Recarregue a página e tente novamente.');
      return;
    }

    isTransitionLoading = true;
    loadingMessage = 'Abrindo Relatório de Construção…';
    await tick();
    await new Promise((resolve) => setTimeout(resolve, TRANSITION_LOADING_MS));
    onOpenTool(FORMULARIO_TOOL_ID, { returnTo: RETURN_TOOL_ID });
  }

  async function toggleSearch() {
    showSearch = !showSearch;
    if (!showSearch) {
      searchQuery = '';
      return;
    }
    await tick();
    searchInputEl?.focus();
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
    <div class="dashboard-actions">
      <button
        type="button"
        class="btn-primary"
        class:btn-primary--active={showSearch}
        on:click={toggleSearch}
        aria-expanded={showSearch}
        disabled={isTransitionLoading}
      >
        Pesquisar
      </button>
      <button
        type="button"
        class="btn-primary"
        on:click={abrirFormularioPdf}
        disabled={isTransitionLoading}
      >
        Gerar PDF
      </button>
    </div>
  </header>

  {#if showSearch}
    <section class="search-panel" aria-label="Pesquisar relatórios">
      <input
        bind:this={searchInputEl}
        id="search-relatorios-implantacao"
        type="search"
        class="search-input"
        placeholder="Cliente, projeto, projetista…"
        bind:value={searchQuery}
        autocomplete="off"
      />
    </section>
  {/if}

  <RelatoriosStatusQuadros relatorios={recentRelatorios} {searchQuery} />
</div>

{#if isTransitionLoading}
  <div class="transition-loading-layer" role="status" aria-live="polite" aria-busy="true">
    <Loading currentMessage={loadingMessage} />
  </div>
{/if}

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
    justify-content: flex-start;
    flex-shrink: 0;
  }

  .dashboard-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-start;
    gap: 0.65rem;
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

  .btn-primary--active {
    box-shadow:
      0 4px 12px rgba(123, 104, 238, 0.35),
      inset 0 0 0 2px rgba(255, 255, 255, 0.45);
  }

  .search-panel {
    flex-shrink: 0;
    display: flex;
    justify-content: flex-start;
  }

  .search-input {
    width: 100%;
    max-width: 24rem;
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

  .btn-primary:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .transition-loading-layer {
    position: fixed;
    inset: 0;
    z-index: 10000;
  }

  .transition-loading-layer :global(.loading-container) {
    min-height: 100%;
  }
</style>
