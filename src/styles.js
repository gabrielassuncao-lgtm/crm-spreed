export const STAGE_PALETTE = ['#7C93FF', '#9B8CFF', '#C08CFF', '#FF8CC8', '#FFA98C', '#F0CB6E', '#6EDCB0', '#6ED4E8'];
export const WON_COLOR = '#4ADE9A';
export const LOST_COLOR = '#F0685E';

export const DEFAULT_STAGES = ['Lead', 'Contato feito', 'Contato realizado', 'Reunião agendada', 'Reunião realizada', 'No show', 'Follow up', 'Ganho'];

export function fmtMoney(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Converte o valor digitado num número seguro para o banco (nunca string vazia)
export function toNumericOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";

export const colors = {
  bg: '#0A0A0B',
  surface: '#141416',
  surfaceAlt: '#1B1B1E',
  border: '#26262A',
  borderSubtle: '#1E1E21',
  text: '#F2F2F4',
  textDim: '#A1A1A6',
  textFaint: '#6E6E73',
  accent: '#6C6CF2',
  accentSoft: '#6C6CF230',
};

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
  borderRadius: 10, padding: '11px 12px 11px 34px', color: colors.text, fontSize: 14, outline: 'none',
};
export const primaryBtn = {
  background: colors.accent, color: '#fff', border: 'none', borderRadius: 9,
  padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', letterSpacing: 0.1,
};
export const inputPlain = {
  width: '100%', boxSizing: 'border-box', background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
  borderRadius: 9, padding: '10px 11px', color: colors.text, fontSize: 14,
};
export const labelStyle = { fontSize: 11.5, color: colors.textDim, display: 'block', marginBottom: 5, marginTop: 12, fontWeight: 500, letterSpacing: 0.2 };
export const modalTitle = { fontSize: 15.5, fontWeight: 650, margin: '0 0 18px', color: colors.text, letterSpacing: -0.1 };
