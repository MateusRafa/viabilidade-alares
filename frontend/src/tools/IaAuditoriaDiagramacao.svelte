<script>
  import { onMount, onDestroy } from 'svelte';
  import Loading from '../Loading.svelte';
  import { getApiUrl } from '../config.js';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  let isLoading = false;
  let loadingMessage = '';
  let selectedFiles = [];
  let jobId = null;
  let jobStatus = null;
  let error = null;
  let pollTimer = null;
  let dragOver = false;

  const NIVEL_BADGE = {
    1: { class: 'badge-n1', label: 'Sem diagramação' },
    2: { class: 'badge-n2', label: 'Incompleta' },
    3: { class: 'badge-n3', label: 'Diagramada' }
  };

  function openSettings() {}

  function preloadSettingsData() {}

  function handleFileSelect(event) {
    const files = Array.from(event.target.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length === 0) {
      error = 'Selecione apenas arquivos PDF.';
      return;
    }
    selectedFiles = files;
    error = null;
    jobId = null;
    jobStatus = null;
  }

  function handleDrop(event) {
    event.preventDefault();
    dragOver = false;
    const files = Array.from(event.dataTransfer?.files || []).filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (files.length === 0) {
      error = 'Solte apenas arquivos PDF.';
      return;
    }
    selectedFiles = files;
    error = null;
    jobId = null;
    jobStatus = null;
  }

  function clearSelection() {
    selectedFiles = [];
    jobId = null;
    jobStatus = null;
    error = null;
  }

  async function pollJob(id) {
    const res = await fetch(getApiUrl(`/api/diagramacao/lote/${id}`));
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Erro ao consultar lote');
    jobStatus = data.job;
    if (jobStatus.status === 'processando') {
      pollTimer = setTimeout(() => pollJob(id), 800);
    } else {
      isLoading = false;
      loadingMessage = '';
    }
  }

  async function analisarLote() {
    if (selectedFiles.length === 0) {
      error = 'Selecione ao menos um PDF.';
      return;
    }

    isLoading = true;
    loadingMessage = `Enviando ${selectedFiles.length} PDF(s)...`;
    error = null;
    jobStatus = null;

    try {
      const formData = new FormData();
      for (const f of selectedFiles) {
        formData.append('pdfs', f);
      }

      const res = await fetch(getApiUrl('/api/diagramacao/analisar-lote'), {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      jobId = data.jobId;
      loadingMessage = `Processando 0 / ${data.total}...`;
      await pollJob(jobId);
    } catch (e) {
      error = e.message || 'Erro ao analisar lote';
      isLoading = false;
      loadingMessage = '';
    }
  }

  function exportarCsv() {
    if (!jobStatus?.resultados?.length) return;
    const header = [
      'arquivo',
      'id_caixa',
      'nivel_tipo',
      'nivel_diagramacao',
      'nivel_diagramacao_label',
      'submotivos',
      'confianca',
      'projeto'
    ];
    const rows = jobStatus.resultados.map((r) =>
      [
        r.arquivo,
        r.id_caixa || '',
        r.nivel_tipo || '',
        r.nivel_diagramacao ?? '',
        r.nivel_diagramacao_label || '',
        (r.submotivos || []).join(';'),
        r.confianca || '',
        r.projeto || ''
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-diagramacao-${jobId || 'lote'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  $: resumo = jobStatus?.resumo;
  $: resultados = jobStatus?.resultados || [];
  $: progressPct =
    jobStatus?.total > 0 ? Math.round((jobStatus.processados / jobStatus.total) * 100) : 0;

  onMount(() => {
    if (onSettingsRequest) onSettingsRequest(openSettings);
    if (onSettingsHover) onSettingsHover(preloadSettingsData);
  });

  onDestroy(() => {
    if (pollTimer) clearTimeout(pollTimer);
  });
</script>

<div class="ia-diagramacao-content">
  {#if isLoading}
    <Loading message={loadingMessage || `Processando... ${progressPct}%`} />
  {:else}
    <div class="content-wrapper">
      <header class="page-header">
        <h2>IA de Auditoria de Diagramação</h2>
        <p>
          Envie PDFs de CEO/CTO em lote. Classificação: sem diagramação (1), incompleta (2) ou
          diagramada (3). Em <strong>CTO</strong>, só a fusão na entrada do splitter conta; em
          <strong>CEO</strong>, as saídas do splitter precisam de ao menos uma fusão.
        </p>
      </header>

      <section
        class="upload-zone"
        class:drag-over={dragOver}
        on:dragover|preventDefault={() => (dragOver = true)}
        on:dragleave={() => (dragOver = false)}
        on:drop={handleDrop}
      >
        <input
          type="file"
          accept="application/pdf,.pdf"
          multiple
          on:change={handleFileSelect}
          id="pdf-lote-input"
        />
        <label for="pdf-lote-input" class="upload-label">
          <span class="upload-icon">📄</span>
          <span>Clique ou arraste PDFs aqui (até 200 por lote)</span>
        </label>
        {#if selectedFiles.length > 0}
          <p class="file-count">{selectedFiles.length} arquivo(s) selecionado(s)</p>
          <div class="actions">
            <button type="button" class="btn-primary" on:click={analisarLote}>Analisar lote</button>
            <button type="button" class="btn-secondary" on:click={clearSelection}>Limpar</button>
          </div>
        {/if}
      </section>

      {#if error}
        <div class="alert-error">{error}</div>
      {/if}

      {#if resumo && jobStatus?.status === 'concluido'}
        <section class="resumo-cards">
          <div class="card card-n1">
            <span class="num">{resumo.nivel1}</span>
            <span class="lbl">Sem diagramação</span>
          </div>
          <div class="card card-n2">
            <span class="num">{resumo.nivel2}</span>
            <span class="lbl">Incompleta</span>
          </div>
          <div class="card card-n3">
            <span class="num">{resumo.nivel3}</span>
            <span class="lbl">Diagramada</span>
          </div>
        </section>
        <div class="actions">
          <button type="button" class="btn-primary" on:click={exportarCsv}>Exportar CSV</button>
        </div>
      {/if}

      {#if resultados.length > 0 && jobStatus?.status === 'concluido'}
        <section class="results-table-wrap">
          <table class="results-table">
            <thead>
              <tr>
                <th>Arquivo</th>
                <th>Caixa / ID</th>
                <th>Tipo</th>
                <th>Nível</th>
                <th>Submotivos</th>
                <th>Confiança</th>
              </tr>
            </thead>
            <tbody>
              {#each resultados as row}
                <tr>
                  <td class="col-file" title={row.arquivo}>{row.arquivo}</td>
                  <td>{row.id_caixa || '—'}</td>
                  <td>{row.nivel_tipo || '—'}</td>
                  <td>
                    {#if row.nivel_diagramacao && NIVEL_BADGE[row.nivel_diagramacao]}
                      <span class="badge {NIVEL_BADGE[row.nivel_diagramacao].class}">
                        {row.nivel_diagramacao} — {NIVEL_BADGE[row.nivel_diagramacao].label}
                      </span>
                    {:else}
                      <span class="badge badge-erro">{row.erro || 'Erro'}</span>
                    {/if}
                  </td>
                  <td class="col-sub">{(row.submotivos || []).join(', ') || '—'}</td>
                  <td>{row.confianca || '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/if}
    </div>
  {/if}
</div>

<style>
  .ia-diagramacao-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f5f7fa;
  }

  .content-wrapper {
    flex: 1;
    padding: 1.5rem 2rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .page-header h2 {
    color: #4c1d95;
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem 0;
  }

  .page-header p {
    color: #5b21b6;
    margin: 0;
    font-size: 0.95rem;
    opacity: 0.9;
  }

  .upload-zone {
    border: 2px dashed rgba(123, 104, 238, 0.45);
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    background: rgba(255, 255, 255, 0.9);
    transition: border-color 0.2s, background 0.2s;
  }

  .upload-zone.drag-over {
    border-color: #7b68ee;
    background: rgba(123, 104, 238, 0.08);
  }

  #pdf-lote-input {
    display: none;
  }

  .upload-label {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #5b21b6;
  }

  .upload-icon {
    font-size: 2rem;
  }

  .file-count {
    margin: 1rem 0 0;
    font-size: 0.9rem;
    color: #6b7280;
  }

  .actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .btn-primary {
    background: linear-gradient(135deg, #7b68ee, #6a5acd);
    color: white;
    border: none;
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-secondary {
    background: white;
    color: #5b21b6;
    border: 1px solid rgba(123, 104, 238, 0.4);
    padding: 0.6rem 1.25rem;
    border-radius: 8px;
    cursor: pointer;
  }

  .alert-error {
    background: #fef2f2;
    color: #b91c1c;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    border: 1px solid #fecaca;
  }

  .resumo-cards {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .card {
    background: white;
    border-radius: 10px;
    padding: 1rem;
    text-align: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  }

  .card .num {
    display: block;
    font-size: 1.75rem;
    font-weight: 700;
  }

  .card .lbl {
    font-size: 0.85rem;
    color: #6b7280;
  }

  .card-n1 .num {
    color: #dc2626;
  }
  .card-n2 .num {
    color: #d97706;
  }
  .card-n3 .num {
    color: #059669;
  }

  .results-table-wrap {
    overflow: auto;
    border-radius: 10px;
    border: 1px solid rgba(123, 104, 238, 0.2);
    background: white;
  }

  .results-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }

  .results-table th,
  .results-table td {
    padding: 0.6rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  .results-table th {
    background: #f8f7ff;
    color: #4c1d95;
    font-weight: 600;
    position: sticky;
    top: 0;
  }

  .col-file {
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-sub {
    max-width: 180px;
    font-size: 0.8rem;
    color: #6b7280;
  }

  .badge {
    display: inline-block;
    padding: 0.2rem 0.5rem;
    border-radius: 6px;
    font-size: 0.75rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .badge-n1 {
    background: #fee2e2;
    color: #991b1b;
  }
  .badge-n2 {
    background: #ffedd5;
    color: #9a3412;
  }
  .badge-n3 {
    background: #d1fae5;
    color: #065f46;
  }
  .badge-erro {
    background: #f3f4f6;
    color: #374151;
  }

  @media (max-width: 768px) {
    .resumo-cards {
      grid-template-columns: 1fr;
    }
    .content-wrapper {
      padding: 1rem;
    }
  }
</style>
