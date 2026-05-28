<script>
  /** @type {Array<{ id: string, titulo?: string, clienteProjeto?: string, status: string, statusLabel?: string }>} */
  export let relatorios = [];
  export let searchQuery = '';

  const STATUS_SECTIONS = [
    {
      status: 'em_analise',
      title: 'Em Análise',
      emptyText: 'Nenhum relatório em análise no momento.'
    },
    {
      status: 'em_implantacao',
      title: 'Em Implantação',
      emptyText: 'Nenhum relatório em implantação no momento.'
    },
    {
      status: 'finalizado',
      title: 'Projetos Finalizados',
      emptyText: 'Nenhum projeto finalizado ainda.'
    }
  ];

  function filterRelatorios(items, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [item.titulo, item.clienteProjeto, item.projetista, item.statusLabel]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  $: filteredRelatorios = filterRelatorios(relatorios, searchQuery);
  $: sectionsWithItems = STATUS_SECTIONS.map((section) => ({
    ...section,
    items: filteredRelatorios.filter((item) => item.status === section.status)
  }));
  $: hasSearch = !!(searchQuery || '').trim();
</script>

<div class="status-quadros-grid" role="region" aria-label="Relatórios por status">
  {#each sectionsWithItems as section (section.status)}
    <section
      class="status-quadro"
      class:status-quadro--analise={section.status === 'em_analise'}
      class:status-quadro--implantacao={section.status === 'em_implantacao'}
      class:status-quadro--finalizado={section.status === 'finalizado'}
      aria-labelledby="quadro-heading-{section.status}"
    >
      <header class="status-quadro-header">
        <h2 id="quadro-heading-{section.status}">{section.title}</h2>
        <span class="status-quadro-count" aria-label="{section.items.length} relatório(s)">
          {section.items.length}
        </span>
      </header>

      <div class="status-quadro-body">
        {#if section.items.length === 0}
          <div class="empty-state" role="status">
            {#if hasSearch}
              <p>Nenhum resultado em &ldquo;{searchQuery.trim()}&rdquo;.</p>
            {:else}
              <p>{section.emptyText}</p>
            {/if}
          </div>
        {:else}
          <ul class="relatorio-list">
            {#each section.items as item (item.id)}
              <li class="relatorio-card">
                <div class="relatorio-card-main">
                  <span class="relatorio-titulo">{item.titulo || 'Sem título'}</span>
                  <span class="relatorio-meta">{item.clienteProjeto || '—'}</span>
                </div>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </section>
  {/each}
</div>

<style>
  .status-quadros-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 1rem;
    overflow: hidden;
  }

  .status-quadro {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    background: white;
    border-radius: 12px;
    border: 1px solid rgba(123, 104, 238, 0.2);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
    overflow: hidden;
  }

  .status-quadro-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid #e5e7eb;
    flex-shrink: 0;
    background: linear-gradient(135deg, #fafbff 0%, #f5f3ff 100%);
  }

  .status-quadro--analise .status-quadro-header {
    border-bottom-color: #fcd34d;
    background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  }

  .status-quadro--implantacao .status-quadro-header {
    border-bottom-color: #93c5fd;
    background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  }

  .status-quadro--finalizado .status-quadro-header {
    border-bottom-color: #6ee7b7;
    background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
  }

  .status-quadro-header h2 {
    margin: 0;
    font-size: 0.9rem;
    font-weight: 700;
    color: #4c1d95;
    line-height: 1.3;
  }

  .status-quadro--analise .status-quadro-header h2 {
    color: #92400e;
  }

  .status-quadro--implantacao .status-quadro-header h2 {
    color: #1d4ed8;
  }

  .status-quadro--finalizado .status-quadro-header h2 {
    color: #047857;
  }

  .status-quadro-count {
    flex-shrink: 0;
    min-width: 1.5rem;
    padding: 0.15rem 0.45rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-align: center;
    border-radius: 999px;
    background: rgba(123, 104, 238, 0.12);
    color: #5b21b6;
  }

  .status-quadro--analise .status-quadro-count {
    background: rgba(146, 64, 14, 0.12);
    color: #92400e;
  }

  .status-quadro--implantacao .status-quadro-count {
    background: rgba(29, 78, 216, 0.12);
    color: #1d4ed8;
  }

  .status-quadro--finalizado .status-quadro-count {
    background: rgba(4, 120, 87, 0.12);
    color: #047857;
  }

  .status-quadro-body {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem 1rem;
    text-align: center;
    color: #6b7280;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
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
    padding: 0.75rem 0.85rem;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background: #fafbff;
    margin-bottom: 0.45rem;
    cursor: default;
    transition: border-color 0.15s ease, box-shadow 0.15s ease;
  }

  .relatorio-card:last-child {
    margin-bottom: 0;
  }

  .relatorio-card:hover {
    border-color: rgba(123, 104, 238, 0.35);
    box-shadow: 0 2px 8px rgba(123, 104, 238, 0.08);
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
    font-size: 0.85rem;
    word-break: break-word;
  }

  .relatorio-meta {
    font-size: 0.75rem;
    color: #6b7280;
    word-break: break-word;
  }

  @media (max-width: 1100px) {
    .status-quadros-grid {
      grid-template-columns: 1fr;
      overflow-y: auto;
    }

    .status-quadro {
      min-height: 200px;
      max-height: 280px;
    }
  }
</style>
