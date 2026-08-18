export const STAGE_PALETTE = ['#60A5FA', '#818CF8', '#A78BFA', '#F472B6', '#FB923C', '#FBBF24', '#34D399', '#22D3EE'];
export const WON_COLOR = '#34D399';
export const LOST_COLOR = '#F87171';
export const DEFAULT_STAGES = ['Lead', 'Contato feito', 'Contato realizado', 'Reunião agendada', 'Reunião realizada', 'No show', 'Follow up', 'Ganho'];

export function fmtMoney(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#1E293B', border: '1px solid #334155',
  borderRadius: 8, padding: '10px 10px 10px 32px', color: '#E2E8F0', fontSize: 14, outline: 'none',
};
export const primaryBtn = {
  background: '#6366F1', color: '#fff', border: 'none', borderRadius: 8,
  padding: '10px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
};
export const inputPlain = {
  width: '100%', boxSizing: 'border-box', background: '#0F172A', border: '1px solid #334155',
  borderRadius: 8, padding: '9px 10px', color: '#E2E8F0', fontSize: 14,
};
export const labelStyle = { fontSize: 12, color: '#94A3B8', display: 'block', marginBottom: 4, marginTop: 10 };
export const modalTitle = { fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#F8FAFC' };
