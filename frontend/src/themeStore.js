import { writable } from 'svelte/store';

const STORAGE_KEY = 'portal-censup-theme';

function readInitialTheme() {
  if (typeof localStorage === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* ignore */
  }
  return 'light';
}

function createThemeStore() {
  const { subscribe, set, update } = writable(readInitialTheme());

  return {
    subscribe,
    set(value) {
      const next = value === 'dark' ? 'dark' : 'light';
      set(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
    },
    toggle() {
      update((current) => {
        const next = current === 'dark' ? 'light' : 'dark';
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
        return next;
      });
    }
  };
}

export const theme = createThemeStore();
