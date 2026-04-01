import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Music2, Wand2, Copy, ArrowRight, Loader2, Download, Clock, ToggleLeft, ToggleRight, X, History } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import AudioPlayer from '../components/ui/AudioPlayer';

const GENRE_PRESETS = [
  'Pop', 'Rock', 'Lo-fi', 'Bossa Nova', 'Sertanejo', 'Funk',
  'MPB', 'Jazz', 'Eletronica', 'Hip Hop', 'R&B', 'Classica',
];

const RECENT_PROMPTS_KEY = 'mysuno_recent_prompts';
const MAX_PROMPT_LENGTH = 3000;
const MAX_LYRICS_LENGTH = 5000;
const MAX_TITLE_LENGTH = 100;
const MAX_TAGS_LENGTH = 200;

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
    }}>
      {statusLabels[status] || status}
    </span>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '14px',
  color: '#333',
  backgroundColor: '#fafafa',
  outline: 'none',
  transition: 'border-color 0.2s',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const textareaStyle = {
  ...inputStyle,
  minHeight: '100px',
  resize: 'vertical',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#555',
  marginBottom: '6px',
};

const buttonPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 22px',
  backgroundColor: '#1976d2',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const buttonSecondary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  backgroundColor: '#f0f0f0',
  color: '#555',
  border: '1px solid #ddd',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color 0.2s',
};

const CharCount = ({ current, max }) => (
  <span style={{
    fontSize: '11px',
    color: current > max * 0.9 ? '#e65100' : '#bbb',
    fontWeight: current > max * 0.9 ? 600 : 400,
    float: 'right',
    marginTop: '4px',
  }}>
    {current}/{max}
  </span>
);

const ToggleSwitch = ({ checked, onChange, label }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      userSelect: 'none',
      fontSize: '14px',
      color: '#555',
    }}
  >
    <div style={{
      width: '44px',
      height: '24px',
      borderRadius: '12px',
      backgroundColor: checked ? '#1976d2' : '#ccc',
      position: 'relative',
      transition: 'background-color 0.25s',
      flexShrink: 0,
    }}>
      <div style={{
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        backgroundColor: '#fff',
        position: 'absolute',
        top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 0.25s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
    <span style={{ fontWeight: checked ? 600 : 400, color: checked ? '#1976d2' : '#555' }}>
      {label}
    </span>
  </div>
);

const loadRecentPrompts = () => {
  try {
    const stored = localStorage.getItem(RECENT_PROMPTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentPrompt = (prompt) => {
  if (!prompt || !prompt.trim()) return;
  const current = loadRecentPrompts();
  const filtered = current.filter(p => p !== prompt.trim());
  const updated = [prompt.trim(), ...filtered].slice(0, 5);
  localStorage.setItem(RECENT_PROMPTS_KEY, JSON.stringify(updated));
};

const LoadingPlaceholder = () => (
  <div style={{ marginTop: '24px', padding: '40px 20px', textAlign: 'center' }}>
    <div style={{
      width: '100%',
      maxWidth: '600px',
      margin: '0 auto 20px',
      borderRadius: '10px',
      overflow: 'hidden',
    }}>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{
          height: '14px',
          marginBottom: '10px',
          borderRadius: '7px',
          background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
          width: i === 3 ? '60%' : '100%',
        }} />
      ))}
    </div>
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
    <Loader2 size={32} color="#1976d2" className="spin" />
    <p style={{ color: '#888', marginTop: '12px', fontSize: '14px' }}>
      Gerando sua musica... Isso pode levar alguns minutos.
    </p>
  </div>
);

export default function Generate() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('simple');

  // Modo simples
  const [simplePrompt, setSimplePrompt] = useState('');
  const [simpleInstrumental, setSimpleInstrumental] = useState(false);

  // Modo personalizado
  const [customTitle, setCustomTitle] = useState('');
  const [customLyrics, setCustomLyrics] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [customInstrumental, setCustomInstrumental] = useState(false);

  // Gerador de letra
  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [generatedLyrics, setGeneratedLyrics] = useState(null);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);

  // Resultados
  const [results, setResults] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Prompts recentes
  const [recentPrompts, setRecentPrompts] = useState([]);

  // Historico de geracoes
  const [generationHistory, setGenerationHistory] = useState([]);

  useEffect(() => {
    setRecentPrompts(loadRecentPrompts());
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/songs?limit=5&sort=created_at&order=DESC');
      setGenerationHistory(res.data.data || []);
    } catch {
      // silently fail
    }
  };

  const handleGenreClick = (genre) => {
    if (tab === 'simple') {
      const current = simplePrompt.trim();
      if (current) {
        setSimplePrompt(current + ', ' + genre.toLowerCase());
      } else {
        setSimplePrompt('Uma musica ' + genre.toLowerCase());
      }
    } else {
      const current = customTags.trim();
      if (current) {
        if (!current.toLowerCase().includes(genre.toLowerCase())) {
          setCustomTags(current + ', ' + genre.toLowerCase());
        }
      } else {
        setCustomTags(genre.toLowerCase());
      }
    }
  };

  const handleSimpleGenerate = async () => {
    if (!simplePrompt.trim()) return;
    setGenerating(true);
    setError('');
    setResults([]);
    saveRecentPrompt(simplePrompt);
    setRecentPrompts(loadRecentPrompts());
    try {
      const res = await api.post('/suno/generate', {
        prompt: simplePrompt,
        make_instrumental: simpleInstrumental,
        wait_audio: true,
      });
      setResults(Array.isArray(res.data) ? res.data : [res.data]);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar musica. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomGenerate = async () => {
    if (!customLyrics.trim() && !customInstrumental) return;
    setGenerating(true);
    setError('');
    setResults([]);
    saveRecentPrompt(customLyrics || customTitle);
    setRecentPrompts(loadRecentPrompts());
    try {
      const res = await api.post('/suno/custom_generate', {
        prompt: customLyrics,
        tags: customTags,
        title: customTitle,
        make_instrumental: customInstrumental,
        wait_audio: true,
      });
      setResults(Array.isArray(res.data) ? res.data : [res.data]);
      fetchHistory();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar musica. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateLyrics = async () => {
    if (!lyricsPrompt.trim()) return;
    setGeneratingLyrics(true);
    setGeneratedLyrics(null);
    try {
      const res = await api.post('/suno/generate_lyrics', { prompt: lyricsPrompt });
      setGeneratedLyrics(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao gerar letra.');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const handleCopyLyrics = () => {
    if (generatedLyrics?.text) {
      navigator.clipboard.writeText(generatedLyrics.text);
    }
  };

  const handleUseLyrics = () => {
    if (generatedLyrics) {
      setCustomTitle(generatedLyrics.title || '');
      setCustomLyrics(generatedLyrics.text || '');
      setTab('custom');
    }
  };

  const tabStyle = (active) => ({
    padding: '10px 24px',
    fontSize: '14px',
    fontWeight: 600,
    border: 'none',
    borderBottom: active ? '3px solid #1976d2' : '3px solid transparent',
    backgroundColor: 'transparent',
    color: active ? '#1976d2' : '#888',
    cursor: 'pointer',
    transition: 'color 0.2s, border-color 0.2s',
  });

  const chipStyle = (selected) => ({
    display: 'inline-block',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    border: '1px solid',
    borderColor: selected ? '#1976d2' : '#e0e0e0',
    backgroundColor: selected ? '#e3f2fd' : '#fff',
    color: selected ? '#1976d2' : '#666',
    cursor: 'pointer',
    transition: 'all 0.15s',
    userSelect: 'none',
  });

  const currentTags = tab === 'simple' ? simplePrompt.toLowerCase() : customTags.toLowerCase();

  return (
    <div>
      <h1 style={{ margin: '0 0 28px 0', fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>
        Gerar Musica
      </h1>

      <Card>
        <div style={{ borderBottom: '1px solid #eee', marginBottom: '24px', display: 'flex' }}>
          <button style={tabStyle(tab === 'simple')} onClick={() => setTab('simple')}>
            <Music2 size={16} style={{ marginRight: '6px', verticalAlign: '-3px' }} />
            Simples
          </button>
          <button style={tabStyle(tab === 'custom')} onClick={() => setTab('custom')}>
            <Wand2 size={16} style={{ marginRight: '6px', verticalAlign: '-3px' }} />
            Personalizado
          </button>
        </div>

        {/* Genre Presets */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ ...labelStyle, marginBottom: '10px' }}>Estilos rapidos</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {GENRE_PRESETS.map((genre) => (
              <span
                key={genre}
                style={chipStyle(currentTags.includes(genre.toLowerCase()))}
                onClick={() => handleGenreClick(genre)}
                onMouseEnter={(e) => { if (!currentTags.includes(genre.toLowerCase())) e.currentTarget.style.borderColor = '#bbb'; }}
                onMouseLeave={(e) => { if (!currentTags.includes(genre.toLowerCase())) e.currentTarget.style.borderColor = '#e0e0e0'; }}
              >
                {genre}
              </span>
            ))}
          </div>
        </div>

        {tab === 'simple' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Descreva a musica que voce quer</label>
              <textarea
                style={textareaStyle}
                placeholder="Ex: Uma musica pop alegre sobre o verao..."
                value={simplePrompt}
                onChange={(e) => setSimplePrompt(e.target.value.slice(0, MAX_PROMPT_LENGTH))}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
              <CharCount current={simplePrompt.length} max={MAX_PROMPT_LENGTH} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <ToggleSwitch
                checked={simpleInstrumental}
                onChange={setSimpleInstrumental}
                label="Modo instrumental (sem voz)"
              />
            </div>
            <button
              style={{ ...buttonPrimary, opacity: generating || !simplePrompt.trim() ? 0.6 : 1, cursor: generating || !simplePrompt.trim() ? 'not-allowed' : 'pointer' }}
              onClick={handleSimpleGenerate}
              disabled={generating || !simplePrompt.trim()}
            >
              {generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {generating ? 'Gerando...' : 'Gerar Musica'}
            </button>
          </div>
        )}

        {tab === 'custom' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Titulo</label>
              <input
                style={inputStyle}
                placeholder="Titulo da musica"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
              <CharCount current={customTitle.length} max={MAX_TITLE_LENGTH} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Letra</label>
              <textarea
                style={{ ...textareaStyle, minHeight: '150px' }}
                placeholder="Digite ou cole a letra da musica aqui..."
                value={customLyrics}
                onChange={(e) => setCustomLyrics(e.target.value.slice(0, MAX_LYRICS_LENGTH))}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
              <CharCount current={customLyrics.length} max={MAX_LYRICS_LENGTH} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Estilo / Tags</label>
              <input
                style={inputStyle}
                placeholder="Ex: pop, rock, acustico, alegre..."
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value.slice(0, MAX_TAGS_LENGTH))}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
              <CharCount current={customTags.length} max={MAX_TAGS_LENGTH} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <ToggleSwitch
                checked={customInstrumental}
                onChange={setCustomInstrumental}
                label="Modo instrumental (sem voz)"
              />
            </div>
            <button
              style={{ ...buttonPrimary, opacity: generating ? 0.6 : 1, cursor: generating ? 'not-allowed' : 'pointer' }}
              onClick={handleCustomGenerate}
              disabled={generating}
            >
              {generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
              {generating ? 'Gerando...' : 'Gerar Musica'}
            </button>
          </div>
        )}
      </Card>

      {/* Prompts Recentes */}
      {recentPrompts.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <Card title="Prompts Recentes">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {recentPrompts.map((p, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (tab === 'simple') {
                      setSimplePrompt(p);
                    } else {
                      setCustomLyrics(p);
                    }
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#555',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s, border-color 0.15s',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e3f2fd'; e.currentTarget.style.borderColor = '#bbdefb'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#e8e8e8'; }}
                  title={p}
                >
                  <Clock size={12} color="#999" />
                  {p.length > 50 ? p.substring(0, 50) + '...' : p}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Gerador de Letra */}
      <div style={{ marginTop: '20px' }}>
        <Card title="Gerar Letra com IA">
          <div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Descreva o tema da letra</label>
              <input
                style={inputStyle}
                placeholder="Ex: Uma balada romantica sobre saudade..."
                value={lyricsPrompt}
                onChange={(e) => setLyricsPrompt(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
            </div>
            <button
              style={{ ...buttonPrimary, backgroundColor: (generatingLyrics || !lyricsPrompt.trim()) ? '#a5d6a7' : '#2e7d32', opacity: generatingLyrics || !lyricsPrompt.trim() ? 0.7 : 1, cursor: generatingLyrics || !lyricsPrompt.trim() ? 'not-allowed' : 'pointer' }}
              onClick={handleGenerateLyrics}
              disabled={generatingLyrics || !lyricsPrompt.trim()}
            >
              {generatingLyrics ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
              {generatingLyrics ? 'Gerando...' : 'Gerar Letra'}
            </button>

            {generatedLyrics && (
              <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px', border: '1px solid #e8e8e8' }}>
                <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '12px' }}>
                  {generatedLyrics.title}
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '14px', color: '#444', lineHeight: 1.7, margin: '0 0 16px 0', fontFamily: 'inherit' }}>
                  {generatedLyrics.text}
                </pre>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button style={buttonSecondary} onClick={handleCopyLyrics}>
                    <Copy size={14} /> Copiar
                  </button>
                  <button
                    style={{ ...buttonSecondary, backgroundColor: '#e3f2fd', color: '#1976d2', borderColor: '#bbdefb' }}
                    onClick={handleUseLyrics}
                  >
                    <ArrowRight size={14} /> Usar no modo personalizado
                  </button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Erro */}
      {error && (
        <div style={{
          marginTop: '20px',
          padding: '14px 18px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: '2px' }}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* Carregando */}
      {generating && <LoadingPlaceholder />}

      {/* Resultados */}
      {results.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Card title="Resultados">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {results.map((clip, idx) => (
                <div key={clip.id || idx} style={{
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '10px',
                  border: '1px solid #e8e8e8',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                        {clip.title || 'Sem titulo'}
                      </div>
                      {clip.suno_id && (
                        <div style={{ fontSize: '12px', color: '#999', marginTop: '4px', fontFamily: 'monospace' }}>
                          ID: {clip.suno_id}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {clip.status && <StatusBadge status={clip.status} />}
                      {clip.audio_url && (
                        <a
                          href={clip.audio_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          style={{
                            ...buttonSecondary,
                            textDecoration: 'none',
                            padding: '6px 12px',
                          }}
                          title="Baixar audio"
                        >
                          <Download size={14} />
                        </a>
                      )}
                    </div>
                  </div>
                  {clip.audio_url && (
                    <AudioPlayer src={clip.audio_url} title={clip.title} />
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Historico de Geracoes */}
      {generationHistory.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <Card title="Ultimas Geracoes">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {generationHistory.map((song) => (
                <div
                  key={song.id}
                  onClick={() => navigate(`/songs/${song.id}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f0f0'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fafafa'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                    <History size={14} color="#999" />
                    <span style={{ fontSize: '14px', fontWeight: 500, color: '#333', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {song.title || 'Sem titulo'}
                    </span>
                    {song.tags && (
                      <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>
                        {song.tags}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    <StatusBadge status={song.status} />
                    <span style={{ fontSize: '12px', color: '#bbb' }}>
                      {song.created_at ? new Date(song.created_at).toLocaleDateString('pt-BR') : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
