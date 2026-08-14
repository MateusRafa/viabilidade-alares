import { writable } from 'svelte/store';

/** Título dinâmico do header da ferramenta (ex.: ALA-1745000). null = título padrão. */
export const toolShellTitle = writable(null);

/** Handler opcional do botão voltar do header. null = volta ao dashboard. */
export const toolShellBackHandler = writable(null);

/** Botão à direita do header (substitui configurações quando definido). */
export const toolShellHeaderAction = writable(null);

/** Busca no header (botão lupa que abre o input). */
export const toolShellSearch = writable(null);

/** Mostra botão de tema claro/escuro no header. */
export const toolShellThemeToggle = writable(false);

export function clearToolShell() {
  toolShellTitle.set(null);
  toolShellBackHandler.set(null);
  toolShellHeaderAction.set(null);
  toolShellSearch.set(null);
  toolShellThemeToggle.set(false);
}
