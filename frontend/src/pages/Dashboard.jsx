import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, CreditCard, Music, Calendar, Zap, Sparkles, Library, Heart, Trash2, TrendingUp } from 'lucide-react';
import api, { formatDateTime } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
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

const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
];

const StatCard = ({ icon: Icon, label, value, gradient }) => (
  <div style={{
    background: gradient,
    borderRadius: '14px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
    flex: '1 1 220px',
    minWidth: '200px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'default',
  }}
    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; }}
    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)'; }}
  >
    <div style={{
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      backgroundColor: 'rgba(255,255,255,0.25)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      backdropFilter: 'blur(4px)',
    }}>
      <Icon size={24} color="#fff" strokeWidth={2} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '30px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
        {value ?? '--'}
      </div>
    </div>
  </div>
);

const MiniStatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    background: '#fff',
    borderRadius: '10px',
    border: '1px solid #e8e8e8',
    flex: '1 1 160px',
    minWidth: '150px',
  }}>
    <div style={{
      width: '38px',
      height: '38px',
      borderRadius: '10px',
      backgroundColor: color + '15',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={18} color={color} strokeWidth={2} />
    </div>
    <div>
      <div style={{ fontSize: '11px', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
        {value ?? '--'}
      </div>
    </div>
  </div>
);

const formatTotalDuration = (seconds) => {
  if (!seconds) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

const formatGreetingDate = () => {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
};

const getFirstName = (user) => {
  if (!user) return '';
  const name = user.name || user.username || user.email || '';
  return name.split(' ')[0] || name.split('@')[0] || 'Usuario';
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [limits, setLimits] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentSongs, setRecentSongs] = useState([]);
  const [songStats, setSongStats] = useState(null);
  const [weekActivity, setWeekActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const [limitsRes, summaryRes, songsRes, statsRes, activityRes] = await Promise.allSettled([
      api.get('/suno/limit'),
      api.get('/reports/summary'),
      api.get('/songs?limit=5&sort=created_at&order=DESC'),
      api.get('/songs/stats/overview'),
      api.get(`/reports/by-period?group=day&start=${startDate}`),
    ]);
    if (limitsRes.status === 'fulfilled') setLimits(limitsRes.value.data);
    if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
    if (songsRes.status === 'fulfilled') setRecentSongs(songsRes.value.data.data || []);
    if (statsRes.status === 'fulfilled') setSongStats(statsRes.value.data);
    if (activityRes.status === 'fulfilled') {
      const data = activityRes.value.data;
      const items = Array.isArray(data) ? data : (data?.data || []);
      const total = items.reduce((sum, d) => sum + (d.count || d.total || 0), 0);
      setWeekActivity({ total, days: items });
    }
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
    { key: 'title', label: 'Titulo', render: (val) => <span style={{ fontWeight: 500 }}>{val || 'Sem titulo'}</span> },
    { key: 'tags', label: 'Estilo', render: (val) => val || '--' },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val} />,
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (val) => formatDateTime(val),
    },
  ];

  const quickActionStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'transform 0.15s, box-shadow 0.15s',
    textDecoration: 'none',
  };

  return (
    <div>
      {/* Welcome + Sync */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>
            Ola, {getFirstName(user)}!
          </h1>
          <p style={{ margin: 0, fontSize: '14px', color: '#888', textTransform: 'capitalize' }}>
            {formatGreetingDate()}
          </p>
        </div>
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

      {/* Quick Actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate('/generate')}
          style={{
            ...quickActionStyle,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            boxShadow: '0 3px 10px rgba(102,126,234,0.3)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 15px rgba(102,126,234,0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(102,126,234,0.3)'; }}
        >
          <Sparkles size={16} />
          Gerar Musica
        </button>
        <button
          onClick={() => navigate('/songs')}
          style={{
            ...quickActionStyle,
            background: '#fff',
            color: '#555',
            border: '1px solid #e0e0e0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 10px rgba(0,0,0,0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; }}
        >
          <Library size={16} />
          Ver Biblioteca
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard icon={CreditCard} label="Creditos Restantes" value={limits?.credits_left} gradient={gradients[0]} />
        <StatCard icon={Music} label="Total de Musicas" value={summary?.total_songs} gradient={gradients[1]} />
        <StatCard icon={Calendar} label="Musicas Hoje" value={summary?.songs_today} gradient={gradients[2]} />
        <StatCard icon={Zap} label="Total de Geracoes" value={summary?.total_generations} gradient={gradients[3]} />
      </div>

      {/* Song Stats + Week Activity */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 300px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <MiniStatCard
            icon={Music}
            label="Duracao Total"
            value={formatTotalDuration(songStats?.total_duration)}
            color="#7b1fa2"
          />
          <MiniStatCard
            icon={Heart}
            label="Favoritas"
            value={songStats?.favorites_count ?? summary?.favorites_count ?? '--'}
            color="#e91e63"
          />
          <MiniStatCard
            icon={Trash2}
            label="Na Lixeira"
            value={songStats?.trashed_count ?? summary?.trashed_count ?? '--'}
            color="#757575"
          />
        </div>

        {/* Week Activity */}
        <div style={{
          flex: '1 1 280px',
          background: '#fff',
          borderRadius: '10px',
          border: '1px solid #e8e8e8',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingUp size={16} color="#1976d2" />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ultimos 7 dias
            </span>
          </div>
          {weekActivity ? (
            <div>
              <span style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
                {weekActivity.total}
              </span>
              <span style={{ fontSize: '14px', color: '#888', marginLeft: '8px' }}>
                musica{weekActivity.total !== 1 ? 's' : ''} gerada{weekActivity.total !== 1 ? 's' : ''}
              </span>
              {/* Mini bar chart */}
              {weekActivity.days.length > 0 && (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-end', marginTop: '12px', height: '32px' }}>
                  {weekActivity.days.slice(-7).map((d, i) => {
                    const count = d.count || d.total || 0;
                    const max = Math.max(...weekActivity.days.slice(-7).map(x => x.count || x.total || 0), 1);
                    const h = Math.max((count / max) * 28, 3);
                    return (
                      <div
                        key={i}
                        title={`${d.period || d.date || ''}: ${count} musica(s)`}
                        style={{
                          flex: 1,
                          height: `${h}px`,
                          backgroundColor: count > 0 ? '#667eea' : '#e0e0e0',
                          borderRadius: '3px',
                          transition: 'height 0.3s',
                          cursor: 'default',
                          minWidth: '8px',
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '14px', color: '#bbb' }}>Carregando...</span>
          )}
        </div>
      </div>

      {/* Recent Songs Table */}
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
