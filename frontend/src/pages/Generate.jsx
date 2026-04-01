import React, { useState } from 'react';
import { Wand2, Sparkles, FileText, Copy, Check, Loader2, Music } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import AudioPlayer from '../components/ui/AudioPlayer';

const btnStyle = (active) => ({
  padding: '10px 24px',
  border: 'none',
  borderBottom: active ? '3px solid #1976d2' : '3px solid transparent',
  background: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: active ? 600 : 400,
  color: active ? '#1976d2' : '#666',
  transition: 'all 0.2s',
});

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

const textareaStyle = {
  ...inputStyle,
  minHeight: '100px',
  resize: 'vertical',
};

const primaryBtn = (disabled) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 24px',
  backgroundColor: disabled ? '#90caf9' : '#1976d2',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: '14px',
  fontWeight: 500,
});

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 500,
  color: '#555',
  marginBottom: '6px',
};

export default function Generate() {
  const [mode, setMode] = useState('simple');
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);

  // Simple mode
  const [simplePrompt, setSimplePrompt] = useState('');
  const [simpleInstrumental, setSimpleInstrumental] = useState(false);

  // Custom mode
  const [customTitle, setCustomTitle] = useState('');
  const [customLyrics, setCustomLyrics] = useState('');
  const [customTags, setCustomTags] = useState('');
  const [customInstrumental, setCustomInstrumental] = useState(false);

  // Lyrics generator
  const [lyricsPrompt, setLyricsPrompt] = useState('');
  const [generatedLyrics, setGeneratedLyrics] = useState(null);
  const [generatingLyrics, setGeneratingLyrics] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSimpleGenerate = async () => {
    if (!simplePrompt.trim()) return;
    setGenerating(true);
    setResults([]);
    try {
      const res = await api.post('/suno/generate', {
        prompt: simplePrompt,
        make_instrumental: simpleInstrumental,
        wait_audio: true,
      });
      setResults(Array.isArray(res.data) ? res.data : [res.data]);
    } catch (err) {
      console.error('Generation failed:', err);
      alert('Generation failed. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCustomGenerate = async () => {
    if (!customLyrics.trim()) return;
    setGenerating(true);
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
      console.error('Custom generation failed:', err);
      alert('Custom generation failed. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateLyrics = async () => {
    if (!lyricsPrompt.trim()) return;
    setGeneratingLyrics(true);
    setGeneratedLyrics(null);
    try {
      const res = await api.post('/suno/generate_lyrics', {
        prompt: lyricsPrompt,
      });
      setGeneratedLyrics(res.data);
    } catch (err) {
      console.error('Lyrics generation failed:', err);
      alert('Lyrics generation failed.');
    } finally {
      setGeneratingLyrics(false);
    }
  };

  const handleCopyLyrics = () => {
    if (generatedLyrics?.text) {
      navigator.clipboard.writeText(generatedLyrics.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUseLyrics = () => {
    if (generatedLyrics) {
      setCustomTitle(generatedLyrics.title || '');
      setCustomLyrics(generatedLyrics.text || '');
      setMode('custom');
    }
  };

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700, color: '#333' }}>
        Generate Music
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Left: Generation Form */}
        <div>
          <Card>
            <div style={{ borderBottom: '1px solid #e0e0e0', marginBottom: '20px', display: 'flex' }}>
              <button style={btnStyle(mode === 'simple')} onClick={() => setMode('simple')}>
                <Wand2 size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Simple
              </button>
              <button style={btnStyle(mode === 'custom')} onClick={() => setMode('custom')}>
                <Sparkles size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Custom
              </button>
            </div>

            {mode === 'simple' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Prompt</label>
                  <textarea
                    style={textareaStyle}
                    placeholder="Describe the song you want to create..."
                    value={simplePrompt}
                    onChange={(e) => setSimplePrompt(e.target.value)}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={simpleInstrumental}
                    onChange={(e) => setSimpleInstrumental(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Instrumental (no vocals)
                </label>
                <button
                  onClick={handleSimpleGenerate}
                  disabled={generating || !simplePrompt.trim()}
                  style={primaryBtn(generating || !simplePrompt.trim())}
                >
                  {generating ? <Loader2 size={16} className="spin" /> : <Wand2 size={16} />}
                  {generating ? 'Generating...' : 'Generate'}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Title</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="Song title"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Lyrics / Prompt</label>
                  <textarea
                    style={{ ...textareaStyle, minHeight: '140px' }}
                    placeholder="Write your lyrics here..."
                    value={customLyrics}
                    onChange={(e) => setCustomLyrics(e.target.value)}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Style / Tags</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g. pop, rock, acoustic, electronic"
                    value={customTags}
                    onChange={(e) => setCustomTags(e.target.value)}
                  />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#555', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customInstrumental}
                    onChange={(e) => setCustomInstrumental(e.target.checked)}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Instrumental (no vocals)
                </label>
                <button
                  onClick={handleCustomGenerate}
                  disabled={generating || !customLyrics.trim()}
                  style={primaryBtn(generating || !customLyrics.trim())}
                >
                  {generating ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                  {generating ? 'Generating...' : 'Generate Custom'}
                </button>
              </div>
            )}
          </Card>

          {/* Lyrics Generator */}
          <div style={{ marginTop: '24px' }}>
            <Card title="Generate Lyrics">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Describe the lyrics you want</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g. A love song about the ocean at sunset"
                    value={lyricsPrompt}
                    onChange={(e) => setLyricsPrompt(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleGenerateLyrics}
                  disabled={generatingLyrics || !lyricsPrompt.trim()}
                  style={{
                    ...primaryBtn(generatingLyrics || !lyricsPrompt.trim()),
                    backgroundColor: (generatingLyrics || !lyricsPrompt.trim()) ? '#a5d6a7' : '#2e7d32',
                  }}
                >
                  {generatingLyrics ? <Loader2 size={16} className="spin" /> : <FileText size={16} />}
                  {generatingLyrics ? 'Generating...' : 'Generate Lyrics'}
                </button>

                {generatedLyrics && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '14px', color: '#333' }}>
                        {generatedLyrics.title || 'Generated Lyrics'}
                      </strong>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleCopyLyrics}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px', fontSize: '12px', border: '1px solid #ddd',
                            borderRadius: '4px', background: '#fff', cursor: 'pointer', color: '#555',
                          }}
                        >
                          {copied ? <Check size={12} /> : <Copy size={12} />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={handleUseLyrics}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '4px',
                            padding: '4px 10px', fontSize: '12px', border: '1px solid #1976d2',
                            borderRadius: '4px', background: '#e3f2fd', cursor: 'pointer', color: '#1976d2',
                          }}
                        >
                          Use in Custom
                        </button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      value={generatedLyrics.text || ''}
                      style={{ ...textareaStyle, minHeight: '160px', backgroundColor: '#fafafa' }}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* Right: Results */}
        <div>
          <Card title="Generation Results">
            {generating && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                <Loader2 size={32} className="spin" style={{ marginBottom: '12px' }} />
                <p>Generating your music... This may take a moment.</p>
              </div>
            )}

            {!generating && results.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#aaa' }}>
                <Music size={48} style={{ marginBottom: '12px', opacity: 0.3 }} />
                <p>Generated songs will appear here.</p>
              </div>
            )}

            {!generating && results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {results.map((clip, i) => (
                  <div
                    key={clip.id || clip.suno_id || i}
                    style={{
                      padding: '16px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      backgroundColor: '#fafafa',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <strong style={{ fontSize: '15px', color: '#333' }}>
                        {clip.title || 'Untitled'}
                      </strong>
                      <span style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        borderRadius: '10px',
                        backgroundColor: clip.status === 'complete' ? '#e8f5e9' : '#fff3e0',
                        color: clip.status === 'complete' ? '#2e7d32' : '#e65100',
                        fontWeight: 600,
                      }}>
                        {clip.status || 'pending'}
                      </span>
                    </div>
                    {clip.suno_id && (
                      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontFamily: 'monospace' }}>
                        ID: {clip.suno_id}
                      </div>
                    )}
                    {clip.audio_url && (
                      <AudioPlayer src={clip.audio_url} title="" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
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
