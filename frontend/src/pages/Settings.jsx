import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Key, UserPlus, Trash2, Copy, Check, Plus, Shield, Loader2 } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

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
      alert(err.response?.data?.error || 'Failed to add email');
    }
  };

  const removeEmail = async (id) => {
    if (!confirm('Remove this email from allowed list?')) return;
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
      alert(err.response?.data?.error || 'Failed to create key');
    }
  };

  const revokeKey = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    await api.delete(`/keys/${id}`);
    loadData();
  };

  const copyKey = () => {
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="loading-spinner" />;

  return (
    <div>
      <h1 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: 700, color: '#333' }}>Settings</h1>

      {/* User Info */}
      <Card title="Account">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user?.picture && <img src={user.picture} alt="" style={{ width: 48, height: 48, borderRadius: '50%' }} />}
          <div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>{user?.name}</div>
            <div style={{ color: '#666', fontSize: '14px' }}>{user?.email}</div>
            {user?.is_admin && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', padding: '2px 8px', background: '#e3f2fd', color: '#1565c0', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                <Shield size={12} /> Admin
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Allowed Emails (admin only) */}
      {user?.is_admin && (
        <Card title="Allowed Emails">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="email"
              placeholder="email@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addEmail()}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }}
            />
            <button onClick={addEmail} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
              <UserPlus size={16} /> Add
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#666' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#666' }}>Added</th>
                <th style={{ width: '60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {allowedEmails.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 8px', fontSize: '14px' }}>{e.email}</td>
                  <td style={{ padding: '10px 8px', fontSize: '13px', color: '#888' }}>{new Date(e.created_at).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <button onClick={() => removeEmail(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* API Keys */}
      <Card title="API Keys">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="Key name (e.g. My Integration)"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createKey()}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #e0e0e0', borderRadius: '6px', fontSize: '14px' }}
          />
          <button onClick={createKey} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>
            <Plus size={16} /> Create
          </button>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#666' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#666' }}>Key</th>
              <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#666' }}>Last Used</th>
              <th style={{ textAlign: 'left', padding: '8px', fontSize: '13px', color: '#666' }}>Status</th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {apiKeys.map(k => (
              <tr key={k.id} style={{ borderBottom: '1px solid #f0f0f0', opacity: k.revoked ? 0.5 : 1 }}>
                <td style={{ padding: '10px 8px', fontSize: '14px' }}>{k.name}</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', fontFamily: 'monospace', color: '#666' }}>{k.key_prefix}...****</td>
                <td style={{ padding: '10px 8px', fontSize: '13px', color: '#888' }}>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('pt-BR') : 'Never'}</td>
                <td style={{ padding: '10px 8px' }}>
                  <span style={{
                    padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                    background: k.revoked ? '#fce4ec' : '#e8f5e9',
                    color: k.revoked ? '#c62828' : '#2e7d32',
                  }}>
                    {k.revoked ? 'Revoked' : 'Active'}
                  </span>
                </td>
                <td style={{ padding: '10px 8px' }}>
                  {!k.revoked && (
                    <button onClick={() => revokeKey(k.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d32f2f', padding: '4px' }}>
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {apiKeys.length === 0 && (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>No API keys yet</td></tr>
            )}
          </tbody>
        </table>

        <div style={{ marginTop: '16px', padding: '12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '13px', color: '#666' }}>
          <strong>Usage:</strong> Include the API key in the <code>X-API-Key</code> header of your requests.
          <br />
          <code style={{ display: 'block', marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
            curl -H "X-API-Key: mysn_..." https://api.mysn.vipte.co/api/songs
          </code>
        </div>
      </Card>

      {/* Modal: show created key */}
      <Modal isOpen={!!createdKey} onClose={() => setCreatedKey(null)} title="API Key Created">
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
          Copy this key now. You won't be able to see it again.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <code style={{ flex: 1, padding: '12px', background: '#f5f5f5', borderRadius: '6px', fontSize: '13px', wordBreak: 'break-all', border: '1px solid #e0e0e0' }}>
            {createdKey}
          </code>
          <button onClick={copyKey} style={{ padding: '10px', background: copied ? '#2e7d32' : '#1976d2', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
      </Modal>
    </div>
  );
}
