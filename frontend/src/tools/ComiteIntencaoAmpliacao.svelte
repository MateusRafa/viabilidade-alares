<script>
  import { onMount, onDestroy } from 'svelte';
  import { theme } from '../themeStore.js';
  import { clearToolShell, toolShellThemeToggle } from '../toolShellStore.js';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  const STATUS = {
    APROVADO: 'Aprovado',
    REPROVADO: 'Reprovado',
    EM_ESPERA: 'Em Espera'
  };

  /** Dados mock — serão substituídos pela ferramenta de cadastro */
  const projetosMock = [
    {
      id: 'cia-001',
      nome: 'Ampliação Norte — Setor A',
      cidade: 'João Pessoa (PB)',
      responsavel: 'Engenharia Alares',
      data: '02/09/2026',
      status: STATUS.APROVADO,
      resumo: 'Expansão de backbone e novos CTOs na região Norte.',
      tecnicos: {
        area: '12,4 km',
        ctos: 28,
        clientesEstimados: 420,
        investimento: 'R$ 185.000'
      },
      estatisticas: { cobertura: 78, demanda: 65, prioridade: 90 },
      imagens: [
        { label: 'Mapa de cobertura', color: '#4c1d95' },
        { label: 'Diagrama de rede', color: '#6366F1' },
        { label: 'Foto de campo', color: '#0D9488' }
      ]
    },
    {
      id: 'cia-002',
      nome: 'Anel Metropolitano — Fase 2',
      cidade: 'Campina Grande (PB)',
      responsavel: 'Planejamento',
      data: '05/09/2026',
      status: STATUS.EM_ESPERA,
      resumo: 'Projeto em análise pelo comitê de intenção de ampliação.',
      tecnicos: {
        area: '8,1 km',
        ctos: 16,
        clientesEstimados: 210,
        investimento: 'R$ 96.000'
      },
      estatisticas: { cobertura: 54, demanda: 72, prioridade: 60 },
      imagens: [
        { label: 'Planta baixa', color: '#7B68EE' },
        { label: 'Traçado proposto', color: '#6495ED' }
      ]
    },
    {
      id: 'cia-003',
      nome: 'Corredor Litoral Sul',
      cidade: 'Cabedelo (PB)',
      responsavel: 'Engenharia Alares',
      data: '28/08/2026',
      status: STATUS.REPROVADO,
      resumo: 'Reprovado por overlap com projeto já em implantação.',
      tecnicos: {
        area: '5,6 km',
        ctos: 9,
        clientesEstimados: 140,
        investimento: 'R$ 62.000'
      },
      estatisticas: { cobertura: 41, demanda: 38, prioridade: 35 },
      imagens: [
        { label: 'Sobreposição de rede', color: '#DC2626' },
        { label: 'Área analisada', color: '#F59E0B' }
      ]
    },
    {
      id: 'cia-004',
      nome: 'Hub Industrial — Distrito',
      cidade: 'Bayeux (PB)',
      responsavel: 'Projetos B2B',
      data: '10/09/2026',
      status: STATUS.EM_ESPERA,
      resumo: 'Intenção de ampliação para atendimento B2B no distrito industrial.',
      tecnicos: {
        area: '3,2 km',
        ctos: 6,
        clientesEstimados: 85,
        investimento: 'R$ 48.500'
      },
      estatisticas: { cobertura: 33, demanda: 88, prioridade: 75 },
      imagens: [
        { label: 'Layout industrial', color: '#0D9488' },
        { label: 'Pontos de demanda', color: '#4c1d95' },
        { label: 'Rota sugerida', color: '#6366F1' }
      ]
    },
    {
      id: 'cia-005',
      nome: 'Reforço Oeste — Cluster 7',
      cidade: 'Santa Rita (PB)',
      responsavel: 'Engenharia Alares',
      data: '01/09/2026',
      status: STATUS.APROVADO,
      resumo: 'Reforço de capacidade e redistribuição de CTOs saturadas.',
      tecnicos: {
        area: '6,9 km',
        ctos: 14,
        clientesEstimados: 310,
        investimento: 'R$ 112.000'
      },
      estatisticas: { cobertura: 69, demanda: 81, prioridade: 85 },
      imagens: [
        { label: 'CTOs saturadas', color: '#F59E0B' },
        { label: 'Plano de reforço', color: '#10B981' }
      ]
    },
    {
      id: 'cia-006',
      nome: 'Extensão Rural — Zona B',
      cidade: 'Conde (PB)',
      responsavel: 'Planejamento',
      data: '12/09/2026',
      status: STATUS.EM_ESPERA,
      resumo: 'Aguardando validação de demanda e custo por cliente.',
      tecnicos: {
        area: '15,0 km',
        ctos: 11,
        clientesEstimados: 95,
        investimento: 'R$ 140.000'
      },
      estatisticas: { cobertura: 22, demanda: 45, prioridade: 40 },
      imagens: [
        { label: 'Traçado rural', color: '#6495ED' },
        { label: 'Estimativa CAPEX', color: '#7B68EE' }
      ]
    }
  ];

  let selectedProjeto = null;
  let slideIndex = 0;
  let carouselTimer = null;

  $: isDark = $theme === 'dark';
  $: proximosEmAnalise = projetosMock.filter((p) => p.status === STATUS.EM_ESPERA);

  function statusClass(status) {
    if (status === STATUS.APROVADO) return 'status-aprovado';
    if (status === STATUS.REPROVADO) return 'status-reprovado';
    return 'status-espera';
  }

  function openProjeto(projeto) {
    selectedProjeto = projeto;
    slideIndex = 0;
    startCarousel();
  }

  function closeProjeto() {
    selectedProjeto = null;
    stopCarousel();
  }

  function startCarousel() {
    stopCarousel();
    if (!selectedProjeto?.imagens?.length || selectedProjeto.imagens.length < 2) return;
    carouselTimer = setInterval(() => {
      slideIndex = (slideIndex + 1) % selectedProjeto.imagens.length;
    }, 2800);
  }

  function stopCarousel() {
    if (carouselTimer) {
      clearInterval(carouselTimer);
      carouselTimer = null;
    }
  }

  function goSlide(dir) {
    if (!selectedProjeto?.imagens?.length) return;
    const n = selectedProjeto.imagens.length;
    slideIndex = (slideIndex + dir + n) % n;
    startCarousel();
  }

  function onKeydown(event) {
    if (event.key === 'Escape' && selectedProjeto) closeProjeto();
  }

  onMount(() => {
    if (onSettingsRequest) onSettingsRequest(null);
    if (onSettingsHover) onSettingsHover(null);
    toolShellThemeToggle.set(true);
    window.addEventListener('keydown', onKeydown);
  });

  onDestroy(() => {
    stopCarousel();
    clearToolShell();
    window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="cia-root" class:theme-dark={isDark}>
  <div class="cia-scroll">
    <section class="cia-grid" aria-label="Projetos">
      {#each projetosMock as projeto (projeto.id)}
        <button
          type="button"
          class="cia-card"
          on:click={() => openProjeto(projeto)}
        >
          <div class="cia-card-status {statusClass(projeto.status)}">{projeto.status}</div>
          <div class="cia-card-content">
            <div class="cia-card-visual">
              <span>{projeto.nome}</span>
            </div>
            <div class="cia-card-date">Data: {projeto.data}</div>
            <div class="cia-card-body">
              <p class="cia-card-type">Intenção de Ampliação</p>
              <p><strong>Responsável:</strong> {projeto.responsavel}</p>
              <p><strong>Local:</strong> {projeto.cidade}</p>
              <p class="cia-card-resumo">{projeto.resumo}</p>
            </div>
          </div>
          <div class="cia-card-action {statusClass(projeto.status)}">Ver detalhes</div>
        </button>
      {/each}
    </section>
  </div>

  <footer class="cia-ticker" aria-label="Próximos projetos em análise">
    <div class="cia-ticker-label">Em análise</div>
    <div class="cia-ticker-track-wrap">
      {#if proximosEmAnalise.length}
        <div class="cia-ticker-track">
          <div class="cia-ticker-group">
            {#each proximosEmAnalise as item (item.id)}
              <button type="button" class="cia-ticker-item" on:click={() => openProjeto(item)}>
                <span class="dot"></span>
                {item.nome} — {item.cidade} · {item.data}
              </button>
            {/each}
          </div>
          <div class="cia-ticker-group" aria-hidden="true">
            {#each proximosEmAnalise as item (item.id + '-dup')}
              <button type="button" class="cia-ticker-item" tabindex="-1" on:click={() => openProjeto(item)}>
                <span class="dot"></span>
                {item.nome} — {item.cidade} · {item.data}
              </button>
            {/each}
          </div>
        </div>
      {:else}
        <span class="cia-ticker-empty">Nenhum projeto em espera no momento.</span>
      {/if}
    </div>
  </footer>
</div>

{#if selectedProjeto}
  <div
    class="cia-modal-overlay"
    class:theme-dark={isDark}
    role="presentation"
    on:click={closeProjeto}
  >
    <div
      class="cia-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cia-modal-title"
      on:click|stopPropagation
    >
      <header class="cia-modal-header">
        <div>
          <span class="cia-modal-badge {statusClass(selectedProjeto.status)}">
            {selectedProjeto.status}
          </span>
          <h3 id="cia-modal-title">{selectedProjeto.nome}</h3>
          <p>{selectedProjeto.cidade} · {selectedProjeto.data}</p>
        </div>
        <button type="button" class="cia-modal-close" on:click={closeProjeto} aria-label="Fechar">
          ×
        </button>
      </header>

      <div class="cia-modal-body">
        <div class="cia-carousel">
          {#each selectedProjeto.imagens as img, i}
            <div
              class="cia-slide"
              class:active={i === slideIndex}
              style="background: linear-gradient(160deg, {img.color} 0%, #0f172a 100%);"
            >
              <span class="cia-slide-label">{img.label}</span>
              <span class="cia-slide-count">{i + 1} / {selectedProjeto.imagens.length}</span>
            </div>
          {/each}
          {#if selectedProjeto.imagens.length > 1}
            <button type="button" class="cia-nav prev" on:click={() => goSlide(-1)} aria-label="Anterior">‹</button>
            <button type="button" class="cia-nav next" on:click={() => goSlide(1)} aria-label="Próxima">›</button>
            <div class="cia-dots">
              {#each selectedProjeto.imagens as _, i}
                <button
                  type="button"
                  class:active={i === slideIndex}
                  aria-label="Imagem {i + 1}"
                  on:click={() => { slideIndex = i; startCarousel(); }}
                ></button>
              {/each}
            </div>
          {/if}
        </div>

        <aside class="cia-side">
          <section>
            <h4>Informações técnicas</h4>
            <dl>
              <div><dt>Área</dt><dd>{selectedProjeto.tecnicos.area}</dd></div>
              <div><dt>CTOs</dt><dd>{selectedProjeto.tecnicos.ctos}</dd></div>
              <div><dt>Clientes est.</dt><dd>{selectedProjeto.tecnicos.clientesEstimados}</dd></div>
              <div><dt>Investimento</dt><dd>{selectedProjeto.tecnicos.investimento}</dd></div>
              <div><dt>Responsável</dt><dd>{selectedProjeto.responsavel}</dd></div>
            </dl>
            <p class="cia-side-resumo">{selectedProjeto.resumo}</p>
          </section>

          <section>
            <h4>Estatísticas</h4>
            <div class="cia-stats">
              <div class="cia-stat">
                <div class="cia-stat-head"><span>Cobertura</span><strong>{selectedProjeto.estatisticas.cobertura}%</strong></div>
                <div class="cia-bar"><span style="width: {selectedProjeto.estatisticas.cobertura}%"></span></div>
              </div>
              <div class="cia-stat">
                <div class="cia-stat-head"><span>Demanda</span><strong>{selectedProjeto.estatisticas.demanda}%</strong></div>
                <div class="cia-bar"><span style="width: {selectedProjeto.estatisticas.demanda}%"></span></div>
              </div>
              <div class="cia-stat">
                <div class="cia-stat-head"><span>Prioridade</span><strong>{selectedProjeto.estatisticas.prioridade}%</strong></div>
                <div class="cia-bar priority"><span style="width: {selectedProjeto.estatisticas.prioridade}%"></span></div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  </div>
{/if}

<style>
  .cia-root {
    --cia-bg: #f5f7fa;
    --cia-surface: #ffffff;
    --cia-text: #1e1b4b;
    --cia-muted: #64748b;
    --cia-border: rgba(123, 104, 238, 0.18);
    --cia-accent: #7B68EE;
    --cia-aprovado: #16a34a;
    --cia-reprovado: #dc2626;
    --cia-espera: #eab308;
    --cia-espera-text: #713f12;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--cia-bg);
    color: var(--cia-text);
  }

  .cia-root.theme-dark {
    --cia-bg: #0f1220;
    --cia-surface: #1a1f33;
    --cia-text: #e8eaf6;
    --cia-muted: #94a3b8;
    --cia-border: rgba(123, 104, 238, 0.28);
  }

  .cia-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem 1.75rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .cia-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 1rem;
  }

  .cia-card {
    display: flex;
    flex-direction: column;
    padding: 0;
    border: none;
    border-radius: 12px;
    overflow: hidden;
    background: #1a1f33;
    box-shadow: 0 2px 10px rgba(30, 27, 75, 0.18);
    cursor: pointer;
    text-align: left;
    color: #fff;
    transition: transform 0.18s ease, box-shadow 0.18s ease;
  }

  .cia-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 24px rgba(76, 29, 149, 0.28);
  }

  .cia-card-status {
    text-align: center;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.5rem;
    color: #fff;
  }

  .cia-card-status.status-aprovado { background: var(--cia-aprovado); }
  .cia-card-status.status-reprovado { background: var(--cia-reprovado); }
  .cia-card-status.status-espera {
    background: var(--cia-espera);
    color: var(--cia-espera-text);
  }

  .cia-card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: linear-gradient(160deg, #5b4fcf 0%, #3b2a8a 45%, #1e1b4b 100%);
    color: #fff;
  }

  .cia-card-visual {
    min-height: 72px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem 1rem 0.35rem;
    color: #fff;
    font-weight: 700;
    text-align: center;
    font-size: 0.95rem;
    background: transparent;
  }

  .cia-card-date {
    background: transparent;
    color: rgba(255, 255, 255, 0.9);
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem 0.55rem;
  }

  .theme-dark .cia-card-date {
    color: rgba(255, 255, 255, 0.9);
    background: transparent;
  }

  .cia-card-body {
    padding: 0.35rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
    background: transparent;
  }

  .cia-card-type {
    margin: 0;
    font-weight: 700;
    font-size: 0.88rem;
    color: #fff;
  }

  .cia-card-body p {
    margin: 0;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.88);
  }

  .cia-card-resumo {
    margin-top: 0.35rem !important;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .cia-card-action {
    text-align: center;
    font-weight: 700;
    font-size: 0.82rem;
    padding: 0.75rem;
    letter-spacing: 0.02em;
    color: #fff;
  }

  .cia-card-action.status-aprovado { background: var(--cia-aprovado); color: #fff; }
  .cia-card-action.status-reprovado { background: var(--cia-reprovado); color: #fff; }
  .cia-card-action.status-espera {
    background: var(--cia-espera);
    color: var(--cia-espera-text);
  }

  .cia-ticker {
    display: flex;
    align-items: stretch;
    border-top: 1px solid var(--cia-border);
    background: var(--cia-surface);
    min-height: 44px;
    flex-shrink: 0;
  }

  .cia-ticker-label {
    background: linear-gradient(135deg, #7B68EE 0%, #4c1d95 100%);
    color: #fff;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    padding: 0 0.9rem;
    white-space: nowrap;
    z-index: 1;
  }

  .cia-ticker-track-wrap {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
    min-width: 0;
    container-type: inline-size;
  }

  .cia-ticker-track {
    display: flex;
    width: max-content;
    will-change: transform;
    animation: cia-marquee 32s linear infinite;
  }

  .cia-ticker-track:hover {
    animation-play-state: paused;
  }

  .cia-ticker-group {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 1.75rem;
    padding-right: 1.75rem;
  }

  /* Começa no canto direito; avança exatamente 1 grupo (−50%) para loop contínuo com pequeno espaço */
  @keyframes cia-marquee {
    from { transform: translateX(100cqi); }
    to { transform: translateX(calc(100cqi - 50%)); }
  }

  .cia-ticker-item {
    border: none;
    background: transparent;
    color: var(--cia-text);
    font-size: 0.82rem;
    white-space: nowrap;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.35rem 0;
  }

  .cia-ticker-item .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--cia-espera);
    flex-shrink: 0;
  }

  .cia-ticker-empty {
    padding: 0 1rem;
    color: var(--cia-muted);
    font-size: 0.85rem;
  }

  .cia-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 18, 32, 0.55);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1200;
    padding: 1rem;
  }

  .cia-modal {
    width: min(980px, 100%);
    max-height: min(90vh, 820px);
    background: var(--cia-surface, #fff);
    color: var(--cia-text, #1e1b4b);
    border-radius: 14px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
  }

  .cia-modal-overlay.theme-dark .cia-modal {
    background: #1a1f33;
    color: #e8eaf6;
  }

  .cia-modal-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid rgba(123, 104, 238, 0.2);
  }

  .cia-modal-badge {
    display: inline-block;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    margin-bottom: 0.35rem;
  }

  .cia-modal-badge.status-aprovado { background: var(--cia-aprovado); }
  .cia-modal-badge.status-reprovado { background: var(--cia-reprovado); }
  .cia-modal-badge.status-espera {
    background: var(--cia-espera);
    color: var(--cia-espera-text);
  }

  .cia-modal-header h3 {
    margin: 0;
    font-size: 1.2rem;
  }

  .cia-modal-header p {
    margin: 0.25rem 0 0;
    color: #64748b;
    font-size: 0.85rem;
  }

  .cia-modal-close {
    border: none;
    background: transparent;
    font-size: 1.6rem;
    line-height: 1;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
  }

  .cia-modal-body {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 1rem;
    padding: 1rem 1.25rem 1.25rem;
    overflow: auto;
  }

  .cia-carousel {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    min-height: 280px;
    background: #0f172a;
  }

  .cia-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transition: opacity 0.45s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    padding: 1.5rem;
  }

  .cia-slide.active {
    opacity: 1;
  }

  .cia-slide-label {
    font-size: 1.15rem;
    font-weight: 700;
    text-align: center;
  }

  .cia-slide-count {
    margin-top: 0.5rem;
    font-size: 0.8rem;
    opacity: 0.8;
  }

  .cia-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    border: none;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 1.4rem;
    cursor: pointer;
  }

  .cia-nav.prev { left: 0.6rem; }
  .cia-nav.next { right: 0.6rem; }

  .cia-dots {
    position: absolute;
    bottom: 0.75rem;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    gap: 0.35rem;
  }

  .cia-dots button {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    padding: 0;
  }

  .cia-dots button.active {
    background: #fff;
  }

  .cia-side {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .cia-side h4 {
    margin: 0 0 0.65rem;
    font-size: 0.95rem;
    color: #4c1d95;
  }

  .cia-modal-overlay.theme-dark .cia-side h4 {
    color: #c4b5fd;
  }

  .cia-side dl {
    margin: 0;
    display: grid;
    gap: 0.45rem;
  }

  .cia-side dl > div {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.85rem;
    padding-bottom: 0.35rem;
    border-bottom: 1px solid rgba(123, 104, 238, 0.12);
  }

  .cia-side dt {
    color: #64748b;
    font-weight: 500;
  }

  .cia-side dd {
    margin: 0;
    font-weight: 700;
    text-align: right;
  }

  .cia-side-resumo {
    margin: 0.75rem 0 0;
    font-size: 0.85rem;
    color: #64748b;
    line-height: 1.45;
  }

  .cia-stats {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .cia-stat-head {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    margin-bottom: 0.3rem;
  }

  .cia-bar {
    height: 8px;
    border-radius: 999px;
    background: rgba(123, 104, 238, 0.15);
    overflow: hidden;
  }

  .cia-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #7B68EE, #6366F1);
  }

  .cia-bar.priority span {
    background: linear-gradient(90deg, #0d9488, #10b981);
  }

  @media (max-width: 800px) {
    .cia-modal-body {
      grid-template-columns: 1fr;
    }

    .cia-carousel {
      min-height: 220px;
    }
  }

  @media (max-width: 640px) {
    .cia-scroll {
      padding: 1rem;
    }
  }
</style>
