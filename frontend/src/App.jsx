import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { MessageSquare, Send, LogOut, CheckCircle, XCircle, RefreshCw, Smartphone, Lock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function App() {
  const [password, setPassword] = useState(sessionStorage.getItem('wa_password') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('wa_password'));
  const [status, setStatus] = useState('DISCONNECTED');
  const [qr, setQr] = useState(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    const newSocket = io(API_BASE);
    setSocket(newSocket);

    // Initial status fetch
    axios.get(`${API_BASE}/status`, {
        headers: { 'x-access-password': password }
    }).then(res => {
      setStatus(res.data.status);
      setQr(res.data.qr);
    }).catch(err => {
        if (err.response?.status === 401) {
            handleLogoutSite();
            setAlert({ type: 'error', text: 'Senha incorreta!' });
        }
    });

    newSocket.on('status', (data) => {
      setStatus(data.status);
      setQr(data.qr || null);
    });

    return () => {
        newSocket.disconnect();
        newSocket.off('status');
    };
  }, [isAuthenticated]);

  const handleLogin = (e) => {
    e.preventDefault();
    sessionStorage.setItem('wa_password', password);
    setIsAuthenticated(true);
  };

  const handleLogoutSite = () => {
    sessionStorage.removeItem('wa_password');
    setIsAuthenticated(false);
    setPassword('');
    if (socket) socket.disconnect();
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!phone || !message) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/send-message`, 
        { jid: phone, text: message },
        { headers: { 'x-access-password': password } }
      );
      setAlert({ type: 'success', text: 'Mensagem enviada com sucesso!' });
      setMessage('');
    } catch (err) {
      setAlert({ type: 'error', text: 'Erro ao enviar: ' + (err.response?.data?.error || err.message) });
    }
    setLoading(false);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleLogoutWA = async () => {
    if (!confirm('Tem certeza que deseja desconectar o WhatsApp?')) return;
    try {
      await axios.post(`${API_BASE}/logout`, {}, {
          headers: { 'x-access-password': password }
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAuthenticated) {
    return (
        <div className="animate-fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', padding: '1rem' }}>
            <div className="glass-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <Lock size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
                <h2 style={{ marginBottom: '1rem' }}>Acesso Restrito</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Digite a senha de acesso para gerenciar o WhatsApp.</p>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input 
                        type="password" 
                        placeholder="Senha de Acesso" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                    />
                    <button type="submit" className="btn-primary">
                        Entrar no Sistema
                    </button>
                </form>
                {alert && alert.type === 'error' && (
                    <div style={{ marginTop: '1rem', color: '#ef4444', fontSize: '0.875rem' }}>{alert.text}</div>
                )}
            </div>
        </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '3rem', textAlign: 'center', position: 'relative' }}>
        <button 
            onClick={handleLogoutSite} 
            className="btn-secondary"
            style={{ position: 'absolute', right: 0, top: 0, padding: '0.5rem 1rem', fontSize: '0.875rem' }}
        >
            <LogOut size={16} /> Sair do Painel
        </button>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          WhatsApp <span style={{ color: 'var(--primary)' }}>Try</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Painel de Controle Seguro</p>
      </header>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div className={`status-badge ${status === 'CONNECTED' ? 'status-connected' : status === 'QR_READY' ? 'status-waiting' : 'status-disconnected'}`}>
            {status === 'CONNECTED' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {status === 'CONNECTED' ? 'Conectado' : status === 'QR_READY' ? 'Aguardando Escaneamento' : 'Desconectado'}
          </div>
          
          {status === 'CONNECTED' && (
            <button onClick={handleLogoutWA} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <LogOut size={18} /> Desconectar WhatsApp
            </button>
          )}
        </div>

        {status === 'CONNECTED' ? (
          <div className="animate-fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Número do Destinatário (com DDI e DDD)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 5511999999999" 
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>Mensagem</label>
                  <textarea 
                    rows="4"
                    placeholder="Digite sua mensagem aqui..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  ></textarea>
                </div>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? <RefreshCw className="animate-spin" size={18} /> : <Send size={18} />}
                  Enviar Mensagem
                </button>
              </form>
            </div>
          </div>
        ) : status === 'QR_READY' && qr ? (
          <div style={{ textAlign: 'center' }} className="animate-fade-in">
            <div style={{ background: 'white', padding: '1rem', borderRadius: '16px', display: 'inline-block', marginBottom: '1.5rem' }}>
              <img src={qr} alt="QR Code" style={{ width: '256px', height: '256px' }} />
            </div>
            <h3 style={{ marginBottom: '0.5rem' }}>Escaneie o código</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
              Abra o WhatsApp no seu celular, vá em Aparelhos Conectados e escaneie o código acima.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
              <Smartphone size={20} />
              <span>Sincronizando em tempo real...</span>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <RefreshCw className="animate-spin" size={48} style={{ color: 'var(--primary)', marginBottom: '1.5rem' }} />
            <h3>Inicializando motor WhatsApp...</h3>
            <p style={{ color: 'var(--text-muted)' }}>Isso pode levar alguns segundos.</p>
          </div>
        )}

        {alert && (
          <div style={{ 
            marginTop: '2rem', 
            padding: '1rem', 
            borderRadius: '12px', 
            background: alert.type === 'success' ? 'rgba(37, 211, 102, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            color: alert.type === 'success' ? 'var(--primary)' : '#ef4444',
            border: `1px solid ${alert.type === 'success' ? 'var(--primary)' : '#ef4444'}`,
            textAlign: 'center'
          }}>
            {alert.text}
          </div>
        )}
      </div>

      <footer style={{ marginTop: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        &copy; 2026 WhatsApp Try. Acesso Protegido.
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .btn-secondary {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: var(--text-muted);
            border-radius: 8px;
            padding: 0.5rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
        }
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.1);
            color: white;
        }
      `}} />
    </div>
  );
}

export default App;
