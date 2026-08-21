export const STAGE_PALETTE = ['#7C93FF', '#9B8CFF', '#C08CFF', '#FF8CC8', '#FFA98C', '#F0CB6E', '#6EDCB0', '#6ED4E8'];
export const DEFAULT_STAGES = ['Lead', 'Contato feito', 'Contato realizado', 'No show', 'Reunião agendada', 'Reunião realizada', 'Follow up', 'Ganho'];
export const RESPONSIBLE_OPTIONS = ['Gabriel', 'Hanna'];
export const PLAN_OPTIONS = ['Doxa Pro', 'Doxa Base'];
export const DURATION_OPTIONS = ['3 meses', '3+2 meses'];

export function fmtMoney(v) {
  const n = parseFloat(v) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function toNumericOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Tempo decorrido de forma compacta: 5min, 3h, 2d, 3sem, 4m (meses)
export function fmtElapsed(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `${min}min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (days < 30) return `${weeks}sem`;
  const months = Math.floor(days / 30);
  return `${months}m`;
}

export function normalize(str) {
  return (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export const FONT = "-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif";
export const FONT_LOGO = "'Space Grotesk', -apple-system, sans-serif";
