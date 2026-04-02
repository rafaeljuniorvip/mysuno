import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RefreshCw, Play, Eye, Trash2, ChevronLeft, ChevronRight,
  Heart, Grid, List, SortDesc, CheckSquare, Square, Music, Clock,
  X, Download, Check
} from 'lucide-react';
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

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Mais recentes' },
  { value: 'created_at:ASC', label: 'Mais antigos' },
  { value: 'title:ASC', label: 'Titulo A-Z' },
  { value: 'title:DESC', label: 'Titulo Z-A' },
  { value: 'duration:DESC', label: 'Maior duracao' },
];

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

const formatDuration = (val) => {
  const n = parseFloat(val);
  if (!n) return '--';
  const mins = Math.floor(n / 60);
  const secs = Math.floor(n % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTotalDuration = (seconds) => {
  if (!seconds) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

export default function Songs() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [favoritesFilter, setFavoritesFilter] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortOption, setSortOption] = useState('created_at:DESC');
  const [syncing, setSyncing] = useState(false);
  const [playerSong, setPlayerSong] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [stats, setStats] = useState({ total: 0, favorites: 0, totalDuration: 0 });

  const fetchSongs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortOption.split(':');
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (favoritesFilter) params.set('favorite', 'true');
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);

      const res = await api.get(`/songs?${params.toString()}`);
      const data = res.data.data || [];
      setSongs(data);
      setPagination(res.data.pagination || { page, limit: 20, total: 0, pages: 1 });

      // Calculate stats from pagination total and current data
      const pag = res.data.pagination || {};
      const totalDur = data.reduce((sum, s) => sum + (parseFloat(s.duration) || 0), 0);
      const favCount = data.filter(s => s.is_favorite).length;
      setStats({
        total: pag.total || data.length,
        favorites: favCount,
        totalDuration: totalDur,
      });
    } catch (err) {
      console.error('Falha ao buscar musicas:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, favoritesFilter, dateFrom, dateTo, sortOption]);

  useEffect(() => {
    setSelectedIds(new Set());
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
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      fetchSongs(pagination.page);
    } catch (err) {
      console.error('Falha ao excluir:', err);
      alert('Falha ao excluir musica.');
    }
  };

  const handleToggleFavorite = async (id) => {
    try {
      await api.post(`/songs/${id}/favorite`);
      setSongs(prev => prev.map(s => s.id === id ? { ...s, is_favorite: !s.is_favorite } : s));
    } catch (err) {
      console.error('Falha ao favoritar:', err);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === songs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(songs.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Excluir ${selectedIds.size} musica(s) selecionada(s)?`)) return;
    try {
      await Promise.all([...selectedIds].map(id => api.delete(`/songs/${id}`)));
      setSelectedIds(new Set());
      fetchSongs(pagination.page);
    } catch (err) {
      console.error('Falha ao excluir em massa:', err);
      alert('Falha ao excluir algumas musicas.');
    }
  };

  const handleBulkFavorite = async () => {
    if (selectedIds.size === 0) return;
    try {
      await Promise.all([...selectedIds].map(id => api.post(`/songs/${id}/favorite`)));
      setSelectedIds(new Set());
      fetchSongs(pagination.page);
    } catch (err) {
      console.error('Falha ao favoritar em massa:', err);
    }
  };

  // Pagination page numbers
  const getPageNumbers = () => {
    const { page, pages } = pagination;
    const pageNums = [];
    const maxShow = 7;
    if (pages <= maxShow) {
      for (let i = 1; i <= pages; i++) pageNums.push(i);
    } else {
      pageNums.push(1);
      let start = Math.max(2, page - 2);
      let end = Math.min(pages - 1, page + 2);
      if (page <= 3) { start = 2; end = 5; }
      if (page >= pages - 2) { start = pages - 4; end = pages - 1; }
      if (start > 2) pageNums.push('...');
      for (let i = start; i <= end; i++) pageNums.push(i);
      if (end < pages - 1) pageNums.push('...');
      pageNums.push(pages);
    }
    return pageNums;
  };

  const columns = [
    {
      key: 'select',
      label: (
        <button onClick={toggleSelectAll} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#666' }}>
          {selectedIds.size === songs.length && songs.length > 0
            ? <CheckSquare size={16} color="#1976d2" />
            : <Square size={16} />
          }
        </button>
      ),
      render: (_, row) => (
        <button onClick={(e) => { e.stopPropagation(); toggleSelect(row.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#666' }}>
          {selectedIds.has(row.id)
            ? <CheckSquare size={16} color="#1976d2" />
            : <Square size={16} />
          }
        </button>
      ),
    },
    {
      key: 'favorite',
      label: '',
      render: (_, row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(row.id); }}
          title={row.is_favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
        >
          <Heart
            size={16}
            fill={row.is_favorite ? '#e91e63' : 'none'}
            color={row.is_favorite ? '#e91e63' : '#ccc'}
            strokeWidth={2}
          />
        </button>
      ),
    },
    {
      key: 'title',
      label: 'Titulo',
      render: (val) => (
        <span style={{ fontWeight: 500, color: '#1a1a1a' }}>{val || 'Sem titulo'}</span>
      ),
    },
    {
      key: 'tags',
      label: 'Estilo',
      render: (val) => val ? (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {val.split(',').slice(0, 3).map((tag, i) => (
            <span key={i} style={{
              display: 'inline-block',
              padding: '2px 8px',
              backgroundColor: '#f0f0f0',
              borderRadius: '12px',
              fontSize: '11px',
              color: '#666',
              whiteSpace: 'nowrap',
            }}>
              {tag.trim()}
            </span>
          ))}
        </div>
      ) : '--',
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

  // Grid card component
  const SongGridCard = ({ song }) => (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e8e8e8',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s, transform 0.15s',
      cursor: 'pointer',
      position: 'relative',
    }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)'; }}
    >
      {/* Cover image */}
      <div style={{
        width: '100%',
        height: '160px',
        backgroundColor: '#f0f0f0',
        backgroundImage: song.image_url ? `url(${song.image_url})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
      }}>
        {/* Checkbox */}
        <button
          onClick={(e) => { e.stopPropagation(); toggleSelect(song.id); }}
          style={{
            position: 'absolute',
            top: '8px',
            left: '8px',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '4px',
            padding: '4px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {selectedIds.has(song.id)
            ? <CheckSquare size={16} color="#1976d2" />
            : <Square size={16} color="#999" />
          }
        </button>

        {/* Favorite */}
        <button
          onClick={(e) => { e.stopPropagation(); handleToggleFavorite(song.id); }}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'rgba(255,255,255,0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Heart size={14} fill={song.is_favorite ? '#e91e63' : 'none'} color={song.is_favorite ? '#e91e63' : '#999'} />
        </button>

        {/* Play overlay */}
        {song.audio_url && (
          <button
            onClick={(e) => { e.stopPropagation(); setPlayerSong(song); }}
            style={{
              position: 'absolute',
              bottom: '10px',
              right: '10px',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(25,118,210,0.9)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Play size={18} color="#fff" fill="#fff" />
          </button>
        )}
      </div>

      {/* Info */}
      <div
        style={{ padding: '14px' }}
        onClick={() => navigate(`/songs/${song.id}`)}
      >
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {song.title || 'Sem titulo'}
        </div>
        {song.tags && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {song.tags.split(',').slice(0, 2).map((tag, i) => (
              <span key={i} style={{
                display: 'inline-block',
                padding: '2px 8px',
                backgroundColor: '#f0f0f0',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#666',
              }}>
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#999' }}>
            {song.duration ? formatDuration(song.duration) : ''}
          </span>
          <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: (statusColors[song.status] || {}).bg || '#f5f5f5',
            color: (statusColors[song.status] || {}).color || '#666',
          }}>
            {statusLabels[song.status] || song.status}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
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

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: '20px',
        alignItems: 'center',
        padding: '12px 18px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '13px',
        color: '#666',
        flexWrap: 'wrap',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Music size={14} color="#1976d2" />
          <strong style={{ color: '#333' }}>{stats.total}</strong> musica{stats.total !== 1 ? 's' : ''} encontrada{stats.total !== 1 ? 's' : ''}
        </span>
        <span style={{ color: '#ddd' }}>|</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Heart size={14} color="#e91e63" />
          <strong style={{ color: '#333' }}>{stats.favorites}</strong> favorita{stats.favorites !== 1 ? 's' : ''}
        </span>
        <span style={{ color: '#ddd' }}>|</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} color="#7b1fa2" />
          Duracao total: <strong style={{ color: '#333' }}>{formatTotalDuration(stats.totalDuration)}</strong>
        </span>
      </div>

      {/* Filters Row */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: '400px' }}>
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

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button style={filterBtnStyle(statusFilter === '' && !favoritesFilter)} onClick={() => { setStatusFilter(''); setFavoritesFilter(false); }}>Todos</button>
          <button style={filterBtnStyle(statusFilter === 'pending')} onClick={() => { setStatusFilter('pending'); setFavoritesFilter(false); }}>Pendente</button>
          <button style={filterBtnStyle(statusFilter === 'streaming')} onClick={() => { setStatusFilter('streaming'); setFavoritesFilter(false); }}>Transmitindo</button>
          <button style={filterBtnStyle(statusFilter === 'complete')} onClick={() => { setStatusFilter('complete'); setFavoritesFilter(false); }}>Completo</button>
          <button
            style={{
              ...filterBtnStyle(favoritesFilter),
              borderColor: favoritesFilter ? '#e91e63' : '#e0e0e0',
              backgroundColor: favoritesFilter ? '#fce4ec' : '#fff',
              color: favoritesFilter ? '#e91e63' : '#666',
            }}
            onClick={() => { setFavoritesFilter(!favoritesFilter); setStatusFilter(''); }}
          >
            <Heart size={12} fill={favoritesFilter ? '#e91e63' : 'none'} color={favoritesFilter ? '#e91e63' : '#666'} style={{ verticalAlign: '-2px', marginRight: '4px' }} />
            Favoritas
          </button>
        </div>
      </div>

      {/* Date Range + Sort + View Toggle */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Date range */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>De:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{
              padding: '8px 10px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fafafa',
              color: '#333',
            }}
          />
          <span style={{ fontSize: '13px', color: '#888' }}>Ate:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{
              padding: '8px 10px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fafafa',
              color: '#333',
            }}
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#999' }}
              title="Limpar datas"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ flex: 1 }} />

        {/* Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <SortDesc size={14} color="#888" />
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
              backgroundColor: '#fafafa',
              color: '#333',
              cursor: 'pointer',
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', border: '1px solid #e0e0e0', borderRadius: '6px', overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('list')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: viewMode === 'list' ? '#e3f2fd' : '#fff',
              color: viewMode === 'list' ? '#1976d2' : '#888',
              transition: 'all 0.15s',
            }}
            title="Visualizar como lista"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              border: 'none',
              borderLeft: '1px solid #e0e0e0',
              cursor: 'pointer',
              backgroundColor: viewMode === 'grid' ? '#e3f2fd' : '#fff',
              color: viewMode === 'grid' ? '#1976d2' : '#888',
              transition: 'all 0.15s',
            }}
            title="Visualizar como grade"
          >
            <Grid size={16} />
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 18px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '1px solid #bbdefb',
        }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1976d2' }}>
            {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={handleBulkFavorite}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              border: '1px solid #bbdefb',
              borderRadius: '6px',
              backgroundColor: '#fff',
              color: '#e91e63',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Heart size={14} />
            Favoritar selecionados
          </button>
          <button
            onClick={handleBulkDelete}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              backgroundColor: '#fff',
              color: '#d32f2f',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={14} />
            Excluir selecionados
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#1976d2' }}
            title="Limpar selecao"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Content: List or Grid */}
      {viewMode === 'list' ? (
        <Card>
          <Table
            columns={columns}
            data={songs}
            loading={loading}
            emptyMessage="Nenhuma musica encontrada."
          />

          {/* Pagination */}
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
                Pagina {pagination.page} de {pagination.pages} ({pagination.total} musicas)
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => fetchSongs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                    color: pagination.page <= 1 ? '#ddd' : '#333',
                  }}
                >
                  <ChevronLeft size={16} />
                </button>
                {getPageNumbers().map((p, i) =>
                  p === '...' ? (
                    <span key={`dots-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: '#999', fontSize: '13px' }}>...</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => fetchSongs(p)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '34px',
                        height: '34px',
                        padding: '0 8px',
                        border: '1px solid',
                        borderColor: p === pagination.page ? '#1976d2' : '#e0e0e0',
                        borderRadius: '6px',
                        background: p === pagination.page ? '#1976d2' : '#fff',
                        color: p === pagination.page ? '#fff' : '#333',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: p === pagination.page ? 600 : 400,
                        transition: 'all 0.15s',
                      }}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  onClick={() => fetchSongs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '34px',
                    height: '34px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                    color: pagination.page >= pagination.pages ? '#ddd' : '#333',
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Grid View */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>Carregando...</div>
          ) : songs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#888' }}>Nenhuma musica encontrada.</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '16px',
              marginBottom: '20px',
            }}>
              {songs.map(song => (
                <SongGridCard key={song.id} song={song} />
              ))}
            </div>
          )}

          {/* Grid Pagination */}
          {pagination.pages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              marginTop: '16px',
              paddingTop: '16px',
            }}>
              <button
                onClick={() => fetchSongs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  background: '#fff',
                  cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                  color: pagination.page <= 1 ? '#ddd' : '#333',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '0 6px', color: '#999', fontSize: '13px' }}>...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => fetchSongs(p)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '34px',
                      height: '34px',
                      padding: '0 8px',
                      border: '1px solid',
                      borderColor: p === pagination.page ? '#1976d2' : '#e0e0e0',
                      borderRadius: '6px',
                      background: p === pagination.page ? '#1976d2' : '#fff',
                      color: p === pagination.page ? '#fff' : '#333',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: p === pagination.page ? 600 : 400,
                    }}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => fetchSongs(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  background: '#fff',
                  cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                  color: pagination.page >= pagination.pages ? '#ddd' : '#333',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Audio Modal */}
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
