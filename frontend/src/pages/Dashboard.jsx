import React, { useState, useEffect } from 'react';
import { RefreshCw, CreditCard, Music, Calendar, Zap } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

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
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 600,
      backgroundColor: style.bg,
      color: style.color,
    }}>
      {status}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    flex: '1 1 0',
    minWidth: '200px',
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      backgroundColor: color + '15',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Icon size={24} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#333', marginTop: '2px' }}>
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
      alert(`Synced ${res.data.synced} song(s)`);
      fetchData();
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Sync failed. Check console for details.');
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Title', render: (val) => val || 'Untitled' },
    { key: 'tags', label: 'Style', render: (val) => val || '--' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (val) => val ? new Date(val).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '--',
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#333' }}>Dashboard</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            opacity: syncing ? 0.7 : 1,
          }}
        >
          <RefreshCw size={16} className={syncing ? 'spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync Songs'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard
          icon={CreditCard}
          label="Credits Left"
          value={limits?.credits_left}
          color="#1976d2"
        />
        <StatCard
          icon={Music}
          label="Total Songs"
          value={summary?.total_songs}
          color="#7b1fa2"
        />
        <StatCard
          icon={Calendar}
          label="Songs Today"
          value={summary?.songs_today}
          color="#2e7d32"
        />
        <StatCard
          icon={Zap}
          label="Total Generations"
          value={summary?.total_generations}
          color="#e65100"
        />
      </div>

      <Card title="Recent Songs">
        <Table columns={columns} data={recentSongs} loading={loading} />
      </Card>
    </div>
  );
}
