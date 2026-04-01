import React, { useState } from 'react';
import { Sparkles, Music2, Wand2, Copy, ArrowRight, Loader2, Music } from 'lucide-react';
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

export default function Generate() {
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

  const handleSimpleGenerate = async () => {
    if (!simplePrompt.trim()) return;
    setGenerating(true);
    setError('');
    setResults([]);
    try {
      const res = await api.post('/suno/generate', {
        prompt: simplePrompt,
        make_instrumental: simpleInstrumental,
        wait_audio: true,
      });
      setResults(Array.isArray(res.data) ? res.data : [res.data]);
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
    try {
      const res = await api.post('/suno/custom_generate', {
        prompt: customLyrics,
        tags: customTags,
        title: customTitle,
        make_instrumental: customInstrumental,
        wait_audio: true,
      });
      setResults(Array.isArray(res.data) ? res.data : [res.data]);
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

        {tab === 'simple' && (
          <div style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Descreva a musica que voce quer</label>
              <textarea
                style={textareaStyle}
                placeholder="Ex: Uma musica pop alegre sobre o verao..."
                value={simplePrompt}
                onChange={(e) => setSimplePrompt(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#555' }}>
                <input
                  type="checkbox"
                  checked={simpleInstrumental}
                  onChange={(e) => setSimpleInstrumental(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#1976d2' }}
                />
                Instrumental (sem voz)
              </label>
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
          <div style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Titulo</label>
              <input
                style={inputStyle}
                placeholder="Titulo da musica"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Letra</label>
              <textarea
                style={{ ...textareaStyle, minHeight: '150px' }}
                placeholder="Digite ou cole a letra da musica aqui..."
                value={customLyrics}
                onChange={(e) => setCustomLyrics(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Estilo / Tags</label>
              <input
                style={inputStyle}
                placeholder="Ex: pop, rock, acustico, alegre..."
                value={customTags}
                onChange={(e) => setCustomTags(e.target.value)}
                onFocus={(e) => { e.target.style.borderColor = '#1976d2'; }}
                onBlur={(e) => { e.target.style.borderColor = '#ddd'; }}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#555' }}>
                <input
                  type="checkbox"
                  checked={customInstrumental}
                  onChange={(e) => setCustomInstrumental(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#1976d2' }}
                />
                Instrumental (sem voz)
              </label>
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

      {/* Gerador de Letra */}
      <div style={{ marginTop: '24px' }}>
        <Card title="Gerar Letra">
          <div style={{ maxWidth: '600px' }}>
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
        <div style={{ marginTop: '20px', padding: '14px 18px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Carregando */}
      {generating && (
        <div style={{ marginTop: '24px', textAlign: 'center', padding: '40px 20px' }}>
          <Loader2 size={36} color="#1976d2" className="spin" />
          <p style={{ color: '#888', marginTop: '12px', fontSize: '14px' }}>Gerando sua musica... Isso pode levar alguns minutos.</p>
        </div>
      )}

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
                    {clip.status && <StatusBadge status={clip.status} />}
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
    </div>
  );
}
