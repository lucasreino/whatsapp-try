import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { MessageSquare, Send, LogOut, CheckCircle, XCircle, RefreshCw, Smartphone } from 'lucide-react';

const API_BASE = 'http://localhost:3001';
const socket = io(API_BASE);

function App() {
  const [status, setStatus] = useState('DISCONNECTED');
  const [qr, setQr] = useState(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    // Initial status fetch
    axios.get(`${API_BASE}/status`).then(res => {
      setStatus(res.data.status);
      setQr(res.data.qr);
    });

    socket.on('status', (data) => {
      setStatus(data.status);
      setQr(data.qr || null);
    });

    return () => socket.off('status');
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!phone || !message) return;
    setLoading(true);
    try {
      await axios.post(`${API_BASE}/send-message`, { jid: phone, text: message });
      setAlert({ type: 'success', text: 'Mensagem enviada com sucesso!' });
      setMessage('');
    } catch (err) {
      setAlert({ type: 'error', text: 'Erro ao enviar: ' + err.response?.data?.error });
    }
    setLoading(false);
    setTimeout(() => setAlert(null), 3000);
  };

  const handleLogout = async () => {
    if (!confirm('Tem certeza que deseja desconectar?')) return;
    try {
      await axios.post(`${API_BASE}/logout`);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="animate-fade-in">
      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          WhatsApp <span style={{ color: 'var(--primary)' }}>Try</span>
        </h1>
        <p style={{ color: 'var(--text-muted)' }}>Gerencie sua conexão de forma simples e elegante</p>
      </header>

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div className={`status-badge ${status === 'CONNECTED' ? 'status-connected' : status === 'QR_READY' ? 'status-waiting' : 'status-disconnected'}`}>
            {status === 'CONNECTED' ? <CheckCircle size={18} /> : <XCircle size={18} />}
            {status === 'CONNECTED' ? 'Conectado' : status === 'QR_READY' ? 'Aguardando Escaneamento' : 'Desconectado'}
          </div>
          
          {status === 'CONNECTED' && (
            <button onClick={handleLogout} className="btn-primary" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <LogOut size={18} /> Sair
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
        &copy; 2026 WhatsApp Try. Desenvolvido com Antigravity.
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}

export default App;
