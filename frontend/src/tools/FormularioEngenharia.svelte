<script>
  import { onMount, tick } from 'svelte';
  import {
    defaultFormData,
    normalizeFormData,
    emptyPasso,
    getPdfPageCount,
    CABECALHO_FIELDS,
    buildFullPdfHtml,
    printEngineeringPdf,
    loadLogoDataUrl,
    loadCapaOndasDataUrl,
    sanitizeRichHtml
  } from './formularioPdfShared.js';

  export let currentUser = '';
  export let userTipo = 'user';
  export let onBackToDashboard = () => {};
  export let onSettingsRequest = null;
  export let onSettingsHover = null;

  let formData = normalizeFormData(defaultFormData());
  let generatingPDF = false;
  let pdfError = '';
  let expandedSections = {
    capa: true,
    cabecalho: true,
    'passo-0': true,
    listaMaterial: true
  };
  let logoDataUrl = '';
  let capaOndasDataUrl = '';
  let assetsReady = false;
  let passoImageInput;
  let previewIframeEl;
  /** { type: 'passo', index: number } | { type: 'material' } */
  let uploadTarget = null;
  let armedUploadTarget = null;
  const descricaoEditorEls = {};
  const descricaoEditorReady = {};
  const MAX_PASSO_IMAGE_MB = 8;

  $: previewBaseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  $: previewHtml = buildFullPdfHtml(formData, {}, {
    baseUrl: previewBaseUrl,
    logoDataUrl,
    capaOndasDataUrl
  });

  function toggleSection(sectionId) {
    expandedSections = {
      ...expandedSections,
      [sectionId]: !expandedSections[sectionId]
    };
  }

  $: pdfPageCount = getPdfPageCount(formData);
  $: previewPagesHint = `${pdfPageCount} páginas (Capa · Informações · ${formData.passos.length} passo(s) · Lista de Material)`;

  function passoSectionId(index) {
    return `passo-${index}`;
  }

  function updatePasso(index, patch) {
    formData = {
      ...formData,
      passos: formData.passos.map((p, i) => (i === index ? { ...p, ...patch } : p))
    };
  }

  function updateListaMaterial(patch) {
    formData = {
      ...formData,
      listaMaterial: { ...formData.listaMaterial, ...patch }
    };
  }

  function addPasso() {
    const newIndex = formData.passos.length;
    formData = {
      ...formData,
      passos: [...formData.passos, emptyPasso()]
    };
    expandedSections = {
      ...expandedSections,
      [passoSectionId(newIndex)]: true
    };
  }

  function removePasso(passoIndex) {
    if (passoIndex < 1 || formData.passos.length <= 1) return;

    const passoExpanded = {};
    formData.passos.forEach((_, i) => {
      if (i === passoIndex) return;
      const newIndex = i < passoIndex ? i : i - 1;
      const oldId = passoSectionId(i);
      if (expandedSections[oldId] !== undefined) {
        passoExpanded[passoSectionId(newIndex)] = expandedSections[oldId];
      }
    });

    expandedSections = {
      capa: expandedSections.capa,
      cabecalho: expandedSections.cabecalho,
      listaMaterial: expandedSections.listaMaterial,
      ...passoExpanded
    };

    for (const key of Object.keys(descricaoEditorEls)) {
      if (key.startsWith('passo-')) delete descricaoEditorEls[key];
    }
    for (const key of Object.keys(descricaoEditorReady)) {
      if (key.startsWith('passo-')) delete descricaoEditorReady[key];
    }

    formData = {
      ...formData,
      passos: formData.passos.filter((_, i) => i !== passoIndex)
    };

    if (uploadTarget?.type === 'passo' && uploadTarget.index === passoIndex) {
      uploadTarget = null;
    } else if (uploadTarget?.type === 'passo' && uploadTarget.index > passoIndex) {
      uploadTarget = { type: 'passo', index: uploadTarget.index - 1 };
    }
    if (armedUploadTarget?.type === 'passo' && armedUploadTarget.index === passoIndex) {
      disarmImagePaste();
    } else if (armedUploadTarget?.type === 'passo' && armedUploadTarget.index > passoIndex) {
      armedUploadTarget = { type: 'passo', index: armedUploadTarget.index - 1 };
    }
  }

  function applyImageToTarget(file) {
    if (!file) return false;
    if (!uploadTarget) return false;

    if (!file.type.startsWith('image/')) {
      pdfError = 'Use um arquivo de imagem (PNG, JPG, WEBP ou SVG).';
      return false;
    }

    if (file.size > MAX_PASSO_IMAGE_MB * 1024 * 1024) {
      pdfError = `A imagem deve ter no máximo ${MAX_PASSO_IMAGE_MB} MB.`;
      return false;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const nome =
        file.name?.trim() ||
        `imagem-colada.${(file.type.split('/')[1] || 'png').replace('svg+xml', 'svg')}`;
      const patch = { imagemDataUrl: dataUrl, imagemNome: nome };
      if (uploadTarget.type === 'passo') {
        updatePasso(uploadTarget.index, patch);
      }
    };
    reader.onerror = () => {
      pdfError = 'Não foi possível ler a imagem. Tente outro arquivo.';
    };
    reader.readAsDataURL(file);
    return true;
  }

  function handlePassoImageChange(event) {
    pdfError = '';
    const file = event.currentTarget?.files?.[0];
    if (!file) return;
    applyImageToTarget(file);
    event.currentTarget.value = '';
  }

  function handleUploadBoxDblClick(event) {
    event.preventDefault();
    event.stopPropagation();
    pdfError = '';
    passoImageInput?.click();
  }

  function setUploadTarget(target) {
    uploadTarget = target;
  }

  function armImagePaste(target) {
    uploadTarget = target;
    armedUploadTarget = target;
  }

  function disarmImagePaste() {
    armedUploadTarget = null;
  }

  function uploadTargetsMatch(a, b) {
    if (!a || !b) return false;
    if (a.type !== 'passo' || b.type !== 'passo') return false;
    return a.index === b.index;
  }

  function fileFromClipboardItem(item) {
    if (!item?.type?.startsWith('image/')) return null;

    const direct = item.getAsFile?.();
    if (direct) return direct;

    if (typeof item.getAsFile === 'function') {
      try {
        return item.getAsFile();
      } catch {
        /* fallback abaixo */
      }
    }
    return null;
  }

  async function readImageFromClipboardApi() {
    if (!navigator.clipboard?.read) return null;

    const items = await navigator.clipboard.read();
    for (const clipItem of items) {
      const imageType = clipItem.types?.find((t) => t.startsWith('image/'));
      if (!imageType) continue;

      const blob = await clipItem.getType(imageType);
      const ext = imageType.split('/')[1]?.replace('svg+xml', 'svg') || 'png';
      return new File([blob], `imagem-colada.${ext}`, { type: imageType });
    }
    return null;
  }

  async function processImagePaste(event) {
    pdfError = '';
    const dt = event?.clipboardData;

    if (dt?.files?.length) {
      for (let i = 0; i < dt.files.length; i++) {
        const file = dt.files[i];
        if (file?.type?.startsWith('image/') && applyImageToTarget(file)) {
          return true;
        }
      }
    }

    if (dt?.items?.length) {
      for (const item of dt.items) {
        const file = fileFromClipboardItem(item);
        if (file && applyImageToTarget(file)) {
          return true;
        }
      }
    }

    try {
      const file = await readImageFromClipboardApi();
      if (file && applyImageToTarget(file)) {
        return true;
      }
    } catch (err) {
      console.warn('Leitura da área de transferência:', err);
    }

    pdfError =
      'Não foi possível colar esta imagem. Clique uma vez no box roxo, depois Ctrl+V — ou use duplo clique para escolher arquivo.';
    return false;
  }

  async function handleImagePaste(event) {
    if (!armedUploadTarget) return;

    event.preventDefault();
    event.stopPropagation();
    uploadTarget = armedUploadTarget;
    await processImagePaste(event);
  }

  function descricaoEditorKey(passoIndex) {
    return `passo-${passoIndex}`;
  }

  function syncDescricaoEditor(passoIndex, el) {
    if (!el) return;
    const html = sanitizeRichHtml(el.innerHTML);
    if (html !== formData.passos[passoIndex].descricao) {
      updatePasso(passoIndex, { descricao: html });
    }
  }

  function syncMaterialDescricaoEditor(el) {
    if (!el) return;
    const html = sanitizeRichHtml(el.innerHTML);
    if (html !== formData.listaMaterial.descricao) {
      updateListaMaterial({ descricao: html });
    }
  }

  function handleDescricaoPaste(event) {
    event.preventDefault();
    const dt = event.clipboardData;
    if (!dt) return;

    const html = dt.getData('text/html');
    const plain = dt.getData('text/plain');

    if (html?.trim()) {
      document.execCommand('insertHTML', false, sanitizeRichHtml(html));
    } else if (plain != null) {
      document.execCommand('insertText', false, plain);
    }
    const target = event.currentTarget;
    if (target?.dataset?.editor === 'material') {
      syncMaterialDescricaoEditor(target);
    } else if (target?.dataset?.passoIndex != null) {
      syncDescricaoEditor(Number(target.dataset.passoIndex), target);
    }
  }

  function handlePassoDescricaoInput(passoIndex, event) {
    syncDescricaoEditor(passoIndex, event.currentTarget);
  }

  function handleMaterialDescricaoInput(event) {
    syncMaterialDescricaoEditor(event.currentTarget);
  }

  async function initDescricaoEditor(passoIndex) {
    const key = descricaoEditorKey(passoIndex);
    const el = descricaoEditorEls[key];
    if (!el) return;
    const html = formData.passos[passoIndex]?.descricao || '';
    if (!descricaoEditorReady[key] || el.innerHTML !== html) {
      el.innerHTML = html;
      descricaoEditorReady[key] = true;
    }
  }

  async function initMaterialDescricaoEditor() {
    const el = descricaoEditorEls.material;
    if (!el) return;
    const html = formData.listaMaterial.descricao || '';
    if (!descricaoEditorReady.material || el.innerHTML !== html) {
      el.innerHTML = html;
      descricaoEditorReady.material = true;
    }
  }

  $: {
    formData.passos.forEach((_, passoIndex) => {
      if (expandedSections[passoSectionId(passoIndex)]) {
        tick().then(() => initDescricaoEditor(passoIndex));
      }
    });
  }

  $: if (expandedSections.listaMaterial) {
    tick().then(initMaterialDescricaoEditor);
  }

  function clearPassoImage(passoIndex) {
    updatePasso(passoIndex, { imagemDataUrl: '', imagemNome: '' });
  }

  function registerDescricaoEditor(node, params) {
    const key = params?.key;
    if (key) descricaoEditorEls[key] = node;
    return {
      destroy() {
        if (descricaoEditorEls[key] === node) delete descricaoEditorEls[key];
      }
    };
  }

  const PDF_PRINT_HINT =
    'Na impressão: destino "Salvar como PDF", margens "Padrão" (ou "Nenhuma") e desmarque "Cabeçalhos e rodapés" do navegador.';

  async function handleGeneratePdf() {
    if (!assetsReady) {
      pdfError = 'Aguarde o carregamento das imagens da capa antes de gerar o PDF.';
      return;
    }
    generatingPDF = true;
    pdfError = '';
    await tick();
    const fileName = `${formData.cabecalho.ordemJira?.trim() || formData.cabecalho.contrato?.trim() || formData.cabecalho.cliente?.trim() || 'Formulario'} - Engenharia.pdf`;
    const result = await printEngineeringPdf(previewIframeEl, previewHtml, {
      title: fileName.replace('.pdf', '')
    });
    generatingPDF = false;
    if (!result.success) {
      pdfError =
        result.error === 'popup_blocked'
          ? 'Não foi possível abrir a impressão. Verifique se o bloqueador de pop-ups está desativado.'
          : 'Não foi possível abrir a impressão. Tente novamente.';
    }
  }

  onMount(async () => {
    if (onSettingsRequest && typeof onSettingsRequest === 'function') {
      onSettingsRequest(() => {});
    }
    if (onSettingsHover && typeof onSettingsHover === 'function') {
      onSettingsHover(() => {});
    }

    let removeWindowPaste = null;

    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const [logo, ondas] = await Promise.all([
        loadLogoDataUrl(origin),
        loadCapaOndasDataUrl(origin)
      ]);
      logoDataUrl = logo;
      capaOndasDataUrl = ondas;
      assetsReady = true;

      const onWindowPaste = (e) => {
        if (!armedUploadTarget) return;
        e.preventDefault();
        e.stopPropagation();
        uploadTarget = armedUploadTarget;
        processImagePaste(e);
      };
      window.addEventListener('paste', onWindowPaste, true);
      removeWindowPaste = () => window.removeEventListener('paste', onWindowPaste, true);
    }

    return () => {
      removeWindowPaste?.();
      disarmImagePaste();
    };
  });
</script>

<div class="formulario-engenharia">
  <div class="workspace">
    <!-- Coluna esquerda: formulário -->
    <aside class="form-column">
      <div class="form-scroll">
        <!-- Box: Capa -->
        <section class="form-box" class:expanded={expandedSections.capa}>
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

        <!-- Box: Informações do projeto -->
        <section class="form-box" class:expanded={expandedSections.cabecalho}>
          <button
            type="button"
            class="form-box-header"
            on:click={() => toggleSection('cabecalho')}
            aria-expanded={expandedSections.cabecalho}
          >
            <span class="form-box-title">Informações do projeto</span>
            <span class="chevron" class:open={expandedSections.cabecalho}>▼</span>
          </button>
          {#if expandedSections.cabecalho}
            <div class="form-box-body form-box-body-cabecalho">
              {#each CABECALHO_FIELDS as field (field.key)}
                <label class="field">
                  <span>{field.label}</span>
                  {#if field.multiline}
                    <textarea
                      rows="3"
                      bind:value={formData.cabecalho[field.key]}
                      placeholder={field.placeholder}
                    ></textarea>
                  {:else}
                    <input
                      type="text"
                      bind:value={formData.cabecalho[field.key]}
                      placeholder={field.placeholder}
                    />
                  {/if}
                </label>
              {/each}
            </div>
          {/if}
        </section>

        <input
          bind:this={passoImageInput}
          type="file"
          class="file-input-hidden"
          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/*"
          on:change={handlePassoImageChange}
          tabindex="-1"
          aria-hidden="true"
        />

        {#each formData.passos as passo, passoIndex (passoIndex)}
          {@const sectionId = passoSectionId(passoIndex)}
          {@const editorKey = descricaoEditorKey(passoIndex)}
          {@const uploadCtx = { type: 'passo', index: passoIndex }}
          {@const isLastPasso = passoIndex === formData.passos.length - 1}
          {@const canRemovePasso = passoIndex >= 1}
          <section class="form-box" class:expanded={expandedSections[sectionId]}>
            <div class="form-box-header-row">
              <button
                type="button"
                class="form-box-header"
                on:click={() => toggleSection(sectionId)}
                aria-expanded={expandedSections[sectionId]}
              >
                <span class="form-box-title"
                  >Passo {passoIndex + 1}° — {passo.tituloPasso || 'XXXXX'}</span
                >
                <span class="chevron" class:open={expandedSections[sectionId]}>▼</span>
              </button>
              {#if canRemovePasso}
                <button
                  type="button"
                  class="btn-remove-passo"
                  title="Remover Passo {passoIndex + 1}°"
                  aria-label="Remover este passo"
                  on:click|stopPropagation={() => removePasso(passoIndex)}
                >
                  −
                </button>
              {/if}
              {#if isLastPasso}
                <button
                  type="button"
                  class="btn-add-passo"
                  title="Adicionar Passo {passoIndex + 2}°"
                  aria-label="Adicionar próximo passo"
                  on:click|stopPropagation={addPasso}
                >
                  +
                </button>
              {/if}
            </div>
            {#if expandedSections[sectionId]}
              <div class="form-box-body">
                <label class="field">
                  <span>Nome do passo (substitui XXXXX)</span>
                  <input
                    type="text"
                    value={passo.tituloPasso}
                    on:input={(e) => updatePasso(passoIndex, { tituloPasso: e.currentTarget.value })}
                    placeholder="XXXXX"
                  />
                </label>
                <label class="field">
                  <span>Descrição</span>
                  <div
                    use:registerDescricaoEditor={{ key: editorKey }}
                    class="rich-editor"
                    contenteditable="true"
                    role="textbox"
                    aria-multiline="true"
                    data-passo-index={passoIndex}
                    data-placeholder="Descrição do passo (suporta negrito e formatação ao colar)"
                    on:input={(e) => handlePassoDescricaoInput(passoIndex, e)}
                    on:paste={handleDescricaoPaste}
                    on:blur={(e) => syncDescricaoEditor(passoIndex, e.currentTarget)}
                  ></div>
                </label>
                <div class="field field-upload">
                  <span>Imagem</span>
                  <div
                    class="upload-box"
                    class:armed={uploadTargetsMatch(armedUploadTarget, uploadCtx)}
                    tabindex="0"
                    role="group"
                    aria-label="Imagem do passo {passoIndex + 1}. Um clique para selecionar e colar com Ctrl+V. Dois cliques para escolher arquivo."
                    on:click={() => armImagePaste(uploadCtx)}
                    on:focus={() => armImagePaste(uploadCtx)}
                    on:blur={disarmImagePaste}
                    on:paste={handleImagePaste}
                    on:dblclick={(e) => {
                      setUploadTarget(uploadCtx);
                      handleUploadBoxDblClick(e);
                    }}
                  >
                    <div class="upload-trigger">
                      <span class="upload-trigger-text">1 clique: selecionar o box e colar (Ctrl+V)</span>
                      <span class="upload-trigger-hint"
                        >2 cliques seguidos: escolher imagem no computador — até {MAX_PASSO_IMAGE_MB} MB</span
                      >
                    </div>
                    {#if passo.imagemDataUrl}
                      <div class="upload-preview-wrap">
                        <img
                          class="upload-preview"
                          src={passo.imagemDataUrl}
                          alt="Prévia da imagem do passo {passoIndex + 1}"
                        />
                        {#if passo.imagemNome}
                          <p class="upload-filename">{passo.imagemNome}</p>
                        {/if}
                        <button
                          type="button"
                          class="btn-remove-image"
                          on:click|stopPropagation={() => clearPassoImage(passoIndex)}
                        >
                          Remover imagem
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/if}
          </section>
        {/each}

        <!-- Box: Lista de Material -->
        <section class="form-box" class:expanded={expandedSections.listaMaterial}>
          <button
            type="button"
            class="form-box-header"
            on:click={() => toggleSection('listaMaterial')}
            aria-expanded={expandedSections.listaMaterial}
          >
            <span class="form-box-title">Lista de Material</span>
            <span class="chevron" class:open={expandedSections.listaMaterial}>▼</span>
          </button>
          {#if expandedSections.listaMaterial}
            <div class="form-box-body">
              <label class="field">
                <span>Descrição</span>
                <div
                  use:registerDescricaoEditor={{ key: 'material' }}
                  class="rich-editor"
                  contenteditable="true"
                  role="textbox"
                  aria-multiline="true"
                  data-editor="material"
                  data-placeholder="Descrição da lista de material"
                  on:input={handleMaterialDescricaoInput}
                  on:paste={handleDescricaoPaste}
                  on:blur={(e) => syncMaterialDescricaoEditor(e.currentTarget)}
                ></div>
              </label>
            </div>
          {/if}
        </section>
      </div>

      <footer class="form-actions">
        {#if pdfError}
          <p class="pdf-error" role="alert">{pdfError}</p>
        {/if}
        <p class="pdf-print-hint">{PDF_PRINT_HINT}</p>
        <button
          type="button"
          class="btn-generate-pdf"
          on:click={handleGeneratePdf}
          disabled={generatingPDF || !assetsReady}
        >
          {generatingPDF ? 'Abrindo impressão...' : 'Gerar PDF'}
        </button>
      </footer>
    </aside>

    <!-- Coluna direita: prévia em tempo real -->
    <main class="preview-column">
      <div class="preview-header">
        <h2>Prévia do PDF</h2>
        <span class="preview-hint">{previewPagesHint} — atualiza em tempo real</span>
      </div>
      <div class="preview-frame-wrapper">
        {#if !assetsReady}
          <p class="preview-loading">Carregando imagens da capa…</p>
        {/if}
        <iframe
          bind:this={previewIframeEl}
          title="Prévia do PDF"
          class="pdf-preview-iframe"
          class:hidden-until-ready={!assetsReady}
          srcdoc={previewHtml}
          sandbox="allow-same-origin allow-modals"
          tabindex="-1"
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
    min-width: 0;
    width: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fff;
    border-right: 1px solid #e2e8f0;
    box-shadow: 2px 0 12px rgba(0, 0, 0, 0.04);
  }

  /* Rolagem entre os boxes (Capa, Informações, Passo 1) */
  .form-scroll {
    flex: 1;
    min-height: 0;
    min-width: 0;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overscroll-behavior: contain;
    box-sizing: border-box;
  }

  .form-box {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 100%;
    border: 1px solid rgba(123, 104, 238, 0.25);
    border-radius: 10px;
    overflow: hidden;
    background: #fafbff;
    min-height: 0;
    box-sizing: border-box;
  }

  .form-box.expanded {
    max-height: min(58vh, 540px);
  }

  .form-box-header-row {
    display: flex;
    align-items: stretch;
    flex-shrink: 0;
    width: 100%;
  }

  .form-box-header-row .form-box-header {
    flex: 1;
    min-width: 0;
  }

  .btn-add-passo,
  .btn-remove-passo {
    flex-shrink: 0;
    width: 2.75rem;
    border: none;
    border-left: 1px solid rgba(255, 255, 255, 0.35);
    background: linear-gradient(135deg, #5a4fd4 0%, #7b68ee 100%);
    color: white;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1;
    cursor: pointer;
    padding: 0;
  }

  .btn-add-passo:hover,
  .btn-remove-passo:hover {
    filter: brightness(1.1);
  }

  .form-box-header {
    flex-shrink: 0;
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

  /* Rolagem interna dentro do box (campos) */
  .form-box-body {
    flex: 1;
    min-height: 0;
    min-width: 0;
    width: 100%;
    max-width: 100%;
    max-height: min(48vh, 460px);
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
    box-sizing: border-box;
    padding: 1rem 0.85rem 1rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    -webkit-overflow-scrolling: touch;
  }

  .form-box-body-cabecalho {
    max-height: min(50vh, 480px);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    min-width: 0;
    width: 100%;
    max-width: 100%;
  }

  .field span {
    font-size: 0.8rem;
    font-weight: 600;
    color: #5b21b6;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    line-height: 1.35;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  .field input,
  .field textarea {
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 0.55rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: inherit;
    color: #1f2937;
    background: white;
  }

  .field input:focus,
  .field textarea:focus,
  .rich-editor:focus {
    outline: none;
    border-color: #7b68ee;
    box-shadow: 0 0 0 3px rgba(123, 104, 238, 0.15);
  }

  .rich-editor {
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    min-height: 100px;
    max-height: 220px;
    overflow-y: auto;
    box-sizing: border-box;
    padding: 0.55rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.9rem;
    font-family: inherit;
    color: #1f2937;
    background: white;
    line-height: 1.45;
    word-break: break-word;
  }

  .rich-editor:empty::before {
    content: attr(data-placeholder);
    color: #9ca3af;
    pointer-events: none;
  }

  .field-upload   .upload-box {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    outline: none;
  }

  .upload-box:focus-visible {
    box-shadow: 0 0 0 3px rgba(123, 104, 238, 0.2);
    border-radius: 8px;
  }

  .upload-box:focus-visible .upload-trigger,
  .upload-box:focus .upload-trigger,
  .upload-box.armed .upload-trigger {
    border-color: #7b68ee;
    background: #f5f3ff;
    box-shadow: inset 0 0 0 1px rgba(123, 104, 238, 0.35);
  }

  .file-input-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .upload-trigger {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    width: 100%;
    max-width: 100%;
    min-height: 88px;
    padding: 0.85rem;
    border: 2px dashed rgba(123, 104, 238, 0.45);
    border-radius: 8px;
    background: #fff;
    cursor: pointer;
    text-align: center;
    box-sizing: border-box;
    position: relative;
  }

  .upload-trigger:hover {
    border-color: #7b68ee;
    background: #f5f3ff;
  }

  .upload-trigger-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: #5b21b6;
    pointer-events: none;
  }

  .upload-trigger-hint {
    font-size: 0.75rem;
    color: #6b7280;
    pointer-events: none;
  }

  .upload-preview-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }

  .upload-preview {
    display: block;
    width: 100%;
    max-width: 100%;
    max-height: 200px;
    object-fit: contain;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    background: #f9fafb;
  }

  .upload-filename {
    margin: 0;
    font-size: 0.75rem;
    color: #6b7280;
    word-break: break-all;
  }

  .btn-remove-image {
    align-self: flex-start;
    padding: 0.4rem 0.75rem;
    font-size: 0.8rem;
    font-family: inherit;
    color: #b91c1c;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    cursor: pointer;
  }

  .btn-remove-image:hover {
    background: #fee2e2;
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

  .pdf-print-hint {
    margin: 0 0 0.65rem;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #64748b;
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
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .preview-loading {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .pdf-preview-iframe.hidden-until-ready {
    visibility: hidden;
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
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
