import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, RefreshCw, Play, Eye, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Modal from '../components/ui/Modal';
import AudioPlayer from '../components/ui/AudioPlayer';

const statusColors = {
  complete: { bg: '#e8f5e9', color: '#2e7d32' },
  streaming: { bg: '#e3f2fd', color: '#1565c0' },
  pending: { bg: '#fff3e0', color: '#e65100' },
};

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
      console.error('Failed to fetch songs:', err);
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
      alert(`Synced ${res.data.synced} song(s)`);
      fetchSongs(pagination.page);
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this song?')) return;
    try {
      await api.delete(`/songs/${id}`);
      fetchSongs(pagination.page);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete song.');
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (val) => (
        <span style={{ fontWeight: 500, color: '#333' }}>{val || 'Untitled'}</span>
      ),
    },
    {
      key: 'prompt',
      label: 'Prompt',
      render: (val) => (
        <span style={{ color: '#666', fontSize: '13px' }} title={val}>
          {val ? (val.length > 60 ? val.substring(0, 60) + '...' : val) : '--'}
        </span>
      ),
    },
    {
      key: 'tags',
      label: 'Style / Tags',
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
            padding: '4px 10px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: s.bg,
            color: s.color,
          }}>
            {val || 'unknown'}
          </span>
        );
      },
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (val) => {
        if (!val) return '--';
        const mins = Math.floor(val / 60);
        const secs = Math.floor(val % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (val) => val ? new Date(val).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }) : '--',
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          {row.audio_url && (
            <button
              onClick={() => setPlayerSong(row)}
              title="Play"
              style={actionBtnStyle}
            >
              <Play size={14} />
            </button>
          )}
          <button
            onClick={() => navigate(`/songs/${row.id}`)}
            title="View"
            style={actionBtnStyle}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            title="Delete"
            style={{ ...actionBtnStyle, color: '#d32f2f' }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#333' }}>Songs</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 16px', backgroundColor: '#1976d2', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: 500, opacity: syncing ? 0.7 : 1,
          }}
        >
          <RefreshCw size={16} />
          {syncing ? 'Syncing...' : 'Sync Songs'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
          <input
            type="text"
            placeholder="Search by title, prompt or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px 10px 36px',
              border: '1px solid #ddd', borderRadius: '6px', fontSize: '14px',
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px', border: '1px solid #ddd',
            borderRadius: '6px', fontSize: '14px', outline: 'none',
            backgroundColor: '#fff', color: '#333', cursor: 'pointer',
          }}
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="streaming">Streaming</option>
          <option value="complete">Complete</option>
        </select>
      </div>

      <Card>
        <Table columns={columns} data={songs} loading={loading} />

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee',
          }}>
            <span style={{ fontSize: '13px', color: '#888' }}>
              Showing {((pagination.page - 1) * pagination.limit) + 1}
              {' - '}
              {Math.min(pagination.page * pagination.limit, pagination.total)}
              {' of '}
              {pagination.total} songs
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => fetchSongs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={pageBtnStyle(pagination.page <= 1)}
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
                let pageNum;
                if (pagination.pages <= 7) {
                  pageNum = i + 1;
                } else if (pagination.page <= 4) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.pages - 3) {
                  pageNum = pagination.pages - 6 + i;
                } else {
                  pageNum = pagination.page - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => fetchSongs(pageNum)}
                    style={{
                      ...pageBtnStyle(false),
                      backgroundColor: pageNum === pagination.page ? '#1976d2' : '#fff',
                      color: pageNum === pagination.page ? '#fff' : '#333',
                      fontWeight: pageNum === pagination.page ? 600 : 400,
                    }}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => fetchSongs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                style={pageBtnStyle(pagination.page >= pagination.pages)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Audio Player Modal */}
      <Modal
        isOpen={!!playerSong}
        onClose={() => setPlayerSong(null)}
        title={playerSong?.title || 'Play Song'}
      >
        {playerSong && (
          <AudioPlayer src={playerSong.audio_url} title={playerSong.title} />
        )}
      </Modal>
    </div>
  );
}

const actionBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: '30px', height: '30px', border: '1px solid #ddd',
  borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#555',
};

const pageBtnStyle = (disabled) => ({
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  minWidth: '32px', height: '32px', padding: '0 8px',
  border: '1px solid #ddd', borderRadius: '4px',
  background: '#fff', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#ccc' : '#333', fontSize: '13px',
});
