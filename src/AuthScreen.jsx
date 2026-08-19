import React, { useState } from 'react';
import { User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { FONT, FONT_LOGO } from './styles';
import { useTheme } from './theme.jsx';

export default function AuthScreen() {
  const { theme } = useTheme();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr('');
    setInfo('');
    if (!email.trim() || !password.trim()) {
      setErr('Preencha e-mail e senha.');
      return;
    }
    setLoading(true);
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) setErr(traduzErro(error.message));
    } else {
      const { error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) {
        setErr(traduzErro(error.message));
      } else {
        setInfo('Conta criada. Se a confirmação por e-mail estiver ativa no seu projeto Supabase, verifique a caixa de entrada antes de entrar.');
      }
    }
    setLoading(false);
  }

  function traduzErro(msg) {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('User already registered')) return 'Esse e-mail já tem conta. Tente entrar.';
    if (msg.includes('Password should be')) return 'A senha precisa ter pelo menos 6 caracteres.';
    return msg;
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', background: theme.surfaceAlt, border: `1px solid ${theme.border}`,
    borderRadius: 10, padding: '11px 12px 11px 34px', color: theme.textPrimary, fontSize: 14, outline: 'none',
  };
  const primaryBtn = {
    background: theme.accent, color: theme.accentText, border: 'none', borderRadius: 9,
    padding: '10px 16px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
  };

  return (
    <div style={{ minHeight: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FONT }}>
      <div style={{ width: '100%', maxWidth: 300 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, color: theme.textPrimary, fontFamily: FONT_LOGO, letterSpacing: -0.3 }}>
            CRM <span style={{ color: theme.accent }}>DOXA</span>
          </h1>
          <p style={{ fontSize: 12.5, color: theme.textMuted, margin: '6px 0 0' }}>
            {mode === 'login' ? 'Entre com sua conta' : 'Crie sua conta de acesso'}
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }}><UserIcon size={14} /></div>
          <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: theme.textMuted }}><Lock size={14} /></div>
          <input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} style={inputStyle} />
        </div>

        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.lost, fontSize: 12.5, marginBottom: 12 }}>
            <AlertCircle size={13} /> {err}
          </div>
        )}
        {info && <div style={{ color: theme.accent, fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>{info}</div>}

        <button onClick={submit} disabled={loading} style={{ ...primaryBtn, width: '100%', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: theme.textMuted, marginTop: 18 }}>
          {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); setInfo(''); }}
            style={{ color: theme.accent, cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'login' ? 'Criar agora' : 'Entrar'}
          </span>
        </p>
      </div>
    </div>
  );
}
