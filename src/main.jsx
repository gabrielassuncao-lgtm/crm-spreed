import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { ThemeProvider, ValuesVisibilityProvider, GlobalStyle } from './theme.jsx';

// Se algo quebrar na tela, mostra uma mensagem em vez de deixar a tela toda preta.
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) { console.error('Erro na tela:', error); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 24, textAlign: 'center', color: '#e8e8ea', fontFamily: "'Poppins', sans-serif" }}>
        <div style={{ fontSize: 18 }}>Algo deu errado nesta tela.</div>
        <div style={{ fontSize: 13, opacity: 0.65 }}>Seus dados estão salvos. Recarregue para continuar.</div>
        <button
          onClick={() => window.location.reload()}
          style={{ background: '#f4f4f2', color: '#111', border: 'none', borderRadius: 999, padding: '10px 22px', fontSize: 13.5, fontWeight: 500, cursor: 'pointer' }}
        >
          Recarregar
        </button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <GlobalStyle />
        <ValuesVisibilityProvider>
          <App />
        </ValuesVisibilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
