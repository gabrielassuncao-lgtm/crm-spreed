import React, { useState, useEffect } from 'react';
import { User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { FONT, FONT_LOGO } from './styles';
import { useTheme } from './theme.jsx';
import { LOGO_URL, LOGO_RATIO } from './logo.js';

const MIN_PASSWORD = 8;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 30;
const PENDING_KEY = 'crm-pending-invite';

function readPending() {
  try { return localStorage.getItem(PENDING_KEY); } catch (e) { return null; }
}
function savePending(token) {
  try { localStorage.setItem(PENDING_KEY, token); } catch (e) {}
}
function clearPending() {
  try { localStorage.removeItem(PENDING_KEY); } catch (e) {}
}

export default function AuthScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [invite, setInvite] = useState(undefined); // undefined = checando, null = sem convite válido, objeto = válido
  const [inviteToken, setInviteToken] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token) { setInvite(null); return; }
    setInviteToken(token);
    supabase.rpc('get_invite', { p_token: token }).then(({ data }) => {
      const found = Array.isArray(data) ? data[0] : null;
      setInvite(found || null);
      if (found) setMode('register');
    });
  }, []);

  // Atualiza a contagem regressiva do bloqueio temporário
  useEffect(() => {
    if (!lockedUntil) return;
    const t = setInterval(() => {
      setTick(n => n + 1);
      if (Date.now() >= lockedUntil) { setLockedUntil(0); setFailedAttempts(0); }
    }, 1000);
    return () => clearInterval(t);
  }, [lockedUntil]);

  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000)) : 0;

  function goToApp() {
    window.location.replace(window.location.pathname);
  }

  async function redeem(token) {
    const { error } = await supabase.rpc('redeem_invite', { p_token: token });
    return !error;
  }

  async function submit() {
    setErr('');
    setInfo('');

    if (mode === 'forgot') {
      if (!email.trim()) { setErr('Informe seu e-mail.'); return; }
      setLoading(true);
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${window.location.pathname}`,
      });
      setLoading(false);
      // Mesma mensagem sempre, exista a conta ou não, pra ninguém descobrir quem tem conta.
      setInfo('Se esse e-mail tiver uma conta, enviamos um link de redefinição. Confira também o spam.');
      return;
    }

    if (!email.trim() || !password) {
      setErr('Preencha e-mail e senha.');
      return;
    }

    if (mode === 'login') {
      if (secondsLeft > 0) { setErr(`Muitas tentativas. Aguarde ${secondsLeft}s.`); return; }
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) {
        const attempts = failedAttempts + 1;
        setFailedAttempts(attempts);
        if (attempts >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + COOLDOWN_SECONDS * 1000);
          setErr(`Muitas tentativas. Aguarde ${COOLDOWN_SECONDS}s.`);
        } else {
          setErr('E-mail ou senha incorretos.');
        }
      } else {
        // Caso a pessoa tenha criado a conta e só confirmou o e-mail depois, finaliza o convite agora.
        const pending = readPending();
        if (pending) {
          const ok = await redeem(pending);
          clearPending();
          if (ok) { goToApp(); return; }
        }
      }
      setLoading(false);
      return;
    }

    // Cadastro (só com convite válido)
    if (!invite || !inviteToken) { setErr('Convite inválido ou já usado.'); return; }
    if (password.length < MIN_PASSWORD) {
      setErr(`A senha precisa ter pelo menos ${MIN_PASSWORD} caracteres.`);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setErr(traduzErro(error.message));
    } else if (data.session) {
      const ok = await redeem(inviteToken);
      if (ok) { goToApp(); return; }
      await supabase.auth.signOut();
      setErr('Não foi possível usar esse convite. Ele pode ter sido usado ou cancelado.');
    } else {
      // Sem sessão: o e-mail precisa ser confirmado antes. O convite é finalizado no primeiro login.
      savePending(inviteToken);
      setInfo('Conta criada. Confirme seu e-mail e depois entre com sua senha.');
    }
    setLoading(false);
  }

  function traduzErro(msg) {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('User already registered')) return 'Não foi possível criar a conta com esses dados. Se você já tem conta, entre ou use "Esqueci minha senha".';
    if (msg.includes('Password should be') || msg.includes('weak') || msg.includes('pwned')) return 'Essa senha é fraca ou já apareceu em vazamentos. Escolha outra, com pelo menos 8 caracteres.';
    if (msg.toLowerCase().includes('rate limit')) return 'Muitas tentativas. Espere alguns minutos e tente de novo.';
    return 'Não foi possível concluir. Tente de novo.';
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
    borderRadius: 999, padding: '12px 14px 12px 38px', color: theme.textPrimary, fontSize: 14, outline: 'none',
  };
  const primaryBtn = {
    background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 999,
    padding: '12px 18px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer',
  };

  const canRegister = mode === 'register' && invite;
  const blocked = mode === 'login' && secondsLeft > 0;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FONT }}>
      <div className="modal-in glass" style={{
        width: '100%', maxWidth: 380, background: theme.columnBg, border: `1px solid ${theme.borderStrong}`,
        borderRadius: 24, padding: '40px 34px 32px', boxShadow: theme.shadow,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <img src={LOGO_URL} alt="DOXA" width={Math.round(30 * LOGO_RATIO)} height={30}
            style={{ display: 'inline-block', filter: theme.mode === 'light' ? 'invert(1)' : 'none' }} />
          <div className="serif" style={{ fontSize: 30, fontStyle: 'italic', color: theme.textPrimary, margin: '10px 0 0', lineHeight: 1 }}>CRM</div>
          <p className="eyebrow" style={{ margin: '14px 0 0' }}>
            {mode === 'forgot' ? 'Redefinir senha' : canRegister ? 'Crie sua conta de acesso' : 'Entre com sua conta'}
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: mode === 'forgot' ? 14 : 10 }}>
          <div style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }}><UserIcon size={14} /></div>
          <input type="email" autoComplete="email" placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && mode === 'forgot' && submit()} style={inputStyle} />
        </div>
        {mode !== 'forgot' && (
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <div style={{ position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }}><Lock size={14} /></div>
            <input
              type="password"
              autoComplete={canRegister ? 'new-password' : 'current-password'}
              placeholder={canRegister ? `Senha (mín. ${MIN_PASSWORD} caracteres)` : 'Senha'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              style={inputStyle}
            />
          </div>
        )}

        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.lost, fontSize: 12.5, marginBottom: 12, lineHeight: 1.4 }}>
            <AlertCircle size={13} style={{ flexShrink: 0 }} /> {err}
          </div>
        )}
        {info && <div style={{ color: theme.accent, fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>{info}</div>}

        <button onClick={submit} disabled={loading || blocked} style={{ ...primaryBtn, width: '100%', opacity: loading || blocked ? 0.6 : 1 }}>
          {loading ? 'Aguarde...' : blocked ? `Aguarde ${secondsLeft}s` : mode === 'forgot' ? 'Enviar link de redefinição' : canRegister ? 'Criar conta' : 'Entrar'}
        </button>

        {mode === 'login' && (
          <p style={{ textAlign: 'center', fontSize: 11.5, marginTop: 14 }}>
            <span onClick={() => { setMode('forgot'); setErr(''); setInfo(''); }} style={{ color: theme.textPrimary, cursor: 'pointer', fontWeight: 400, textDecoration: 'underline', textUnderlineOffset: 3 }}>
              Esqueci minha senha
            </span>
          </p>
        )}
        {mode === 'forgot' && (
          <p style={{ textAlign: 'center', fontSize: 11.5, marginTop: 14 }}>
            <span onClick={() => { setMode('login'); setErr(''); setInfo(''); }} style={{ color: theme.textMuted, cursor: 'pointer' }}>
              Voltar para o login
            </span>
          </p>
        )}

        {mode === 'login' && invite === null && (
          <p style={{ textAlign: 'center', fontSize: 11.5, color: theme.textMuted, marginTop: 18, lineHeight: 1.5 }}>
            Novas contas só podem ser criadas com um link de convite.
          </p>
        )}
        {canRegister && (
          <p style={{ textAlign: 'center', fontSize: 11.5, color: theme.textMuted, marginTop: 18, lineHeight: 1.5 }}>
            Você foi convidado com acesso de {invite.role === 'viewer' ? 'visualização' : 'edição'}.
          </p>
        )}
      </div>
    </div>
  );
}
