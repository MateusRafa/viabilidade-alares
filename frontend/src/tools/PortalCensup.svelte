<script>
  import { onMount, onDestroy } from 'svelte';
  import Loading from '../Loading.svelte';
  import { getApiUrl } from '../config.js';
  import {
    fetchPortalCensupChamados,
    fetchPortalCensupChamadoById,
    sendPortalCensupFeedback,
    fetchTabulacoesList
  } from './portalCensupApi.js';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  const REFRESH_INTERVAL_MS = 30000;
  const pageSize = 50;

  let chamados = [];
  let total = 0;
  let totalPages = 1;
  let page = 1;
  let searchQuery = '';
  let loadingList = false;
  let listError = '';
  let lastUpdatedAt = null;
  let refreshInterval = null;
  let isRefreshing = false;

  let selectedChamado = null;
  let loadingDetail = false;
  let detailError = '';
  let tabulacoesList = [];
  let tabulacaoCorrigida = '';
  let showCorrectionForm = false;
  let submittingFeedback = false;
  let feedbackMessage = '';

  let showExtensionHelp = false;

  $: showingDetail = !!selectedChamado;
  $: apiBaseHint = (() => {
    try {
      const url = getApiUrl('/api/portal-censup/chamados');
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return new URL(url).origin;
      }
    } catch {
      // ignore
    }
    return 'URL do backend Railway (mesmo do Portal)';
  })();

  async function carregarChamados({ silent = false } = {}) {
    if (!(currentUser || '').trim()) {
      chamados = [];
      return;
    }

    if (!silent) loadingList = true;
    listError = '';

    try {
      const data = await fetchPortalCensupChamados(currentUser, {
        q: searchQuery,
        page,
        limit: pageSize
      });
      chamados = data.chamados || [];
      total = data.total || 0;
      totalPages = data.totalPages || 1;
      lastUpdatedAt = new Date();
    } catch (err) {
      if (!silent) {
        listError = err?.message || 'Não foi possível carregar os chamados.';
        chamados = [];
      }
    } finally {
      if (!silent) loadingList = false;
    }
  }

  async function handleAtualizar() {
    if (isRefreshing) return;
    isRefreshing = true;
    try {
      await carregarChamados();
    } finally {
      isRefreshing = false;
    }
  }

  async function abrirChamado(item) {
    if (loadingDetail) return;
    loadingDetail = true;
    detailError = '';
    feedbackMessage = '';
    showCorrectionForm = false;
    tabulacaoCorrigida = '';

    try {
      selectedChamado = await fetchPortalCensupChamadoById(currentUser, item.id);
    } catch (err) {
      detailError = err?.message || 'Não foi possível abrir o chamado.';
      selectedChamado = null;
    } finally {
      loadingDetail = false;
    }
  }

  function fecharDetalhe() {
    selectedChamado = null;
    detailError = '';
    feedbackMessage = '';
    showCorrectionForm = false;
    tabulacaoCorrigida = '';
  }

  async function confirmarTabulacaoCorreta() {
    if (!selectedChamado || submittingFeedback) return;
    submittingFeedback = true;
    feedbackMessage = '';
    try {
      const result = await sendPortalCensupFeedback(currentUser, selectedChamado.id, {
        correto: true
      });
      selectedChamado = result.chamado;
      feedbackMessage = 'Tabulação confirmada como correta.';
      await carregarChamados({ silent: true });
    } catch (err) {
      feedbackMessage = err?.message || 'Erro ao registrar confirmação.';
    } finally {
      submittingFeedback = false;
    }
  }

  function iniciarCorrecao() {
    showCorrectionForm = true;
    tabulacaoCorrigida = selectedChamado?.tabulacaoFinal || '';
    feedbackMessage = '';
  }

  async function enviarCorrecao() {
    if (!selectedChamado || submittingFeedback) return;
    if (!(tabulacaoCorrigida || '').trim()) {
      feedbackMessage = 'Selecione a tabulação correta.';
      return;
    }

    submittingFeedback = true;
    feedbackMessage = '';
    try {
      const result = await sendPortalCensupFeedback(currentUser, selectedChamado.id, {
        correto: false,
        tabulacaoCorrigida: tabulacaoCorrigida.trim()
      });
      selectedChamado = result.chamado;
      showCorrectionForm = false;
      feedbackMessage = 'Correção registrada. A IA usará este exemplo nas próximas análises.';
      await carregarChamados({ silent: true });
    } catch (err) {
      feedbackMessage = err?.message || 'Erro ao registrar correção.';
    } finally {
      submittingFeedback = false;
    }
  }

  function handleSearchInput() {
    page = 1;
    carregarChamados();
  }

  function goToPage(nextPage) {
    if (nextPage < 1 || nextPage > totalPages) return;
    page = nextPage;
    carregarChamados();
  }

  function statusLabel(status) {
    if (status === 'aprovada') return 'Aprovada';
    if (status === 'corrigida') return 'Corrigida';
    if (status === 'aguardando_analise') return 'Aguardando análise';
    return 'Pendente revisão';
  }

  onMount(async () => {
    if (onSettingsRequest && typeof onSettingsRequest === 'function') {
      onSettingsRequest(() => {});
    }
    if (onSettingsHover && typeof onSettingsHover === 'function') {
      onSettingsHover(() => {});
    }

    tabulacoesList = await fetchTabulacoesList();
    await carregarChamados();

    refreshInterval = setInterval(() => {
      carregarChamados({ silent: true });
    }, REFRESH_INTERVAL_MS);
  });

  onDestroy(() => {
    if (refreshInterval) clearInterval(refreshInterval);
  });
</script>

<div class="portal-censup">
  {#if showingDetail}
    <div class="detail-view">
      <header class="detail-header">
        <button type="button" class="btn-secondary" on:click={fecharDetalhe}>
          ← Voltar para a fila
        </button>
        <div class="detail-title">
          <h2>Pedido {selectedChamado?.pedido || '—'}</h2>
          <span class="detail-subtitle">{selectedChamado?.endereco?.completo || '—'}</span>
        </div>
      </header>

      {#if loadingDetail}
        <div class="detail-loading"><Loading currentMessage="Abrindo tabulação…" /></div>
      {:else if detailError}
        <p class="load-error" role="alert">{detailError}</p>
      {:else if selectedChamado}
        <div class="detail-grid">
          <section class="panel tabulacao-panel" aria-label="Tabulação">
            <h3>Tabulação</h3>

            <div class="info-grid">
              <div class="info-item">
                <span class="label">Pedido</span>
                <span class="value">{selectedChamado.pedido}</span>
              </div>
              <div class="info-item">
                <span class="label">Cidade</span>
                <span class="value">{selectedChamado.endereco?.cidade || selectedChamado.cidade}</span>
              </div>
              <div class="info-item full">
                <span class="label">Endereço</span>
                <span class="value">{selectedChamado.endereco?.completo}</span>
              </div>
              <div class="info-item">
                <span class="label">Tabulação sugerida</span>
                <span class="value highlight">{selectedChamado.tabulacaoFinal || '—'}</span>
              </div>
              <div class="info-item">
                <span class="label">Status</span>
                <span class="value status-badge status-badge--{selectedChamado.tabulacaoStatus || 'pendente'}">
                  {statusLabel(selectedChamado.tabulacaoStatus)}
                </span>
              </div>
            </div>

            {#if selectedChamado.analiseIa?.motivoSugestao}
              <div class="ia-box">
                <strong>Análise da IA</strong>
                <p>{selectedChamado.analiseIa.motivoSugestao}</p>
              </div>
            {/if}

            <div class="feedback-actions">
              <button
                type="button"
                class="btn-success"
                on:click={confirmarTabulacaoCorreta}
                disabled={submittingFeedback || selectedChamado.tabulacaoStatus === 'aprovada'}
              >
                Tabulação correta
              </button>
              <button
                type="button"
                class="btn-warning"
                on:click={iniciarCorrecao}
                disabled={submittingFeedback}
              >
                Tabulação errada
              </button>
            </div>

            {#if showCorrectionForm}
              <div class="correction-form">
                <label for="tabulacao-corrigida">Tabulação correta</label>
                <select id="tabulacao-corrigida" bind:value={tabulacaoCorrigida} disabled={submittingFeedback}>
                  <option value="">Selecione…</option>
                  {#each tabulacoesList as tabulacao}
                    <option value={tabulacao}>{tabulacao}</option>
                  {/each}
                </select>
                <button type="button" class="btn-primary" on:click={enviarCorrecao} disabled={submittingFeedback}>
                  Salvar correção
                </button>
              </div>
            {/if}

            {#if feedbackMessage}
              <p class="feedback-message" role="status">{feedbackMessage}</p>
            {/if}
          </section>

          <section class="panel pdf-panel" aria-label="Prévia do PDF">
            <h3>Prévia do PDF</h3>
            <div class="pdf-frame-wrap">
              <iframe
                title="Prévia do relatório de tabulação"
                srcdoc={selectedChamado.pdfHtml || ''}
                class="pdf-frame"
              ></iframe>
            </div>
          </section>
        </div>
      {/if}
    </div>
  {:else}
    <div class="queue-view">
      <header class="queue-header">
        <div class="queue-header-left">
          <h2>Arrastadinhas</h2>
          {#if lastUpdatedAt}
            <span class="last-update">
              Atualizado às {lastUpdatedAt.toLocaleTimeString('pt-BR')}
            </span>
          {/if}
        </div>
        <div class="queue-header-actions">
          <button
            type="button"
            class="btn-primary btn-refresh"
            on:click={handleAtualizar}
            disabled={isRefreshing}
            aria-busy={isRefreshing}
          >
            <span class="refresh-icon" class:spinning={isRefreshing}>↻</span>
            Atualizar
          </button>
        </div>
      </header>

      <section class="extension-panel" aria-label="Extensão Chrome da Agenda">
        <div class="extension-panel-main">
          <div>
            <strong>Entrada pela extensão Chrome</strong>
            <p>
              Os chamados chegam pela extensão <strong>Portal CENSUP — Assistente Agenda</strong>,
              rodando na Agenda já logada no seu Chrome. Este portal só lista e tabula.
            </p>
          </div>
        </div>

        <button
          type="button"
          class="btn-link"
          on:click={() => { showExtensionHelp = !showExtensionHelp; }}
        >
          {showExtensionHelp ? 'Ocultar instruções' : 'Como usar a extensão'}
        </button>

        {#if showExtensionHelp}
          <div class="extension-help">
            <ol>
              <li>Abra a Agenda logada em <code>/arrastadinhas</code> e deixe a aba aberta.</li>
              <li>Clique no ícone da extensão no Chrome.</li>
              <li>
                Em <strong>URL da API</strong>, use:
                <code class="api-hint">{apiBaseHint}</code>
              </li>
              <li>Em <strong>Usuário</strong>, use o mesmo login deste portal.</li>
              <li>Clique em <strong>Ligar PoC</strong> (ou <strong>Agora</strong> para um ciclo).</li>
              <li>Volte aqui e clique em <strong>Atualizar</strong> para ver os chamados novos.</li>
            </ol>
          </div>
        {/if}
      </section>

      <div class="table-controls">
        <label class="search-control">
          Procurar:
          <input
            type="search"
            bind:value={searchQuery}
            on:input={handleSearchInput}
            placeholder="Pedido, cidade, motivo…"
            autocomplete="off"
          />
        </label>
      </div>

      {#if listError}
        <p class="load-error" role="alert">{listError}</p>
      {/if}

      <div class="table-wrap">
        <table class="chamados-table">
          <thead>
            <tr>
              <th>UF</th>
              <th>Cidade</th>
              <th>Sistema</th>
              <th>Pedido</th>
              <th>Data Situação</th>
              <th>PDV</th>
              <th>Motivo</th>
              <th>Situação</th>
              <th class="col-action" aria-label="Ações"></th>
            </tr>
          </thead>
          <tbody>
            {#if loadingList && chamados.length === 0}
              <tr>
                <td colspan="9" class="empty-cell">Carregando chamados…</td>
              </tr>
            {:else if chamados.length === 0}
              <tr>
                <td colspan="9" class="empty-cell">Sem dados na tabela</td>
              </tr>
            {:else}
              {#each chamados as item (item.id)}
                <tr>
                  <td>{item.uf}</td>
                  <td>{item.cidade}</td>
                  <td>{item.sistema}</td>
                  <td>{item.pedido}</td>
                  <td>{item.dataSituacaoLabel || '—'}</td>
                  <td>{item.pdv}</td>
                  <td>{item.motivo}</td>
                  <td>{item.situacao}</td>
                  <td class="col-action">
                    <button
                      type="button"
                      class="btn-lupa"
                      on:click={() => abrirChamado(item)}
                      aria-label="Abrir tabulação do pedido {item.pedido}"
                      title="Abrir tabulação"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2.5" />
                        <path d="M20 20L16.5 16.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
                      </svg>
                    </button>
                  </td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>

      <footer class="table-footer">
        <div class="pagination">
          <button type="button" class="btn-page" on:click={() => goToPage(page - 1)} disabled={page <= 1}>
            Anterior
          </button>
          <span class="page-indicator">{page}</span>
          <button
            type="button"
            class="btn-page"
            on:click={() => goToPage(page + 1)}
            disabled={page >= totalPages}
          >
            Próximo
          </button>
        </div>
      </footer>
    </div>
  {/if}
</div>

<style>
  .portal-censup {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f0f2f8;
    box-sizing: border-box;
  }

  .queue-view,
  .detail-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    padding: 1.25rem 1.5rem;
    gap: 1rem;
  }

  .queue-header,
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-shrink: 0;
  }

  .queue-header-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
  }

  .extension-panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 0.85rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05);
    flex-shrink: 0;
  }

  .extension-panel-main strong {
    display: block;
    color: #374151;
    margin-bottom: 0.15rem;
  }

  .extension-panel-main p {
    margin: 0;
    font-size: 0.88rem;
    color: #6b7280;
    line-height: 1.45;
  }

  .btn-link {
    background: none;
    border: none;
    padding: 0;
    color: #7b68ee;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
    width: fit-content;
  }

  .btn-link:hover {
    text-decoration: underline;
  }

  .extension-help ol {
    margin: 0;
    padding-left: 1.2rem;
    font-size: 0.85rem;
    color: #4b5563;
    line-height: 1.55;
  }

  .extension-help code {
    font-size: 0.8rem;
    background: #f3f4f6;
    padding: 0.1rem 0.35rem;
    border-radius: 4px;
  }

  .api-hint {
    display: inline-block;
    margin-top: 0.2rem;
    word-break: break-all;
  }

  .queue-header-left {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .queue-header h2,
  .detail-title h2 {
    margin: 0;
    font-size: 1.35rem;
    color: #374151;
  }

  .last-update,
  .detail-subtitle {
    font-size: 0.85rem;
    color: #6b7280;
  }

  .btn-primary,
  .btn-secondary,
  .btn-success,
  .btn-warning,
  .btn-page {
    border: none;
    border-radius: 8px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.15s ease;
  }

  .btn-primary {
    padding: 0.65rem 1.1rem;
    background: linear-gradient(135deg, #7b68ee 0%, #6495ed 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(123, 104, 238, 0.3);
  }

  .btn-secondary {
    padding: 0.55rem 0.95rem;
    background: white;
    color: #7b68ee;
    border: 1px solid #c4b5fd;
  }

  .btn-success {
    padding: 0.65rem 1rem;
    background: #10b981;
    color: white;
  }

  .btn-warning {
    padding: 0.65rem 1rem;
    background: #f59e0b;
    color: white;
  }

  .btn-primary:hover,
  .btn-secondary:hover,
  .btn-success:hover,
  .btn-warning:hover,
  .btn-page:hover:not(:disabled) {
    filter: brightness(1.05);
  }

  .btn-primary:disabled,
  .btn-success:disabled,
  .btn-warning:disabled,
  .btn-page:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .btn-refresh {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .refresh-icon {
    display: inline-block;
    font-size: 1.1rem;
    line-height: 1;
  }

  .refresh-icon.spinning {
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .table-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
    flex-shrink: 0;
  }

  .search-control {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    color: #374151;
  }

  .search-control input,
  .correction-form select {
    padding: 0.45rem 0.65rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-family: inherit;
    font-size: 0.9rem;
    background: white;
  }

  .search-control input {
    min-width: 220px;
  }

  .table-wrap {
    flex: 1;
    min-height: 0;
    overflow: auto;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }

  .chamados-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.88rem;
  }

  .chamados-table thead {
    position: sticky;
    top: 0;
    z-index: 1;
    background: linear-gradient(135deg, #7b68ee 0%, #6495ed 100%);
    color: white;
  }

  .chamados-table th,
  .chamados-table td {
    padding: 0.75rem 0.85rem;
    text-align: left;
    border-bottom: 1px solid #eef2f7;
    vertical-align: middle;
  }

  .chamados-table th {
    font-weight: 600;
    white-space: nowrap;
  }

  .chamados-table tbody tr:hover {
    background: #f8f7ff;
  }

  .col-action {
    width: 72px;
    text-align: center;
  }

  .empty-cell {
    text-align: center;
    color: #6b7280;
    padding: 2.5rem 1rem !important;
  }

  .btn-lupa {
    width: 42px;
    height: 42px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 3px 10px rgba(249, 115, 22, 0.35);
  }

  .btn-lupa:hover {
    filter: brightness(1.06);
    transform: scale(1.03);
  }

  .table-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 1rem;
    flex-shrink: 0;
    font-size: 0.88rem;
    color: #6b7280;
  }

  .pagination {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn-page {
    padding: 0.45rem 0.85rem;
    background: white;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .page-indicator {
    min-width: 2rem;
    text-align: center;
    font-weight: 600;
    color: #7b68ee;
  }

  .detail-grid {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: minmax(320px, 420px) 1fr;
    gap: 1rem;
  }

  .panel {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    min-height: 0;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  }

  .panel h3 {
    margin: 0 0 1rem;
    font-size: 1rem;
    color: #7b68ee;
  }

  .info-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .info-item.full {
    grid-column: 1 / -1;
  }

  .label {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #9ca3af;
  }

  .value {
    font-size: 0.92rem;
    color: #1f2937;
    font-weight: 600;
  }

  .value.highlight {
    color: #7b68ee;
  }

  .status-badge {
    display: inline-flex;
    width: fit-content;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    font-size: 0.78rem;
  }

  .status-badge--pendente_revisao,
  .status-badge--pendente {
    background: #fef3c7;
    color: #92400e;
  }

  .status-badge--aguardando_analise {
    background: #dbeafe;
    color: #1d4ed8;
  }

  .status-badge--aprovada {
    background: #d1fae5;
    color: #065f46;
  }

  .status-badge--corrigida {
    background: #ede9fe;
    color: #5b21b6;
  }

  .ia-box {
    background: #f5f3ff;
    border: 1px solid #ddd6fe;
    border-radius: 8px;
    padding: 0.85rem;
    margin-bottom: 1rem;
  }

  .ia-box strong {
    display: block;
    margin-bottom: 0.35rem;
    color: #6d28d9;
  }

  .ia-box p {
    margin: 0;
    font-size: 0.88rem;
    color: #4b5563;
    line-height: 1.45;
  }

  .feedback-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.65rem;
    margin-bottom: 0.75rem;
  }

  .correction-form {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    margin-top: 0.5rem;
  }

  .correction-form label {
    font-size: 0.85rem;
    color: #374151;
    font-weight: 600;
  }

  .feedback-message {
    margin: 0.75rem 0 0;
    font-size: 0.88rem;
    color: #059669;
  }

  .pdf-frame-wrap {
    flex: 1;
    min-height: 0;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: #f9fafb;
  }

  .pdf-frame {
    width: 100%;
    height: 100%;
    min-height: 480px;
    border: none;
    background: white;
  }

  .detail-loading {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .load-error {
    margin: 0;
    padding: 0.75rem 1rem;
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
    border-radius: 8px;
  }

  @media (max-width: 960px) {
    .detail-grid {
      grid-template-columns: 1fr;
    }

    .pdf-frame {
      min-height: 360px;
    }
  }
</style>
