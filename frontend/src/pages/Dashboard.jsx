import React, { useState, useEffect } from 'react';
import { RefreshCw, CreditCard, Music, Calendar, Zap } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

const statusLabels = {
  complete: 'Completo',
  streaming: 'Transmitindo',
  pending: 'Pendente',
};

const statusColors = {
  complete: { bg: '#e8f5e9', color: '#2e7d32' },
  streaming: { bg: '#e3f2fd', color: '#1565c0' },
  pending: { bg: '#fff3e0', color: '#e65100' },
};

const StatusBadge = ({ status }) => {
  const style = statusColors[status] || { bg: '#f5f5f5', color: '#666' };
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: style.bg,
      color: style.color,
      letterSpacing: '0.3px',
    }}>
      {statusLabels[status] || status}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e8e8e8',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    flex: '1 1 220px',
    minWidth: '200px',
    transition: 'box-shadow 0.2s',
  }}>
    <div style={{
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      backgroundColor: color + '12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={24} color={color} strokeWidth={2} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '30px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
        {value ?? '--'}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [limits, setLimits] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [limitsRes, summaryRes, songsRes] = await Promise.allSettled([
      api.get('/suno/limit'),
      api.get('/reports/summary'),
      api.get('/songs?limit=5&sort=created_at&order=DESC'),
    ]);
    if (limitsRes.status === 'fulfilled') setLimits(limitsRes.value.data);
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
    if (songsRes.status === 'fulfilled') setRecentSongs(songsRes.value.data.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/songs/sync');
      alert(`${res.data.synced} musica(s) sincronizada(s)`);
      fetchData();
    } catch (err) {
      console.error('Falha na sincronizacao:', err);
      alert('Falha ao sincronizar. Verifique o console para detalhes.');
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Titulo', render: (val) => val || 'Sem titulo' },
    { key: 'tags', label: 'Estilo', render: (val) => val || '--' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (val) => val
        ? new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '--',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>Painel</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            opacity: syncing ? 0.7 : 1,
            transition: 'opacity 0.2s, background-color 0.2s',
          }}
        >
          <RefreshCw size={16} className={syncing ? 'spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <StatCard icon={CreditCard} label="Creditos Restantes" value={limits?.credits_left} color="#1976d2" />
        <StatCard icon={Music} label="Total de Musicas" value={summary?.total_songs} color="#7b1fa2" />
        <StatCard icon={Calendar} label="Musicas Hoje" value={summary?.songs_today} color="#2e7d32" />
        <StatCard icon={Zap} label="Total de Geracoes" value={summary?.total_generations} color="#e65100" />
      </div>

      <Card title="Musicas Recentes">
        <Table
          columns={columns}
          data={recentSongs}
          loading={loading}
          emptyMessage="Nenhuma musica encontrada."
        />
      </Card>
    </div>
  );
}
