<script>
  import { onMount, onDestroy } from 'svelte';
  import {
    defaultFormData,
    buildFullPdfHtml,
    openPdfPrintWindow,
    loadLogoDataUrl
  } from './formularioPdfShared.js';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  let formData = defaultFormData();
  let generatingPDF = false;
  let pdfError = '';
  let expandedSections = {
    capa: true,
    cabecalho: true,
    passo1: true
  };
  let logoDataUrl = '';

  $: previewBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  $: previewHtml = buildFullPdfHtml(formData, {}, {
    baseUrl: previewBaseUrl,
    logoDataUrl
  });

  function toggleSection(sectionId) {
    expandedSections = {
      ...expandedSections,
      [sectionId]: !expandedSections[sectionId]
    };
  }

  function handleGeneratePdf() {
    generatingPDF = true;
    pdfError = '';
    const result = openPdfPrintWindow(formData, {
      baseUrl: typeof window !== 'undefined' ? window.location.origin : '',
      logoDataUrl
    });
    generatingPDF = false;
    if (!result.success) {
      pdfError = 'Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desativado.';
    }
  }

  onMount(async () => {
    if (onSettingsRequest && typeof onSettingsRequest === 'function') {
      onSettingsRequest(() => {});
    }
    if (onSettingsHover && typeof onSettingsHover === 'function') {
      onSettingsHover(() => {});
    }
    if (typeof window !== 'undefined') {
      logoDataUrl = await loadLogoDataUrl(window.location.origin);
    }
  });

  onDestroy(() => {});
</script>

<div class="formulario-engenharia">
  <div class="workspace">
    <!-- Coluna esquerda: formulário -->
    <aside class="form-column">
      <div class="form-scroll">
        <!-- Box: Capa -->
        <section class="form-box">
          <button
            type="button"
            class="form-box-header"
            on:click={() => toggleSection('capa')}
            aria-expanded={expandedSections.capa}
          >
            <span class="form-box-title">Capa</span>
            <span class="chevron" class:open={expandedSections.capa}>▼</span>
          </button>
          {#if expandedSections.capa}
            <div class="form-box-body">
              <label class="field">
                <span>Título</span>
                <input
                  type="text"
                  bind:value={formData.capa.titulo}
                  placeholder="Ex: Planejamento e Engenharia de Redes FTTx"
                />
              </label>
              <label class="field">
                <span>Cliente / Projeto</span>
                <input
                  type="text"
                  bind:value={formData.capa.clienteProjeto}
                  placeholder="Ex: SICRED CAMBARÁ (ENGT-46557)"
                />
              </label>
              <label class="field">
                <span>Data</span>
                <input
                  type="text"
                  bind:value={formData.capa.data}
                  placeholder="Ex: 04 de Fevereiro - 2026"
                />
              </label>
              <label class="field">
                <span>Cidade</span>
                <input
                  type="text"
                  bind:value={formData.capa.cidade}
                  placeholder="Ex: Cambará – PR"
                />
              </label>
            </div>
          {/if}
        </section>

        <!-- Box: Cabeçalho -->
        <section class="form-box">
          <button
            type="button"
            class="form-box-header"
            on:click={() => toggleSection('cabecalho')}
            aria-expanded={expandedSections.cabecalho}
          >
            <span class="form-box-title">Cabeçalho</span>
            <span class="chevron" class:open={expandedSections.cabecalho}>▼</span>
          </button>
          {#if expandedSections.cabecalho}
            <div class="form-box-body">
              <label class="field">
                <span>Número de referência</span>
                <input type="text" bind:value={formData.cabecalho.numeroReferencia} placeholder="Nº de referência" />
              </label>
              <label class="field">
                <span>Cliente</span>
                <input type="text" bind:value={formData.cabecalho.cliente} placeholder="Nome do cliente" />
              </label>
              <label class="field">
                <span>Local</span>
                <input type="text" bind:value={formData.cabecalho.local} placeholder="Cidade / endereço" />
              </label>
            </div>
          {/if}
        </section>

        <!-- Box: Passo 1 -->
        <section class="form-box">
          <button
            type="button"
            class="form-box-header"
            on:click={() => toggleSection('passo1')}
            aria-expanded={expandedSections.passo1}
          >
            <span class="form-box-title">Passo 1° — {formData.passo1.tituloPasso || 'XXXXX'}</span>
            <span class="chevron" class:open={expandedSections.passo1}>▼</span>
          </button>
          {#if expandedSections.passo1}
            <div class="form-box-body">
              <label class="field">
                <span>Nome do passo (substitui XXXXX)</span>
                <input type="text" bind:value={formData.passo1.tituloPasso} placeholder="XXXXX" />
              </label>
              <label class="field">
                <span>Descrição</span>
                <textarea
                  rows="4"
                  bind:value={formData.passo1.descricao}
                  placeholder="Descrição do passo"
                ></textarea>
              </label>
              <label class="field">
                <span>Responsável técnico</span>
                <input type="text" bind:value={formData.passo1.responsavel} placeholder="Nome do responsável" />
              </label>
              <label class="field">
                <span>Data</span>
                <input type="date" bind:value={formData.passo1.data} />
              </label>
            </div>
          {/if}
        </section>
      </div>

      <footer class="form-actions">
        {#if pdfError}
          <p class="pdf-error" role="alert">{pdfError}</p>
        {/if}
        <button
          type="button"
          class="btn-generate-pdf"
          on:click={handleGeneratePdf}
          disabled={generatingPDF}
        >
          {generatingPDF ? 'Abrindo impressão...' : 'Gerar PDF'}
        </button>
      </footer>
    </aside>

    <!-- Coluna direita: prévia em tempo real -->
    <main class="preview-column">
      <div class="preview-header">
        <h2>Prévia do PDF</h2>
        <span class="preview-hint">3 páginas (Capa · Cabeçalho · Passo 1) — atualiza em tempo real</span>
      </div>
      <div class="preview-frame-wrapper">
        <iframe
          title="Prévia do PDF"
          class="pdf-preview-iframe"
          srcdoc={previewHtml}
          sandbox="allow-same-origin"
        ></iframe>
      </div>
    </main>
  </div>
</div>

<style>
  .formulario-engenharia {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #f0f2f8;
  }

  .workspace {
    flex: 1;
    display: flex;
    min-height: 0;
    gap: 0;
  }

  .form-column {
    flex: 0 0 42%;
    max-width: 520px;
    min-width: 300px;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-right: 1px solid #e2e8f0;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.04);
  }

  .form-scroll {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .form-box {
    border: 1px solid rgba(123, 104, 238, 0.25);
    border-radius: 10px;
    overflow: hidden;
    background: #fafbff;
  }

  .form-box-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    background: linear-gradient(135deg, #7b68ee 0%, #6b5bee 100%);
    color: white;
    border: none;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 600;
    text-align: left;
  }

  .form-box-header:hover {
    filter: brightness(1.05);
  }

  .chevron {
    font-size: 0.65rem;
    transition: transform 0.2s ease;
    transform: rotate(-90deg);
  }

  .chevron.open {
    transform: rotate(0deg);
  }

  .form-box-body {
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .field span {
    font-size: 0.8rem;
    font-weight: 600;
    color: #5b21b6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .field input,
  .field textarea {
    width: 100%;
    padding: 0.55rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: inherit;
    color: #1f2937;
    background: white;
  }

  .field input:focus,
  .field textarea:focus {
    outline: none;
    border-color: #7b68ee;
    box-shadow: 0 0 0 3px rgba(123, 104, 238, 0.15);
  }

  .form-actions {
    padding: 1rem;
    border-top: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .btn-generate-pdf {
    width: 100%;
    padding: 0.85rem 1.25rem;
    background: linear-gradient(135deg, #7b68ee 0%, #6495ed 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(123, 104, 238, 0.35);
  }

  .btn-generate-pdf:hover:not(:disabled) {
    filter: brightness(1.06);
  }

  .btn-generate-pdf:disabled {
    opacity: 0.7;
    cursor: wait;
  }

  .pdf-error {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: #b91c1c;
  }

  .preview-column {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: #e8ecf4;
  }

  .preview-header {
    padding: 0.75rem 1.25rem;
    background: white;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 1rem;
  }

  .preview-header h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #4c1d95;
  }

  .preview-hint {
    font-size: 0.8rem;
    color: #6b7280;
  }

  .preview-frame-wrapper {
    flex: 1;
    padding: 1rem;
    overflow: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }

  .pdf-preview-iframe {
    width: 100%;
    max-width: 240mm;
    height: 100%;
    min-height: 520px;
    border: 2px solid #7b68ee;
    border-radius: 6px;
    background: #e8ecf4;
    box-shadow: 0 4px 20px rgba(123, 104, 238, 0.15);
  }

  @media (max-width: 900px) {
    .workspace {
      flex-direction: column;
    }

    .form-column {
      flex: none;
      max-width: none;
      max-height: 45vh;
    }

    .preview-column {
      min-height: 50vh;
    }
  }
</style>
