import React, { useState } from 'react';
import { GitBranch, User as UserIcon, Lock, AlertCircle } from 'lucide-react';
import { supabase } from './lib/supabaseClient';
import { inputStyle, primaryBtn, colors, FONT } from './styles';

export default function AuthScreen() {
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

  return (
    <div style={{ minHeight: 440, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: FONT }}>
      <div style={{ width: '100%', maxWidth: 300 }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 11, background: colors.surfaceAlt, border: `1px solid ${colors.border}`,
            margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GitBranch size={19} color={colors.accent} strokeWidth={1.8} />
          </div>
          <h1 style={{ fontSize: 17, fontWeight: 650, margin: 0, color: colors.text, letterSpacing: -0.2 }}>CRM de vendas</h1>
          <p style={{ fontSize: 12.5, color: colors.textFaint, margin: '5px 0 0' }}>
            {mode === 'login' ? 'Entre com sua conta' : 'Crie sua conta de acesso'}
          </p>
        </div>

        <div style={{ position: 'relative', marginBottom: 10 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textFaint }}><UserIcon size={14} /></div>
          <input placeholder="E-mail" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: colors.textFaint }}><Lock size={14} /></div>
          <input type="password" placeholder="Senha (mín. 6 caracteres)" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} style={inputStyle} />
        </div>

        {err && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#F0958D', fontSize: 12.5, marginBottom: 12 }}>
            <AlertCircle size={13} /> {err}
          </div>
        )}
        {info && <div style={{ color: '#9FB4F0', fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>{info}</div>}

        <button onClick={submit} disabled={loading} style={{ ...primaryBtn, width: '100%', opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12.5, color: colors.textFaint, marginTop: 18 }}>
          {mode === 'login' ? 'Ainda não tem conta? ' : 'Já tem conta? '}
          <span onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); setInfo(''); }}
            style={{ color: colors.accent, cursor: 'pointer', fontWeight: 600 }}>
            {mode === 'login' ? 'Criar agora' : 'Entrar'}
          </span>
        </p>
      </div>
    </div>
  );
}
