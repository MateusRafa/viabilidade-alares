<script>
  import { onMount, onDestroy } from 'svelte';
  import { theme } from '../themeStore.js';
  import { clearToolShell, toolShellThemeToggle, toolShellAddAction } from '../toolShellStore.js';

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

  const TIPOS_SOLICITACAO = ['Alívio Proativo', 'Crescimento Orgânico', 'MDU'];
  const DESAFIOS_OCUPACAO = ['Cenário 01', 'Cenário 02', 'Cenário 03'];
  const STATUS_OPTS = [STATUS.APROVADO, STATUS.REPROVADO, STATUS.EM_ESPERA];
  const LEILOES_OPTS = ['1ª', '2ª', '3ª', '4ª'];

  function emptyForm() {
    return {
      nroChamado: '',
      hiperlinkChamado: '',
      dataAbertura: '',
      solicitanteEmail: '',
      cidadeUf: '',
      tipoSolicitacao: '',
      nomeProjeto: '',
      hps: '',
      facilidadesPrevistas: '',
      capex: '',
      opex: '',
      desafioOcupacao: '',
      posicionamentoFpa: '',
      posicionamentoEngenharia: '',
      posicionamentoComercial: '',
      dataDefesa: '',
      status: STATUS.EM_ESPERA,
      quantidadeLeiloes: ''
    };
  }

  function formatDateBr(iso) {
    if (!iso) return '';
    const [y, m, d] = iso.split('-');
    if (!y || !m || !d) return iso;
    return `${d}/${m}/${y}`;
  }

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

  const LAYOUT_KEY = 'cia-card-layout-v1';
  const CARD_W = 250;
  const CARD_GAP = 16;
  const CARD_H_EST = 360;

  const SNAP = 12;

  let projetos = [...projetosMock];
  let cardPositions = {};
  let selectedProjeto = null;
  let showAddModal = false;
  let form = emptyForm();
  let formImages = [];
  let formError = '';
  let imageInputEl;
  let slideIndex = 0;
  let carouselTimer = null;
  let boardEl;
  let draggingId = null;
  let dragOffset = { x: 0, y: 0 };
  let dragMoved = false;
  let alignGuides = { x: null, y: null };

  $: isDark = $theme === 'dark';
  $: proximosEmAnalise = projetos.filter((p) => p.status === STATUS.EM_ESPERA);
  $: tickerItems = [...proximosEmAnalise, ...proximosEmAnalise];
  $: boardMinHeight = Math.max(
    480,
    ...Object.values(cardPositions).map((p) => (p?.y || 0) + CARD_H_EST + 24)
  );

  function statusClass(status) {
    if (status === STATUS.APROVADO) return 'status-aprovado';
    if (status === STATUS.REPROVADO) return 'status-reprovado';
    return 'status-espera';
  }

  function applyDefaultLayout() {
    const width = boardEl?.clientWidth || 1100;
    const cols = Math.max(1, Math.floor((width - 24) / (CARD_W + CARD_GAP)));
    const next = {};
    projetos.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      next[p.id] = {
        x: 12 + col * (CARD_W + CARD_GAP),
        y: 12 + row * (CARD_H_EST + CARD_GAP)
      };
    });
    cardPositions = next;
  }

  function loadLayout() {
    try {
      const raw = localStorage.getItem(LAYOUT_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return false;
      const next = {};
      let ok = false;
      for (const p of projetos) {
        if (parsed[p.id] && typeof parsed[p.id].x === 'number' && typeof parsed[p.id].y === 'number') {
          next[p.id] = { x: parsed[p.id].x, y: parsed[p.id].y };
          ok = true;
        }
      }
      if (!ok) return false;
      // Preenche faltantes
      projetos.forEach((p, i) => {
        if (!next[p.id]) {
          next[p.id] = { x: 12 + (i % 3) * (CARD_W + CARD_GAP), y: 12 + Math.floor(i / 3) * (CARD_H_EST + CARD_GAP) };
        }
      });
      cardPositions = next;
      return true;
    } catch {
      return false;
    }
  }

  function saveLayout() {
    try {
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(cardPositions));
    } catch {
      /* ignore */
    }
  }

  function snapToNeighbors(id, x, y) {
    let nextX = x;
    let nextY = y;
    let guideX = null;
    let guideY = null;

    for (const p of projetos) {
      if (p.id === id) continue;
      const pos = cardPositions[p.id];
      if (!pos) continue;

      const targetsX = [pos.x, pos.x + CARD_W + CARD_GAP];
      for (const tx of targetsX) {
        if (Math.abs(x - tx) <= SNAP) {
          nextX = tx;
          guideX = tx;
        }
      }

      const targetsY = [pos.y, pos.y + CARD_H_EST + CARD_GAP];
      for (const ty of targetsY) {
        if (Math.abs(y - ty) <= SNAP) {
          nextY = ty;
          guideY = ty;
        }
      }
    }

    alignGuides = { x: guideX, y: guideY };
    return { x: Math.max(0, nextX), y: Math.max(0, nextY) };
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

  function openAddModal() {
    form = emptyForm();
    formImages = [];
    formError = '';
    showAddModal = true;
    syncAddButton();
  }

  function closeAddModal() {
    showAddModal = false;
    formError = '';
    syncAddButton();
  }

  function toggleAddModal() {
    if (showAddModal) closeAddModal();
    else openAddModal();
  }

  function syncAddButton() {
    toolShellAddAction.set({
      label: 'Adicionar novo arquivo',
      title: 'Adicionar novo arquivo',
      active: showAddModal,
      onClick: toggleAddModal
    });
  }

  function onImagesSelected(event) {
    const files = Array.from(event.target.files || []).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        formImages = [
          ...formImages,
          { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, label: file.name, url: reader.result }
        ];
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  }

  function removeFormImage(id) {
    formImages = formImages.filter((img) => img.id !== id);
  }

  function submitNovoProjeto() {
    formError = '';
    if (!(form.nomeProjeto || '').trim()) {
      formError = 'Informe o Nome do Projeto.';
      return;
    }
    if (!form.status) {
      formError = 'Selecione o Status.';
      return;
    }

    const id = `cia-${Date.now()}`;
    const imagens =
      formImages.length > 0
        ? formImages.map((img) => ({ label: img.label, url: img.url }))
        : [{ label: 'Sem imagem', color: '#7B68EE' }];

    const novo = {
      id,
      nome: form.nomeProjeto.trim(),
      cidade: (form.cidadeUf || '').trim() || '—',
      responsavel: (form.solicitanteEmail || '').trim() || '—',
      data: formatDateBr(form.dataDefesa) || formatDateBr(form.dataAbertura) || '—',
      status: form.status,
      resumo: form.facilidadesPrevistas || form.tipoSolicitacao || 'Projeto cadastrado no comitê.',
      campos: { ...form },
      tecnicos: {
        area: form.facilidadesPrevistas || '—',
        ctos: form.hps || '—',
        clientesEstimados: form.hps || '—',
        investimento: form.capex ? `CAPEX ${form.capex}` : '—'
      },
      estatisticas: { cobertura: 0, demanda: 0, prioridade: 0 },
      imagens
    };

    projetos = [novo, ...projetos];
    cardPositions = {
      ...cardPositions,
      [id]: { x: 12, y: 12 }
    };
    saveLayout();
    closeAddModal();
  }

  function onKeydown(event) {
    if (event.key !== 'Escape') return;
    if (showAddModal) {
      closeAddModal();
      return;
    }
    if (selectedProjeto) closeProjeto();
  }

  function boardPoint(event) {
    const rect = boardEl.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function onCardPointerDown(event, projeto) {
    if (event.button !== 0) return;
    event.preventDefault();
    const pos = cardPositions[projeto.id] || { x: 0, y: 0 };
    const point = boardPoint(event);
    draggingId = projeto.id;
    dragMoved = false;
    dragOffset = { x: point.x - pos.x, y: point.y - pos.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onCardPointerMove(event, projeto) {
    if (draggingId !== projeto.id) return;
    const point = boardPoint(event);
    const nextX = Math.max(0, point.x - dragOffset.x);
    const nextY = Math.max(0, point.y - dragOffset.y);
    const prev = cardPositions[projeto.id] || { x: 0, y: 0 };
    if (Math.abs(nextX - prev.x) > 3 || Math.abs(nextY - prev.y) > 3) {
      dragMoved = true;
    }
    const next = snapToNeighbors(projeto.id, nextX, nextY);
    cardPositions = {
      ...cardPositions,
      [projeto.id]: next
    };
  }

  function onCardPointerUp(event, projeto) {
    if (draggingId !== projeto.id) return;
    draggingId = null;
    alignGuides = { x: null, y: null };
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      /* ignore */
    }
    if (dragMoved) {
      saveLayout();
    } else {
      openProjeto(projeto);
    }
  }

  onMount(() => {
    if (onSettingsRequest) onSettingsRequest(null);
    if (onSettingsHover) onSettingsHover(null);
    toolShellThemeToggle.set(true);
    syncAddButton();
    window.addEventListener('keydown', onKeydown);
    if (!loadLayout()) applyDefaultLayout();
  });

  onDestroy(() => {
    stopCarousel();
    clearToolShell();
    window.removeEventListener('keydown', onKeydown);
  });
</script>

<div class="cia-root" class:theme-dark={isDark}>
  <div class="cia-scroll">
    <section
      class="cia-board"
      bind:this={boardEl}
      aria-label="Projetos — arraste para reposicionar"
      style="min-height: {boardMinHeight}px;"
    >
      {#if alignGuides.x != null}
        <div class="cia-guide vertical" style="left: {alignGuides.x}px;"></div>
      {/if}
      {#if alignGuides.y != null}
        <div class="cia-guide horizontal" style="top: {alignGuides.y}px;"></div>
      {/if}
      {#each projetos as projeto (projeto.id)}
        <div
          role="button"
          tabindex="0"
          class="cia-card"
          class:dragging={draggingId === projeto.id}
          style="left: {cardPositions[projeto.id]?.x ?? 0}px; top: {cardPositions[projeto.id]?.y ?? 0}px; width: {CARD_W}px;"
          on:pointerdown={(e) => onCardPointerDown(e, projeto)}
          on:pointermove={(e) => onCardPointerMove(e, projeto)}
          on:pointerup={(e) => onCardPointerUp(e, projeto)}
          on:pointercancel={(e) => onCardPointerUp(e, projeto)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              openProjeto(projeto);
            }
          }}
        >
          <div class="cia-card-status {statusClass(projeto.status)}">{projeto.status}</div>
          <div class="cia-card-visual {statusClass(projeto.status)}">
            <span>{projeto.nome}</span>
          </div>
          <div class="cia-card-date">Data: {projeto.data}</div>
          <div class="cia-card-body">
            <p class="cia-card-type">Intenção de Ampliação</p>
            <p><strong>Responsável:</strong> {projeto.responsavel}</p>
            <p><strong>Local:</strong> {projeto.cidade}</p>
            <p class="cia-card-resumo">{projeto.resumo}</p>
          </div>
          <div class="cia-card-action {statusClass(projeto.status)}">Ver detalhes</div>
        </div>
      {/each}
    </section>
  </div>

  <footer class="cia-ticker" aria-label="Próximos projetos em análise">
    <div class="cia-ticker-label">Em análise</div>
    <div class="cia-ticker-track-wrap">
      {#if proximosEmAnalise.length}
        <div class="cia-ticker-track">
          {#each tickerItems as item, i (item.id + '-' + i)}
            <button type="button" class="cia-ticker-item" on:click={() => openProjeto(item)}>
              <span class="dot"></span>
              {item.nome} — {item.cidade} · {item.data}
            </button>
          {/each}
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
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
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
              class:has-image={!!img.url}
              style={img.url
                ? `background-image: url('${img.url}');`
                : `background: linear-gradient(160deg, ${img.color || '#7B68EE'} 0%, #0f172a 100%);`}
            >
              {#if !img.url}
                <span class="cia-slide-label">{img.label}</span>
              {/if}
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
            {#if selectedProjeto.campos}
              <dl>
                <div><dt>Nro do Chamado</dt><dd>{selectedProjeto.campos.nroChamado || '—'}</dd></div>
                <div><dt>Tipo</dt><dd>{selectedProjeto.campos.tipoSolicitacao || '—'}</dd></div>
                <div><dt>HPs</dt><dd>{selectedProjeto.campos.hps || '—'}</dd></div>
                <div><dt>CAPEX</dt><dd>{selectedProjeto.campos.capex || '—'}</dd></div>
                <div><dt>OPEX</dt><dd>{selectedProjeto.campos.opex || '—'}</dd></div>
                <div><dt>Desafio</dt><dd>{selectedProjeto.campos.desafioOcupacao || '—'}</dd></div>
                <div><dt>FP&A</dt><dd>{selectedProjeto.campos.posicionamentoFpa || '—'}</dd></div>
                <div><dt>Engenharia</dt><dd>{selectedProjeto.campos.posicionamentoEngenharia || '—'}</dd></div>
                <div><dt>Comercial</dt><dd>{selectedProjeto.campos.posicionamentoComercial || '—'}</dd></div>
                <div><dt>Leilões</dt><dd>{selectedProjeto.campos.quantidadeLeiloes || '—'}</dd></div>
                <div><dt>Solicitante</dt><dd>{selectedProjeto.campos.solicitanteEmail || '—'}</dd></div>
              </dl>
              {#if selectedProjeto.campos.hiperlinkChamado}
                <p class="cia-side-resumo">
                  <a href={selectedProjeto.campos.hiperlinkChamado} target="_blank" rel="noopener noreferrer">
                    Abrir chamado
                  </a>
                </p>
              {/if}
              {#if selectedProjeto.campos.facilidadesPrevistas}
                <p class="cia-side-resumo">{selectedProjeto.campos.facilidadesPrevistas}</p>
              {/if}
            {:else}
              <dl>
                <div><dt>Área</dt><dd>{selectedProjeto.tecnicos.area}</dd></div>
                <div><dt>CTOs</dt><dd>{selectedProjeto.tecnicos.ctos}</dd></div>
                <div><dt>Clientes est.</dt><dd>{selectedProjeto.tecnicos.clientesEstimados}</dd></div>
                <div><dt>Investimento</dt><dd>{selectedProjeto.tecnicos.investimento}</dd></div>
                <div><dt>Responsável</dt><dd>{selectedProjeto.responsavel}</dd></div>
              </dl>
              <p class="cia-side-resumo">{selectedProjeto.resumo}</p>
            {/if}
          </section>

          {#if selectedProjeto.estatisticas && (selectedProjeto.estatisticas.cobertura || selectedProjeto.estatisticas.demanda || selectedProjeto.estatisticas.prioridade)}
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
          {/if}
        </aside>
      </div>
    </div>
  </div>
{/if}

{#if showAddModal}
  <div
    class="cia-modal-overlay"
    class:theme-dark={isDark}
    role="presentation"
    on:click={closeAddModal}
  >
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
      class="cia-modal cia-add-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cia-add-title"
      on:click|stopPropagation
    >
      <header class="cia-modal-header cia-add-header">
        <div>
          <h3 id="cia-add-title">Adicionar novo arquivo</h3>
        </div>
        <button type="button" class="cia-modal-close" on:click={closeAddModal} aria-label="Fechar">
          ×
        </button>
      </header>
      <div class="cia-add-body">
        <form class="cia-form" on:submit|preventDefault={submitNovoProjeto}>
          <div class="cia-form-grid">
            <label class="cia-field">
              <span>Nro do Chamado</span>
              <input type="text" bind:value={form.nroChamado} />
            </label>
            <label class="cia-field">
              <span>Hiperlink do Chamado</span>
              <input type="url" placeholder="https://" bind:value={form.hiperlinkChamado} />
            </label>
            <label class="cia-field">
              <span>Data de Abertura</span>
              <input type="date" bind:value={form.dataAbertura} />
            </label>
            <label class="cia-field">
              <span>Solicitante / e-mail</span>
              <input type="text" bind:value={form.solicitanteEmail} />
            </label>
            <label class="cia-field">
              <span>Cidade/UF</span>
              <input type="text" placeholder="Ex.: João Pessoa/PB" bind:value={form.cidadeUf} />
            </label>
            <label class="cia-field">
              <span>Tipo de Solicitação</span>
              <select bind:value={form.tipoSolicitacao}>
                <option value="">Selecione</option>
                {#each TIPOS_SOLICITACAO as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </label>
            <label class="cia-field cia-field-full">
              <span>Nome do Projeto</span>
              <input type="text" required bind:value={form.nomeProjeto} />
            </label>
            <label class="cia-field">
              <span>HPs</span>
              <input type="text" bind:value={form.hps} />
            </label>
            <label class="cia-field">
              <span>Facilidades Previstas</span>
              <input type="text" bind:value={form.facilidadesPrevistas} />
            </label>
            <label class="cia-field">
              <span>CAPEX</span>
              <input type="text" bind:value={form.capex} />
            </label>
            <label class="cia-field">
              <span>OPEX</span>
              <input type="text" bind:value={form.opex} />
            </label>
            <label class="cia-field">
              <span>Desafio de Ocupação</span>
              <select bind:value={form.desafioOcupacao}>
                <option value="">Selecione</option>
                {#each DESAFIOS_OCUPACAO as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </label>
            <label class="cia-field">
              <span>Posicionamento FP&A</span>
              <select bind:value={form.posicionamentoFpa}>
                <option value="">Selecione</option>
                {#each STATUS_OPTS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </label>
            <label class="cia-field">
              <span>Posicionamento Engenharia</span>
              <select bind:value={form.posicionamentoEngenharia}>
                <option value="">Selecione</option>
                {#each STATUS_OPTS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </label>
            <label class="cia-field">
              <span>Posicionamento Comercial</span>
              <select bind:value={form.posicionamentoComercial}>
                <option value="">Selecione</option>
                {#each STATUS_OPTS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </label>
            <label class="cia-field">
              <span>Data da Defesa</span>
              <input type="date" bind:value={form.dataDefesa} />
            </label>
            <label class="cia-field">
              <span>Status</span>
              <select bind:value={form.status} required>
                {#each STATUS_OPTS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </label>
            <label class="cia-field">
              <span>Quantidade de Leilões</span>
              <select bind:value={form.quantidadeLeiloes}>
                <option value="">Selecione</option>
                {#each LEILOES_OPTS as opt}
                  <option value={opt}>{opt}</option>
                {/each}
              </select>
            </label>
          </div>

          <div class="cia-images-box">
            <div class="cia-images-head">
              <strong>Imagens do post</strong>
              <span>Adicione quantas quiser — elas passam em loop na visualização</span>
            </div>
            <input
              bind:this={imageInputEl}
              class="cia-file-input"
              type="file"
              accept="image/*"
              multiple
              on:change={onImagesSelected}
            />
            <button type="button" class="cia-images-add" on:click={() => imageInputEl?.click()}>
              + Adicionar imagens
            </button>
            {#if formImages.length}
              <div class="cia-images-grid">
                {#each formImages as img (img.id)}
                  <div class="cia-image-thumb">
                    <img src={img.url} alt={img.label} />
                    <button type="button" class="cia-image-remove" on:click={() => removeFormImage(img.id)} aria-label="Remover imagem">
                      ×
                    </button>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="cia-images-empty">Nenhuma imagem selecionada ainda.</p>
            {/if}
          </div>

          {#if formError}
            <p class="cia-form-error">{formError}</p>
          {/if}

          <div class="cia-form-actions">
            <button type="button" class="cia-btn-secondary" on:click={closeAddModal}>Cancelar</button>
            <button type="submit" class="cia-btn-primary">Criar post</button>
          </div>
        </form>
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
    --cia-aprovado: #059669;
    --cia-reprovado: #dc2626;
    --cia-espera: #eab308;
    --cia-espera-text: #422006;
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
  }

  .cia-guide {
    position: absolute;
    pointer-events: none;
    z-index: 30;
    background: none;
    opacity: 0.55;
  }

  .cia-guide.vertical {
    top: 0;
    bottom: 0;
    width: 0;
    border-left: 1.5px dashed #7B68EE;
  }

  .cia-guide.horizontal {
    left: 0;
    right: 0;
    height: 0;
    border-top: 1.5px dashed #7B68EE;
  }

  .cia-board {
    position: relative;
    width: 100%;
    min-height: 480px;
    user-select: none;
    touch-action: none;
  }

  .cia-card {
    position: absolute;
    display: flex;
    flex-direction: column;
    padding: 0;
    border: 1px solid var(--cia-border);
    border-radius: 12px;
    overflow: hidden;
    background: var(--cia-surface);
    box-shadow: 0 2px 10px rgba(30, 27, 75, 0.06);
    cursor: grab;
    text-align: left;
    color: inherit;
    transition: box-shadow 0.18s ease;
    z-index: 1;
  }

  .cia-card.dragging {
    cursor: grabbing;
    z-index: 20;
    box-shadow: 0 12px 28px rgba(76, 29, 149, 0.28);
    opacity: 0.96;
  }

  .cia-card:hover {
    box-shadow: 0 10px 24px rgba(76, 29, 149, 0.14);
  }

  .cia-card-status {
    text-align: center;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.45rem;
    color: #fff;
  }

  .status-aprovado { background: var(--cia-aprovado); }
  .status-reprovado { background: var(--cia-reprovado); }
  .status-espera {
    background: var(--cia-espera);
    color: #fff;
  }

  .cia-card-visual {
    min-height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    color: #fff;
    font-weight: 700;
    text-align: center;
    font-size: 0.95rem;
  }

  /* Cor interna do box (entre título e data) — mesmo padrão do Reprovado, por status */
  .cia-card-visual.status-aprovado {
    background: linear-gradient(145deg, #22c55e 0%, #1e1b4b 100%);
  }

  .cia-card-visual.status-reprovado {
    background: linear-gradient(145deg, #ef4444 0%, #1e1b4b 100%);
  }

  .cia-card-visual.status-espera {
    background: linear-gradient(145deg, #facc15 0%, #1e1b4b 100%);
  }

  .cia-card-date {
    background: rgba(123, 104, 238, 0.12);
    color: #4c1d95;
    text-align: center;
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.4rem;
  }

  .theme-dark .cia-card-date {
    color: #c4b5fd;
    background: rgba(123, 104, 238, 0.2);
  }

  .cia-card-body {
    padding: 0.85rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1;
  }

  .cia-card-type {
    margin: 0;
    font-weight: 700;
    font-size: 0.88rem;
  }

  .cia-card-body p {
    margin: 0;
    font-size: 0.8rem;
    color: var(--cia-muted);
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
    color: #fff;
    font-weight: 700;
    font-size: 0.82rem;
    padding: 0.7rem;
    letter-spacing: 0.02em;
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
    background: #4c1d95;
    color: #fff;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    padding: 0 0.9rem;
    white-space: nowrap;
  }

  .cia-ticker-track-wrap {
    flex: 1;
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  .cia-ticker-track {
    display: flex;
    gap: 2rem;
    width: max-content;
    animation: cia-marquee 28s linear infinite;
    padding-left: 1rem;
  }

  .cia-ticker-track:hover {
    animation-play-state: paused;
  }

  @keyframes cia-marquee {
    from { transform: translateX(0); }
    to { transform: translateX(-50%); }
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

  .cia-add-modal {
    width: min(920px, 100%);
    max-height: min(92vh, 900px);
    border: none;
    background: #fff;
    box-shadow: 0 24px 60px rgba(15, 18, 32, 0.45);
  }

  .cia-add-header {
    align-items: center;
    background: linear-gradient(135deg, #7B68EE 0%, #6B5BEE 100%);
    border-bottom: none;
    color: #fff;
  }

  .cia-add-header h3 {
    color: #fff;
    font-weight: 700;
    font-size: 1.25rem;
    text-shadow: none;
    opacity: 1;
  }

  .cia-add-header .cia-modal-close {
    color: #fff;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 1;
  }

  .cia-add-header .cia-modal-close:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .cia-add-body {
    padding: 1.25rem 1.5rem 1.5rem;
    overflow: auto;
    background: #fff;
  }

  .cia-modal-overlay.theme-dark .cia-add-modal {
    background: #1a1f33;
  }

  .cia-modal-overlay.theme-dark .cia-add-body {
    background: #1a1f33;
  }

  .cia-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.85rem 1rem;
  }

  .cia-field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: #4c1d95;
  }

  .cia-modal-overlay.theme-dark .cia-field {
    color: #c4b5fd;
  }

  .cia-field-full {
    grid-column: 1 / -1;
  }

  .cia-field input,
  .cia-field select {
    border: 1px solid rgba(123, 104, 238, 0.35);
    border-radius: 8px;
    padding: 0.6rem 0.75rem;
    font-size: 0.9rem;
    font-weight: 500;
    color: #1e1b4b;
    background: #fff;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .cia-field input:focus,
  .cia-field select:focus {
    outline: none;
    border-color: #7B68EE;
    box-shadow: 0 0 0 3px rgba(123, 104, 238, 0.18);
  }

  .cia-modal-overlay.theme-dark .cia-field input,
  .cia-modal-overlay.theme-dark .cia-field select {
    background: #232a42;
    color: #e8eaf6;
    border-color: rgba(123, 104, 238, 0.4);
  }

  .cia-images-box {
    margin-top: 1.15rem;
    padding: 1rem;
    border: 1px dashed #7B68EE;
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(123, 104, 238, 0.1) 0%, rgba(100, 149, 237, 0.06) 100%);
  }

  .cia-images-head {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    margin-bottom: 0.75rem;
  }

  .cia-images-head strong {
    color: #4c1d95;
    font-size: 0.92rem;
  }

  .cia-modal-overlay.theme-dark .cia-images-head strong {
    color: #c4b5fd;
  }

  .cia-images-head span {
    font-size: 0.78rem;
    color: #64748b;
  }

  .cia-file-input {
    display: none;
  }

  .cia-images-add {
    border: none;
    background: linear-gradient(135deg, #7B68EE 0%, #6495ED 100%);
    color: #fff;
    font-weight: 600;
    font-size: 0.85rem;
    padding: 0.65rem 1.1rem;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(123, 104, 238, 0.3);
    transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
  }

  .cia-images-add:hover {
    filter: brightness(1.06);
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(123, 104, 238, 0.4);
  }

  .cia-images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
    gap: 0.55rem;
    margin-top: 0.75rem;
  }

  .cia-image-thumb {
    position: relative;
    aspect-ratio: 1;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid rgba(123, 104, 238, 0.35);
  }

  .cia-image-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cia-image-remove {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 22px;
    height: 22px;
    border: none;
    border-radius: 50%;
    background: linear-gradient(135deg, #7B68EE 0%, #6495ED 100%);
    color: #fff;
    cursor: pointer;
    line-height: 1;
  }

  .cia-images-empty {
    margin: 0.65rem 0 0;
    font-size: 0.8rem;
    color: #64748b;
  }

  .cia-form-error {
    margin: 0.75rem 0 0;
    color: #dc2626;
    font-size: 0.85rem;
    font-weight: 600;
  }

  .cia-form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 1px solid rgba(123, 104, 238, 0.2);
  }

  .cia-btn-primary,
  .cia-btn-secondary {
    border: none;
    border-radius: 8px;
    padding: 0.7rem 1.35rem;
    font-weight: 600;
    font-size: 0.9rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s, background 0.2s, filter 0.2s;
  }

  .cia-btn-primary {
    background: linear-gradient(135deg, #7B68EE 0%, #6495ED 100%);
    color: #fff;
    box-shadow: 0 4px 6px rgba(123, 104, 238, 0.3);
  }

  .cia-btn-primary:hover {
    filter: brightness(1.06);
    transform: translateY(-1px);
    box-shadow: 0 6px 12px rgba(123, 104, 238, 0.4);
  }

  .cia-btn-secondary {
    background: #e8e4f8;
    color: #4c1d95;
  }

  .cia-btn-secondary:hover {
    background: #ddd6f5;
  }

  .cia-modal-overlay.theme-dark .cia-btn-secondary {
    background: #2a3150;
    color: #e8eaf6;
  }

  @media (max-width: 700px) {
    .cia-form-grid {
      grid-template-columns: 1fr;
    }
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
    background-size: cover;
    background-position: center;
  }

  .cia-slide.active {
    opacity: 1;
  }

  .cia-slide.has-image .cia-slide-count {
    position: absolute;
    right: 0.75rem;
    bottom: 0.75rem;
    margin: 0;
    padding: 0.2rem 0.45rem;
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.45);
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

  .cia-side-resumo a {
    color: #7B68EE;
    font-weight: 700;
    text-decoration: none;
  }

  .cia-side-resumo a:hover {
    text-decoration: underline;
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
