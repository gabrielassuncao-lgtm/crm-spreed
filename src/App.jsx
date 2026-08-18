import React, { useState, useEffect } from 'react';
import {
  Plus, Trash2, X, LogOut, Users, GitBranch, BarChart3,
  Phone, Mail, Tag, Filter, DollarSign, TrendingUp, UserCircle2, AlertCircle
} from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import AuthScreen from './AuthScreen';
import {
  STAGE_PALETTE, WON_COLOR, LOST_COLOR, DEFAULT_STAGES, fmtMoney,
  primaryBtn, inputPlain, labelStyle, modalTitle,
} from './styles';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = carregando, null = deslogado
  const [funnels, setFunnels] = useState([]);
  const [stages, setStages] = useState([]);
  const [cards, setCards] = useState([]);
  const [tab, setTab] = useState('funis');
  const [activeFunnelId, setActiveFunnelId] = useState(null);
  const [toast, setToast] = useState('');

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

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
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
      {toast && <Toast msg={toast} />}
      <div style={{ padding: '16px 20px 32px' }}>
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
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#0B1120', color: '#E2E8F0', minHeight: '100vh' }}>
      {children}
    </div>
  );
}
function Centered({ children }) {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748B', fontSize: 14 }}>{children}</div>;
}
function Toast({ msg }) {
  return (
    <div style={{ position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', background: '#1E293B', color: '#E2E8F0', padding: '9px 16px', borderRadius: 8, fontSize: 13, zIndex: 200, border: '1px solid #334155', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
      {msg}
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
    <div style={{ borderBottom: '1px solid #1E293B', padding: '14px 20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitBranch size={15} color="#fff" />
          </div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#F8FAFC' }}>CRM de vendas</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 5 }}>
            <UserCircle2 size={15} /> {email}
          </span>
          <button onClick={onLogout} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12.5 }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {tabs.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', fontSize: 13.5, fontWeight: 600, color: active ? '#F8FAFC' : '#64748B', borderBottom: active ? '2px solid #6366F1' : '2px solid transparent' }}>
              <Icon size={14} /> {t.label}
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
    if (error) { showToast('Erro ao criar funil.'); return; }
    const stageRows = stageNames.map((name, i) => ({
      funnel_id: funnel.id, name, color: STAGE_PALETTE[i % STAGE_PALETTE.length], position: i,
    }));
    await supabase.from('stages').insert(stageRows);
    await reload();
    setActiveFunnelId(funnel.id);
    setShowNewFunnel(false);
    setNewFunnelName('');
    setNewFunnelStages(DEFAULT_STAGES.join('\n'));
    showToast('Funil criado.');
  }

  async function deleteFunnel(id) {
    await supabase.from('funnels').delete().eq('id', id);
    await reload();
    if (activeFunnelId === id) setActiveFunnelId(null);
    showToast('Funil excluído.');
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
        {funnels.map(f => (
          <button key={f.id} onClick={() => setActiveFunnelId(f.id)} style={{ background: f.id === activeFunnelId ? '#6366F1' : '#1E293B', color: f.id === activeFunnelId ? '#fff' : '#CBD5E1', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {f.name}
          </button>
        ))}
        <button onClick={() => setShowNewFunnel(true)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: '1px dashed #334155', color: '#94A3B8', borderRadius: 20, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>
          <Plus size={13} /> Novo funil
        </button>
      </div>

      {activeFunnel ? (
        <FunnelBoard funnel={activeFunnel} allCards={cards} reload={reload} onDeleteFunnel={() => deleteFunnel(activeFunnel.id)} showToast={showToast} />
      ) : (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B', fontSize: 14 }}>
          Nenhum funil ainda. Crie o primeiro para começar.
        </div>
      )}

      {showNewFunnel && (
        <Modal onClose={() => setShowNewFunnel(false)}>
          <h2 style={modalTitle}>Novo funil</h2>
          <label style={labelStyle}>Nome do funil</label>
          <input value={newFunnelName} onChange={e => setNewFunnelName(e.target.value)} placeholder="Ex: Funil comercial" style={inputPlain} />
          <label style={labelStyle}>Etapas (uma por linha, na ordem)</label>
          <textarea value={newFunnelStages} onChange={e => setNewFunnelStages(e.target.value)} rows={8} style={{ ...inputPlain, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }} />
          <button onClick={createFunnel} style={{ ...primaryBtn, width: '100%', marginTop: 4 }}>Criar funil</button>
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
    const payload = { ...data, stage_id: targetStageId, funnel_id: funnel.id };
    if (editingCard) {
      await supabase.from('cards').update(payload).eq('id', editingCard.id);
    } else {
      await supabase.from('cards').insert({ ...payload, status: 'active' });
    }
    await reload();
    setShowCardModal(false);
    showToast('Salvo.');
  }

  async function markLost(cardId) {
    await supabase.from('cards').update({ status: 'lost' }).eq('id', cardId);
    await reload();
    setShowCardModal(false);
    showToast('Card marcado como perdido.');
  }
  async function restoreCard(cardId) {
    await supabase.from('cards').update({ status: 'active' }).eq('id', cardId);
    await reload();
    showToast('Card restaurado ao pipeline.');
  }
  async function deleteCard(cardId) {
    await supabase.from('cards').delete().eq('id', cardId);
    await reload();
    setShowCardModal(false);
    showToast('Card excluído.');
  }
  async function onDropStage(stageId) {
    if (!dragCardId) return;
    await supabase.from('cards').update({ stage_id: stageId, status: 'active' }).eq('id', dragCardId);
    await reload();
    setDragCardId(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <SelectFilter icon={<Tag size={12} />} value={filterOrigin} onChange={setFilterOrigin} options={origins} placeholder="Todas as origens" />
          <SelectFilter icon={<UserCircle2 size={12} />} value={filterResponsible} onChange={setFilterResponsible} options={responsibles} placeholder="Todos os responsáveis" />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => openNewCard(funnel.stages[0]?.id)} style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <Plus size={14} /> Novo lead
          </button>
          <button onClick={() => setConfirmDeleteFunnel(true)} style={{ background: 'none', border: '1px solid #334155', color: '#94A3B8', borderRadius: 8, padding: '8px 10px', cursor: 'pointer' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {funnel.stages.map(stage => {
          const stageCards = visibleCards.filter(c => c.stage_id === stage.id);
          const isWon = stage.id === wonStage?.id;
          return (
            <div key={stage.id} onDragOver={e => e.preventDefault()} onDrop={() => onDropStage(stage.id)} style={{ minWidth: 230, width: 230, flexShrink: 0, background: '#111827', borderRadius: 10, padding: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, padding: '2px 4px' }}>
                <span style={{ width: 8, height: 8, borderRadius: 4, background: stage.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#E2E8F0', flex: 1 }}>{stage.name}</span>
                <span style={{ fontSize: 11, color: '#64748B' }}>{stageCards.length}</span>
              </div>
              {isWon && (
                <div style={{ fontSize: 12, color: WON_COLOR, fontWeight: 700, marginBottom: 8, padding: '4px 6px', background: WON_COLOR + '15', borderRadius: 6 }}>
                  Total: {fmtMoney(wonTotal)}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minHeight: 40 }}>
                {stageCards.map(card => (
                  <div key={card.id} draggable onDragStart={() => setDragCardId(card.id)} onClick={() => openEditCard(card)} style={{ background: '#1E293B', borderRadius: 8, padding: '9px 10px', cursor: 'grab', border: '1px solid #263149' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#F1F5F9', marginBottom: 3 }}>{card.name}</div>
                    {card.origin && <div style={{ fontSize: 11, color: '#818CF8', marginBottom: 3 }}>{card.origin}</div>}
                    <div style={{ fontSize: 11, color: '#64748B' }}>{card.responsible}</div>
                    {isWon && card.value && <div style={{ fontSize: 12, color: WON_COLOR, fontWeight: 700, marginTop: 4 }}>{fmtMoney(card.value)}</div>}
                  </div>
                ))}
              </div>
              <button onClick={() => openNewCard(stage.id)} style={{ width: '100%', marginTop: 8, background: 'none', border: '1px dashed #263149', color: '#475569', borderRadius: 6, padding: '6px', fontSize: 11.5, cursor: 'pointer' }}>
                + adicionar
              </button>
            </div>
          );
        })}
      </div>

      {lostCards.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#94A3B8', marginBottom: 8 }}>Perdidos ({lostCards.length})</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {lostCards.map(card => (
              <div key={card.id} style={{ background: LOST_COLOR + '15', border: '1px solid ' + LOST_COLOR + '40', borderRadius: 8, padding: '8px 10px', minWidth: 180 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: '#FCA5A5', marginBottom: 2 }}>{card.name}</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 6 }}>{card.origin} · {card.responsible}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => restoreCard(card.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#818CF8', cursor: 'pointer', padding: 0 }}>Restaurar</button>
                  <button onClick={() => deleteCard(card.id)} style={{ fontSize: 11, background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}>Excluir</button>
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
          <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 18 }}>Todos os cards desse funil também serão excluídos. Essa ação não pode ser desfeita.</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setConfirmDeleteFunnel(false)} style={{ flex: 1, background: '#1E293B', color: '#E2E8F0', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={onDeleteFunnel} style={{ flex: 1, background: '#7F1D1D', color: '#FECACA', border: 'none', borderRadius: 8, padding: '10px', fontSize: 14, cursor: 'pointer' }}>Excluir</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SelectFilter({ icon, value, onChange, options, placeholder }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1E293B', borderRadius: 8, padding: '6px 10px' }}>
      {icon}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ background: 'transparent', border: 'none', color: '#CBD5E1', fontSize: 12.5, cursor: 'pointer', outline: 'none' }}>
        <option value="all">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function CardModal({ card, stages, targetStageId, setTargetStageId, isWonStage, onSave, onClose, onMarkLost, onDelete }) {
  const [form, setForm] = useState({
    name: card?.name || '', phone: card?.phone || '', email: card?.email || '',
    origin: card?.origin || '', responsible: card?.responsible || '', value: card?.value || '',
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
      <input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} placeholder="Nome do vendedor" style={inputPlain} />
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
      {err && <div style={{ fontSize: 12.5, color: '#FCA5A5', marginBottom: 10 }}>{err}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button onClick={submit} style={{ ...primaryBtn, flex: 1 }}>Salvar</button>
        {onMarkLost && <button onClick={onMarkLost} style={{ background: LOST_COLOR + '20', color: '#FCA5A5', border: 'none', borderRadius: 8, padding: '10px 12px', fontSize: 13, cursor: 'pointer' }}>Marcar perdido</button>}
      </div>
      {onDelete && <button onClick={onDelete} style={{ width: '100%', marginTop: 8, background: 'none', border: 'none', color: '#64748B', fontSize: 12.5, cursor: 'pointer' }}>Excluir card</button>}
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
    return stage ? { name: stage.name, color: stage.color } : { name: '—', color: '#64748B' };
  }

  const filtered = cards.filter(c => ((c.name || '') + (c.email || '') + (c.phone || '') + (c.origin || '') + (c.responsible || '')).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#1E293B', borderRadius: 8, padding: '9px 12px', marginBottom: 16, maxWidth: 320 }}>
        <Filter size={14} color="#64748B" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads e clientes" style={{ background: 'transparent', border: 'none', outline: 'none', color: '#E2E8F0', fontSize: 14, width: '100%' }} />
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 16px', color: '#64748B', fontSize: 14 }}>Nenhum lead cadastrado ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(c => {
            const stage = stageOf(c);
            const funnel = funnels.find(f => f.id === c.funnel_id);
            return (
              <div key={c.id} style={{ background: '#1E293B', borderRadius: 10, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, background: stage.color + '22', color: stage.color, whiteSpace: 'nowrap' }}>{stage.name}</span>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: '#F1F5F9' }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>{funnel?.name}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#94A3B8', flexWrap: 'wrap' }}>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 24 }}>
        <StatCard icon={<Users size={16} />} label="Total de leads" value={total} />
        <StatCard icon={<TrendingUp size={16} />} label="Taxa de conversão" value={conversion + '%'} />
        <StatCard icon={<DollarSign size={16} />} label="Valor ganho" value={fmtMoney(totalValue)} color={WON_COLOR} />
        <StatCard icon={<X size={16} />} label="Perdidos" value={lost.length} color={LOST_COLOR} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <BreakdownCard title="Por origem" data={byOrigin} />
        <BreakdownCard title="Por responsável" data={byResponsible} />
      </div>
    </div>
  );
}
function StatCard({ icon, label, value, color = '#818CF8' }) {
  return (
    <div style={{ background: '#1E293B', borderRadius: 10, padding: '14px' }}>
      <div style={{ color, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: '#F8FAFC' }}>{value}</div>
      <div style={{ fontSize: 11.5, color: '#64748B' }}>{label}</div>
    </div>
  );
}
function BreakdownCard({ title, data }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(e => e[1]));
  return (
    <div style={{ background: '#1E293B', borderRadius: 10, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#E2E8F0', marginBottom: 12 }}>{title}</div>
      {entries.length === 0 ? (
        <div style={{ fontSize: 12.5, color: '#64748B' }}>Sem dados ainda.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {entries.map(([k, v]) => (
            <div key={k}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#CBD5E1', marginBottom: 3 }}><span>{k}</span><span>{v}</span></div>
              <div style={{ height: 5, background: '#0F172A', borderRadius: 3 }}>
                <div style={{ height: 5, width: `${(v / max) * 100}%`, background: '#6366F1', borderRadius: 3 }} />
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#1E293B', borderRadius: 14, padding: 22, width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', marginTop: -4 }}><X size={18} /></button>
        {children}
      </div>
    </div>
  );
}
