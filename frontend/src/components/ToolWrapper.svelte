<script>
  import { toolShellHeaderAction } from '../toolShellStore.js';

  export let toolTitle = 'Ferramenta';
  export let onBackToDashboard = () => {};
  export let onOpenSettings = () => {};
  export let onSettingsHover = () => {};
  export let showSettingsButton = true;

  $: headerAction = $toolShellHeaderAction;
</script>

<div class="app-container">
  <header>
    <div class="header-left">
      <button 
        class="back-button" 
        on:click={onBackToDashboard}
        aria-label="Voltar ao Dashboard" 
        title="Voltar ao Dashboard"
        type="button"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <h1>{toolTitle}</h1>
    </div>
    {#if headerAction?.onClick}
      <button
        class="header-action-button"
        on:click|stopPropagation={headerAction.onClick}
        disabled={headerAction.disabled || headerAction.spinning}
        aria-label={headerAction.label || 'Atualizar'}
        title={headerAction.label || 'Atualizar'}
        type="button"
      >
        <span class="header-refresh-icon" class:spinning={headerAction.spinning}>↻</span>
      </button>
    {:else if showSettingsButton}
      <button 
        class="settings-button" 
        on:click|stopPropagation={onOpenSettings}
        on:mouseenter={onSettingsHover}
        aria-label="Configurações" 
        title="Configurações"
        type="button"
      >
        ⚙️
      </button>
    {/if}
  </header>

  <div class="main-content">
    <slot />
  </div>
</div>

<style>
  .app-container {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100%;
    overflow: hidden;
  }

  header {
    background: linear-gradient(135deg, #7B68EE 0%, #6B5BEE 100%);
    color: white;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    z-index: 100;
    position: relative;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .back-button {
    background: rgba(255, 255, 255, 0.2);
    border: none;
    border-radius: 8px;
    padding: 0.5rem;
    cursor: pointer;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .back-button:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: translateX(-2px);
  }

  .back-button:active {
    transform: translateX(0);
  }

  header h1 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: white;
  }

  .settings-button,
  .header-action-button {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.3s ease;
    position: relative;
    z-index: 1001;
  }

  .header-action-button {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    font-size: 1.25rem;
  }

  .header-action-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.3);
  }

  .header-action-button:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .header-refresh-icon {
    display: inline-block;
    line-height: 1;
  }

  .header-refresh-icon.spinning {
    animation: headerSpin 0.8s linear infinite;
  }

  @keyframes headerSpin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Gira quando o usuário passar o mouse ou clicar */
  .settings-button:hover,
  .settings-button:active {
    animation: rotateOnce 0.5s ease-in-out;
  }

  @keyframes rotateOnce {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(45deg);
    }
  }

  .main-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    position: relative;
  }

  /* Responsividade */
  @media (max-width: 768px) {
    header {
      padding: 0.75rem 1rem;
    }

    header h1 {
      font-size: 1.25rem;
    }

    .back-button,
    .settings-button {
      padding: 0.4rem;
    }
  }
</style>

