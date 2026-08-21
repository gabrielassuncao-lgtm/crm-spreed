import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, LogOut, Users, GitBranch, BarChart3,
  Phone, Mail, Tag, Filter, DollarSign, TrendingUp, UserCircle2, AlertCircle,
  GripVertical, Sun, Moon, CreditCard, CalendarClock, Wallet, Settings2
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import AuthScreen from './AuthScreen';
import { useTheme } from './theme.jsx';
import {
  STAGE_PALETTE, DEFAULT_STAGES, RESPONSIBLE_OPTIONS, PLAN_OPTIONS, DURATION_OPTIONS,
  fmtMoney, toNumericOrNull, normalize, fmtDate, fmtElapsed, FONT, FONT_LOGO,
} from './styles';

export default function App() {
  const { theme, mode, toggle } = useTheme();
  const [session, setSession] = useState(undefined);
  const [funnels, setFunnels] = useState([]);
  const [stages, setStages] = useState([]);
  const [cards, setCards] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [lossReasons, setLossReasons] = useState([]);
  const [tab, setTab] = useState('funis');
  const [activeFunnelId, setActiveFunnelId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showOriginsModal, setShowOriginsModal] = useState(false);
  const [showReasonsModal, setShowReasonsModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    loadAll();
    const channel = supabase
      .channel('crm-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'funnels' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stages' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cards' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'origins' }, loadAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loss_reasons' }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadAll() {
    const [{ data: f }, { data: s }, { data: c }, { data: o }, { data: lr }] = await Promise.all([
      supabase.from('funnels').select('*').order('created_at'),
      supabase.from('stages').select('*').order('position'),
      supabase.from('cards').select('*').order('created_at', { ascending: false }),
      supabase.from('origins').select('*').order('name'),
      supabase.from('loss_reasons').select('*').order('name'),
    ]);
    setFunnels(f || []);
    setStages(s || []);
    setCards(c || []);
    setOrigins(o || []);
    setLossReasons(lr || []);
    setActiveFunnelId(prev => prev || (f && f[0]?.id) || null);
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  // Atualiza o card na tela na hora (sem esperar o banco), evitando o "piscar".
  function updateCardLocal(id, patch) {
    setCards(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }

  // Reordena as etapas de um funil na tela na hora, e salva a nova ordem em segundo plano.
  function reorderStages(funnelId, orderedIds) {
    setStages(prev => {
      const others = prev.filter(s => s.funnel_id !== funnelId);
      const byId = Object.fromEntries(prev.filter(s => s.funnel_id === funnelId).map(s => [s.id, s]));
      const updated = orderedIds.map((id, i) => ({ ...byId[id], position: i }));
      return [...others, ...updated];
    });
    orderedIds.forEach((id, i) => {
      supabase.from('stages').update({ position: i }).eq('id', id).then(({ error }) => {
        if (error) showToast('Erro ao salvar ordem das etapas.', 'error');
      });
    });
  }

  async function addOrigin(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (origins.some(o => o.name.toLowerCase() === trimmed.toLowerCase())) { showToast('Essa origem já existe.', 'error'); return; }
    const tempId = 'temp-' + Date.now();
    setOrigins(prev => [...prev, { id: tempId, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
    const { data, error } = await supabase.from('origins').insert({ name: trimmed }).select().single();
    if (error) {
      setOrigins(prev => prev.filter(o => o.id !== tempId));
      showToast('Erro ao criar origem: ' + error.message, 'error');
      return;
    }
    setOrigins(prev => prev.map(o => (o.id === tempId ? data : o)));
  }

  async function deleteOrigin(id) {
    const prev = origins;
    setOrigins(o => o.filter(x => x.id !== id));
    const { error } = await supabase.from('origins').delete().eq('id', id);
    if (error) { setOrigins(prev); showToast('Erro ao excluir origem: ' + error.message, 'error'); }
  }

  async function addLossReason(name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (lossReasons.some(r => r.name.toLowerCase() === trimmed.toLowerCase())) { showToast('Esse motivo já existe.', 'error'); return; }
    const tempId = 'temp-' + Date.now();
    setLossReasons(prev => [...prev, { id: tempId, name: trimmed }].sort((a, b) => a.name.localeCompare(b.name)));
    const { data, error } = await supabase.from('loss_reasons').insert({ name: trimmed }).select().single();
    if (error) {
      setLossReasons(prev => prev.filter(r => r.id !== tempId));
      showToast('Erro ao criar motivo: ' + error.message, 'error');
      return;
    }
    setLossReasons(prev => prev.map(r => (r.id === tempId ? data : r)));
  }

  async function deleteLossReason(id) {
    const prev = lossReasons;
    setLossReasons(r => r.filter(x => x.id !== id));
    const { error } = await supabase.from('loss_reasons').delete().eq('id', id);
    if (error) { setLossReasons(prev); showToast('Erro ao excluir motivo: ' + error.message, 'error'); }
  }

  function updateWonFields(funnelId, fields) {
    setFunnels(prev => prev.map(f => (f.id === funnelId ? { ...f, won_fields: fields } : f)));
    supabase.from('funnels').update({ won_fields: fields }).eq('id', funnelId).then(({ error }) => {
      if (error) showToast('Erro ao salvar campos: ' + error.message, 'error');
    });
  }

  if (session === undefined) return <Shell><Centered>Carregando...</Centered></Shell>;
  if (!session) return <Shell><AuthScreen /></Shell>;

  const funnelsWithStages = funnels.map(f => ({
    ...f,
    stages: stages.filter(s => s.funnel_id === f.id).sort((a, b) => a.position - b.position),
  }));
  const activeFunnel = funnelsWithStages.find(f => f.id === activeFunnelId) || null;

  const originNames = origins.map(o => o.name).sort((a, b) => a.localeCompare(b));
  const reasonNames = lossReasons.map(r => r.name).sort((a, b) => a.localeCompare(b));

  return (
    <Shell>
      <TopBar email={session.user.email} onLogout={() => supabase.auth.signOut()} tab={tab} setTab={setTab} mode={mode} toggle={toggle} onManageOrigins={() => setShowOriginsModal(true)} onManageReasons={() => setShowReasonsModal(true)} />
      {toast && <Toast toast={toast} />}
      <div style={{ padding: '18px 22px 36px' }}>
        {tab === 'funis' && (
          <FunisTab
            funnels={funnelsWithStages}
            cards={cards}
            origins={originNames}
            onAddOrigin={addOrigin}
            reasons={reasonNames}
            onAddReason={addLossReason}
            onUpdateWonFields={updateWonFields}
            activeFunnelId={activeFunnelId}
            setActiveFunnelId={setActiveFunnelId}
            showToast={showToast}
            reload={loadAll}
            updateCardLocal={updateCardLocal}
            reorderStages={reorderStages}
          />
        )}
        {tab === 'leads' && <LeadsTab funnels={funnelsWithStages} cards={cards} origins={originNames} />}
        {tab === 'relatorios' && <RelatoriosTab funnels={funnelsWithStages} cards={cards} origins={originNames} />}
      </div>
      {showOriginsModal && (
        <ReasonsModal title="Origens" hint="Crie e remova origens. Elas continuam existindo mesmo sem nenhum lead associado." items={origins} onAdd={addOrigin} onDelete={deleteOrigin} onClose={() => setShowOriginsModal(false)} placeholder="Nova origem (ex: Instagram)" />
      )}
      {showReasonsModal && (
        <ReasonsModal title="Motivos de perda" hint="Crie e remova motivos usados ao marcar um lead como perdido." items={lossReasons} onAdd={addLossReason} onDelete={deleteLossReason} onClose={() => setShowReasonsModal(false)} />
      )}
    </Shell>
  );
}

function Shell({ children }) {
  const { theme } = useTheme();
  return (
    <div style={{ fontFamily: FONT, background: theme.bg, color: theme.textPrimary, minHeight: '100vh', transition: 'background .2s' }}>
      {children}
    </div>
  );
}
function Centered({ children }) {
  const { theme } = useTheme();
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: theme.textMuted, fontSize: 14 }}>{children}</div>;
}
function Toast({ toast }) {
  const { theme } = useTheme();
  const isErr = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)',
      background: theme.surfaceAlt, color: isErr ? theme.lost : theme.textPrimary, padding: '10px 18px', borderRadius: 10,
      fontSize: 13, zIndex: 200, border: `1px solid ${isErr ? theme.lost + '55' : theme.border}`, boxShadow: theme.shadow,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {isErr && <AlertCircle size={14} />}
      {toast.msg}
    </div>
  );
}

/* ---------- TOP BAR ---------- */
function TopBar({ email, onLogout, tab, setTab, mode, toggle, onManageOrigins, onManageReasons }) {
  const { theme } = useTheme();
  const tabs = [
    { id: 'funis', label: 'Funis', icon: GitBranch },
    { id: 'leads', label: 'Leads/Clientes', icon: Users },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  ];
  return (
    <div style={{ borderBottom: `1px solid ${theme.border}`, padding: '18px 22px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
          <span style={{ fontSize: 29, fontWeight: 700, color: theme.textPrimary, fontFamily: FONT_LOGO, letterSpacing: -0.5 }}>
            CRM <span style={{ color: theme.accent }}>DOXA</span>
          </span>
          <span style={{ fontSize: 14, fontWeight: 500, color: theme.textMuted, marginLeft: 8, fontFamily: FONT_LOGO }}>
            — Matriz
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onManageOrigins} title="Gerenciar origens" style={{
            background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, height: 30, padding: '0 10px',
            display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, cursor: 'pointer', fontSize: 12,
          }}>
            <Settings2 size={13} /> Origens
          </button>
          <button onClick={onManageReasons} title="Gerenciar motivos de perda" style={{
            background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, height: 30, padding: '0 10px',
            display: 'flex', alignItems: 'center', gap: 6, color: theme.textSecondary, cursor: 'pointer', fontSize: 12,
          }}>
            <Settings2 size={13} /> Motivos
          </button>
          <button onClick={toggle} title="Mudar tema" style={{
            background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, width: 30, height: 30,
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: theme.textSecondary, cursor: 'pointer',
          }}>
            {mode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <span style={{ fontSize: 12, color: theme.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
            <UserCircle2 size={14} /> {email}
          </span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
            <LogOut size={13} /> Sair
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer',
              padding: '9px 13px', fontSize: 13, fontWeight: 550, color: active ? theme.textPrimary : theme.textMuted,
              borderBottom: active ? `2px solid ${theme.accent}` : '2px solid transparent', transition: 'color .15s',
            }}>
              <Icon size={13.5} /> {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- FUNIS TAB ---------- */
function FunisTab({ funnels, cards, origins, onAddOrigin, reasons, onAddReason, onUpdateWonFields, activeFunnelId, setActiveFunnelId, showToast, reload, updateCardLocal, reorderStages }) {
  const { theme } = useTheme();
  const [showNewFunnel, setShowNewFunnel] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelStages, setNewFunnelStages] = useState(DEFAULT_STAGES.join('\n'));

  const inputPlain = { width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '10px 11px', color: theme.textPrimary, fontSize: 14 };
  const labelStyle = { fontSize: 11.5, color: theme.textSecondary, display: 'block', marginBottom: 5, marginTop: 12, fontWeight: 500 };
  const modalTitle = { fontSize: 15.5, fontWeight: 650, margin: '0 0 18px', color: theme.textPrimary };
  const primaryBtn = { background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };

  const activeFunnel = funnels.find(f => f.id === activeFunnelId);

  async function createFunnel() {
    if (!newFunnelName.trim()) return;
    const stageNames = newFunnelStages.split('\n').map(s => s.trim()).filter(Boolean);
    const { data: funnel, error } = await supabase.from('funnels').insert({ name: newFunnelName.trim() }).select().single();
    if (error) { showToast('Erro ao criar funil: ' + error.message, 'error'); return; }
    const stageRows = stageNames.map((name, i) => ({
      funnel_id: funnel.id, name, color: STAGE_PALETTE[i % STAGE_PALETTE.length], position: i,
    }));
    const { error: stageErr } = await supabase.from('stages').insert(stageRows);
    if (stageErr) { showToast('Erro ao criar etapas: ' + stageErr.message, 'error'); return; }
    await reload();
    setActiveFunnelId(funnel.id);
    setShowNewFunnel(false);
    setNewFunnelName('');
    setNewFunnelStages(DEFAULT_STAGES.join('\n'));
    showToast('Funil criado.');
  }

  async function deleteFunnel(id) {
    const { error } = await supabase.from('funnels').delete().eq('id', id);
    if (error) { showToast('Erro ao excluir: ' + error.message, 'error'); return; }
    await reload();
    if (activeFunnelId === id) setActiveFunnelId(null);
    showToast('Funil excluído.');
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        {funnels.map(f => (
          <button key={f.id} onClick={() => setActiveFunnelId(f.id)} style={{
            background: f.id === activeFunnelId ? theme.accent : theme.surfaceAlt,
            color: f.id === activeFunnelId ? theme.accentText : theme.textSecondary,
            border: `1px solid ${f.id === activeFunnelId ? theme.accent : theme.border}`,
            borderRadius: 18, padding: '7px 15px', fontSize: 12.5, fontWeight: 550, cursor: 'pointer',
          }}>
            {f.name}
          </button>
        ))}
        <button onClick={() => setShowNewFunnel(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${theme.border}`,
          color: theme.textSecondary, borderRadius: 18, padding: '7px 15px', fontSize: 12.5, cursor: 'pointer',
        }}>
          <Plus size={13} /> Novo funil
        </button>
      </div>

      {activeFunnel ? (
        <FunnelBoard funnel={activeFunnel} allCards={cards} origins={origins} onAddOrigin={onAddOrigin} reasons={reasons} onAddReason={onAddReason} onUpdateWonFields={onUpdateWonFields} reload={reload} onDeleteFunnel={() => deleteFunnel(activeFunnel.id)} showToast={showToast} updateCardLocal={updateCardLocal} reorderStages={reorderStages} />
      ) : (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: theme.textMuted, fontSize: 13.5 }}>
          Nenhum funil ainda. Crie o primeiro para começar.
        </div>
      )}

      {showNewFunnel && (
        <Modal onClose={() => setShowNewFunnel(false)}>
          <h2 style={modalTitle}>Novo funil</h2>
          <label style={labelStyle}>Nome do funil</label>
          <input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Ex: Funil comercial" style={inputPlain} />
          <label style={labelStyle}>Etapas (uma por linha, na ordem — dá pra reordenar depois)</label>
          <textarea value={newFunnelStages} onChange={e => setNewFunnelStages(e.target.value)} rows={8} style={{ ...inputPlain, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }} />
          <button onClick={createFunnel} style={{ ...primaryBtn, width: '100%', marginTop: 16 }}>Criar funil</button>
        </Modal>
      )}
    </div>
  );
}

function FunnelBoard({ funnel, allCards, origins, onAddOrigin, reasons, onAddReason, onUpdateWonFields, reload, onDeleteFunnel, showToast, updateCardLocal, reorderStages }) {
  const { theme } = useTheme();
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [targetStageId, setTargetStageId] = useState(funnel.stages[0]?.id);
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [search, setSearch] = useState('');
  const [viewStatus, setViewStatus] = useState('active'); // active | lost | all
  const [dragCardId, setDragCardId] = useState(null);
  const [dragOverStageId, setDragOverStageId] = useState(null);
  const [draggingStageId, setDraggingStageId] = useState(null);
  const [confirmDeleteFunnel, setConfirmDeleteFunnel] = useState(false);
  const [showLostPrompt, setShowLostPrompt] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);

  const primaryBtn = { background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };

  const funnelCards = allCards.filter(c => c.funnel_id === funnel.id);
  const activeCards = funnelCards.filter(c => c.status !== 'lost');
  const lostCards = funnelCards.filter(c => c.status === 'lost');

  const responsibles = [...new Set(funnelCards.map(c => c.responsible).filter(Boolean))];

  const visibleCards = activeCards.filter(c =>
    (filterOrigin === 'all' || c.origin === filterOrigin) &&
    (filterResponsible === 'all' || c.responsible === filterResponsible) &&
    ((c.name || '') + (c.email || '') + (c.phone || '')).toLowerCase().includes(search.toLowerCase())
  );

  const wonStage = funnel.stages[funnel.stages.length - 1];
  const wonTotal = visibleCards.filter(c => c.stage_id === wonStage?.id).reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);

  // Conversão do funil, já considerando os filtros de origem/responsável ativos acima.
  const filteredAllStatus = funnelCards.filter(c =>
    (filterOrigin === 'all' || c.origin === filterOrigin) &&
    (filterResponsible === 'all' || c.responsible === filterResponsible)
  );
  const wonCount = filteredAllStatus.filter(c => c.status !== 'lost' && c.stage_id === wonStage?.id).length;
  const conversionTotal = filteredAllStatus.length > 0 ? (wonCount / filteredAllStatus.length) * 100 : 0;
  const meetingStage = funnel.stages.find(s => normalize(s.name).includes('reuniao') && normalize(s.name).includes('realizada'));
  let conversionMeeting = null;
  if (meetingStage) {
    const reached = filteredAllStatus.filter(c => c.status !== 'lost' && (c.stage_id === meetingStage.id || c.stage_id === wonStage?.id));
    conversionMeeting = reached.length > 0 ? (reached.filter(c => c.stage_id === wonStage?.id).length / reached.length) * 100 : null;
  }

  function openNewCard(stageId) { setEditingCard(null); setTargetStageId(stageId); setShowCardModal(true); }
  function openEditCard(card) { setEditingCard(card); setTargetStageId(card.stage_id); setShowCardModal(true); }

  function dropStageOn(targetStage) {
    if (!draggingStageId || draggingStageId === targetStage.id) { setDraggingStageId(null); return; }
    const sorted = [...funnel.stages].sort((a, b) => a.position - b.position);
    const fromIdx = sorted.findIndex(s => s.id === draggingStageId);
    const toIdx = sorted.findIndex(s => s.id === targetStage.id);
    if (fromIdx === -1 || toIdx === -1) { setDraggingStageId(null); return; }
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    reorderStages(funnel.id, reordered.map(s => s.id));
    setDraggingStageId(null);
  }

  async function saveCard(data) {
    const stageChanged = !editingCard || editingCard.stage_id !== targetStageId;
    const payload = {
      name: data.name.trim(),
      phone: data.phone || null,
      email: data.email || null,
      origin: data.origin || null,
      responsible: data.responsible || null,
      notes: data.notes || null,
      value: toNumericOrNull(data.value),
      won_data: data.wonData || {},
      stage_id: targetStageId,
      funnel_id: funnel.id,
    };
    if (stageChanged) payload.stage_changed_at = new Date().toISOString();
    let error;
    if (editingCard) {
      ({ error } = await supabase.from('cards').update(payload).eq('id', editingCard.id));
    } else {
      ({ error } = await supabase.from('cards').insert({ ...payload, status: 'active', stage_changed_at: new Date().toISOString() }));
    }
    if (error) { showToast('Não salvou: ' + error.message, 'error'); return; }
    await reload();
    setShowCardModal(false);
    showToast('Salvo.');
  }

  async function markLost(cardId, reason) {
    const { error } = await supabase.from('cards').update({ status: 'lost', loss_reason: reason || null }).eq('id', cardId);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    await reload();
    setShowCardModal(false);
    setShowLostPrompt(false);
    showToast('Card marcado como perdido.');
  }
  async function restoreCard(cardId) {
    const { error } = await supabase.from('cards').update({ status: 'active' }).eq('id', cardId);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    await reload();
    showToast('Card restaurado ao pipeline.');
  }
  async function deleteCard(cardId) {
    const { error } = await supabase.from('cards').delete().eq('id', cardId);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    await reload();
    setShowCardModal(false);
    showToast('Card excluído.');
  }
  function onDropStage(stageId) {
    setDragOverStageId(null);
    if (!dragCardId) return;
    const id = dragCardId;
    setDragCardId(null);
    const now = new Date().toISOString();
    updateCardLocal(id, { stage_id: stageId, status: 'active', stage_changed_at: now });
    supabase.from('cards').update({ stage_id: stageId, status: 'active', stage_changed_at: now }).eq('id', id).then(({ error }) => {
      if (error) showToast('Erro ao mover: ' + error.message, 'error');
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <button onClick={() => openNewCard(funnel.stages[0]?.id)} style={{
          ...primaryBtn, display: 'flex', alignItems: 'center', gap: 7, textTransform: 'uppercase', letterSpacing: 0.4, fontSize: 12.5,
        }}>
          <Plus size={14} /> Novo lead
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowFieldsModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1px solid ${theme.border}`, color: theme.textSecondary, borderRadius: 9, padding: '8px 12px', cursor: 'pointer', fontSize: 12.5 }}>
            <Settings2 size={13} /> Campos de ganho
          </button>
          <button onClick={() => setConfirmDeleteFunnel(true)} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 9, padding: '8px 11px', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '6px 11px', maxWidth: 240, flex: '1 1 180px' }}>
          <Filter size={12} color={theme.textMuted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar lead" style={{ background: 'transparent', border: 'none', outline: 'none', color: theme.textPrimary, fontSize: 12.5, width: '100%' }} />
        </div>
        <SelectFilter icon={<Tag size={12} />} value={filterOrigin} onChange={setFilterOrigin} options={origins} placeholder="Todas as origens" />
        <SelectFilter icon={<UserCircle2 size={12} />} value={filterResponsible} onChange={setFilterResponsible} options={responsibles} placeholder="Todos os responsáveis" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '6px 11px' }}>
          <span style={{ fontSize: 12, color: theme.textMuted }}>Ver:</span>
          <select value={viewStatus} onChange={e => setViewStatus(e.target.value)} style={{ background: 'transparent', border: 'none', color: theme.textSecondary, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            <option value="active">Ativos</option>
            <option value="lost">Perdidos</option>
            <option value="all">Todos</option>
          </select>
        </div>
      </div>

      {viewStatus !== 'lost' && (
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {funnel.stages.map((stage, idx) => {
          const stageCards = visibleCards.filter(c => c.stage_id === stage.id);
          const isWon = stage.id === wonStage?.id;
          const isDragOver = dragOverStageId === stage.id;
          const isStageDragging = draggingStageId === stage.id;
          return (
            <div
              key={stage.id}
              onDragOver={e => { e.preventDefault(); if (dragOverStageId !== stage.id) setDragOverStageId(stage.id); }}
              onDragLeave={() => setDragOverStageId(prev => (prev === stage.id ? null : prev))}
              onDrop={() => { if (draggingStageId) dropStageOn(stage); else onDropStage(stage.id); }}
              style={{
                minWidth: 226, width: 226, flexShrink: 0,
                background: isWon ? theme.wonSoft : theme.surface,
                border: `1.5px solid ${isDragOver ? theme.accent : isWon ? theme.won + '70' : theme.border}`,
                borderRadius: 12, padding: 11, opacity: isStageDragging ? 0.4 : 1,
                transition: 'border-color .12s, box-shadow .12s, opacity .12s',
                boxShadow: isDragOver ? `0 0 0 3px ${theme.accentSoft}` : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, padding: '2px 3px' }}>
                <div
                  draggable
                  onDragStart={e => { e.stopPropagation(); setDraggingStageId(stage.id); }}
                  onDragEnd={() => setDraggingStageId(null)}
                  title="Arraste para reordenar"
                  style={{ cursor: 'grab', color: theme.textMuted, display: 'flex', alignItems: 'center' }}
                >
                  <GripVertical size={13} />
                </div>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: stage.color, flexShrink: 0 }} />
                <span style={{
                  fontSize: 12.5, fontWeight: 700, color: isWon ? theme.won : theme.textSecondary, flex: 1,
                  letterSpacing: 0.4, textTransform: 'uppercase',
                }}>{stage.name}</span>
                <span style={{ fontSize: 11, color: theme.textMuted }}>{stageCards.length}</span>
              </div>
              {isWon && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  <ConversionBar label="Conversão total" value={conversionTotal} color={theme.accent} theme={theme} compact />
                  <ConversionBar label="Reunião realizada" value={conversionMeeting} color={theme.won} theme={theme} compact />
                  <div style={{ fontSize: 12, color: theme.won, fontWeight: 650, padding: '6px 8px', background: theme.surface, borderRadius: 8 }}>
                    Total: {fmtMoney(wonTotal)}
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 40, maxHeight: 460, overflowY: 'auto', paddingRight: 2 }}>
                {stageCards.map(card => (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={e => { setDragCardId(card.id); e.dataTransfer.effectAllowed = 'move'; }}
                    onDragEnd={() => { setDragCardId(null); setDragOverStageId(null); }}
                    onClick={() => openEditCard(card)}
                    style={{
                      background: theme.surfaceAlt, borderRadius: 9, padding: '10px 11px', cursor: 'grab', border: `1px solid ${theme.border}`,
                      opacity: dragCardId === card.id ? 0.35 : 1, transform: dragCardId === card.id ? 'scale(0.97)' : 'scale(1)',
                      transition: 'opacity .12s, transform .12s, box-shadow .12s', boxShadow: theme.shadowSm,
                      position: 'relative',
                    }}
                    onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing'; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginBottom: 3, paddingRight: 26 }}>{card.name}</div>
                    {card.origin && <div style={{ fontSize: 11, color: theme.accent, marginBottom: 3 }}>{card.origin}</div>}
                    <div style={{ fontSize: 11, color: theme.textMuted }}>{card.responsible}</div>
                    {isWon && card.value != null && <div style={{ fontSize: 12, color: theme.won, fontWeight: 650, marginTop: 5 }}>{fmtMoney(card.value)}</div>}
                    {isWon && card.won_data && Object.values(card.won_data).some(Boolean) && (
                      <div style={{ fontSize: 10.5, color: theme.textMuted, marginTop: 2 }}>{Object.values(card.won_data).filter(Boolean).join(' · ')}</div>
                    )}
                    <span title="Tempo nessa etapa" style={{ position: 'absolute', bottom: 7, right: 9, fontSize: 9.5, color: theme.textMuted, fontWeight: 600 }}>
                      {fmtElapsed(card.stage_changed_at || card.created_at)}
                    </span>
                  </div>
                ))}
              </div>
              <button onClick={() => openNewCard(stage.id)} style={{
                width: '100%', marginTop: 9, background: 'none', border: 'none', color: theme.textMuted,
                padding: '6px', fontSize: 11.5, cursor: 'pointer', textAlign: 'left',
              }}>
                + adicionar
              </button>
            </div>
          );
        })}
      </div>
      )}

      {viewStatus !== 'active' && lostCards.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginBottom: 10 }}>Perdidos ({lostCards.length})</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lostCards.map(card => (
              <div key={card.id} style={{ background: theme.lostSoft, border: `1px solid ${theme.lost}30`, borderRadius: 9, padding: '9px 11px', minWidth: 180 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.lost, marginBottom: 2 }}>{card.name}</div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 7 }}>{card.origin} · {card.responsible}</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <button onClick={() => restoreCard(card.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: theme.accent, cursor: 'pointer', padding: 0 }}>Restaurar</button>
                  <ConfirmDeleteLink onConfirm={() => deleteCard(card.id)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewStatus !== 'active' && lostCards.length === 0 && (
        <div style={{ marginTop: 26, textAlign: 'center', padding: '32px 16px', color: theme.textMuted, fontSize: 13 }}>
          Nenhum card perdido nesse funil.
        </div>
      )}

      {showCardModal && (
        <CardModal card={editingCard} stages={funnel.stages} origins={origins} onAddOrigin={onAddOrigin} targetStageId={targetStageId} setTargetStageId={setTargetStageId} isWonStage={targetStageId === wonStage?.id} wonFields={funnel.won_fields} onSave={saveCard} onClose={() => setShowCardModal(false)} onMarkLost={editingCard ? () => { setShowCardModal(false); setShowLostPrompt(true); } : null} onDelete={editingCard ? () => deleteCard(editingCard.id) : null} />
      )}

      {showLostPrompt && editingCard && (
        <LostReasonModal reasons={reasons} onAdd={onAddReason} onConfirm={reason => markLost(editingCard.id, reason)} onClose={() => setShowLostPrompt(false)} />
      )}

      {showFieldsModal && (
        <WonFieldsModal
          fields={funnel.won_fields || []}
          onSave={fields => onUpdateWonFields(funnel.id, fields)}
          onClose={() => setShowFieldsModal(false)}
        />
      )}

      {confirmDeleteFunnel && (
        <Modal onClose={() => setConfirmDeleteFunnel(false)}>
          <h2 style={{ fontSize: 15.5, fontWeight: 650, margin: '0 0 18px', color: theme.textPrimary }}>Excluir funil "{funnel.name}"?</h2>
          <p style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 20, lineHeight: 1.5 }}>Todos os cards desse funil também serão excluídos. Essa ação não pode ser desfeita.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmDeleteFunnel(false)} style={{ flex: 1, background: theme.surfaceAlt, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '10px', fontSize: 13.5, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={onDeleteFunnel} style={{ flex: 1, background: theme.lostSoft, color: theme.lost, border: 'none', borderRadius: 9, padding: '10px', fontSize: 13.5, cursor: 'pointer' }}>Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ConversionBar({ label, value, color, theme, compact }) {
  const hasValue = value != null;
  const pct = hasValue ? Math.round(value * 10) / 10 : 0;
  return (
    <div style={{
      background: compact ? 'transparent' : theme.surface, border: compact ? 'none' : `1px solid ${theme.border}`,
      borderRadius: compact ? 0 : 10, padding: compact ? '0' : '10px 14px',
      minWidth: compact ? 'auto' : 200, flex: compact ? 'none' : '1 1 220px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: compact ? 10.5 : 11.5, color: theme.textSecondary, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ fontWeight: 700, color: theme.textPrimary }}>{hasValue ? pct + '%' : '—'}</span>
      </div>
      <div style={{ height: compact ? 4 : 5, background: theme.surfaceAlt, borderRadius: 3 }}>
        <div style={{ height: compact ? 4 : 5, width: `${hasValue ? pct : 0}%`, background: color, borderRadius: 3, transition: 'width .2s' }} />
      </div>
    </div>
  );
}

function SelectFilter({ icon, value, onChange, options, placeholder }) {
  const { theme } = useTheme();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '6px 11px' }}>
      {icon}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'transparent', border: 'none', color: theme.textSecondary, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
        <option value="all">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CardModal({ card, stages, origins, onAddOrigin, targetStageId, setTargetStageId, isWonStage, wonFields, onSave, onClose, onMarkLost, onDelete }) {
  const { theme } = useTheme();
  const inputPlain = { width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '10px 11px', color: theme.textPrimary, fontSize: 14 };
  const labelStyle = { fontSize: 11.5, color: theme.textSecondary, display: 'block', marginBottom: 5, marginTop: 12, fontWeight: 500 };
  const modalTitle = { fontSize: 15.5, fontWeight: 650, margin: '0 0 18px', color: theme.textPrimary };
  const primaryBtn = { background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };

  const [form, setForm] = useState({
    name: card?.name || '', phone: card?.phone || '', email: card?.email || '',
    origin: card?.origin || '', responsible: card?.responsible || '', notes: card?.notes || '', value: card?.value ?? '',
    wonData: card?.won_data || {},
  });
  const [err, setErr] = useState('');
  const [addingOrigin, setAddingOrigin] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newOrigin, setNewOrigin] = useState('');

  function submit() {
    if (!form.name.trim()) { setErr('Nome é obrigatório.'); return; }
    onSave(form);
  }

  function confirmNewOrigin() {
    const trimmed = newOrigin.trim();
    if (!trimmed) { setAddingOrigin(false); return; }
    onAddOrigin(trimmed);
    setForm(f => ({ ...f, origin: trimmed }));
    setNewOrigin('');
    setAddingOrigin(false);
  }

  function setWonField(id, value) {
    setForm(f => ({ ...f, wonData: { ...f.wonData, [id]: value } }));
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={modalTitle}>{card ? 'Editar lead' : 'Novo lead'}</h2>
      <label style={labelStyle}>Nome</label>
      <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={inputPlain} />
      <label style={labelStyle}>Telefone</label>
      <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={inputPlain} />
      <label style={labelStyle}>E-mail</label>
      <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputPlain} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label style={{ ...labelStyle, marginTop: 12 }}>Origem</label>
        {!addingOrigin && (
          <span onClick={() => setAddingOrigin(true)} style={{ fontSize: 11, color: theme.accent, cursor: 'pointer', fontWeight: 600 }}>
            + nova origem
          </span>
        )}
      </div>
      {addingOrigin ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            autoFocus
            value={newOrigin}
            onChange={e => setNewOrigin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmNewOrigin()}
            placeholder="Nome da nova origem"
            style={inputPlain}
          />
          <button onClick={confirmNewOrigin} style={{ background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>OK</button>
        </div>
      ) : (
        <select value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} style={inputPlain}>
          <option value="">Selecione</option>
          {origins.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      )}

      <label style={labelStyle}>Responsável</label>
      <select value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} style={inputPlain}>
        <option value="">Selecione</option>
        {RESPONSIBLE_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
      <label style={labelStyle}>Observações</label>
      <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Anotações sobre o lead ou a reunião" rows={3} style={{ ...inputPlain, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
      <label style={labelStyle}>Etapa</label>
      <select value={targetStageId} onChange={e => setTargetStageId(e.target.value)} style={inputPlain}>
        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      {isWonStage && (
        <>
          <label style={labelStyle}>Valor da venda</label>
          <input type="number" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0,00" style={inputPlain} />

          {(wonFields || []).map(field => (
            <React.Fragment key={field.id}>
              <label style={labelStyle}>{field.label}</label>
              {field.type === 'select' ? (
                <select value={form.wonData[field.id] || ''} onChange={e => setWonField(field.id, e.target.value)} style={inputPlain}>
                  <option value="">Selecione</option>
                  {(field.options || []).map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input value={form.wonData[field.id] || ''} onChange={e => setWonField(field.id, e.target.value)} style={inputPlain} />
              )}
            </React.Fragment>
          ))}
        </>
      )}
      {err && <div style={{ fontSize: 12.5, color: theme.lost, marginTop: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button onClick={submit} style={{ ...primaryBtn, flex: 1 }}>Salvar</button>
        {onMarkLost && <button onClick={onMarkLost} style={{ background: theme.lostSoft, color: theme.lost, border: 'none', borderRadius: 9, padding: '10px 13px', fontSize: 13, cursor: 'pointer' }}>Marcar perdido</button>}
      </div>
      {onDelete && (
        confirmDelete ? (
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, color: theme.textMuted }}>Excluir esse card?</span>
            <span onClick={onDelete} style={{ fontSize: 12, color: theme.lost, cursor: 'pointer', fontWeight: 700 }}>Sim, excluir</span>
            <span onClick={() => setConfirmDelete(false)} style={{ fontSize: 12, color: theme.accent, cursor: 'pointer' }}>Cancelar</span>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: theme.textMuted, fontSize: 12, cursor: 'pointer' }}>Excluir card</button>
        )
      )}

      {card && (
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ fontSize: 11, color: theme.textMuted }}>Cadastrado em {fmtDate(card.created_at)}</div>
          <div style={{ fontSize: 11, color: theme.textMuted }}>Última movimentação de etapa: {fmtDate(card.stage_changed_at || card.created_at)}</div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- LEADS TAB ---------- */
function LeadsTab({ funnels, cards, origins }) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  function stageOf(card) {
    if (card.status === 'lost') return { name: 'Perdido', color: theme.lost };
    const funnel = funnels.find(f => f.id === card.funnel_id);
    const stage = funnel?.stages.find(s => s.id === card.stage_id);
    return stage ? { name: stage.name, color: stage.color } : { name: '—', color: theme.textMuted };
  }

  let filtered = cards.filter(c =>
    ((c.name || '') + (c.email || '') + (c.phone || '') + (c.origin || '') + (c.responsible || '')).toLowerCase().includes(search.toLowerCase()) &&
    (filterOrigin === 'all' || c.origin === filterOrigin) &&
    (filterStatus === 'all' || (filterStatus === 'lost' ? c.status === 'lost' : c.status !== 'lost'))
  );
  if (sortBy === 'name') filtered = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sortBy === 'origin') filtered = [...filtered].sort((a, b) => (a.origin || '').localeCompare(b.origin || ''));
  else filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const cols = '1fr 1.2fr 1fr 1.3fr 0.9fr 0.9fr 1.1fr';
  const th = { fontSize: 10.5, fontWeight: 700, color: theme.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', padding: '10px 12px' };
  const td = { fontSize: 12.5, color: theme.textSecondary, padding: '11px 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '9px 12px', maxWidth: 260, flex: '1 1 200px' }}>
          <Filter size={13} color={theme.textMuted} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads e clientes" style={{ background: 'transparent', border: 'none', outline: 'none', color: theme.textPrimary, fontSize: 13, width: '100%' }} />
        </div>
        <SelectFilter icon={<Tag size={12} />} value={filterOrigin} onChange={setFilterOrigin} options={origins} placeholder="Todas as origens" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '6px 11px' }}>
          <span style={{ fontSize: 12, color: theme.textMuted }}>Status:</span>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ background: 'transparent', border: 'none', color: theme.textSecondary, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="lost">Perdidos</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '6px 11px' }}>
          <span style={{ fontSize: 12, color: theme.textMuted }}>Ordenar:</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: 'transparent', border: 'none', color: theme.textSecondary, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
            <option value="recent">Mais recentes</option>
            <option value="name">Nome (A-Z)</option>
            <option value="origin">Origem (A-Z)</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: theme.textMuted, fontSize: 13.5 }}>Nenhum lead encontrado.</div>
      ) : (
        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 11, overflow: 'hidden', overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: cols, background: theme.surfaceAlt, borderBottom: `1px solid ${theme.border}`, minWidth: 820 }}>
            <div style={th}>Etapa</div>
            <div style={th}>Nome</div>
            <div style={th}>Telefone</div>
            <div style={th}>E-mail</div>
            <div style={th}>Origem</div>
            <div style={th}>Responsável</div>
            <div style={th}>Motivo</div>
          </div>
          {filtered.map((c, i) => {
            const stage = stageOf(c);
            return (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: cols, background: i % 2 === 0 ? theme.surface : theme.surfaceAlt + '80',
                borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${theme.border}`, minWidth: 820,
              }}>
                <div style={{ ...td }}>
                  <span style={{ fontSize: 10, fontWeight: 650, padding: '3px 8px', borderRadius: 999, background: stage.color + '1E', color: stage.color, whiteSpace: 'nowrap' }}>
                    {stage.name}
                  </span>
                </div>
                <div style={{ ...td, fontWeight: 600, color: theme.textPrimary }}>{c.name}</div>
                <div style={td}>{c.phone || '—'}</div>
                <div style={td}>{c.email || '—'}</div>
                <div style={td}>{c.origin || '—'}</div>
                <div style={td}>{c.responsible || '—'}</div>
                <div style={{ ...td, color: c.status === 'lost' ? theme.lost : theme.textMuted }}>{c.status === 'lost' ? (c.loss_reason || 'Não especificado') : '—'}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- RELATORIOS TAB ---------- */
function RelatoriosTab({ funnels, cards: allCards, origins }) {
  const { theme } = useTheme();
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');


  const cards = allCards.filter(c =>
    (filterResponsible === 'all' || c.responsible === filterResponsible) &&
    (filterOrigin === 'all' || c.origin === filterOrigin)
  );

  const total = cards.length;
  const won = cards.filter(c => {
    const f = funnels.find(fn => fn.id === c.funnel_id);
    const wonStage = f?.stages[f.stages.length - 1];
    return c.status !== 'lost' && c.stage_id === wonStage?.id;
  });
  const lost = cards.filter(c => c.status === 'lost');
  const totalValue = won.reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);
  const conversionTotal = total > 0 ? ((won.length / total) * 100).toFixed(1) : '0';

  // Conversão com base em "reunião realizada": entre quem chegou nessa etapa (ou passou dela, incluindo ganho),
  // quantos foram ganhos.
  let meetingReached = 0;
  let meetingWon = 0;
  funnels.forEach(f => {
    const meetingStage = f.stages.find(s => normalize(s.name).includes('reuniao realizada') || (normalize(s.name).includes('reuniao') && normalize(s.name).includes('realizada')));
    const wonStage = f.stages[f.stages.length - 1];
    if (!meetingStage || !wonStage) return;
    const funnelCards = cards.filter(c => c.funnel_id === f.id && c.status !== 'lost');
    const reached = funnelCards.filter(c => c.stage_id === meetingStage.id || c.stage_id === wonStage.id);
    meetingReached += reached.length;
    meetingWon += reached.filter(c => c.stage_id === wonStage.id).length;
  });
  const conversionMeeting = meetingReached > 0 ? ((meetingWon / meetingReached) * 100).toFixed(1) : null;

  const byOrigin = {};
  cards.forEach(c => { if (c.origin) byOrigin[c.origin] = (byOrigin[c.origin] || 0) + 1; });
  const byResponsible = {};
  cards.forEach(c => { if (c.responsible) byResponsible[c.responsible] = (byResponsible[c.responsible] || 0) + 1; });

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <SelectFilter icon={<UserCircle2 size={12} />} value={filterResponsible} onChange={setFilterResponsible} options={RESPONSIBLE_OPTIONS} placeholder="Todos os responsáveis" />
        <SelectFilter icon={<Tag size={12} />} value={filterOrigin} onChange={setFilterOrigin} options={origins} placeholder="Todas as origens" />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 26 }}>
        <StatCard icon={<Users size={15} />} label="Total de leads" value={total} />
        <StatCard icon={<TrendingUp size={15} />} label="Conversão total" value={conversionTotal + '%'} />
        <StatCard icon={<TrendingUp size={15} />} label="Conversão (reunião realizada)" value={conversionMeeting != null ? conversionMeeting + '%' : '—'} />
        <StatCard icon={<DollarSign size={15} />} label="Valor ganho" value={fmtMoney(totalValue)} color={theme.won} />
        <StatCard icon={<X size={15} />} label="Perdidos" value={lost.length} color={theme.lost} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <BreakdownCard title="Por origem" data={byOrigin} />
        <BreakdownCard title="Por responsável" data={byResponsible} />
      </div>
    </div>
  );
}
function StatCard({ icon, label, value, color }) {
  const { theme } = useTheme();
  return (
    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 11, padding: '15px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: color || theme.accent, display: 'flex' }}>{icon}</span>
        <span style={{ fontSize: 12.5, fontWeight: 650, color: theme.textPrimary }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: theme.textPrimary, letterSpacing: -0.3 }}>{value}</div>
    </div>
  );
}
function BreakdownCard({ title, data }) {
  const { theme } = useTheme();
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  return (
    <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 11, padding: 17 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.textPrimary, marginBottom: 14 }}>{title}</div>
      {entries.length === 0 ? (
        <div style={{ fontSize: 12, color: theme.textMuted }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(([k, v]) => (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: theme.textSecondary, marginBottom: 4 }}><span>{k}</span><span>{v}</span></div>
              <div style={{ height: 4, background: theme.surfaceAlt, borderRadius: 3 }}>
                <div style={{ height: 4, width: `${(v / max) * 100}%`, background: theme.accent, borderRadius: 3 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- SHARED MODAL ---------- */
function ConfirmDeleteButton({ onConfirm, size = 14 }) {
  const { theme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span onClick={() => { onConfirm(); setConfirming(false); }} style={{ fontSize: 11, color: theme.lost, cursor: 'pointer', fontWeight: 700 }}>Excluir</span>
        <span onClick={() => setConfirming(false)} style={{ fontSize: 11, color: theme.textMuted, cursor: 'pointer' }}>Cancelar</span>
      </div>
    );
  }
  return (
    <button onClick={() => setConfirming(true)} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 2, display: 'flex' }}>
      <Trash2 size={size} />
    </button>
  );
}

function ConfirmDeleteLink({ onConfirm }) {
  const { theme } = useTheme();
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <>
        <span onClick={() => { onConfirm(); setConfirming(false); }} style={{ fontSize: 11, color: theme.lost, cursor: 'pointer', fontWeight: 700 }}>Confirmar?</span>
        <span onClick={() => setConfirming(false)} style={{ fontSize: 11, color: theme.textMuted, cursor: 'pointer' }}>Não</span>
      </>
    );
  }
  return <span onClick={() => setConfirming(true)} style={{ fontSize: 11, color: theme.textMuted, cursor: 'pointer' }}>Excluir</span>;
}

function Modal({ children, onClose }) {
  const { theme } = useTheme();
  return (
    <div style={{ position: 'fixed', inset: 0, background: theme.overlay, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={onClose}>
      <div style={{ background: theme.surface, border: `1px solid ${theme.border}`, borderRadius: 15, padding: 24, width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto', boxShadow: theme.shadow }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', marginTop: -4 }}><X size={17} /></button>
        {children}
      </div>
    </div>
  );
}

/* ---------- GERENCIAR ORIGENS ---------- */
function WonFieldsModal({ fields, onSave, onClose }) {
  const { theme } = useTheme();
  const [items, setItems] = useState(fields);
  const [label, setLabel] = useState('');
  const [type, setType] = useState('text');
  const [options, setOptions] = useState('');
  const inputPlain = { width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '9px 11px', color: theme.textPrimary, fontSize: 13.5 };
  const labelStyle = { fontSize: 11.5, color: theme.textSecondary, display: 'block', marginBottom: 5, marginTop: 10, fontWeight: 500 };

  function addField() {
    const trimmed = label.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').slice(0, 30) + '_' + Date.now().toString(36).slice(-4);
    const newField = { id, label: trimmed, type };
    if (type === 'select') newField.options = options.split(',').map(o => o.trim()).filter(Boolean);
    const next = [...items, newField];
    setItems(next);
    onSave(next);
    setLabel(''); setOptions(''); setType('text');
  }

  function removeField(id) {
    const next = items.filter(f => f.id !== id);
    setItems(next);
    onSave(next);
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 15.5, fontWeight: 650, margin: '0 0 4px', color: theme.textPrimary }}>Campos de ganho</h2>
      <p style={{ fontSize: 12, color: theme.textMuted, margin: '0 0 16px' }}>Escolha quais informações aparecem quando um lead desse funil vira "Ganho". O campo Valor da venda é sempre fixo.</p>

      {items.length === 0 ? (
        <div style={{ fontSize: 12.5, color: theme.textMuted, marginBottom: 16 }}>Nenhum campo extra ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {items.map(f => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '8px 11px' }}>
              <div>
                <span style={{ fontSize: 13, color: theme.textPrimary }}>{f.label}</span>
                <span style={{ fontSize: 11, color: theme.textMuted, marginLeft: 8 }}>
                  {f.type === 'select' ? 'seleção: ' + (f.options || []).join(', ') : 'texto livre'}
                </span>
              </div>
              <ConfirmDeleteButton onConfirm={() => removeField(f.id)} />
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 4 }}>
        <label style={labelStyle}>Novo campo</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex: Tipo de licença" style={inputPlain} />
        <label style={labelStyle}>Tipo</label>
        <select value={type} onChange={e => setType(e.target.value)} style={inputPlain}>
          <option value="text">Texto livre</option>
          <option value="select">Seleção (opções fixas)</option>
        </select>
        {type === 'select' && (
          <>
            <label style={labelStyle}>Opções (separadas por vírgula)</label>
            <input value={options} onChange={e => setOptions(e.target.value)} placeholder="Ex: Anual, Mensal" style={inputPlain} />
          </>
        )}
        <button onClick={addField} style={{ marginTop: 12, width: '100%', background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '10px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
          Adicionar campo
        </button>
      </div>
    </Modal>
  );
}

function LostReasonModal({ reasons, onAdd, onConfirm, onClose }) {
  const { theme } = useTheme();
  const [reason, setReason] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newReason, setNewReason] = useState('');
  const inputPlain = { width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '10px 11px', color: theme.textPrimary, fontSize: 14 };
  const labelStyle = { fontSize: 11.5, color: theme.textSecondary, display: 'block', marginBottom: 5, fontWeight: 500 };

  function confirmNewReason() {
    const trimmed = newReason.trim();
    if (!trimmed) { setAddingNew(false); return; }
    onAdd(trimmed);
    setReason(trimmed);
    setNewReason('');
    setAddingNew(false);
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 15.5, fontWeight: 650, margin: '0 0 16px', color: theme.textPrimary }}>Marcar como perdido</h2>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <label style={labelStyle}>Motivo</label>
        {!addingNew && (
          <span onClick={() => setAddingNew(true)} style={{ fontSize: 11, color: theme.accent, cursor: 'pointer', fontWeight: 600 }}>
            + novo motivo
          </span>
        )}
      </div>
      {addingNew ? (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <input
            autoFocus
            value={newReason}
            onChange={e => setNewReason(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && confirmNewReason()}
            placeholder="Nome do novo motivo"
            style={inputPlain}
          />
          <button onClick={confirmNewReason} style={{ background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>OK</button>
        </div>
      ) : (
        <select value={reason} onChange={e => setReason(e.target.value)} style={{ ...inputPlain, marginBottom: 16 }}>
          <option value="">Sem motivo especificado</option>
          {reasons.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onClose} style={{ flex: 1, background: theme.surfaceAlt, color: theme.textPrimary, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '10px', fontSize: 13.5, cursor: 'pointer' }}>Cancelar</button>
        <button onClick={() => onConfirm(reason)} style={{ flex: 1, background: theme.lostSoft, color: theme.lost, border: 'none', borderRadius: 9, padding: '10px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>Confirmar perda</button>
      </div>
    </Modal>
  );
}

function ReasonsModal({ title, hint, items, onAdd, onDelete, onClose, placeholder = 'Novo item' }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));

  function submit() {
    if (!name.trim()) return;
    onAdd(name);
    setName('');
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 15.5, fontWeight: 650, margin: '0 0 4px', color: theme.textPrimary }}>{title}</h2>
      <p style={{ fontSize: 12, color: theme.textMuted, margin: '0 0 16px' }}>{hint}</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder={placeholder}
          style={{ flex: 1, boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '9px 11px', color: theme.textPrimary, fontSize: 13.5 }}
        />
        <button onClick={submit} style={{ background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Adicionar
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ fontSize: 12.5, color: theme.textMuted }}>Nada cadastrado ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {sorted.map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '8px 11px' }}>
              <span style={{ fontSize: 13, color: theme.textPrimary }}>{o.name}</span>
              <ConfirmDeleteButton onConfirm={() => onDelete(o.id)} />
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
