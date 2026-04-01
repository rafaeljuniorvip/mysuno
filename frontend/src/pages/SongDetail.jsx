import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Clock, Music, Tag, Calendar, Cpu, ExternalLink, Loader2 } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import AudioPlayer from '../components/ui/AudioPlayer';

const statusColors = {
  complete: { bg: '#e8f5e9', color: '#2e7d32' },
  streaming: { bg: '#e3f2fd', color: '#1565c0' },
  pending: { bg: '#fff3e0', color: '#e65100' },
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: '6px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const DetailRow = ({ icon: Icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
    <Icon size={16} color="#888" style={{ marginTop: '2px', flexShrink: 0 }} />
    <div style={{ minWidth: '120px', fontSize: '13px', fontWeight: 500, color: '#888' }}>{label}</div>
    <div style={{ fontSize: '14px', color: '#333', flex: 1, wordBreak: 'break-word' }}>{value || '--'}</div>
  </div>
);

export default function SongDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);

  // Extend audio state
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
        console.error('Failed to fetch song:', err);
        alert('Failed to load song details.');
        navigate('/songs');
      } finally {
        setLoading(false);
      }
    };
    fetchSong();
  }, [id, navigate]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this song? This action cannot be undone.')) return;
    try {
      await api.delete(`/songs/${id}`);
      navigate('/songs');
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete song.');
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
      console.error('Extend failed:', err);
      alert('Failed to extend audio.');
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
        Loading...
      </div>
    );
  }

  if (!song) return null;

  const s = statusColors[song.status] || { bg: '#f5f5f5', color: '#666' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/songs')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', border: '1px solid #ddd', borderRadius: '6px',
              background: '#fff', cursor: 'pointer', fontSize: '14px', color: '#555',
            }}
          >
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#333' }}>
            {song.title || 'Untitled Song'}
          </h1>
          <span style={{
            padding: '4px 12px', borderRadius: '12px', fontSize: '12px',
            fontWeight: 600, backgroundColor: s.bg, color: s.color,
          }}>
            {song.status}
          </span>
        </div>
        <button
          onClick={handleDelete}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '8px 16px', backgroundColor: '#fff', color: '#d32f2f',
            border: '1px solid #d32f2f', borderRadius: '6px', cursor: 'pointer',
            fontSize: '14px', fontWeight: 500,
          }}
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Details */}
        <div>
          <Card title="Song Details">
            <DetailRow icon={Music} label="Title" value={song.title} />
            <DetailRow icon={Tag} label="Tags / Style" value={song.tags} />
            <DetailRow icon={Clock} label="Duration" value={formatDuration(song.duration)} />
            <DetailRow icon={Cpu} label="Model" value={song.model_name || song.model} />
            <DetailRow icon={Calendar} label="Created" value={
              song.created_at ? new Date(song.created_at).toLocaleString('pt-BR') : '--'
            } />
            <DetailRow icon={Music} label="Suno ID" value={
              <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>{song.suno_id}</span>
            } />
          </Card>

          {/* Prompt */}
          {song.prompt && (
            <div style={{ marginTop: '16px' }}>
              <Card title="Prompt">
                <p style={{ margin: 0, fontSize: '14px', color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {song.prompt}
                </p>
              </Card>
            </div>
          )}

          {/* Lyrics */}
          {song.lyric && (
            <div style={{ marginTop: '16px' }}>
              <Card title="Lyrics">
                <pre style={{
                  margin: 0, fontSize: '14px', color: '#333',
                  whiteSpace: 'pre-wrap', fontFamily: 'inherit', lineHeight: 1.6,
                }}>
                  {song.lyric}
                </pre>
              </Card>
            </div>
          )}
        </div>

        {/* Right: Media & Extend */}
        <div>
          {/* Audio Player */}
          {song.audio_url && (
            <Card title="Audio">
              <AudioPlayer src={song.audio_url} title={song.title} />
            </Card>
          )}

          {/* Image */}
          {song.image_url && (
            <div style={{ marginTop: '16px' }}>
              <Card title="Cover Image">
                <img
                  src={song.image_url}
                  alt={song.title}
                  style={{ width: '100%', borderRadius: '6px', maxHeight: '300px', objectFit: 'cover' }}
                />
              </Card>
            </div>
          )}

          {/* Video Link */}
          {song.video_url && (
            <div style={{ marginTop: '16px' }}>
              <Card title="Video">
                <a
                  href={song.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    color: '#1976d2', fontSize: '14px', textDecoration: 'none',
                  }}
                >
                  <ExternalLink size={16} /> Open Video
                </a>
              </Card>
            </div>
          )}

          {/* Extend Audio */}
          {song.suno_id && (
            <div style={{ marginTop: '16px' }}>
              <Card title="Extend Audio">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>
                      Continue At (seconds)
                    </label>
                    <input
                      type="number"
                      style={inputStyle}
                      placeholder="e.g. 120"
                      value={extendContinueAt}
                      onChange={(e) => setExtendContinueAt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>
                      Prompt (optional)
                    </label>
                    <textarea
                      style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                      placeholder="Describe what should come next..."
                      value={extendPrompt}
                      onChange={(e) => setExtendPrompt(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#555', marginBottom: '6px' }}>
                      Tags / Style (optional)
                    </label>
                    <input
                      type="text"
                      style={inputStyle}
                      placeholder="e.g. rock, energetic"
                      value={extendTags}
                      onChange={(e) => setExtendTags(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={handleExtend}
                    disabled={extending}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '8px',
                      padding: '10px 24px', backgroundColor: extending ? '#90caf9' : '#1976d2',
                      color: '#fff', border: 'none', borderRadius: '6px',
                      cursor: extending ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 500,
                    }}
                  >
                    {extending ? <Loader2 size={16} className="spin" /> : <Music size={16} />}
                    {extending ? 'Extending...' : 'Extend Audio'}
                  </button>

                  {extendResult && extendResult.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <strong style={{ fontSize: '13px', color: '#555' }}>Extended Clips:</strong>
                      {extendResult.map((clip, i) => (
                        <div key={clip.id || i} style={{ marginTop: '8px' }}>
                          {clip.audio_url && <AudioPlayer src={clip.audio_url} title={clip.title} />}
                          {!clip.audio_url && (
                            <p style={{ fontSize: '13px', color: '#888' }}>
                              Clip generated (ID: {clip.suno_id || clip.id}) - audio not yet available.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}
