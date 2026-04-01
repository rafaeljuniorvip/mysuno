import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Play, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import AudioPlayer from '../components/ui/AudioPlayer';

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

const actionBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  background: '#fff',
  cursor: 'pointer',
  color: '#666',
  transition: 'background-color 0.15s, border-color 0.15s',
};

const pageBtnStyle = (disabled) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '34px',
  height: '34px',
  padding: '0 10px',
  border: '1px solid #e0e0e0',
  borderRadius: '6px',
  background: '#fff',
  cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#ccc' : '#333',
  fontSize: '13px',
  fontWeight: 500,
  transition: 'background-color 0.15s',
});

export default function Songs() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [playerSong, setPlayerSong] = useState(null);

  const fetchSongs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sort: 'created_at',
        order: 'DESC',
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await api.get(`/songs?${params.toString()}`);
      setSongs(res.data.data || []);
      setPagination(res.data.pagination || { page, limit: 20, total: 0, pages: 1 });
    } catch (err) {
      console.error('Falha ao buscar musicas:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSongs(1);
  }, [fetchSongs]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/songs/sync');
      alert(`${res.data.synced} musica(s) sincronizada(s)`);
      fetchSongs(pagination.page);
    } catch (err) {
      console.error('Falha na sincronizacao:', err);
      alert('Falha ao sincronizar.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta musica?')) return;
    try {
      await api.delete(`/songs/${id}`);
      fetchSongs(pagination.page);
    } catch (err) {
      console.error('Falha ao excluir:', err);
      alert('Falha ao excluir musica.');
    }
  };

  const formatDuration = (val) => {
    if (!val) return '--';
    const mins = Math.floor(val / 60);
    const secs = Math.floor(val % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const columns = [
    {
      key: 'title',
      label: 'Titulo',
      render: (val) => (
        <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{val || 'Sem titulo'}</span>
      ),
    },
    {
      key: 'prompt',
      label: 'Prompt',
      render: (val) => (
        <span style={{ color: '#777', fontSize: '13px' }} title={val}>
          {val ? (val.length > 60 ? val.substring(0, 60) + '...' : val) : '--'}
        </span>
      ),
    },
    {
      key: 'tags',
      label: 'Estilo',
      render: (val) => val || '--',
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => {
        const s = statusColors[val] || { bg: '#f5f5f5', color: '#666' };
        return (
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: s.bg,
            color: s.color,
          }}>
            {statusLabels[val] || val || 'Desconhecido'}
          </span>
        );
      },
    },
    {
      key: 'duration',
      label: 'Duracao',
      render: (val) => formatDuration(val),
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (val) => val ? new Date(val).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }) : '--',
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {row.audio_url && (
            <button
              onClick={() => setPlayerSong(row)}
              title="Reproduzir"
              style={actionBtnStyle}
            >
              <Play size={14} />
            </button>
          )}
          <button
            onClick={() => navigate(`/songs/${row.id}`)}
            title="Ver detalhes"
            style={actionBtnStyle}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            title="Excluir"
            style={{ ...actionBtnStyle, color: '#d32f2f' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const filterBtnStyle = (active) => ({
    padding: '8px 16px',
    border: '1px solid',
    borderColor: active ? '#1976d2' : '#e0e0e0',
    borderRadius: '6px',
    backgroundColor: active ? '#e3f2fd' : '#fff',
    color: active ? '#1976d2' : '#666',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>Musicas</h1>
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
          }}
        >
          <RefreshCw size={16} className={syncing ? 'spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 320px', maxWidth: '440px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            type="text"
            placeholder="Buscar por titulo, prompt ou estilo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 38px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: '#fafafa',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
            onBlur={(e) => { e.target.style.borderColor = '#e0e0e0'; }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button style={filterBtnStyle(statusFilter === '')} onClick={() => setStatusFilter('')}>Todos</button>
          <button style={filterBtnStyle(statusFilter === 'pending')} onClick={() => setStatusFilter('pending')}>Pendente</button>
          <button style={filterBtnStyle(statusFilter === 'streaming')} onClick={() => setStatusFilter('streaming')}>Transmitindo</button>
          <button style={filterBtnStyle(statusFilter === 'complete')} onClick={() => setStatusFilter('complete')}>Completo</button>
        </div>
      </div>

      <Card>
        <Table
          columns={columns}
          data={songs}
          loading={loading}
          emptyMessage="Nenhuma musica encontrada."
        />

        {/* Paginacao */}
        {pagination.pages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #f0f0f0',
          }}>
            <span style={{ fontSize: '13px', color: '#888' }}>
              Pagina {pagination.page} de {pagination.pages}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => fetchSongs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={pageBtnStyle(pagination.page <= 1)}
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                onClick={() => fetchSongs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                style={pageBtnStyle(pagination.page >= pagination.pages)}
              >
                Proxima <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de audio */}
      <Modal
        isOpen={!!playerSong}
        onClose={() => setPlayerSong(null)}
        title={playerSong?.title || 'Reproduzir Musica'}
      >
        {playerSong && (
          <AudioPlayer src={playerSong.audio_url} title={playerSong.title} />
        )}
      </Modal>
    </div>
  );
}
