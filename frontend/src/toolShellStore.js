import { writable } from 'svelte/store';

/** Título dinâmico do header da ferramenta (ex.: ALA-1745000). null = título padrão. */
export const toolShellTitle = writable(null);

/** Handler opcional do botão voltar do header. null = volta ao dashboard. */
export const toolShellBackHandler = writable(null);

/** Botão à direita do header (substitui configurações quando definido). */
export const toolShellHeaderAction = writable(null);

/** Busca no header (botão lupa que abre o input). */
export const toolShellSearch = writable(null);

/** Botão de atalho no header, entre pesquisa e alternância de visualização. */
export const toolShellHeaderShortcut = writable(null);

/** Botão extra no header (ex.: alternar fila / resolvidos), ao lado da pesquisa. */
export const toolShellViewToggle = writable(null);

/** Mostra botão de tema claro/escuro no header. */
export const toolShellThemeToggle = writable(false);

/** Botão de adicionar no header (ao lado do tema). */
export const toolShellAddAction = writable(null);

export function clearToolShell() {
  toolShellTitle.set(null);
  toolShellBackHandler.set(null);
  toolShellHeaderAction.set(null);
  toolShellSearch.set(null);
  toolShellHeaderShortcut.set(null);
  toolShellViewToggle.set(null);
  toolShellThemeToggle.set(false);
  toolShellAddAction.set(null);
}
