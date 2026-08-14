import { writable } from 'svelte/store';

/** Título dinâmico do header da ferramenta (ex.: ALA-1745000). null = título padrão. */
export const toolShellTitle = writable(null);

/** Handler opcional do botão voltar do header. null = volta ao dashboard. */
export const toolShellBackHandler = writable(null);

export function clearToolShell() {
  toolShellTitle.set(null);
  toolShellBackHandler.set(null);
}
