import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Clock, Music, Tag, Calendar, Cpu, ExternalLink, Loader2, Hash } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
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

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  backgroundColor: '#fafafa',
  transition: 'border-color 0.2s',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#555',
  marginBottom: '6px',
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
    <Icon size={16} color="#999" style={{ marginTop: '2px', flexShrink: 0 }} />
    <div style={{ minWidth: '120px', fontSize: '13px', fontWeight: 600, color: '#999' }}>{label}</div>
    <div style={{ fontSize: '14px', color: '#333', flex: 1, wordBreak: 'break-word' }}>{value || '--'}</div>
  </div>
);

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);

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
    if (!window.confirm('Tem certeza que deseja excluir esta musica? Esta acao nao pode ser desfeita.')) return;
    try {
      await api.delete(`/songs/${id}`);
      navigate('/songs');
    } catch (err) {
      console.error('Falha ao excluir:', err);
      alert('Falha ao excluir musica.');
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#888' }}>
        <Loader2 size={28} className="spin" style={{ marginRight: '10px' }} />
        Carregando...
      </div>
    );
  }

  if (!song) return null;

  const s = statusColors[song.status] || { bg: '#f5f5f5', color: '#666' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/songs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              background: '#fff',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              color: '#555',
              transition: 'background-color 0.15s',
            }}
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#1a1a1a' }}>
            {song.title || 'Sem titulo'}
          </h1>
          <span style={{
            padding: '4px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: s.bg,
            color: s.color,
          }}>
            {statusLabels[song.status] || song.status}
          </span>
        </div>
        <button
          onClick={handleDelete}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 18px',
            backgroundColor: '#fff',
            color: '#d32f2f',
            border: '1px solid #d32f2f',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
            transition: 'background-color 0.15s',
          }}
        >
          <Trash2 size={16} /> Excluir Musica
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Esquerda: Detalhes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Card title="Detalhes">
            <DetailRow icon={Music} label="Titulo" value={song.title} />
            <DetailRow icon={Hash} label="ID Suno" value={
              song.suno_id ? <span style={{ fontFamily: 'monospace', fontSize: '13px' }}>{song.suno_id}</span> : '--'
            } />
            <DetailRow icon={Tag} label="Estilo" value={song.tags} />
            <DetailRow icon={Clock} label="Duracao" value={formatDuration(song.duration)} />
            <DetailRow icon={Cpu} label="Modelo" value={song.model_name || song.model} />
            <DetailRow icon={Calendar} label="Criado em" value={
              song.created_at ? new Date(song.created_at).toLocaleString('pt-BR') : '--'
            } />
          </Card>

          {/* Prompt */}
          {song.prompt && (
            <Card title="Prompt">
              <p style={{ margin: 0, fontSize: '14px', color: '#444', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                {song.prompt}
              </p>
            </Card>
          )}

          {/* Letra */}
          {song.lyric && (
            <Card title="Letra">
              <pre style={{
                margin: 0,
                fontSize: '14px',
                color: '#444',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
                lineHeight: 1.7,
              }}>
                {song.lyric}
              </pre>
            </Card>
          )}
        </div>

        {/* Direita: Midia e Estender */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Audio */}
          {song.audio_url && (
            <Card title="Audio">
              <AudioPlayer src={song.audio_url} title={song.title} />
            </Card>
          )}

          {/* Imagem de capa */}
          {song.image_url && (
            <Card title="Capa">
              <img
                src={song.image_url}
                alt={song.title}
                style={{ width: '100%', borderRadius: '8px', maxHeight: '300px', objectFit: 'cover' }}
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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#1976d2',
                  fontSize: '14px',
                  fontWeight: 500,
                  textDecoration: 'none',
                }}
              >
                <ExternalLink size={16} /> Assistir Video
              </a>
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
                    onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Prompt (opcional)</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                    placeholder="Descreva o que deve vir a seguir..."
                    value={extendPrompt}
                    onChange={(e) => setExtendPrompt(e.target.value)}
                    onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
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
                    onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
                  />
                </div>
                <button
                  onClick={handleExtend}
                  disabled={extending}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 22px',
                    backgroundColor: extending ? '#90caf9' : '#1976d2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: extending ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: 600,
                    transition: 'background-color 0.2s',
                    alignSelf: 'flex-start',
                  }}
                >
                  {extending ? <Loader2 size={16} className="spin" /> : <Music size={16} />}
                  {extending ? 'Estendendo...' : 'Estender'}
                </button>

                {extendResult && extendResult.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <strong style={{ fontSize: '14px', color: '#555', display: 'block', marginBottom: '10px' }}>
                      Clips estendidos:
                    </strong>
                    {extendResult.map((clip, i) => (
                      <div key={clip.id || i} style={{ marginTop: '8px' }}>
                        {clip.audio_url ? (
                          <AudioPlayer src={clip.audio_url} title={clip.title} />
                        ) : (
                          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>
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
