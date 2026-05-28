<script>
  import { onMount } from 'svelte';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  let searchQuery = '';
  let recentRelatorios = [];

  $: filteredRelatorios = filterRelatorios(recentRelatorios, searchQuery);

  function filterRelatorios(items, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.titulo,
        item.clienteProjeto,
        item.projetista,
        item.statusLabel
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
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

<div class="relatorios-dashboard relatorios-dashboard--implantacao">
  <header class="dashboard-header">
    <div class="dashboard-header-text">
      <h1>Dashboard Implantação</h1>
      <p>
        Setor de Implantação — relatórios enviados por Projetos aguardando Relatório de Construção
      </p>
    </div>
  </header>

  <section class="search-section" aria-label="Pesquisar relatórios">
    <label class="search-label" for="search-relatorios-implantacao">Pesquisar relatórios</label>
    <input
      id="search-relatorios-implantacao"
      type="search"
      class="search-input"
      placeholder="Cliente, projeto, projetista, status…"
      bind:value={searchQuery}
      autocomplete="off"
    />
  </section>

  <section class="recent-section" aria-labelledby="recent-implantacao-heading">
    <h2 id="recent-implantacao-heading">Relatórios recentes</h2>

    {#if filteredRelatorios.length === 0}
      <div class="empty-state" role="status">
        {#if searchQuery.trim()}
          <p>Nenhum relatório encontrado para &ldquo;{searchQuery.trim()}&rdquo;.</p>
          <p class="empty-hint">A busca será conectada ao backend na próxima etapa.</p>
        {:else}
          <p>Nenhum relatório aguardando implantação.</p>
          <p class="empty-hint">
            Quando Projetos enviar um relatório técnico, ele aparecerá aqui para inclusão do
            Relatório de Construção.
          </p>
        {/if}
      </div>
    {:else}
      <ul class="relatorio-list">
        {#each filteredRelatorios as item (item.id)}
          <li class="relatorio-card">
            <div class="relatorio-card-main">
              <span class="relatorio-titulo">{item.titulo || 'Sem título'}</span>
              <span class="relatorio-meta">{item.clienteProjeto || '—'}</span>
            </div>
            <span class="status-badge" data-status={item.status}>{item.statusLabel}</span>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

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

  .relatorios-dashboard--implantacao .dashboard-header-text h1 {
    color: #0f766e;
  }

  .relatorios-dashboard--implantacao .search-label {
    color: #0f766e;
  }

  .relatorios-dashboard--implantacao .search-input:focus {
    border-color: #0d9488;
    box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.15);
  }

  .relatorios-dashboard--implantacao .recent-section {
    border-color: rgba(13, 148, 136, 0.25);
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

  .recent-section {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: white;
    border-radius: 12px;
    border: 1px solid rgba(123, 104, 238, 0.2);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  .recent-section h2 {
    margin: 0;
    padding: 1rem 1.25rem;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
  }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem 1.5rem;
    text-align: center;
    color: #6b7280;
  }

  .empty-state p {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
  }

  .empty-hint {
    font-size: 0.85rem !important;
    color: #9ca3af !important;
    max-width: 30rem;
  }

  .relatorio-list {
    list-style: none;
    margin: 0;
    padding: 0.5rem;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  .relatorio-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.85rem 1rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: #fafbff;
    margin-bottom: 0.5rem;
  }

  .relatorio-card-main {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .relatorio-titulo {
    font-weight: 600;
    color: #1f2937;
    font-size: 0.9rem;
  }

  .relatorio-meta {
    font-size: 0.8rem;
    color: #6b7280;
    word-break: break-word;
  }

  .status-badge {
    flex-shrink: 0;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: #ede9fe;
    color: #5b21b6;
  }

  .status-badge[data-status='em_analise'] {
    background: #fffbeb;
    color: #92400e;
  }

  .status-badge[data-status='em_implantacao'] {
    background: #eff6ff;
    color: #1d4ed8;
  }

  .status-badge[data-status='finalizado'] {
    background: #ecfdf5;
    color: #047857;
  }

  .session-hint {
    margin: 0;
    font-size: 0.75rem;
    color: #9ca3af;
    flex-shrink: 0;
  }
</style>
