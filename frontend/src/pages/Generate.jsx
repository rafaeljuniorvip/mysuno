import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Music2, Wand2, Copy, ArrowRight, Loader2, Download, Clock, X, History, CheckCircle, Eye } from 'lucide-react';
import api, { resolveMediaUrl } from '../services/api';
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
const POLL_INTERVAL = 5000;

const GENERATION_STAGES = [
  { key: 'sending', label: 'Enviando para o Suno...' },
  { key: 'composing', label: 'Compondo a musica...' },
  { key: 'lyrics', label: 'Gerando a letra...' },
  { key: 'producing', label: 'Produzindo o audio...' },
  { key: 'finalizing', label: 'Finalizando...' },
];

const GENERATION_TIPS = [
  'Cada geracao produz 2 variacoes da musica',
  'Musicas instrumentais ficam prontas mais rapido',
  'Voce pode usar presets de estilo para melhores resultados',
  'A IA cria letra, melodia e vocais automaticamente',
  'Use o modo personalizado para mais controle',
];

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

function getStageIndex(sunoStatus, genStatus) {
  if (genStatus === 'complete') return 4;
  if (!sunoStatus) return 0;
  switch (sunoStatus) {
    case 'PENDING': return 1;
    case 'TEXT_SUCCESS': return 2;
    case 'FIRST_SUCCESS': return 3;
    case 'SUCCESS': return 4;
    default: return 0;
  }
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}min ${secs}s`;
}

// ---- Generation Progress Animation Component ----
const GenerationProgress = ({ stageIndex, elapsedSeconds }) => {
  const [tipIndex, setTipIndex] = useState(0);
  const [tipFade, setTipFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipFade(false);
      setTimeout(() => {
        setTipIndex(prev => (prev + 1) % GENERATION_TIPS.length);
        setTipFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ marginTop: '24px' }}>
      <style>{`
        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 4px rgba(25, 118, 210, 0.3); }
          50% { box-shadow: 0 0 16px rgba(25, 118, 210, 0.7); }
        }
        @keyframes fadeInTip {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progressShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeInCard {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div style={{
        background: 'linear-gradient(135deg, #f8faff 0%, #f0f4ff 100%)',
        border: '1px solid #d6e4ff',
        borderRadius: '16px',
        padding: '36px 28px',
        textAlign: 'center',
        animation: 'fadeInCard 0.4s ease-out',
      }}>
        {/* Waveform Animation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          gap: '5px',
          height: '56px',
          marginBottom: '28px',
        }}>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const colors = ['#4285f4', '#5b8def', '#7b6cf6', '#8b5cf6', '#9b4dff', '#7b6cf6', '#4285f4'];
            return (
              <div
                key={i}
                style={{
                  width: '6px',
                  height: '100%',
                  borderRadius: '3px',
                  backgroundColor: colors[i],
                  transformOrigin: 'bottom',
                  animation: `waveBar ${0.8 + i * 0.12}s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            );
          })}
        </div>

        {/* Current Stage Label */}
        <div style={{
          fontSize: '18px',
          fontWeight: 700,
          color: '#1a1a2e',
          marginBottom: '24px',
        }}>
          {GENERATION_STAGES[stageIndex]?.label || 'Gerando...'}
        </div>

        {/* Step Indicator */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '0',
          marginBottom: '28px',
          flexWrap: 'wrap',
          padding: '0 8px',
        }}>
          {GENERATION_STAGES.map((stage, i) => {
            const isComplete = i < stageIndex;
            const isCurrent = i === stageIndex;
            return (
              <React.Fragment key={stage.key}>
                {i > 0 && (
                  <div style={{
                    width: '32px',
                    height: '2px',
                    backgroundColor: isComplete ? '#4285f4' : '#ddd',
                    transition: 'background-color 0.5s',
                    flexShrink: 0,
                  }} />
                )}
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    backgroundColor: isComplete ? '#4285f4' : isCurrent ? '#fff' : '#f0f0f0',
                    color: isComplete ? '#fff' : isCurrent ? '#4285f4' : '#bbb',
                    border: isCurrent ? '2px solid #4285f4' : isComplete ? '2px solid #4285f4' : '2px solid #ddd',
                    transition: 'all 0.4s',
                    animation: isCurrent ? 'pulseGlow 1.5s ease-in-out infinite' : 'none',
                  }}>
                    {isComplete ? <CheckCircle size={14} /> : i + 1}
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: '34px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '10px',
                    color: isCurrent ? '#4285f4' : isComplete ? '#666' : '#bbb',
                    fontWeight: isCurrent ? 600 : 400,
                    whiteSpace: 'nowrap',
                    width: 'max-content',
                    maxWidth: '80px',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    display: 'none',
                  }}>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress shimmer bar */}
        <div style={{
          width: '100%',
          maxWidth: '400px',
          height: '4px',
          borderRadius: '2px',
          backgroundColor: '#e8e8e8',
          margin: '0 auto 20px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${Math.min(((stageIndex + 1) / GENERATION_STAGES.length) * 100, 100)}%`,
            height: '100%',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, #4285f4, #8b5cf6, #4285f4)',
            backgroundSize: '200% 100%',
            animation: 'progressShimmer 2s linear infinite',
            transition: 'width 0.8s ease-out',
          }} />
        </div>

        {/* Elapsed Timer */}
        <div style={{
          fontSize: '14px',
          color: '#888',
          marginBottom: '18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
        }}>
          <Clock size={14} />
          Tempo decorrido: {elapsedSeconds}s
        </div>

        {/* Rotating Tips */}
        <div style={{
          minHeight: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            fontSize: '13px',
            color: '#7c8db5',
            fontStyle: 'italic',
            opacity: tipFade ? 1 : 0,
            transform: tipFade ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.3s, transform 0.3s',
          }}>
            {GENERATION_TIPS[tipIndex]}
          </div>
        </div>
      </div>
    </div>
  );
};

// ---- Result Card Component ----
const ResultCard = ({ song, index, navigate }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), index * 200);
    return () => clearTimeout(timer);
  }, [index]);

  const tags = song.tags ? song.tags.split(',').map(t => t.trim()).filter(Boolean) : [];

  return (
    <div style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
      padding: '0',
      backgroundColor: '#f8f9fa',
      borderRadius: '12px',
      border: '1px solid #e8e8e8',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: '0', flexDirection: 'row', flexWrap: 'wrap' }}>
        {/* Cover Image */}
        {resolveMediaUrl(song.image_url) && (
          <div style={{
            width: '140px',
            minHeight: '140px',
            flexShrink: 0,
            backgroundImage: `url(${resolveMediaUrl(song.image_url)})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px 0 0 12px',
          }} />
        )}

        {/* Song Info */}
        <div style={{ flex: 1, padding: '20px', minWidth: '200px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a1a' }}>
                {song.title || 'Sem titulo'}
              </div>
              {song.duration && (
                <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                  {formatDuration(song.duration)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {resolveMediaUrl(song.audio_url) && (
                <a
                  href={resolveMediaUrl(song.audio_url)}
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
                  <Download size={14} /> Baixar
                </a>
              )}
              {song.id && (
                <button
                  style={{
                    ...buttonSecondary,
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    borderColor: '#bbdefb',
                    padding: '6px 12px',
                  }}
                  onClick={() => navigate(`/songs/${song.id}`)}
                >
                  <Eye size={14} /> Ver detalhes
                </button>
              )}
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {tags.map((tag, i) => (
                <span key={i} style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 500,
                  backgroundColor: '#eef2ff',
                  color: '#5b6abf',
                  border: '1px solid #dde3ff',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Audio Player */}
          {resolveMediaUrl(song.audio_url) && (
            <AudioPlayer src={resolveMediaUrl(song.audio_url)} title={song.title} />
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Main Component ----
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

  // Resultados e geracao
  const [results, setResults] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [stageIndex, setStageIndex] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showResults, setShowResults] = useState(false);

  // Prompts recentes
  const [recentPrompts, setRecentPrompts] = useState([]);

  // Historico de geracoes
  const [generationHistory, setGenerationHistory] = useState([]);

  // Refs for polling
  const pollingRef = useRef(null);
  const timerRef = useRef(null);
  const generationIdRef = useRef(null);

  useEffect(() => {
    setRecentPrompts(loadRecentPrompts());
    fetchHistory();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
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

  const startElapsedTimer = useCallback(() => {
    setElapsedSeconds(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, []);

  const stopTimers = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startPolling = useCallback((generationId) => {
    generationIdRef.current = generationId;

    // After initial 5s of "sending", start polling
    const pollFn = async () => {
      try {
        const res = await api.get(`/suno/status/${generationId}`);
        const { status, sunoStatus, songs } = res.data;

        const idx = getStageIndex(sunoStatus, status);
        setStageIndex(idx);

        if (status === 'complete') {
          stopTimers();
          setGenerating(false);
          setResults(Array.isArray(songs) ? songs : []);
          // Fade in results with a slight delay
          setTimeout(() => setShowResults(true), 100);
          fetchHistory();
          return;
        }

        if (status === 'failed') {
          stopTimers();
          setGenerating(false);
          setError('A geracao falhou. Tente novamente.');
          return;
        }
      } catch (err) {
        // Don't stop polling on transient errors, just log
        console.error('Erro ao verificar status:', err);
      }
    };

    // First poll after a short delay
    setTimeout(pollFn, 2000);

    pollingRef.current = setInterval(pollFn, POLL_INTERVAL);
  }, [stopTimers]);

  const handleSimpleGenerate = async () => {
    if (!simplePrompt.trim()) return;
    setGenerating(true);
    setError('');
    setResults([]);
    setShowResults(false);
    setStageIndex(0);
    saveRecentPrompt(simplePrompt);
    setRecentPrompts(loadRecentPrompts());
    startElapsedTimer();

    try {
      const res = await api.post('/suno/generate', {
        prompt: simplePrompt,
        make_instrumental: simpleInstrumental,
        wait_audio: false,
      });

      const { generationId, taskId } = res.data;

      if (!generationId) {
        // Fallback: if API returned songs directly
        stopTimers();
        setGenerating(false);
        const songs = Array.isArray(res.data) ? res.data : res.data.songs ? res.data.songs : [res.data];
        setResults(songs);
        setTimeout(() => setShowResults(true), 100);
        fetchHistory();
        return;
      }

      setStageIndex(1);
      startPolling(generationId);
    } catch (err) {
      stopTimers();
      setGenerating(false);
      setError(err.response?.data?.error || 'Erro ao gerar musica. Tente novamente.');
    }
  };

  const handleCustomGenerate = async () => {
    if (!customLyrics.trim() && !customInstrumental) return;
    setGenerating(true);
    setError('');
    setResults([]);
    setShowResults(false);
    setStageIndex(0);
    saveRecentPrompt(customLyrics || customTitle);
    setRecentPrompts(loadRecentPrompts());
    startElapsedTimer();

    try {
      const res = await api.post('/suno/custom_generate', {
        prompt: customLyrics,
        tags: customTags,
        title: customTitle,
        make_instrumental: customInstrumental,
        wait_audio: false,
      });

      const { generationId, taskId } = res.data;

      if (!generationId) {
        stopTimers();
        setGenerating(false);
        const songs = Array.isArray(res.data) ? res.data : res.data.songs ? res.data.songs : [res.data];
        setResults(songs);
        setTimeout(() => setShowResults(true), 100);
        fetchHistory();
        return;
      }

      setStageIndex(1);
      startPolling(generationId);
    } catch (err) {
      stopTimers();
      setGenerating(false);
      setError(err.response?.data?.error || 'Erro ao gerar musica. Tente novamente.');
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
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin { animation: spin 1s linear infinite; }
        @media (max-width: 600px) {
          .result-card-inner {
            flex-direction: column !important;
          }
          .result-card-cover {
            width: 100% !important;
            min-height: 180px !important;
            border-radius: 12px 12px 0 0 !important;
          }
        }
      `}</style>

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

      {/* Generation Progress Animation */}
      {generating && (
        <GenerationProgress
          stageIndex={stageIndex}
          elapsedSeconds={elapsedSeconds}
        />
      )}

      {/* Resultados */}
      {results.length > 0 && !generating && (
        <div style={{
          marginTop: '24px',
          opacity: showResults ? 1 : 0,
          transition: 'opacity 0.5s ease-out',
        }}>
          <Card title="Resultados">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {results.map((song, idx) => (
                <ResultCard
                  key={song.id || idx}
                  song={song}
                  index={idx}
                  navigate={navigate}
                />
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
