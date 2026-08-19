import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, LogOut, Users, GitBranch, BarChart3,
  Phone, Mail, Tag, Filter, DollarSign, TrendingUp, UserCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import AuthScreen from './AuthScreen';
import {
  STAGE_PALETTE, WON_COLOR, LOST_COLOR, DEFAULT_STAGES, RESPONSIBLE_OPTIONS, fmtMoney, toNumericOrNull,
  primaryBtn, inputPlain, labelStyle, modalTitle, colors, FONT,
} from './styles';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = carregando, null = deslogado
  const [funnels, setFunnels] = useState([]);
  const [stages, setStages] = useState([]);
  const [cards, setCards] = useState([]);
  const [tab, setTab] = useState('funis');
  const [activeFunnelId, setActiveFunnelId] = useState(null);
  const [toast, setToast] = useState(null); // { msg, type }

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
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function loadAll() {
    const [{ data: f }, { data: s }, { data: c }] = await Promise.all([
      supabase.from('funnels').select('*').order('created_at'),
      supabase.from('stages').select('*').order('position'),
      supabase.from('cards').select('*').order('created_at', { ascending: false }),
    ]);
    setFunnels(f || []);
    setStages(s || []);
    setCards(c || []);
    setActiveFunnelId(prev => prev || (f && f[0]?.id) || null);
  }

  function showToast(msg, type = 'ok') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }

  if (session === undefined) return <Shell><Centered>Carregando...</Centered></Shell>;
  if (!session) return <Shell><AuthScreen /></Shell>;

  const funnelsWithStages = funnels.map(f => ({
    ...f,
    stages: stages.filter(s => s.funnel_id === f.id),
  }));
  const activeFunnel = funnelsWithStages.find(f => f.id === activeFunnelId) || null;

  return (
    <Shell>
      <TopBar email={session.user.email} onLogout={() => supabase.auth.signOut()} tab={tab} setTab={setTab} />
      {toast && <Toast toast={toast} />}
      <div style={{ padding: '18px 22px 36px' }}>
        {tab === 'funis' && (
          <FunisTab
            funnels={funnelsWithStages}
            cards={cards}
            activeFunnelId={activeFunnelId}
            setActiveFunnelId={setActiveFunnelId}
            showToast={showToast}
            reload={loadAll}
          />
        )}
        {tab === 'leads' && <LeadsTab funnels={funnelsWithStages} cards={cards} />}
        {tab === 'relatorios' && <RelatoriosTab funnels={funnelsWithStages} cards={cards} />}
      </div>
    </Shell>
  );
}

function Shell({ children }) {
  return (
    <div style={{ fontFamily: FONT, background: colors.bg, color: colors.text, minHeight: '100vh' }}>
      {children}
    </div>
  );
}
function Centered({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: colors.textFaint, fontSize: 14 }}>{children}</div>;
}
function Toast({ toast }) {
  const isErr = toast.type === 'error';
  return (
    <div style={{
      position: 'fixed', top: 18, left: '50%', transform: 'translateX(-50%)',
      background: colors.surfaceAlt, color: isErr ? '#F0958D' : colors.text, padding: '10px 18px', borderRadius: 10,
      fontSize: 13, zIndex: 200, border: `1px solid ${isErr ? '#F0685E40' : colors.border}`, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      {isErr && <AlertCircle size={14} />}
      {toast.msg}
    </div>
  );
}

/* ---------- TOP BAR ---------- */
function TopBar({ email, onLogout, tab, setTab }) {
  const tabs = [
    { id: 'funis', label: 'Funis', icon: GitBranch },
    { id: 'leads', label: 'Leads/Clientes', icon: Users },
    { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
  ];
  return (
    <div style={{ borderBottom: `1px solid ${colors.borderSubtle}`, padding: '16px 22px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={13} color={colors.accent} strokeWidth={1.8} />
          </div>
          <span style={{ fontSize: 14.5, fontWeight: 650, color: colors.text, letterSpacing: -0.1 }}>CRM de vendas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 12, color: colors.textFaint, display: 'flex', alignItems: 'center', gap: 5 }}>
            <UserCircle2 size={14} /> {email}
          </span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
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
              padding: '9px 13px', fontSize: 13, fontWeight: 550, color: active ? colors.text : colors.textFaint,
              borderBottom: active ? `2px solid ${colors.accent}` : '2px solid transparent', transition: 'color .15s',
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
function FunisTab({ funnels, cards, activeFunnelId, setActiveFunnelId, showToast, reload }) {
  const [showNewFunnel, setShowNewFunnel] = useState(false);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelStages, setNewFunnelStages] = useState(DEFAULT_STAGES.join('\n'));

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
            background: f.id === activeFunnelId ? colors.accent : colors.surfaceAlt,
            color: f.id === activeFunnelId ? '#fff' : colors.textDim,
            border: `1px solid ${f.id === activeFunnelId ? colors.accent : colors.border}`,
            borderRadius: 18, padding: '7px 15px', fontSize: 12.5, fontWeight: 550, cursor: 'pointer',
          }}>
            {f.name}
          </button>
        ))}
        <button onClick={() => setShowNewFunnel(true)} style={{
          display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: `1px solid ${colors.border}`,
          color: colors.textDim, borderRadius: 18, padding: '7px 15px', fontSize: 12.5, cursor: 'pointer',
        }}>
          <Plus size={13} /> Novo funil
        </button>
      </div>

      {activeFunnel ? (
        <FunnelBoard funnel={activeFunnel} allCards={cards} reload={reload} onDeleteFunnel={() => deleteFunnel(activeFunnel.id)} showToast={showToast} />
      ) : (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: colors.textFaint, fontSize: 13.5 }}>
          Nenhum funil ainda. Crie o primeiro para começar.
        </div>
      )}

      {showNewFunnel && (
        <Modal onClose={() => setShowNewFunnel(false)}>
          <h2 style={modalTitle}>Novo funil</h2>
          <label style={labelStyle}>Nome do funil</label>
          <input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Ex: Funil comercial" style={inputPlain} />
          <label style={labelStyle}>Etapas (uma por linha, na ordem)</label>
          <textarea value={newFunnelStages} onChange={e => setNewFunnelStages(e.target.value)} rows={8} style={{ ...inputPlain, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7 }} />
          <button onClick={createFunnel} style={{ ...primaryBtn, width: '100%', marginTop: 16 }}>Criar funil</button>
        </Modal>
      )}
    </div>
  );
}

function FunnelBoard({ funnel, allCards, reload, onDeleteFunnel, showToast }) {
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [targetStageId, setTargetStageId] = useState(funnel.stages[0]?.id);
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [filterResponsible, setFilterResponsible] = useState('all');
  const [dragCardId, setDragCardId] = useState(null);
  const [confirmDeleteFunnel, setConfirmDeleteFunnel] = useState(false);

  const funnelCards = allCards.filter(c => c.funnel_id === funnel.id);
  const activeCards = funnelCards.filter(c => c.status !== 'lost');
  const lostCards = funnelCards.filter(c => c.status === 'lost');

  const origins = [...new Set(funnelCards.map(c => c.origin).filter(Boolean))];
  const responsibles = [...new Set(funnelCards.map(c => c.responsible).filter(Boolean))];

  const visibleCards = activeCards.filter(c =>
    (filterOrigin === 'all' || c.origin === filterOrigin) &&
    (filterResponsible === 'all' || c.responsible === filterResponsible)
  );

  const wonStage = funnel.stages[funnel.stages.length - 1];
  const wonTotal = visibleCards.filter(c => c.stage_id === wonStage?.id).reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);

  function openNewCard(stageId) { setEditingCard(null); setTargetStageId(stageId); setShowCardModal(true); }
  function openEditCard(card) { setEditingCard(card); setTargetStageId(card.stage_id); setShowCardModal(true); }

  async function saveCard(data) {
    const payload = {
      name: data.name.trim(),
      phone: data.phone || null,
      email: data.email || null,
      origin: data.origin || null,
      responsible: data.responsible || null,
      notes: data.notes || null,
      value: toNumericOrNull(data.value),
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
  async function onDropStage(stageId) {
    if (!dragCardId) return;
    const { error } = await supabase.from('cards').update({ stage_id: stageId, status: 'active' }).eq('id', dragCardId);
    if (error) showToast('Erro ao mover: ' + error.message, 'error');
    await reload();
    setDragCardId(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SelectFilter icon={<Tag size={12} />} value={filterOrigin} onChange={setFilterOrigin} options={origins} placeholder="Todas as origens" />
          <SelectFilter icon={<UserCircle2 size={12} />} value={filterResponsible} onChange={setFilterResponsible} options={responsibles} placeholder="Todos os responsáveis" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openNewCard(funnel.stages[0]?.id)} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={14} /> Novo lead
          </button>
          <button onClick={() => setConfirmDeleteFunnel(true)} style={{ background: 'none', border: `1px solid ${colors.border}`, color: colors.textFaint, borderRadius: 9, padding: '8px 11px', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {funnel.stages.map(stage => {
          const stageCards = visibleCards.filter(c => c.stage_id === stage.id);
          const isWon = stage.id === wonStage?.id;
          return (
            <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={() => onDropStage(stage.id)} style={{
              minWidth: 226, width: 226, flexShrink: 0, background: colors.surface, border: `1px solid ${colors.borderSubtle}`, borderRadius: 12, padding: 11,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, padding: '2px 3px' }}>
                <span style={{ width: 7, height: 7, borderRadius: 4, background: stage.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: colors.textDim, flex: 1, letterSpacing: 0.1 }}>{stage.name}</span>
                <span style={{ fontSize: 11, color: colors.textFaint }}>{stageCards.length}</span>
              </div>
              {isWon && (
                <div style={{ fontSize: 12, color: WON_COLOR, fontWeight: 650, marginBottom: 10, padding: '6px 8px', background: WON_COLOR + '14', borderRadius: 8 }}>
                  Total: {fmtMoney(wonTotal)}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, minHeight: 40 }}>
                {stageCards.map(card => (
                  <div key={card.id} draggable onDragStart={() => setDragCardId(card.id)} onClick={() => openEditCard(card)} style={{
                    background: colors.surfaceAlt, borderRadius: 9, padding: '10px 11px', cursor: 'grab', border: `1px solid ${colors.border}`,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: colors.text, marginBottom: 3 }}>{card.name}</div>
                    {card.origin && <div style={{ fontSize: 11, color: colors.accent, marginBottom: 3 }}>{card.origin}</div>}
                    <div style={{ fontSize: 11, color: colors.textFaint }}>{card.responsible}</div>
                    {isWon && card.value != null && <div style={{ fontSize: 12, color: WON_COLOR, fontWeight: 650, marginTop: 5 }}>{fmtMoney(card.value)}</div>}
                  </div>
                ))}
              </div>
              <button onClick={() => openNewCard(stage.id)} style={{
                width: '100%', marginTop: 9, background: 'none', border: 'none', color: colors.textFaint,
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
          <div style={{ fontSize: 12, fontWeight: 600, color: colors.textDim, marginBottom: 10, letterSpacing: 0.1 }}>Perdidos ({lostCards.length})</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lostCards.map(card => (
              <div key={card.id} style={{ background: LOST_COLOR + '10', border: `1px solid ${LOST_COLOR}30`, borderRadius: 9, padding: '9px 11px', minWidth: 180 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#F0958D', marginBottom: 2 }}>{card.name}</div>
                <div style={{ fontSize: 11, color: colors.textFaint, marginBottom: 7 }}>{card.origin} · {card.responsible}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => restoreCard(card.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: colors.accent, cursor: 'pointer', padding: 0 }}>Restaurar</button>
                  <button onClick={() => deleteCard(card.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', padding: 0 }}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCardModal && (
        <CardModal card={editingCard} stages={funnel.stages} targetStageId={targetStageId} setTargetStageId={setTargetStageId} isWonStage={targetStageId === wonStage?.id} onSave={saveCard} onClose={() => setShowCardModal(false)} onMarkLost={editingCard ? () => markLost(editingCard.id) : null} onDelete={editingCard ? () => deleteCard(editingCard.id) : null} />
      )}

      {confirmDeleteFunnel && (
        <Modal onClose={() => setConfirmDeleteFunnel(false)}>
          <h2 style={modalTitle}>Excluir funil "{funnel.name}"?</h2>
          <p style={{ fontSize: 13, color: colors.textDim, marginBottom: 20, lineHeight: 1.5 }}>Todos os cards desse funil também serão excluídos. Essa ação não pode ser desfeita.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmDeleteFunnel(false)} style={{ flex: 1, background: colors.surfaceAlt, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 9, padding: '10px', fontSize: 13.5, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={onDeleteFunnel} style={{ flex: 1, background: LOST_COLOR + '20', color: '#F0958D', border: 'none', borderRadius: 9, padding: '10px', fontSize: 13.5, cursor: 'pointer' }}>Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SelectFilter({ icon, value, onChange, options, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: 9, padding: '6px 11px' }}>
      {icon}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'transparent', border: 'none', color: colors.textDim, fontSize: 12, cursor: 'pointer', outline: 'none' }}>
        <option value="all">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CardModal({ card, stages, targetStageId, setTargetStageId, isWonStage, onSave, onClose, onMarkLost, onDelete }) {
  const [form, setForm] = useState({
    name: card?.name || '', phone: card?.phone || '', email: card?.email || '',
    origin: card?.origin || '', responsible: card?.responsible || '', notes: card?.notes || '', value: card?.value ?? '',
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
      <input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="Ex: Indicação, Instagram, Site" style={inputPlain} />
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
        </>
      )}
      {err && <div style={{ fontSize: 12.5, color: '#F0958D', marginTop: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button onClick={submit} style={{ ...primaryBtn, flex: 1 }}>Salvar</button>
        {onMarkLost && <button onClick={onMarkLost} style={{ background: LOST_COLOR + '18', color: '#F0958D', border: 'none', borderRadius: 9, padding: '10px 13px', fontSize: 13, cursor: 'pointer' }}>Marcar perdido</button>}
      </div>
      {onDelete && <button onClick={onDelete} style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', color: colors.textFaint, fontSize: 12, cursor: 'pointer' }}>Excluir card</button>}
    </Modal>
  );
}

/* ---------- LEADS TAB ---------- */
function LeadsTab({ funnels, cards }) {
  const [search, setSearch] = useState('');

  function stageOf(card) {
    if (card.status === 'lost') return { name: 'Perdido', color: LOST_COLOR };
    const funnel = funnels.find(f => f.id === card.funnel_id);
    const stage = funnel?.stages.find(s => s.id === card.stage_id);
    return stage ? { name: stage.name, color: stage.color } : { name: '—', color: colors.textFaint };
  }

  const filtered = cards.filter(c => ((c.name || '') + (c.email || '') + (c.phone || '') + (c.origin || '') + (c.responsible || '')).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: colors.surfaceAlt, border: `1px solid ${colors.border}`, borderRadius: 9, padding: '9px 12px', marginBottom: 18, maxWidth: 320 }}>
        <Filter size={13} color={colors.textFaint} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads e clientes" style={{ background: 'transparent', border: 'none', outline: 'none', color: colors.text, fontSize: 13.5, width: '100%' }} />
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '56px 16px', color: colors.textFaint, fontSize: 13.5 }}>Nenhum lead cadastrado ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {filtered.map(c => {
            const stage = stageOf(c);
            const funnel = funnels.find(f => f.id === c.funnel_id);
            return (
              <div key={c.id} style={{ background: colors.surface, border: `1px solid ${colors.borderSubtle}`, borderRadius: 10, padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 200 }}>
                  <span style={{ fontSize: 10, fontWeight: 650, padding: '3px 9px', borderRadius: 999, background: stage.color + '1E', color: stage.color, whiteSpace: 'nowrap', letterSpacing: 0.2 }}>
                    {stage.name}
                  </span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: colors.text }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: colors.textFaint }}>{funnel?.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 15, fontSize: 12, color: colors.textDim, flexWrap: 'wrap' }}>
                  {c.phone && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={11} />{c.phone}</span>}
                  {c.email && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={11} />{c.email}</span>}
                  {c.origin && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={11} />{c.origin}</span>}
                  {c.responsible && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><UserCircle2 size={11} />{c.responsible}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- RELATORIOS TAB ---------- */
function RelatoriosTab({ funnels, cards }) {
  const total = cards.length;
  const won = cards.filter(c => {
    const f = funnels.find(fn => fn.id === c.funnel_id);
    const wonStage = f?.stages[f.stages.length - 1];
    return c.status !== 'lost' && c.stage_id === wonStage?.id;
  });
  const lost = cards.filter(c => c.status === 'lost');
  const totalValue = won.reduce((sum, c) => sum + (parseFloat(c.value) || 0), 0);
  const conversion = total > 0 ? ((won.length / total) * 100).toFixed(1) : '0';

  const byOrigin = {};
  cards.forEach(c => { if (c.origin) byOrigin[c.origin] = (byOrigin[c.origin] || 0) + 1; });
  const byResponsible = {};
  cards.forEach(c => { if (c.responsible) byResponsible[c.responsible] = (byResponsible[c.responsible] || 0) + 1; });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 26 }}>
        <StatCard icon={<Users size={15} />} label="Total de leads" value={total} />
        <StatCard icon={<TrendingUp size={15} />} label="Taxa de conversão" value={conversion + '%'} />
        <StatCard icon={<DollarSign size={15} />} label="Valor ganho" value={fmtMoney(totalValue)} color={WON_COLOR} />
        <StatCard icon={<X size={15} />} label="Perdidos" value={lost.length} color={LOST_COLOR} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <BreakdownCard title="Por origem" data={byOrigin} />
        <BreakdownCard title="Por responsável" data={byResponsible} />
      </div>
    </div>
  );
}
function StatCard({ icon, label, value, color = colors.accent }) {
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.borderSubtle}`, borderRadius: 11, padding: '15px' }}>
      <div style={{ color, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 19, fontWeight: 650, color: colors.text, letterSpacing: -0.2 }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.textFaint, marginTop: 2 }}>{label}</div>
    </div>
  );
}
function BreakdownCard({ title, data }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  return (
    <div style={{ background: colors.surface, border: `1px solid ${colors.borderSubtle}`, borderRadius: 11, padding: 17 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: colors.text, marginBottom: 14, letterSpacing: 0.1 }}>{title}</div>
      {entries.length === 0 ? (
        <div style={{ fontSize: 12, color: colors.textFaint }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {entries.map(([k, v]) => (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.textDim, marginBottom: 4 }}><span>{k}</span><span>{v}</span></div>
              <div style={{ height: 4, background: colors.surfaceAlt, borderRadius: 3 }}>
                <div style={{ height: 4, width: `${(v / max) * 100}%`, background: colors.accent, borderRadius: 3 }} />
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
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={onClose}>
      <div style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 15, padding: 24, width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', color: colors.textFaint, cursor: 'pointer', marginTop: -4 }}><X size={17} /></button>
        {children}
      </div>
    </div>
  );
}
