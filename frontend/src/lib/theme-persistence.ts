/**
 * Theme persistence utilities
 * Prevents flash of incorrect theme on page load
 */

type Theme = 'light' | 'dark' | 'system';

const THEME_KEY = 'theme';

/**
 * Get the stored theme preference
 */
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(THEME_KEY) as Theme) || 'system';
}

/**
 * Get the resolved theme (light or dark, never system)
 */
export function getResolvedTheme(): 'light' | 'dark' {
  const stored = getStoredTheme();
  if (stored === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return stored;
}

/**
 * Set the theme and persist to localStorage
 */
export function setTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  localStorage.setItem(THEME_KEY, theme);

  const resolved = theme === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : theme;

  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/**
 * Initialize theme on page load (call before React hydrates)
 */
export function initTheme(): void {
  if (typeof window === 'undefined') return;

  const stored = getStoredTheme();
  const resolved = stored === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : stored;

  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

/**
 * Listen for system theme changes
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (e: MediaQueryListEvent) => {
    if (getStoredTheme() === 'system') {
      callback(e.matches ? 'dark' : 'light');
    }
  };

  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}
