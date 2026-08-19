import React, { createContext, useContext, useState, useEffect } from 'react';

const THEMES = {
  dark: {
    mode: 'dark',
    bg: '#0A0A0C',
    surface: '#131316',
    surfaceAlt: '#1A1A1E',
    surfaceHover: '#202024',
    border: 'rgba(255,255,255,0.07)',
    borderStrong: 'rgba(255,255,255,0.12)',
    textPrimary: '#F5F5F7',
    textSecondary: '#9B9BA3',
    textMuted: '#6B6B73',
    accent: '#8B7CF6',
    accentSoft: 'rgba(139,124,246,0.14)',
    accentText: '#FFFFFF',
    won: '#6EDBA8',
    wonSoft: 'rgba(110,219,168,0.12)',
    lost: '#E08585',
    lostSoft: 'rgba(224,133,133,0.12)',
    shadow: '0 1px 2px rgba(0,0,0,0.3), 0 6px 20px rgba(0,0,0,0.25)',
    shadowSm: '0 1px 2px rgba(0,0,0,0.2)',
    overlay: 'rgba(0,0,0,0.6)',
  },
  light: {
    mode: 'light',
    bg: '#FAFAFA',
    surface: '#FFFFFF',
    surfaceAlt: '#F3F3F5',
    surfaceHover: '#EBEBEE',
    border: 'rgba(0,0,0,0.13)',
    borderStrong: 'rgba(0,0,0,0.20)',
    textPrimary: '#18181B',
    textSecondary: '#6B6B73',
    textMuted: '#9B9BA3',
    accent: '#7C6AE8',
    accentSoft: 'rgba(124,106,232,0.10)',
    accentText: '#FFFFFF',
    won: '#2E9E6B',
    wonSoft: 'rgba(46,158,107,0.10)',
    lost: '#D64545',
    lostSoft: 'rgba(214,69,69,0.10)',
    shadow: '0 1px 2px rgba(16,16,20,0.04), 0 6px 20px rgba(16,16,20,0.06)',
    shadowSm: '0 1px 2px rgba(16,16,20,0.04)',
    overlay: 'rgba(20,20,24,0.4)',
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
