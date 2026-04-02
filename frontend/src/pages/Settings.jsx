import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Key, UserPlus, Trash2, Copy, Check, Plus, Shield, Loader2,
  Sun, Download, AlertTriangle, Calendar, Music, CreditCard, Eye, EyeOff
} from 'lucide-react';
import api, { formatDate } from '../services/api';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

const inputStyle = {
  flex: 1,
  padding: '10px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '#f9fafb',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const buttonPrimary = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '10px 18px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'background-color 0.15s',
  whiteSpace: 'nowrap',
};

const thStyle = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle = {
  padding: '14px',
  fontSize: '14px',
  color: '#374151',
};

const SectionTitle = ({ children, icon: Icon }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #f3f4f6',
  }}>
    {Icon && <Icon size={20} color="#6b7280" />}
    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>{children}</h2>
  </div>
);

const AccountStat = ({ icon: Icon, label, value, color }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '14px 18px', background: `${color}08`, borderRadius: '10px',
    border: `1px solid ${color}18`, flex: '1 1 160px',
  }}>
    <div style={{
      width: '40px', height: '40px', borderRadius: '10px',
      background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <Icon size={18} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', lineHeight: 1.2, marginTop: '2px' }}>{value ?? '--'}</div>
    </div>
  </div>
);

export default function Settings() {
  const { user } = useAuth();
  const [allowedEmails, setAllowedEmails] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [newEmail, setNewEmail] = useState('');
  const [newKeyName, setNewKeyName] = useState('');
  const [createdKey, setCreatedKey] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountStats, setAccountStats] = useState(null);

  // Modals
  const [showRevokeModal, setShowRevokeModal] = useState(null);
  const [showRemoveEmailModal, setShowRemoveEmailModal] = useState(null);
  const [showCleanTrashModal, setShowCleanTrashModal] = useState(false);
  const [cleaningTrash, setCleaningTrash] = useState(false);
  const [exportingData, setExportingData] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [keysRes, emailsRes, statsRes] = await Promise.allSettled([
      api.get('/keys'),
      user?.is_admin ? api.get('/users/allowed') : Promise.resolve({ data: [] }),
      api.get('/reports/summary'),
    ]);
    if (keysRes.status === 'fulfilled') setApiKeys(keysRes.value.data);
    if (emailsRes.status === 'fulfilled') setAllowedEmails(emailsRes.value.data);
    if (statsRes.status === 'fulfilled') setAccountStats(statsRes.value.data);
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
    try {
      await api.delete(`/users/allowed/${id}`);
      setShowRemoveEmailModal(null);
      loadData();
    } catch (err) {
      alert('Falha ao remover email.');
    }
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
    try {
      await api.delete(`/keys/${id}`);
      setShowRevokeModal(null);
      loadData();
    } catch (err) {
      alert('Falha ao revogar chave.');
    }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCleanTrash = async () => {
    setCleaningTrash(true);
    try {
      await api.delete('/songs/trash');
      setShowCleanTrashModal(false);
    } catch (err) {
      alert('Falha ao limpar lixeira.');
    } finally {
      setCleaningTrash(false);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const res = await api.get('/songs?limit=9999');
      const songs = res.data?.songs || res.data || [];
      const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mysuno-dados-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Falha ao exportar dados.');
    } finally {
      setExportingData(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#9ca3af' }}>
        <Loader2 size={28} className="spin" style={{ marginRight: '12px' }} />
        <span style={{ fontSize: '15px', fontWeight: 500 }}>Carregando...</span>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 32px', fontSize: '26px', fontWeight: 700, color: '#111827' }}>Configuracoes</h1>

      {/* ========== CONTA ========== */}
      <div style={{ marginBottom: '32px' }}>
        <SectionTitle icon={Shield}>Conta</SectionTitle>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            {user?.picture && (
              <img
                src={user.picture}
                alt=""
                style={{ width: 60, height: 60, borderRadius: '50%', border: '3px solid #e5e7eb' }}
              />
            )}
            <div>
              <div style={{ fontWeight: 700, fontSize: '18px', color: '#111827' }}>{user?.name}</div>
              <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '2px' }}>{user?.email}</div>
              {user?.is_admin && (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '4px',
                  marginTop: '8px', padding: '4px 12px', background: '#dbeafe',
                  color: '#1d4ed8', borderRadius: '50px', fontSize: '12px', fontWeight: 600,
                }}>
                  <Shield size={12} /> Administrador
                </span>
              )}
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <AccountStat
              icon={Calendar}
              label="Membro desde"
              value={formatDate(user?.created_at)}
              color="#3b82f6"
            />
            <AccountStat
              icon={Music}
              label="Musicas geradas"
              value={accountStats?.total_songs}
              color="#8b5cf6"
            />
            <AccountStat
              icon={CreditCard}
              label="Creditos usados"
              value={accountStats?.total_credits_used}
              color="#10b981"
            />
          </div>
        </Card>
      </div>

      {/* ========== APARENCIA ========== */}
      <div style={{ marginBottom: '32px' }}>
        <SectionTitle icon={Sun}>Aparencia</SectionTitle>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Tema</div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>Escolha o tema visual do sistema</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: '#3b82f6', color: '#fff', border: '1px solid #3b82f6', cursor: 'pointer',
              }}>
                <Sun size={14} style={{ marginRight: '6px', verticalAlign: '-2px' }} />
                Claro
              </button>
              <button style={{
                padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
                background: '#fff', color: '#9ca3af', border: '1px solid #e5e7eb', cursor: 'not-allowed',
                opacity: 0.5,
              }}>
                Escuro
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ========== EMAILS AUTORIZADOS ========== */}
      {user?.is_admin && (
        <div style={{ marginBottom: '32px' }}>
          <SectionTitle icon={UserPlus}>Emails Autorizados</SectionTitle>
          <Card>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
              <input
                type="email"
                placeholder="email@exemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addEmail()}
                style={inputStyle}
                onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)'; }}
                onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
              />
              <button onClick={addEmail} style={buttonPrimary}>
                <UserPlus size={16} /> Adicionar
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Adicionado em</th>
                    <th style={{ width: '60px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {allowedEmails.map((e) => (
                    <tr key={e.id} style={{ borderBottom: '1px solid #f9fafb', transition: 'background 0.1s' }}>
                      <td style={tdStyle}>{e.email}</td>
                      <td style={{ ...tdStyle, color: '#9ca3af', fontSize: '13px' }}>
                        {formatDate(e.created_at)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <button
                          onClick={() => setShowRemoveEmailModal(e)}
                          title="Remover"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {allowedEmails.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#d1d5db', fontSize: '14px' }}>
                        Nenhum email autorizado cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* ========== CHAVES DE API ========== */}
      <div style={{ marginBottom: '32px' }}>
        <SectionTitle icon={Key}>Chaves de API</SectionTitle>
        <Card>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Nome da chave"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKey()}
              style={inputStyle}
              onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
            />
            <button onClick={createKey} style={buttonPrimary}>
              <Plus size={16} /> Criar Chave
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Chave</th>
                  <th style={thStyle}>Ultimo uso</th>
                  <th style={thStyle}>Requisicoes</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {apiKeys.map((k) => (
                  <tr key={k.id} style={{ borderBottom: '1px solid #f9fafb', opacity: k.revoked ? 0.45 : 1, transition: 'background 0.1s' }}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{k.name}</td>
                    <td style={{ ...tdStyle, fontFamily: '"Fira Code", monospace', fontSize: '13px', color: '#9ca3af' }}>
                      {k.key_prefix}...****
                    </td>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontSize: '13px' }}>
                      {k.last_used_at ? formatDate(k.last_used_at) : 'Nunca'}
                    </td>
                    <td style={{ ...tdStyle, color: '#9ca3af', fontSize: '13px', textAlign: 'center' }}>
                      {k.request_count ?? '\u2014'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: 600,
                        background: k.revoked ? '#fef2f2' : '#dcfce7',
                        color: k.revoked ? '#dc2626' : '#15803d',
                      }}>
                        {k.revoked ? 'Revogada' : 'Ativa'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      {!k.revoked && (
                        <button
                          onClick={() => setShowRevokeModal(k)}
                          title="Revogar"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '6px' }}
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {apiKeys.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#d1d5db', fontSize: '14px' }}>
                      <Key size={32} color="#e5e7eb" style={{ marginBottom: '10px' }} />
                      <div>Nenhuma chave de API criada.</div>
                      <div style={{ fontSize: '13px', marginTop: '4px', color: '#d1d5db' }}>Crie uma chave para integrar com outros sistemas.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{
            marginTop: '20px', padding: '16px 20px', background: '#f9fafb', borderRadius: '10px',
            border: '1px solid #f3f4f6', fontSize: '13px', color: '#6b7280', lineHeight: 1.7,
          }}>
            <strong style={{ color: '#374151' }}>Como usar:</strong> Inclua a chave no header{' '}
            <code style={{ backgroundColor: '#e5e7eb', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>X-API-Key</code>{' '}
            das suas requisicoes.
            <br />
            <code style={{
              display: 'block', marginTop: '10px', padding: '12px 16px', background: '#1f2937',
              borderRadius: '8px', fontSize: '12px', color: '#a5f3fc', overflowX: 'auto',
            }}>
              curl -H "X-API-Key: mysn_..." https://api.mysn.vipte.co/api/songs
            </code>
          </div>
        </Card>
      </div>

      {/* ========== ZONA DE PERIGO ========== */}
      <div style={{ marginBottom: '32px' }}>
        <SectionTitle icon={AlertTriangle}>Zona de Perigo</SectionTitle>
        <div style={{
          borderRadius: '14px', border: '1px solid #fecaca', background: '#fff',
          overflow: 'hidden',
        }}>
          {/* Limpar Lixeira */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px', borderBottom: '1px solid #fee2e2',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#991b1b' }}>Limpar Lixeira</div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                Remove permanentemente todas as musicas excluidas. Esta acao nao pode ser desfeita.
              </div>
            </div>
            <button
              onClick={() => setShowCleanTrashModal(true)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', background: '#fff', color: '#dc2626',
                border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: 600, transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <Trash2 size={15} /> Limpar Lixeira
            </button>
          </div>

          {/* Exportar Dados */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px',
          }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>Exportar Dados</div>
              <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
                Baixe todas as suas musicas em formato JSON.
              </div>
            </div>
            <button
              onClick={handleExportData}
              disabled={exportingData}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', background: '#fff', color: '#374151',
                border: '1px solid #e5e7eb', borderRadius: '8px',
                cursor: exportingData ? 'not-allowed' : 'pointer',
                fontSize: '14px', fontWeight: 600, transition: 'all 0.15s',
                whiteSpace: 'nowrap', opacity: exportingData ? 0.6 : 1,
              }}
            >
              {exportingData ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
              {exportingData ? 'Exportando...' : 'Exportar Dados'}
            </button>
          </div>
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Modal: Chave criada */}
      <Modal isOpen={!!createdKey} onClose={() => setCreatedKey(null)} title="Chave de API Criada">
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '18px', lineHeight: 1.6 }}>
          Copie esta chave agora. Voce nao podera ve-la novamente.
        </p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <code style={{
            flex: 1, padding: '14px', background: '#f9fafb', borderRadius: '8px',
            fontSize: '13px', wordBreak: 'break-all', border: '1px solid #e5e7eb',
            color: '#374151', fontFamily: '"Fira Code", monospace',
          }}>
            {createdKey}
          </code>
          <button
            onClick={copyKey}
            style={{
              padding: '12px', background: copied ? '#10b981' : '#3b82f6',
              color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
              transition: 'background-color 0.2s', flexShrink: 0,
            }}
          >
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
        {copied && (
          <p style={{ fontSize: '13px', color: '#10b981', marginTop: '10px', fontWeight: 600 }}>
            Chave copiada para a area de transferencia!
          </p>
        )}
      </Modal>

      {/* Modal: Confirmar revogacao de chave */}
      <Modal isOpen={!!showRevokeModal} onClose={() => setShowRevokeModal(null)} title="Revogar Chave de API">
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px', lineHeight: 1.6 }}>
          Tem certeza que deseja revogar a chave <strong style={{ color: '#374151' }}>{showRevokeModal?.name}</strong>?
        </p>
        <p style={{ fontSize: '13px', color: '#ef4444', marginBottom: '20px' }}>
          Esta acao nao pode ser desfeita. Todas as integracoes usando esta chave deixarao de funcionar.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowRevokeModal(null)}
            style={{
              padding: '10px 20px', background: '#fff', color: '#6b7280',
              border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => revokeKey(showRevokeModal.id)}
            style={{
              padding: '10px 20px', background: '#ef4444', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600,
            }}
          >
            Revogar
          </button>
        </div>
      </Modal>

      {/* Modal: Confirmar remocao de email */}
      <Modal isOpen={!!showRemoveEmailModal} onClose={() => setShowRemoveEmailModal(null)} title="Remover Email">
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.6 }}>
          Tem certeza que deseja remover <strong style={{ color: '#374151' }}>{showRemoveEmailModal?.email}</strong> da lista de emails autorizados?
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowRemoveEmailModal(null)}
            style={{
              padding: '10px 20px', background: '#fff', color: '#6b7280',
              border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => removeEmail(showRemoveEmailModal.id)}
            style={{
              padding: '10px 20px', background: '#ef4444', color: '#fff',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600,
            }}
          >
            Remover
          </button>
        </div>
      </Modal>

      {/* Modal: Confirmar limpar lixeira */}
      <Modal isOpen={showCleanTrashModal} onClose={() => setShowCleanTrashModal(false)} title="Limpar Lixeira">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '14px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fecaca' }}>
          <AlertTriangle size={20} color="#dc2626" />
          <span style={{ fontSize: '14px', color: '#991b1b', fontWeight: 500 }}>Esta acao nao pode ser desfeita.</span>
        </div>
        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.6 }}>
          Todas as musicas na lixeira serao permanentemente excluidas. Voce nao podera recupera-las.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowCleanTrashModal(false)}
            style={{
              padding: '10px 20px', background: '#fff', color: '#6b7280',
              border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 500,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleCleanTrash}
            disabled={cleaningTrash}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 20px', background: '#dc2626', color: '#fff',
              border: 'none', borderRadius: '8px',
              cursor: cleaningTrash ? 'not-allowed' : 'pointer',
              fontSize: '14px', fontWeight: 600, opacity: cleaningTrash ? 0.7 : 1,
            }}
          >
            {cleaningTrash ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
            {cleaningTrash ? 'Limpando...' : 'Limpar Lixeira'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
