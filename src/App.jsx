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
  fmtMoney, toNumericOrNull, normalize, FONT, FONT_LOGO,
} from './styles';

export default function App() {
  const { theme, mode, toggle } = useTheme();
  const [session, setSession] = useState(undefined);
  const [funnels, setFunnels] = useState([]);
  const [stages, setStages] = useState([]);
  const [cards, setCards] = useState([]);
  const [origins, setOrigins] = useState([]);
  const [tab, setTab] = useState('funis');
  const [activeFunnelId, setActiveFunnelId] = useState(null);
  const [toast, setToast] = useState(null);
  const [showOriginsModal, setShowOriginsModal] = useState(false);

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
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadAll() {
    const [{ data: f }, { data: s }, { data: c }, { data: o }] = await Promise.all([
      supabase.from('funnels').select('*').order('created_at'),
      supabase.from('stages').select('*').order('position'),
      supabase.from('cards').select('*').order('created_at', { ascending: false }),
      supabase.from('origins').select('*').order('name'),
    ]);
    setFunnels(f || []);
    setStages(s || []);
    setCards(c || []);
    setOrigins(o || []);
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

  if (session === undefined) return <Shell><Centered>Carregando...</Centered></Shell>;
  if (!session) return <Shell><AuthScreen /></Shell>;

  const funnelsWithStages = funnels.map(f => ({
    ...f,
    stages: stages.filter(s => s.funnel_id === f.id).sort((a, b) => a.position - b.position),
  }));
  const activeFunnel = funnelsWithStages.find(f => f.id === activeFunnelId) || null;

  const originNames = origins.map(o => o.name).sort((a, b) => a.localeCompare(b));

  return (
    <Shell>
      <TopBar email={session.user.email} onLogout={() => supabase.auth.signOut()} tab={tab} setTab={setTab} mode={mode} toggle={toggle} onManageOrigins={() => setShowOriginsModal(true)} />
      {toast && <Toast toast={toast} />}
      <div style={{ padding: '18px 22px 36px' }}>
        {tab === 'funis' && (
          <FunisTab
            funnels={funnelsWithStages}
            cards={cards}
            origins={originNames}
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
        <OriginsModal origins={origins} onAdd={addOrigin} onDelete={deleteOrigin} onClose={() => setShowOriginsModal(false)} />
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
function TopBar({ email, onLogout, tab, setTab, mode, toggle, onManageOrigins }) {
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
function FunisTab({ funnels, cards, origins, activeFunnelId, setActiveFunnelId, showToast, reload, updateCardLocal, reorderStages }) {
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
        <FunnelBoard funnel={activeFunnel} allCards={cards} origins={origins} reload={reload} onDeleteFunnel={() => deleteFunnel(activeFunnel.id)} showToast={showToast} updateCardLocal={updateCardLocal} reorderStages={reorderStages} />
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

function FunnelBoard({ funnel, allCards, origins, reload, onDeleteFunnel, showToast, updateCardLocal, reorderStages }) {
  const { theme } = useTheme();
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [targetStageId, setTargetStageId] = useState(funnel.stages[0]?.id);
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [dragCardId, setDragCardId] = useState(null);
  const [dragOverStageId, setDragOverStageId] = useState(null);
  const [draggingStageId, setDraggingStageId] = useState(null);
  const [confirmDeleteFunnel, setConfirmDeleteFunnel] = useState(false);

  const primaryBtn = { background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };

  const funnelCards = allCards.filter(c => c.funnel_id === funnel.id);
  const activeCards = funnelCards.filter(c => c.status !== 'lost');
  const lostCards = funnelCards.filter(c => c.status === 'lost');

  const responsibles = [...new Set(funnelCards.map(c => c.responsible).filter(Boolean))];

  const visibleCards = activeCards.filter(c =>
    (filterOrigin === 'all' || c.origin === filterOrigin) &&
    (filterResponsible === 'all' || c.responsible === filterResponsible)
  );

  const wonStage = funnel.stages[funnel.stages.length - 1];
  const wonTotal = visibleCards.filter(c => c.stage_id === wonStage?.id).reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);

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
    const payload = {
      name: data.name.trim(),
      phone: data.phone || null,
      email: data.email || null,
      origin: data.origin || null,
      responsible: data.responsible || null,
      notes: data.notes || null,
      value: toNumericOrNull(data.value),
      plan: data.plan || null,
      duration: data.duration || null,
      payment_method: data.payment_method || null,
      stage_id: targetStageId,
      funnel_id: funnel.id,
    };
    let error;
    if (editingCard) {
      ({ error } = await supabase.from('cards').update(payload).eq('id', editingCard.id));
    } else {
      ({ error } = await supabase.from('cards').insert({ ...payload, status: 'active' }));
    }
    if (error) { showToast('Não salvou: ' + error.message, 'error'); return; }
    await reload();
    setShowCardModal(false);
    showToast('Salvo.');
  }

  async function markLost(cardId) {
    const { error } = await supabase.from('cards').update({ status: 'lost' }).eq('id', cardId);
    if (error) { showToast('Erro: ' + error.message, 'error'); return; }
    await reload();
    setShowCardModal(false);
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
    updateCardLocal(id, { stage_id: stageId, status: 'active' });
    supabase.from('cards').update({ stage_id: stageId, status: 'active' }).eq('id', id).then(({ error }) => {
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
        <button onClick={() => setConfirmDeleteFunnel(true)} style={{ background: 'none', border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 9, padding: '8px 11px', cursor: 'pointer' }}>
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
        <SelectFilter icon={<Tag size={12} />} value={filterOrigin} onChange={setFilterOrigin} options={origins} placeholder="Todas as origens" />
        <SelectFilter icon={<UserCircle2 size={12} />} value={filterResponsible} onChange={setFilterResponsible} options={responsibles} placeholder="Todos os responsáveis" />
      </div>

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
                <div style={{ fontSize: 12, color: theme.won, fontWeight: 650, marginBottom: 10, padding: '6px 8px', background: theme.surface, borderRadius: 8 }}>
                  Total: {fmtMoney(wonTotal)}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 40 }}>
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
                    }}
                    onMouseDown={e => { e.currentTarget.style.cursor = 'grabbing'; }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: theme.textPrimary, marginBottom: 3 }}>{card.name}</div>
                    {card.origin && <div style={{ fontSize: 11, color: theme.accent, marginBottom: 3 }}>{card.origin}</div>}
                    <div style={{ fontSize: 11, color: theme.textMuted }}>{card.responsible}</div>
                    {isWon && card.value != null && <div style={{ fontSize: 12, color: theme.won, fontWeight: 650, marginTop: 5 }}>{fmtMoney(card.value)}</div>}
                    {isWon && card.plan && <div style={{ fontSize: 10.5, color: theme.textMuted, marginTop: 2 }}>{card.plan} · {card.duration}</div>}
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

      {lostCards.length > 0 && (
        <div style={{ marginTop: 26 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: theme.textSecondary, marginBottom: 10 }}>Perdidos ({lostCards.length})</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lostCards.map(card => (
              <div key={card.id} style={{ background: theme.lostSoft, border: `1px solid ${theme.lost}30`, borderRadius: 9, padding: '9px 11px', minWidth: 180 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.lost, marginBottom: 2 }}>{card.name}</div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 7 }}>{card.origin} · {card.responsible}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => restoreCard(card.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: theme.accent, cursor: 'pointer', padding: 0 }}>Restaurar</button>
                  <button onClick={() => deleteCard(card.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 0 }}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCardModal && (
        <CardModal card={editingCard} stages={funnel.stages} origins={origins} targetStageId={targetStageId} setTargetStageId={setTargetStageId} isWonStage={targetStageId === wonStage?.id} onSave={saveCard} onClose={() => setShowCardModal(false)} onMarkLost={editingCard ? () => markLost(editingCard.id) : null} onDelete={editingCard ? () => deleteCard(editingCard.id) : null} />
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

function CardModal({ card, stages, origins, targetStageId, setTargetStageId, isWonStage, onSave, onClose, onMarkLost, onDelete }) {
  const { theme } = useTheme();
  const inputPlain = { width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '10px 11px', color: theme.textPrimary, fontSize: 14 };
  const labelStyle = { fontSize: 11.5, color: theme.textSecondary, display: 'block', marginBottom: 5, marginTop: 12, fontWeight: 500 };
  const modalTitle = { fontSize: 15.5, fontWeight: 650, margin: '0 0 18px', color: theme.textPrimary };
  const primaryBtn = { background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' };

  const [form, setForm] = useState({
    name: card?.name || '', phone: card?.phone || '', email: card?.email || '',
    origin: card?.origin || '', responsible: card?.responsible || '', notes: card?.notes || '', value: card?.value ?? '',
    plan: card?.plan || '', duration: card?.duration || '', payment_method: card?.payment_method || '',
  });
  const [err, setErr] = useState('');

  function submit() {
    if (!form.name.trim()) { setErr('Nome é obrigatório.'); return; }
    onSave(form);
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
      <label style={labelStyle}>Origem</label>
      <select value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} style={inputPlain}>
        <option value="">Selecione</option>
        {origins.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
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

          <label style={labelStyle}><CreditCard size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Plano</label>
          <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })} style={inputPlain}>
            <option value="">Selecione</option>
            {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <label style={labelStyle}><CalendarClock size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Duração</label>
          <select value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} style={inputPlain}>
            <option value="">Selecione</option>
            {DURATION_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <label style={labelStyle}><Wallet size={11} style={{ verticalAlign: -1, marginRight: 4 }} />Forma de pagamento</label>
          <input value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} placeholder="Ex: Pix, cartão, boleto" style={inputPlain} />
        </>
      )}
      {err && <div style={{ fontSize: 12.5, color: theme.lost, marginTop: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button onClick={submit} style={{ ...primaryBtn, flex: 1 }}>Salvar</button>
        {onMarkLost && <button onClick={onMarkLost} style={{ background: theme.lostSoft, color: theme.lost, border: 'none', borderRadius: 9, padding: '10px 13px', fontSize: 13, cursor: 'pointer' }}>Marcar perdido</button>}
      </div>
      {onDelete && <button onClick={onDelete} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: theme.textMuted, fontSize: 12, cursor: 'pointer' }}>Excluir card</button>}
    </Modal>
  );
}

/* ---------- LEADS TAB ---------- */
function LeadsTab({ funnels, cards, origins }) {
  const { theme } = useTheme();
  const [search, setSearch] = useState('');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  function stageOf(card) {
    if (card.status === 'lost') return { name: 'Perdido', color: theme.lost };
    const funnel = funnels.find(f => f.id === card.funnel_id);
    const stage = funnel?.stages.find(s => s.id === card.stage_id);
    return stage ? { name: stage.name, color: stage.color } : { name: '—', color: theme.textMuted };
  }


  let filtered = cards.filter(c =>
    ((c.name || '') + (c.email || '') + (c.phone || '') + (c.origin || '') + (c.responsible || '')).toLowerCase().includes(search.toLowerCase()) &&
    (filterOrigin === 'all' || c.origin === filterOrigin)
  );
  if (sortBy === 'name') filtered = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  else if (sortBy === 'origin') filtered = [...filtered].sort((a, b) => (a.origin || '').localeCompare(b.origin || ''));
  else filtered = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const cols = '1.1fr 1.3fr 1.1fr 1.4fr 1fr 1fr';
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
          <div style={{ display: 'grid', gridTemplateColumns: cols, background: theme.surfaceAlt, borderBottom: `1px solid ${theme.border}`, minWidth: 720 }}>
            <div style={th}>Etapa</div>
            <div style={th}>Nome</div>
            <div style={th}>Telefone</div>
            <div style={th}>E-mail</div>
            <div style={th}>Origem</div>
            <div style={th}>Responsável</div>
          </div>
          {filtered.map((c, i) => {
            const stage = stageOf(c);
            return (
              <div key={c.id} style={{
                display: 'grid', gridTemplateColumns: cols, background: i % 2 === 0 ? theme.surface : theme.surfaceAlt + '80',
                borderBottom: i === filtered.length - 1 ? 'none' : `1px solid ${theme.border}`, minWidth: 720,
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
      <div style={{ color: color || theme.accent, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 19, fontWeight: 650, color: theme.textPrimary, letterSpacing: -0.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{label}</div>
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
function OriginsModal({ origins, onAdd, onDelete, onClose }) {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const sorted = [...origins].sort((a, b) => a.name.localeCompare(b.name));

  function submit() {
    if (!name.trim()) return;
    onAdd(name);
    setName('');
  }

  return (
    <Modal onClose={onClose}>
      <h2 style={{ fontSize: 15.5, fontWeight: 650, margin: '0 0 4px', color: theme.textPrimary }}>Origens</h2>
      <p style={{ fontSize: 12, color: theme.textMuted, margin: '0 0 16px' }}>Crie e remova origens. Elas continuam existindo mesmo sem nenhum lead associado.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Nova origem (ex: Instagram)"
          style={{ flex: 1, boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 9, padding: '9px 11px', color: theme.textPrimary, fontSize: 13.5 }}
        />
        <button onClick={submit} style={{ background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9, padding: '0 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          Adicionar
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ fontSize: 12.5, color: theme.textMuted }}>Nenhuma origem cadastrada ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 260, overflowY: 'auto' }}>
          {sorted.map(o => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: theme.surfaceAlt, border: `1px solid ${theme.border}`, borderRadius: 8, padding: '8px 11px' }}>
              <span style={{ fontSize: 13, color: theme.textPrimary }}>{o.name}</span>
              <button onClick={() => onDelete(o.id)} style={{ background: 'none', border: 'none', color: theme.textMuted, cursor: 'pointer', padding: 2, display: 'flex' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
