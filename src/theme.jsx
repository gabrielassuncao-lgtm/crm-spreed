import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = {
  dark: {
    mode: 'dark',
    bg: '#09090a',
    surface: '#141416',
    surfaceAlt: '#1b1b1e',
    surfaceHover: '#242427',
    cardBg: 'linear-gradient(180deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)',
    columnBg: 'linear-gradient(180deg, rgba(16,16,20,0.60) 0%, rgba(9,9,12,0.52) 100%)',
    modalBg: 'linear-gradient(180deg, #202023 0%, #151517 100%)',
    border: 'rgba(255,255,255,0.09)',
    borderStrong: 'rgba(255,255,255,0.18)',
    textPrimary: '#f4f4f2',
    textSecondary: '#b4b4b0',
    textMuted: '#76767a',
    accent: '#f4f4f2',
    accentSoft: 'rgba(244,244,242,0.10)',
    accentText: '#09090a',
    won: '#3fe08f',
    wonSoft: 'rgba(63,224,143,0.12)',
    lost: '#e58a8a',
    lostSoft: 'rgba(229,138,138,0.09)',
    shadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px rgba(0,0,0,0.5)',
    shadowSm: '0 1px 0 rgba(255,255,255,0.05) inset, 0 1px 2px rgba(0,0,0,0.4)',
    overlay: 'rgba(0,0,0,0.72)',
    depth: [
      'radial-gradient(60% 55% at 12% 4%, rgba(112,138,200,0.42) 0%, transparent 70%)',
      'radial-gradient(50% 50% at 88% 8%, rgba(150,165,120,0.26) 0%, transparent 70%)',
      'radial-gradient(55% 55% at 78% 100%, rgba(176,100,78,0.28) 0%, transparent 70%)',
      'radial-gradient(50% 50% at 4% 96%, rgba(100,82,160,0.30) 0%, transparent 70%)',
    ].join(','),
  },
  light: {
    mode: 'light',
    bg: '#d9dde8',
    surface: '#ffffff',
    surfaceAlt: '#eceff5',
    surfaceHover: '#dde1ea',
    cardBg: 'linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.84) 100%)',
    columnBg: 'linear-gradient(180deg, rgba(226,230,242,0.66) 0%, rgba(210,215,232,0.52) 100%)',
    modalBg: 'linear-gradient(180deg, #ffffff 0%, #f8f8fa 100%)',
    border: 'rgba(20,26,50,0.17)',
    borderStrong: 'rgba(20,26,50,0.32)',
    textPrimary: '#0a0a0d',
    textSecondary: '#363843',
    textMuted: '#5c5e6a',
    accent: '#0e0e0f',
    accentSoft: 'rgba(14,14,15,0.10)',
    accentText: '#ffffff',
    won: '#0b7a47',
    wonSoft: 'rgba(11,122,71,0.14)',
    lost: '#bf2f2f',
    lostSoft: 'rgba(204,61,61,0.07)',
    shadow: '0 12px 32px rgba(30,40,90,0.20)',
    shadowSm: '0 1px 3px rgba(30,40,90,0.16)',
    overlay: 'rgba(20,20,24,0.45)',
    depth: [
      'radial-gradient(60% 55% at 10% 6%, rgba(98,124,235,0.62) 0%, transparent 70%)',
      'radial-gradient(50% 50% at 90% 10%, rgba(238,150,110,0.52) 0%, transparent 70%)',
      'radial-gradient(55% 55% at 80% 100%, rgba(84,176,150,0.58) 0%, transparent 70%)',
      'radial-gradient(50% 50% at 6% 96%, rgba(160,120,228,0.52) 0%, transparent 70%)',
    ].join(','),
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
  body::before { content: ''; position: fixed; inset: 0; background: ${t.depth}; pointer-events: none; z-index: 0; transform: translateZ(0); }
  #root { position: relative; z-index: 1; }
  * { box-sizing: border-box; }
  input, select, textarea, button { font-family: inherit; font-weight: 300; }
  input, textarea, select { transition: border-color .15s, box-shadow .15s; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: ${t.borderStrong} !important; box-shadow: 0 0 0 3px ${t.accentSoft}; }
  select, select:focus, select:focus-visible { outline: none !important; }
  input[style*="transparent"]:focus, select[style*="transparent"]:focus { box-shadow: none !important; border-color: transparent !important; background-color: transparent !important; }
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
  .kcard:hover { filter: brightness(1.14); }
  .pill-btn:hover { background: ${t.surfaceHover} !important; color: ${t.textPrimary} !important; }
  .nav-tab:hover { color: ${t.textPrimary} !important; }
  .glass { -webkit-backdrop-filter: blur(18px) saturate(150%); backdrop-filter: blur(18px) saturate(150%); }
  .blur-overlay { -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  .modal-in { animation: modalIn .18s ease-out; }
  @keyframes modalIn { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: none; } }
  .fade-in { animation: fadeIn .2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;
  return <style>{css}</style>;
}
