import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  applyTheme,
  getStoredPreference,
  resolveTheme,
  storePreference,
  watchSystemTheme,
} from '../lib/theme';

/**
 * `preference` is what the user chose ('light' | 'dark' | 'system').
 * `theme` is what is actually on screen ('light' | 'dark').
 *
 * Components that need to branch on appearance — a map tile URL, an inline SVG
 * gradient, a Lottie file — should read `theme`. Only the settings control
 * cares about `preference`.
 */
const ThemeContext = createContext({
  preference: 'system',
  theme: 'light',
  hydrated: false,
  setPreference: () => {},
});

export function ThemeProvider({ children }) {
  /* Seeded with 'system'/'light' rather than reading storage, because this
     runs during SSG where there is no storage and any other value would make
     the static HTML disagree with the first client render. The real values are
     adopted in the effect below; the pre-paint script in _document.js has
     already put the right class on <html>, so nothing flashes in between. */
  const [preference, setPreferenceState] = useState('system');
  const [theme, setTheme] = useState('light');
  /* False until the stored preference has been adopted. Controls that animate
     between states use this to skip their entrance animation: without it, a
     saved 'dark' preference renders one frame as 'system' and then visibly
     slides into place on every visit to the settings screen. */
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = getStoredPreference();
    setPreferenceState(saved);
    const resolved = resolveTheme(saved);
    setTheme(resolved);
    applyTheme(resolved);
    setHydrated(true);
  }, []);

  /* Re-resolve when the OS flips. The listener stays mounted for every
     preference and checks at fire time instead of being torn down and rebuilt
     on each change — iOS Safari drops matchMedia listeners that are added and
     removed rapidly, and this way there is only ever one. */
  useEffect(() => {
    return watchSystemTheme((systemTheme) => {
      if (getStoredPreference() !== 'system') return;
      setTheme(systemTheme);
      applyTheme(systemTheme);
    });
  }, []);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    storePreference(next);
    const resolved = resolveTheme(next);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, theme, hydrated, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
