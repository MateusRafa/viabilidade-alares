<script>
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let title = 'Confirmar';
  export let message = '';
  export let confirmLabel = 'Confirmar';
  export let cancelLabel = 'Cancelar';
  export let loading = false;

  const dispatch = createEventDispatcher();

  function handleCancel() {
    if (loading) return;
    dispatch('cancel');
  }

  function handleConfirm() {
    if (loading) return;
    dispatch('confirm');
  }

  function handleOverlayKeydown(event) {
    if (event.key === 'Escape') handleCancel();
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) handleCancel();
  }

  function handleWindowKeydown(event) {
    if (open && event.key === 'Escape') handleCancel();
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

{#if open}
  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <div
    class="confirm-overlay"
    role="presentation"
    on:click={handleOverlayClick}
    on:keydown={handleOverlayKeydown}
  >
    <div
      class="confirm-box"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-message"
      on:click|stopPropagation
      on:keydown|stopPropagation
    >
      <header class="confirm-header">
        <h2 id="confirm-dialog-title">{title}</h2>
        <button
          type="button"
          class="confirm-close"
          aria-label="Fechar"
          disabled={loading}
          on:click={handleCancel}
        >
          ×
        </button>
      </header>

      <div class="confirm-body">
        <p id="confirm-dialog-message">{message}</p>
      </div>

      <footer class="confirm-footer">
        <button
          type="button"
          class="btn-cancel"
          disabled={loading}
          on:click={handleCancel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          class="btn-confirm"
          disabled={loading}
          on:click={handleConfirm}
        >
          {loading ? 'Aguarde…' : confirmLabel}
        </button>
      </footer>
    </div>
  </div>
{/if}

<style>
  .confirm-overlay {
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.25rem;
    background: rgba(15, 23, 42, 0.55);
    animation: confirmFadeIn 0.2s ease;
  }

  @keyframes confirmFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .confirm-box {
    width: 100%;
    max-width: 420px;
    background: white;
    border-radius: 12px;
    overflow: hidden;
    box-shadow:
      0 20px 50px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(123, 104, 238, 0.12);
    animation: confirmSlideUp 0.25s ease;
  }

  @keyframes confirmSlideUp {
    from {
      opacity: 0;
      transform: translateY(16px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  .confirm-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem 1.15rem;
    background: linear-gradient(135deg, #7b68ee 0%, #6495ed 100%);
    color: white;
  }

  .confirm-header h2 {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.35;
  }

  .confirm-close {
    flex-shrink: 0;
    width: 2rem;
    height: 2rem;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.15);
    color: white;
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .confirm-close:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.28);
  }

  .confirm-close:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .confirm-body {
    padding: 1.25rem 1.15rem 0.5rem;
  }

  .confirm-body p {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.55;
    color: #374151;
    white-space: pre-line;
  }

  .confirm-footer {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: 0.65rem;
    padding: 1rem 1.15rem 1.15rem;
  }

  .btn-cancel,
  .btn-confirm {
    padding: 0.65rem 1.1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: filter 0.15s ease, opacity 0.15s ease;
  }

  .btn-cancel {
    border: 1px solid #d1d5db;
    background: white;
    color: #4b5563;
  }

  .btn-cancel:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .btn-confirm {
    border: none;
    background: linear-gradient(135deg, #7b68ee 0%, #6495ed 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(123, 104, 238, 0.35);
  }

  .btn-confirm:hover:not(:disabled) {
    filter: brightness(1.06);
  }

  .btn-cancel:disabled,
  .btn-confirm:disabled {
    opacity: 0.7;
    cursor: wait;
  }
</style>
