import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Trash2, Clock, Music, Tag, Calendar, Cpu, ExternalLink,
  Loader2, Hash, Heart, Download, Copy, Check, ChevronDown, ChevronUp,
  Edit3, X, Save, FileText, Link2, Info
} from 'lucide-react';
import api, { resolveMediaUrl, formatDateTime } from '../services/api';
import Card from '../components/ui/Card';
import AudioPlayer from '../components/ui/AudioPlayer';

const statusLabels = {
  complete: 'Completo',
  streaming: 'Transmitindo',
  pending: 'Pendente',
};

const statusColors = {
  complete: { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
  streaming: { bg: '#dbeafe', color: '#1d4ed8', border: '#bfdbfe' },
  pending: { bg: '#fef3c7', color: '#b45309', border: '#fde68a' },
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  backgroundColor: '#f9fafb',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const labelStyle = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#6b7280',
  marginBottom: '6px',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const InfoGridItem = ({ label, value, icon: Icon }) => (
  <div style={{
    padding: '16px',
    background: '#f9fafb',
    borderRadius: '10px',
    border: '1px solid #f3f4f6',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
      {Icon && <Icon size={13} color="#9ca3af" />}
      <span style={{ fontSize: '11px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
    </div>
    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1f2937', wordBreak: 'break-word' }}>{value || '--'}</div>
  </div>
);

const InlineEdit = ({ value, onSave, multiline = false, placeholder = '' }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => { setDraft(value || ''); }, [value]);

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', group: 'edit' }}
        title="Clique para editar"
      >
        <span style={{ flex: 1, fontSize: '14px', color: value ? '#1f2937' : '#9ca3af', wordBreak: 'break-word', whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>
          {value || placeholder || 'Clique para editar'}
        </span>
        <Edit3 size={14} color="#9ca3af" style={{ marginTop: '2px', flexShrink: 0, opacity: 0.6 }} />
      </div>
    );
  }

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  const Component = multiline ? 'textarea' : 'input';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <Component
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (!multiline && e.key === 'Enter') handleSave();
          if (e.key === 'Escape') handleCancel();
        }}
        style={{
          ...inputStyle,
          ...(multiline ? { minHeight: '80px', resize: 'vertical' } : {}),
          borderColor: '#3b82f6',
          boxShadow: '0 0 0 3px rgba(59,130,246,0.1)',
        }}
        placeholder={placeholder}
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <button onClick={handleSave} style={{
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px',
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px',
          cursor: 'pointer', fontSize: '13px', fontWeight: 600,
        }}>
          <Save size={13} /> Salvar
        </button>
        <button onClick={handleCancel} style={{
          display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 14px',
          background: '#fff', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '6px',
          cursor: 'pointer', fontSize: '13px', fontWeight: 500,
        }}>
          <X size={13} /> Cancelar
        </button>
      </div>
    </div>
  );
};

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  // Estender audio
  const [extendContinueAt, setExtendContinueAt] = useState('');
  const [extendPrompt, setExtendPrompt] = useState('');
  const [extendTags, setExtendTags] = useState('');
  const [extending, setExtending] = useState(false);
  const [extendResult, setExtendResult] = useState(null);

  useEffect(() => {
    const fetchSong = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/songs/${id}`);
        setSong(res.data);
        setFavorited(res.data.favorited || false);
      } catch (err) {
        console.error('Falha ao carregar musica:', err);
        alert('Falha ao carregar detalhes da musica.');
        navigate('/songs');
      } finally {
        setLoading(false);
      }
    };
    fetchSong();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta musica?')) return;
    try {
      await api.delete(`/songs/${id}`);
      navigate('/songs');
    } catch (err) {
      console.error('Falha ao excluir:', err);
      alert('Falha ao excluir musica.');
    }
  };

  const handleFieldSave = async (field, value) => {
    try {
      await api.patch(`/songs/${id}`, { [field]: value });
      setSong((prev) => ({ ...prev, [field]: value }));
    } catch (err) {
      console.error('Falha ao salvar campo:', err);
      alert('Falha ao salvar alteracao.');
    }
  };

  const handleFavorite = async () => {
    try {
      await api.post(`/songs/${id}/favorite`);
      setFavorited((prev) => !prev);
    } catch (err) {
      console.error('Falha ao favoritar:', err);
    }
  };

  const handleCopyLink = () => {
    if (song?.audio_url) {
      navigator.clipboard.writeText(resolveMediaUrl(song.audio_url));
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleExtend = async () => {
    if (!song?.suno_id) return;
    setExtending(true);
    setExtendResult(null);
    try {
      const res = await api.post('/suno/extend_audio', {
        audio_id: song.suno_id,
        prompt: extendPrompt || undefined,
        continue_at: extendContinueAt ? Number(extendContinueAt) : undefined,
        tags: extendTags || undefined,
        title: song.title || undefined,
        wait_audio: true,
      });
      setExtendResult(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      console.error('Falha ao estender:', err);
      alert('Falha ao estender audio.');
    } finally {
      setExtending(false);
    }
  };

  const formatDuration = (val) => {
    if (!val) return '--';
    const mins = Math.floor(val / 60);
    const secs = Math.floor(val % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#9ca3af' }}>
        <Loader2 size={28} className="spin" style={{ marginRight: '12px' }} />
        <span style={{ fontSize: '15px', fontWeight: 500 }}>Carregando...</span>
      </div>
    );
  }

  if (!song) return null;

  const s = statusColors[song.status] || { bg: '#f3f4f6', color: '#6b7280', border: '#e5e7eb' };
  const isPending = song.status === 'pending';

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/songs')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', border: '1px solid #e5e7eb', borderRadius: '50px',
              background: '#fff', cursor: 'pointer', fontSize: '14px',
              fontWeight: 500, color: '#6b7280', transition: 'all 0.15s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '5px 16px', borderRadius: '50px', fontSize: '12px', fontWeight: 600,
            backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}`,
            ...(isPending ? { animation: 'pulse 2s ease-in-out infinite' } : {}),
          }}>
            {isPending && <span style={{
              width: '8px', height: '8px', borderRadius: '50%', backgroundColor: s.color,
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />}
            {statusLabels[song.status] || song.status}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleFavorite}
            title={favorited ? 'Remover favorito' : 'Favoritar'}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, transition: 'all 0.15s',
              background: favorited ? '#fef2f2' : '#fff',
              color: favorited ? '#dc2626' : '#9ca3af',
              border: favorited ? '1px solid #fecaca' : '1px solid #e5e7eb',
            }}
          >
            <Heart size={16} fill={favorited ? '#dc2626' : 'none'} /> Favoritar
          </button>
          {resolveMediaUrl(song.audio_url) && (
            <a
              href={resolveMediaUrl(song.audio_url)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '10px 18px', background: '#fff', color: '#3b82f6',
                border: '1px solid #bfdbfe', borderRadius: '8px',
                cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                textDecoration: 'none', transition: 'all 0.15s',
              }}
            >
              <Download size={16} /> Baixar Audio
            </a>
          )}
          <button
            onClick={handleDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '10px 18px', backgroundColor: '#fff', color: '#dc2626',
              border: '1px solid #fecaca', borderRadius: '8px',
              cursor: 'pointer', fontSize: '14px', fontWeight: 600,
              transition: 'all 0.15s',
            }}
          >
            <Trash2 size={16} /> Excluir Musica
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @media (max-width: 860px) {
          .song-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="song-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Esquerda: Detalhes + Letra */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Titulo editavel */}
          <Card title="Detalhes">
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Titulo</label>
              <InlineEdit
                value={song.title}
                onSave={(v) => handleFieldSave('title', v)}
                placeholder="Sem titulo"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Estilo / Tags</label>
              <InlineEdit
                value={song.tags}
                onSave={(v) => handleFieldSave('tags', v)}
                placeholder="Ex: rock, pop, energetico"
              />
            </div>

            {/* Info Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
              <InfoGridItem icon={Hash} label="ID Suno" value={
                song.suno_id ? <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{song.suno_id}</span> : null
              } />
              <InfoGridItem icon={Clock} label="Duracao" value={formatDuration(song.duration)} />
              <InfoGridItem icon={Cpu} label="Modelo" value={song.model_name || song.model} />
              <InfoGridItem icon={Calendar} label="Criado em" value={
                formatDateTime(song.created_at) || null
              } />
              <InfoGridItem icon={Music} label="Tipo" value={song.generation_type || song.type || '--'} />
              <InfoGridItem icon={Info} label="Status" value={statusLabels[song.status] || song.status} />
            </div>
          </Card>

          {/* Notas */}
          <Card title="Notas">
            <InlineEdit
              value={song.notes}
              onSave={(v) => handleFieldSave('notes', v)}
              multiline
              placeholder="Adicione notas sobre esta musica..."
            />
          </Card>

          {/* Prompt */}
          {song.prompt && (
            <Card title="Prompt">
              <p style={{ margin: 0, fontSize: '14px', color: '#4b5563', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {song.prompt}
              </p>
            </Card>
          )}

          {/* Letra */}
          {song.lyric && (
            <Card title="Letra">
              <pre style={{
                margin: 0, fontSize: '14px', color: '#4b5563',
                whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.8,
              }}>
                {song.lyric}
              </pre>
            </Card>
          )}

          {/* Metadados JSON */}
          {song.metadata && (
            <Card title={
              <div
                onClick={() => setShowMetadata(!showMetadata)}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}
              >
                <FileText size={16} color="#6b7280" />
                <span>Metadados</span>
                {showMetadata ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
              </div>
            }>
              {showMetadata && (
                <pre style={{
                  margin: 0, padding: '16px', background: '#1f2937', color: '#a5f3fc',
                  borderRadius: '8px', fontSize: '12px', lineHeight: 1.6,
                  overflow: 'auto', maxHeight: '400px', fontFamily: '"Fira Code", "Cascadia Code", monospace',
                }}>
                  {JSON.stringify(typeof song.metadata === 'string' ? JSON.parse(song.metadata) : song.metadata, null, 2)}
                </pre>
              )}
            </Card>
          )}
        </div>

        {/* Direita: Player + Imagem + Compartilhar + Estender */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Audio */}
          {resolveMediaUrl(song.audio_url) && (
            <Card title="Audio">
              <AudioPlayer src={resolveMediaUrl(song.audio_url)} title={song.title} />
            </Card>
          )}

          {/* Capa */}
          {resolveMediaUrl(song.image_url) && (
            <Card title="Capa">
              <img
                src={resolveMediaUrl(song.image_url)}
                alt={song.title}
                style={{
                  width: '100%', borderRadius: '10px', maxHeight: '320px',
                  objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
            </Card>
          )}

          {/* Video */}
          {song.video_url && (
            <Card title="Video">
              <a
                href={song.video_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  color: '#3b82f6', fontSize: '14px', fontWeight: 500, textDecoration: 'none',
                }}
              >
                <ExternalLink size={16} /> Assistir Video
              </a>
            </Card>
          )}

          {/* Compartilhar / Copiar Link */}
          {resolveMediaUrl(song.audio_url) && (
            <Card title="Compartilhar">
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  flex: 1, padding: '10px 14px', background: '#f9fafb', borderRadius: '8px',
                  border: '1px solid #e5e7eb', fontSize: '13px', color: '#6b7280',
                  fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {resolveMediaUrl(song.audio_url)}
                </div>
                <button
                  onClick={handleCopyLink}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '10px 16px', borderRadius: '8px', border: 'none',
                    background: linkCopied ? '#dcfce7' : '#3b82f6',
                    color: linkCopied ? '#15803d' : '#fff',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                    transition: 'all 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  {linkCopied ? <><Check size={14} /> Copiado!</> : <><Link2 size={14} /> Copiar Link</>}
                </button>
              </div>
            </Card>
          )}

          {/* Estender Audio */}
          {song.suno_id && (
            <Card title="Estender Audio">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Continuar em (segundos)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    placeholder="Ex: 120"
                    value={extendContinueAt}
                    onChange={(e) => setExtendContinueAt(e.target.value)}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prompt (opcional)</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    placeholder="Descreva o que deve vir a seguir..."
                    value={extendPrompt}
                    onChange={(e) => setExtendPrompt(e.target.value)}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Tags / Estilo (opcional)</label>
                  <input
                    type="text"
                    style={inputStyle}
                    placeholder="Ex: rock, energetico"
                    value={extendTags}
                    onChange={(e) => setExtendTags(e.target.value)}
                    onFocus={(e) => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#d1d5db'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
                <button
                  onClick={handleExtend}
                  disabled={extending}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    padding: '10px 22px',
                    backgroundColor: extending ? '#93c5fd' : '#3b82f6',
                    color: '#fff', border: 'none', borderRadius: '8px',
                    cursor: extending ? 'not-allowed' : 'pointer',
                    fontSize: '14px', fontWeight: 600, transition: 'background-color 0.2s',
                    alignSelf: 'flex-start',
                  }}
                >
                  {extending ? <Loader2 size={16} className="spin" /> : <Music size={16} />}
                  {extending ? 'Estendendo...' : 'Estender Audio'}
                </button>

                {extendResult && extendResult.length > 0 && (
                  <div style={{ marginTop: '12px', padding: '16px', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                    <strong style={{ fontSize: '14px', color: '#15803d', display: 'block', marginBottom: '12px' }}>
                      Clips estendidos:
                    </strong>
                    {extendResult.map((clip, i) => (
                      <div key={clip.id || i} style={{ marginTop: i > 0 ? '10px' : 0 }}>
                        {resolveMediaUrl(clip.audio_url) ? (
                          <AudioPlayer src={resolveMediaUrl(clip.audio_url)} title={clip.title} />
                        ) : (
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                            Clip gerado (ID: {clip.suno_id || clip.id}) - audio ainda nao disponivel.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
