import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = {
  dark: {
    mode: 'dark',
    bg: '#09090a',
    surface: '#111112',
    surfaceAlt: '#19191b',
    surfaceHover: '#212123',
    cardBg: 'linear-gradient(180deg, #1e1e20 0%, #171719 100%)',
    columnBg: 'linear-gradient(180deg, #131314 0%, #0e0e0f 100%)',
    border: 'rgba(255,255,255,0.08)',
    borderStrong: 'rgba(255,255,255,0.16)',
    textPrimary: '#f4f4f2',
    textSecondary: '#b4b4b0',
    textMuted: '#76767a',
    accent: '#f4f4f2',
    accentSoft: 'rgba(244,244,242,0.10)',
    accentText: '#09090a',
    won: '#7fd9a8',
    wonSoft: 'rgba(127,217,168,0.07)',
    lost: '#e58a8a',
    lostSoft: 'rgba(229,138,138,0.09)',
    shadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(0,0,0,0.5)',
    shadowSm: '0 1px 0 rgba(255,255,255,0.05) inset, 0 1px 2px rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.72)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(255,255,255,0.07), transparent 70%)',
  },
  light: {
    mode: 'light',
    bg: '#f6f6f4',
    surface: '#ffffff',
    surfaceAlt: '#f0f0ee',
    surfaceHover: '#e8e8e5',
    cardBg: 'linear-gradient(180deg, #ffffff 0%, #fafaf8 100%)',
    columnBg: 'linear-gradient(180deg, #ffffff 0%, #f8f8f6 100%)',
    border: 'rgba(0,0,0,0.10)',
    borderStrong: 'rgba(0,0,0,0.20)',
    textPrimary: '#0e0e0f',
    textSecondary: '#55555a',
    textMuted: '#8a8a8f',
    accent: '#0e0e0f',
    accentSoft: 'rgba(14,14,15,0.07)',
    accentText: '#ffffff',
    won: '#1f8f5c',
    wonSoft: 'rgba(31,143,92,0.06)',
    lost: '#cc3d3d',
    lostSoft: 'rgba(204,61,61,0.07)',
    shadow: '0 12px 32px rgba(16,16,20,0.10)',
    shadowSm: '0 1px 2px rgba(16,16,20,0.06)',
    overlay: 'rgba(20,20,24,0.45)',
    glow: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,0,0,0.04), transparent 70%)',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try {
      const saved = localStorage.getItem('crm-theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try { localStorage.setItem('crm-theme', mode); } catch (e) {}
    document.documentElement.style.background = THEMES[mode].bg;
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  const theme = THEMES[mode];
  const toggle = () => setMode(m => (m === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

const ValuesVisibilityContext = createContext(null);

export function ValuesVisibilityProvider({ children }) {
  const [hidden, setHidden] = useState(() => {
    try { return localStorage.getItem('crm-hide-values') === '1'; } catch (e) { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('crm-hide-values', hidden ? '1' : '0'); } catch (e) {}
  }, [hidden]);

  const toggleHidden = () => setHidden(h => !h);

  return (
    <ValuesVisibilityContext.Provider value={{ hidden, toggleHidden }}>
      {children}
    </ValuesVisibilityContext.Provider>
  );
}

export function useValuesVisibility() {
  const ctx = useContext(ValuesVisibilityContext);
  if (!ctx) throw new Error('useValuesVisibility must be used inside ValuesVisibilityProvider');
  return ctx;
}

export function GlobalStyle() {
  const { theme } = useTheme();
  const t = theme;
  const css = `
  html, body { background: ${t.bg}; }
  body { margin: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: ${t.textPrimary}; }
  body::before { content: ''; position: fixed; inset: 0; background: ${t.glow}; pointer-events: none; z-index: 0; }
  #root { position: relative; z-index: 1; }
  * { box-sizing: border-box; }
  input, select, textarea, button { font-family: inherit; font-weight: 300; }
  input, textarea, select { transition: border-color .15s, box-shadow .15s; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: ${t.borderStrong} !important; box-shadow: 0 0 0 3px ${t.accentSoft}; }
  input::placeholder, textarea::placeholder { color: ${t.textMuted}; }
  button { transition: background-color .15s, border-color .15s, color .15s, opacity .15s, transform .15s; }
  button:not(:disabled):active { transform: scale(0.98); }
  ::selection { background: ${t.accentSoft}; }
  * { scrollbar-width: thin; scrollbar-color: ${t.borderStrong} transparent; }
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-thumb { background: ${t.border}; border-radius: 8px; }
  *::-webkit-scrollbar-thumb:hover { background: ${t.borderStrong}; }
  .serif { font-family: 'Instrument Serif', Georgia, serif; font-weight: 400; letter-spacing: -0.01em; }
  .eyebrow { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: ${t.textMuted}; font-weight: 400; }
  .kcard { transition: border-color .15s, transform .15s, box-shadow .15s, opacity .12s; }
  .kcard:hover { border-color: ${t.borderStrong} !important; }
  .pill-btn:hover { background: ${t.surfaceHover} !important; color: ${t.textPrimary} !important; }
  .nav-tab:hover { color: ${t.textPrimary} !important; }
  .modal-in { animation: modalIn .18s ease-out; }
  @keyframes modalIn { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: none; } }
  .fade-in { animation: fadeIn .2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;
  return <style>{css}</style>;
}
