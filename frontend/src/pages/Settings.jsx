import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, UserPlus, Trash2, Copy, Check, Plus, Shield, Loader2 } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

const inputStyle = {
  flex: 1,
  padding: '10px 14px',
  border: '1px solid #e0e0e0',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '#fafafa',
  transition: 'border-color 0.2s',
  fontFamily: 'inherit',
};

const buttonPrimary = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '10px 18px',
  background: '#1976d2',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'background-color 0.2s',
  whiteSpace: 'nowrap',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 12px',
  fontSize: '12px',
  fontWeight: 600,
  color: '#999',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const tdStyle = {
  padding: '12px',
  fontSize: '14px',
  color: '#333',
};

export default function Settings() {
  const { user } = useAuth();
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [keysRes, emailsRes] = await Promise.allSettled([
      api.get('/keys'),
      user?.is_admin ? api.get('/users/allowed') : Promise.resolve({ data: [] }),
    ]);
    if (keysRes.status === 'fulfilled') setApiKeys(keysRes.value.data);
    if (emailsRes.status === 'fulfilled') setAllowedEmails(emailsRes.value.data);
    setLoading(false);
  };

  const addEmail = async () => {
    if (!newEmail.trim()) return;
    try {
      await api.post('/users/allowed', { email: newEmail.trim() });
      setNewEmail('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Falha ao adicionar email');
    }
  };

  const removeEmail = async (id) => {
    if (!window.confirm('Remover este email da lista de autorizados?')) return;
    await api.delete(`/users/allowed/${id}`);
    loadData();
  };

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const res = await api.post('/keys', { name: newKeyName.trim() });
      setCreatedKey(res.data.key);
      setNewKeyName('');
      loadData();
    } catch (err) {
      alert(err.response?.data?.error || 'Falha ao criar chave');
    }
  };

  const revokeKey = async (id) => {
    if (!window.confirm('Revogar esta chave de API? Esta acao nao pode ser desfeita.')) return;
    await api.delete(`/keys/${id}`);
    loadData();
  };

  const copyKey = () => {
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#888' }}>
        <Loader2 size={28} className="spin" style={{ marginRight: '10px' }} />
        Carregando...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 28px', fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>Configuracoes</h1>

      {/* Conta */}
      <div style={{ marginBottom: '24px' }}>
        <Card title="Conta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {user?.picture && (
              <img
                src={user.picture}
                alt=""
                style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid #e8e8e8' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: '17px', color: '#1a1a1a' }}>{user?.name}</div>
              <div style={{ color: '#777', fontSize: '14px', marginTop: '2px' }}>{user?.email}</div>
              {user?.is_admin && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '6px',
                  padding: '3px 10px',
                  background: '#e3f2fd',
                  color: '#1565c0',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}>
                  <Shield size={12} /> Administrador
                </span>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Emails Autorizados (admin) */}
      {user?.is_admin && (
        <div style={{ marginBottom: '24px' }}>
          <Card title="Emails Autorizados">
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; }}
              />
              <button onClick={addEmail} style={buttonPrimary}>
                <UserPlus size={16} /> Adicionar
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Adicionado em</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {allowedEmails.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={tdStyle}>{e.email}</td>
                      <td style={{ ...tdStyle, color: '#888', fontSize: '13px' }}>
                        {new Date(e.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => removeEmail(e.id)}
                          title="Remover"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allowedEmails.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '24px', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
                        Nenhum email autorizado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Chaves de API */}
      <div style={{ marginBottom: '24px' }}>
        <Card title="Chaves de API">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Nome da chave"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; }}
            />
            <button onClick={createKey} style={buttonPrimary}>
              <Plus size={16} /> Criar
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Chave</th>
                  <th style={thStyle}>Ultimo uso</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={k.id} style={{ borderBottom: '1px solid #f5f5f5', opacity: k.revoked ? 0.5 : 1 }}>
                    <td style={tdStyle}>{k.name}</td>
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px', color: '#777' }}>
                      {k.key_prefix}...****
                    </td>
                    <td style={{ ...tdStyle, color: '#888', fontSize: '13px' }}>
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('pt-BR') : 'Nunca'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: 600,
                        background: k.revoked ? '#fef2f2' : '#e8f5e9',
                        color: k.revoked ? '#dc2626' : '#2e7d32',
                      }}>
                        {k.revoked ? 'Revogada' : 'Ativa'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {!k.revoked && (
                        <button
                          onClick={() => revokeKey(k.id)}
                          title="Revogar"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', padding: '4px' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {apiKeys.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#bbb', fontSize: '14px' }}>
                      Nenhuma chave de API criada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '14px 18px',
            background: '#f8f9fa',
            borderRadius: '10px',
            border: '1px solid #e8e8e8',
            fontSize: '13px',
            color: '#666',
            lineHeight: 1.7,
          }}>
            <strong style={{ color: '#555' }}>Como usar:</strong> Inclua a chave no header <code style={{ backgroundColor: '#e8e8e8', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>X-API-Key</code> das suas requisicoes.
            <br />
            <code style={{
              display: 'block',
              marginTop: '10px',
              padding: '10px 14px',
              background: '#fff',
              borderRadius: '6px',
              border: '1px solid #e0e0e0',
              fontSize: '12px',
              color: '#555',
              overflowX: 'auto',
            }}>
              curl -H "X-API-Key: mysn_..." https://api.mysn.vipte.co/api/songs
            </code>
          </div>
        </Card>
      </div>

      {/* Modal: chave criada */}
      <Modal isOpen={!!createdKey} onClose={() => setCreatedKey(null)} title="Chave de API Criada">
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '18px', lineHeight: 1.6 }}>
          Copie esta chave agora. Voce nao podera ve-la novamente.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <code style={{
            flex: 1,
            padding: '14px',
            background: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '13px',
            wordBreak: 'break-all',
            border: '1px solid #e0e0e0',
            color: '#333',
            fontFamily: 'monospace',
          }}>
            {createdKey}
          </code>
          <button
            onClick={copyKey}
            style={{
              padding: '12px',
              background: copied ? '#2e7d32' : '#1976d2',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              flexShrink: 0,
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
        {copied && (
          <p style={{ fontSize: '13px', color: '#2e7d32', marginTop: '10px', fontWeight: 500 }}>
            Chave copiada para a area de transferencia!
          </p>
        )}
      </Modal>
    </div>
  );
}
