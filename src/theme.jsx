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
    bg: '#e9e7e4',
    surface: '#ffffff',
    surfaceAlt: '#f3f2f0',
    surfaceHover: '#e6e5e2',
    cardBg: 'rgba(255,255,255,0.97)',
    columnBg: 'rgba(246,245,250,0.55)',
    modalBg: 'linear-gradient(180deg, #ffffff 0%, #f8f8fa 100%)',
    border: 'rgba(30,28,50,0.15)',
    borderStrong: 'rgba(30,28,50,0.28)',
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
    shadow: '0 12px 32px rgba(40,36,60,0.14)',
    shadowSm: '0 1px 3px rgba(40,36,60,0.12)',
    overlay: 'rgba(20,20,24,0.45)',
    depth: [
      'radial-gradient(60% 55% at 10% 6%, rgba(176,160,226,0.32) 0%, transparent 70%)',
      'radial-gradient(50% 50% at 90% 10%, rgba(240,190,160,0.38) 0%, transparent 70%)',
      'radial-gradient(55% 55% at 80% 100%, rgba(150,200,178,0.34) 0%, transparent 70%)',
      'radial-gradient(50% 50% at 6% 96%, rgba(214,180,200,0.30) 0%, transparent 70%)',
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
    // Só a cor (não o atalho "background"), para não apagar o degradê definido no CSS.
    document.documentElement.style.backgroundColor = THEMES[mode].bg;
    document.documentElement.dataset.theme = mode;
    // Cor da barra do sistema (iPhone/Android) acompanha o tema.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEMES[mode].bg);
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
  // As 4 "luzes" do fundo: as 2 primeiras ficam no topo, as 2 últimas na base.
  const glows = t.depth.split(/,(?=radial-gradient)/);
  // Versão para celular: as luzes ficam mais para dentro e somem antes das bordas do bloco,
  // assim o degradê repete sem emenda e continua igual na área do "elástico" do iPhone.
  const mobileGlows = glows.map(g => g.replace(
    /radial-gradient\(\s*\d+%\s+\d+%\s+at\s+(\d+)%\s+(\d+)%/,
    (_, x, y) => `radial-gradient(70% 34% at ${x}% ${Number(y) < 50 ? 22 : 78}%`
  ));
  const css = `
  html, body { background: ${t.bg}; }
  /* Sem "elástico" ao puxar a página: evita mostrar uma faixa preta no topo/base no celular. */
  html, body { overscroll-behavior-y: none; }
  body { margin: 0; font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-weight: 300; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; color: ${t.textPrimary}; }
  /* A camada passa 120px além do topo e da base: no celular (Safari/iPhone) as barras do navegador deixavam faixas sem o brilho de fundo. */
  body::before { content: ''; position: fixed; top: -120px; bottom: -120px; left: 0; right: 0; background: ${t.depth}; pointer-events: none; z-index: 0; transform: translateZ(0); }
  #root { position: relative; z-index: 1; }
  * { box-sizing: border-box; }
  input, select, textarea, button { font-family: inherit; font-weight: 300; }
  input, textarea, select { transition: border-color .15s, box-shadow .15s; }
  input:focus, textarea:focus, select:focus { outline: none; border-color: ${t.borderStrong} !important; box-shadow: 0 0 0 3px ${t.accentSoft}; }
  select, select:focus, select:focus-visible { outline: none !important; }
  select { -webkit-appearance: none; appearance: none; cursor: pointer; text-overflow: ellipsis;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='${t.mode === 'light' ? '%234a4c58' : '%23a8a8b0'}' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E") !important;
    background-repeat: no-repeat !important; background-position: right 14px center !important; background-size: 12px 12px !important; padding-right: 36px !important; }
  select[style*="transparent"] { background-position: right 2px center !important; padding-right: 20px !important; }
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
  .glass { -webkit-backdrop-filter: ${t.mode === 'light' ? 'none' : 'blur(18px) saturate(150%)'}; backdrop-filter: ${t.mode === 'light' ? 'none' : 'blur(18px) saturate(150%)'}; }
  .blur-overlay { -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
  .modal-in { animation: modalIn .18s ease-out; }
  @keyframes modalIn { from { opacity: 0; transform: translateY(6px) scale(.985); } to { opacity: 1; transform: none; } }
  .fade-in { animation: fadeIn .2s ease-out; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @media (max-width: 560px) { .stat-grid > :last-child:nth-child(odd) { grid-column: 1 / -1; } }
  /* ---- Fundo no celular/tablet ----
     No iPhone, uma camada "fixed" não chega até as bordas da tela (atrás das barras do Safari).
     Aqui o degradê é pintado na própria página (html), que o iPhone sempre estende até a borda. */
  @media (max-width: 900px), (pointer: coarse) {
    body::before { display: none; }
    body { background: transparent; }
    html {
      min-height: 100vh;
      min-height: 100lvh;
      background-color: ${t.bg};
      background-image: ${mobileGlows.join(', ')};
      background-repeat: repeat-y;
      background-size: 100% 100vh;
      background-size: 100% 100lvh;
      background-position: 0 0;
    }
  }

  /* ---- Celular (até 640px) ---- */
  @media (max-width: 640px) {
    .topbar { display: grid !important; grid-template-columns: 1fr auto; grid-template-areas: "logo circles" "nav nav" "pills pills"; gap: 10px !important; padding: calc(14px + env(safe-area-inset-top, 0px)) calc(14px + env(safe-area-inset-right, 0px)) 4px calc(14px + env(safe-area-inset-left, 0px)) !important; }
    .topbar-actions { display: contents !important; }
    .topbar-logo { grid-area: logo; min-width: 0 !important; }
    .topbar-circles { grid-area: circles; }
    .topbar-nav { grid-area: nav; width: 100%; }
    .topbar-nav .nav-tab { flex: 1 1 0; justify-content: center; padding: 8px 6px !important; }
    .topbar-nav .nav-tab:not(.nav-tab-active) .nav-label { display: none; }
    .topbar-nav .nav-tab-active { flex: 2.4 1 0; }
    .topbar-pills { grid-area: pills; }
    .page-pad { padding-left: calc(14px + env(safe-area-inset-left, 0px)) !important; padding-right: calc(14px + env(safe-area-inset-right, 0px)) !important; padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px)) !important; }
    .funnel-tabs { flex-wrap: nowrap !important; overflow-x: auto; margin-bottom: 14px !important; padding-bottom: 4px; scrollbar-width: none; }
    .funnel-tabs::-webkit-scrollbar { display: none; }
    .funnel-tabs > * { flex-shrink: 0; white-space: nowrap; }
    .funnel-head { flex-direction: column; align-items: stretch !important; gap: 10px; }
    .funnel-head .btn-new-lead { width: 100%; justify-content: center; padding: 11px 20px !important; }
    .funnel-tools { align-items: flex-start !important; }
    .funnel-tools-row { justify-content: flex-start !important; flex-wrap: nowrap !important; gap: 5px !important; }
    .funnel-tools-row button { padding: 8px 9px !important; font-size: 11.5px !important; white-space: nowrap; gap: 4px !important; }
    .funnel-addstage { justify-content: flex-start !important; margin-top: 4px !important; }
    .filter-search { max-width: none !important; flex: 1 1 100% !important; }
    .member-head { flex-wrap: wrap; }
    /* Leads: a tabela vira uma lista de cartões */
    .leads-head { display: none !important; }
    .leads-row { display: grid !important; grid-template-columns: 1fr 1fr !important; min-width: 0 !important; padding: 10px 2px; row-gap: 4px; }
    .leads-row > div { min-width: 0; padding: 3px 12px !important; white-space: normal !important; overflow: visible !important; text-overflow: clip !important; overflow-wrap: anywhere; }
    .leads-row > div::before { content: attr(data-label); display: block; font-size: 9.5px; letter-spacing: 0.5px; text-transform: uppercase; opacity: 0.55; margin-bottom: 1px; }
    .leads-row > [data-label="Nome"] { grid-column: 1 / -1; order: -2; font-size: 14px !important; }
    .leads-row > [data-label="Etapa"] { grid-column: 1 / -1; order: -1; }
    .leads-row > [data-label="Nome"]::before, .leads-row > [data-label="Etapa"]::before { display: none; }
    .leads-row > [data-label="Motivo de perda"] { grid-column: 1 / -1; }
    .leads-row > .leads-no-loss { display: none !important; }
  }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
  `;
  return <style>{css}</style>;
}
