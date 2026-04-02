import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Copy, RotateCcw, ArrowRight, Loader2, ChevronDown, ChevronRight,
  Clock, X, Plus, Menu, Image as ImageIcon, Save, Search, MessageSquare, Trash2,
  CheckCircle, Settings2
} from 'lucide-react';
import api from '../services/api';

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
  resize: 'vertical',
  lineHeight: '1.5',
};

const btnPrimary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '10px 20px',
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'opacity 0.2s, transform 0.1s',
  fontFamily: 'inherit',
};

const btnSecondary = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  background: '#fff',
  color: '#374151',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background 0.2s',
  fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#374151',
  marginBottom: '6px',
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatCost(cost) {
  const n = parseFloat(cost) || 0;
  if (n === 0) return '$0.00';
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function shortenModel(modelId) {
  if (!modelId) return '';
  const parts = modelId.split('/');
  return parts[parts.length - 1];
}

function formatPrice(pricePerToken) {
  if (!pricePerToken) return '-';
  const perMillion = parseFloat(pricePerToken) * 1000000;
  if (perMillion < 0.01) return '$0.00/M';
  return `$${perMillion.toFixed(2)}/M`;
}

// Shimmer loading animation
const ShimmerBlock = () => (
  <div style={{ overflow: 'hidden', borderRadius: '8px' }}>
    {[...Array(8)].map((_, i) => (
      <div key={i} style={{
        height: '16px',
        marginBottom: '10px',
        borderRadius: '4px',
        width: `${60 + Math.random() * 35}%`,
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }} />
    ))}
    <style>{`
      @keyframes shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  </div>
);

export default function Lyrics() {
  const navigate = useNavigate();

  // State: conversations / history
  const [conversations, setConversations] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  // State: models
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  // State: preferences
  const [systemPrompt, setSystemPrompt] = useState('Voce e um compositor profissional. Crie letras de musica criativas, poeticas e emocionantes com base nas instrucoes do usuario. Responda apenas com a letra da musica, sem explicacoes adicionais.');
  const [systemPromptOpen, setSystemPromptOpen] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  // State: generation
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [versions, setVersions] = useState(1);
  const timerRef = useRef(null);

  // State: result
  const [result, setResult] = useState(null);
  const [activeVersion, setActiveVersion] = useState(0);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Refs
  const fileInputRef = useRef(null);
  const modelDropdownRef = useRef(null);
  const promptRef = useRef(null);

  // --- Data fetching ---
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/ai/conversations?limit=50');
      setConversations(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar historico:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchModels = useCallback(async () => {
    try {
      const res = await api.get('/ai/models?limit=200');
      setModels(res.data?.data || []);
    } catch (err) {
      console.error('Erro ao carregar modelos:', err);
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await api.get('/ai/preferences');
      if (res.data?.default_model) setSelectedModel(res.data.default_model);
      if (res.data?.default_system_prompt) setSystemPrompt(res.data.default_system_prompt);
    } catch (err) {
      console.error('Erro ao carregar preferencias:', err);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
    fetchModels();
    fetchPreferences();
  }, [fetchConversations, fetchModels, fetchPreferences]);

  // Close model dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setModelDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Timer for elapsed time
  useEffect(() => {
    if (generating) {
      setElapsedTime(0);
      timerRef.current = setInterval(() => setElapsedTime(t => t + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [generating]);

  // --- Helpers ---
  const selectedModelObj = models.find(m => m.id === selectedModel);
  const supportsImage = selectedModelObj?.input_modalities?.includes('image');

  const filteredModels = models.filter(m => {
    if (!modelSearch) return true;
    const q = modelSearch.toLowerCase();
    return (m.name?.toLowerCase().includes(q) || m.id?.toLowerCase().includes(q) || m.provider?.toLowerCase().includes(q));
  });

  // --- Actions ---
  const handleSavePreferences = async () => {
    try {
      setSavingPrefs(true);
      await api.put('/ai/preferences', {
        default_model: selectedModel,
        default_system_prompt: systemPrompt,
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch (err) {
      setError('Erro ao salvar preferencias.');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem muito grande. Maximo: 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageBase64(ev.target.result);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Digite uma descricao para gerar a letra.');
      return;
    }
    if (!selectedModel) {
      setError('Selecione um modelo de IA.');
      return;
    }

    setError('');
    setResult(null);
    setActiveVersion(0);
    setGenerating(true);

    try {
      const body = {
        model: selectedModel,
        prompt: prompt.trim(),
        systemPrompt: systemPrompt,
        versions: versions,
      };
      if (context.trim()) body.context = context.trim();
      if (imageBase64 && supportsImage) body.imageBase64 = imageBase64;

      const res = await api.post('/ai/generate-lyrics', body);
      setResult(res.data);
      fetchConversations();
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Erro ao gerar letra. Tente novamente.';
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    const allVersions = result?.versions || [result];
    const current = allVersions[activeVersion] || allVersions[0];
    if (!current?.lyrics) return;
    try {
      await navigator.clipboard.writeText(current.lyrics);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Erro ao copiar.');
    }
  };

  const handleUseInGenerator = () => {
    const allVersions = result?.versions || [result];
    const current = allVersions[activeVersion] || allVersions[0];
    if (!current) return;
    navigate('/generate', { state: { lyrics: current.lyrics, title: current.title } });
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleNewConversation = () => {
    setSelectedConversation(null);
    setResult(null);
    setPrompt('');
    setContext('');
    removeImage();
    setError('');
    if (promptRef.current) promptRef.current.focus();
  };

  const handleLoadConversation = async (conv) => {
    try {
      const res = await api.get(`/ai/conversations/${conv.id}`);
      const data = res.data;
      setSelectedConversation(data);

      if (data.generated_lyrics) {
        setResult({
          lyrics: data.generated_lyrics,
          title: data.generated_title,
          model: data.model_id,
          tokens: data.total_tokens,
          cost: data.total_cost,
        });
      }
      if (data.model_id) setSelectedModel(data.model_id);
      if (data.system_prompt) setSystemPrompt(data.system_prompt);

      // Try to get the user prompt from messages
      if (data.messages && data.messages.length > 0) {
        const userMsg = data.messages.find(m => m.role === 'user');
        if (userMsg) {
          if (typeof userMsg.content === 'string') {
            setPrompt(userMsg.content);
          } else if (Array.isArray(userMsg.content)) {
            const textPart = userMsg.content.find(p => p.type === 'text');
            if (textPart) setPrompt(textPart.text || '');
          }
        }
      }

      setHistoryOpen(false);
    } catch (err) {
      setError('Erro ao carregar conversa.');
    }
  };

  // --- Responsive ---
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // --- Render: History Panel ---
  const HistoryPanel = () => (
    <div style={{
      width: isMobile ? '100%' : '280px',
      minWidth: isMobile ? 'auto' : '280px',
      height: isMobile ? 'auto' : '100%',
      backgroundColor: '#fff',
      borderRight: isMobile ? 'none' : '1px solid #e5e7eb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#111827' }}>
          Historico
        </h3>
        <button
          onClick={handleNewConversation}
          style={{
            ...btnSecondary,
            padding: '6px 12px',
            fontSize: '12px',
          }}
        >
          <Plus size={14} />
          Nova Conversa
        </button>
      </div>
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
      }}>
        {loadingHistory ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
            Nenhuma conversa ainda.
          </div>
        ) : (
          conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => handleLoadConversation(conv)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '10px 12px',
                marginBottom: '4px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: selectedConversation?.id === conv.id ? '#eff6ff' : 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s',
                fontFamily: 'inherit',
              }}
              onMouseEnter={e => { if (selectedConversation?.id !== conv.id) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
              onMouseLeave={e => { if (selectedConversation?.id !== conv.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#111827',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                <MessageSquare size={12} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#6b7280' }} />
                {conv.generated_title || 'Sem titulo'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {shortenModel(conv.model_id)}
                </span>
                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                  {formatDate(conv.created_at)}
                </span>
              </div>
              {conv.total_cost > 0 && (
                <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>
                  {formatCost(conv.total_cost)}
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      height: 'calc(100vh - 32px)',
      backgroundColor: '#f8fafc',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '1px solid #e5e7eb',
    }}>

      {/* Mobile history drawer */}
      {isMobile && historyOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 50,
          display: 'flex',
        }}>
          <div
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }}
            onClick={() => setHistoryOpen(false)}
          />
          <div style={{
            position: 'relative',
            width: '300px',
            maxWidth: '80vw',
            height: '100%',
            backgroundColor: '#fff',
            boxShadow: '4px 0 20px rgba(0,0,0,0.1)',
            zIndex: 51,
          }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px' }}>
              <button onClick={() => setHistoryOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <X size={20} color="#6b7280" />
              </button>
            </div>
            <HistoryPanel />
          </div>
        </div>
      )}

      {/* Desktop history panel */}
      {!isMobile && <HistoryPanel />}

      {/* Main Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* Top Bar */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
          }}>
            {isMobile && (
              <button
                onClick={() => setHistoryOpen(true)}
                style={{ ...btnSecondary, padding: '8px' }}
              >
                <Menu size={18} />
              </button>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={20} color="#3b82f6" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                Gerador de Letras com IA
              </h2>
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Model selector */}
              <div ref={modelDropdownRef} style={{ position: 'relative', minWidth: '260px' }}>
                <button
                  onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                  style={{
                    ...inputStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    padding: '8px 12px',
                    fontSize: '13px',
                    backgroundColor: '#fff',
                    width: '100%',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    color: selectedModel ? '#111827' : '#9ca3af',
                  }}>
                    {selectedModel ? (selectedModelObj?.name || shortenModel(selectedModel)) : 'Selecionar modelo...'}
                  </span>
                  <ChevronDown size={16} color="#6b7280" style={{ flexShrink: 0, marginLeft: '8px' }} />
                </button>

                {modelDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                    zIndex: 100,
                    maxHeight: '320px',
                    display: 'flex',
                    flexDirection: 'column',
                  }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                      <div style={{ position: 'relative' }}>
                        <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                          type="text"
                          placeholder="Buscar modelo..."
                          value={modelSearch}
                          onChange={e => setModelSearch(e.target.value)}
                          style={{
                            ...inputStyle,
                            paddingLeft: '32px',
                            fontSize: '13px',
                            padding: '8px 10px 8px 32px',
                          }}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div style={{ overflowY: 'auto', maxHeight: '260px' }}>
                      {filteredModels.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                          Nenhum modelo encontrado.
                        </div>
                      ) : (
                        filteredModels.map(m => (
                          <button
                            key={m.id}
                            onClick={() => {
                              setSelectedModel(m.id);
                              setModelDropdownOpen(false);
                              setModelSearch('');
                            }}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              padding: '8px 12px',
                              border: 'none',
                              backgroundColor: m.id === selectedModel ? '#eff6ff' : 'transparent',
                              cursor: 'pointer',
                              fontFamily: 'inherit',
                              transition: 'background 0.1s',
                            }}
                            onMouseEnter={e => { if (m.id !== selectedModel) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                            onMouseLeave={e => { if (m.id !== selectedModel) e.currentTarget.style.backgroundColor = m.id === selectedModel ? '#eff6ff' : 'transparent'; }}
                          >
                            <div style={{ fontSize: '13px', fontWeight: 500, color: '#111827' }}>
                              {m.name || shortenModel(m.id)}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                              <span>{m.provider}</span>
                              <span>In: {formatPrice(m.pricing_prompt)}</span>
                              <span>Out: {formatPrice(m.pricing_completion)}</span>
                              {m.context_length && <span>{(m.context_length / 1000).toFixed(0)}k ctx</span>}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* System prompt toggle */}
              <button
                onClick={() => setSystemPromptOpen(!systemPromptOpen)}
                style={{ ...btnSecondary, padding: '8px 12px', fontSize: '12px' }}
                title="System Prompt"
              >
                <Settings2 size={14} />
                System Prompt
                {systemPromptOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              </button>

              {/* Save preferences */}
              <button
                onClick={handleSavePreferences}
                disabled={savingPrefs}
                style={{
                  ...btnSecondary,
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: prefsSaved ? '#16a34a' : '#374151',
                  borderColor: prefsSaved ? '#86efac' : '#d1d5db',
                  opacity: savingPrefs ? 0.7 : 1,
                }}
                title="Salvar preferencias"
              >
                {prefsSaved ? <CheckCircle size={14} /> : <Save size={14} />}
                {prefsSaved ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
          </div>

          {/* System prompt collapsible */}
          {systemPromptOpen && (
            <div style={{ marginTop: '12px' }}>
              <label style={labelStyle}>System Prompt</label>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                rows={3}
                style={{ ...textareaStyle, fontSize: '13px' }}
                placeholder="Instrucoes para a IA..."
              />
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
        }}>
          {/* Error */}
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>{error}</span>
              <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}>
                <X size={16} color="#dc2626" />
              </button>
            </div>
          )}

          {/* Prompt area */}
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <div style={{ marginBottom: '14px' }}>
              <label style={labelStyle}>Descreva a musica que voce quer gerar a letra</label>
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                style={{ ...textareaStyle, minHeight: '100px' }}
                placeholder="Ex: Uma balada romantica sobre saudade, em estilo MPB, com metaforas sobre o mar..."
                disabled={generating}
              />
            </div>

            <div style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}>
              {/* Context */}
              <div style={{ flex: '1 1 300px' }}>
                <label style={labelStyle}>Contexto adicional (opcional)</label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  rows={2}
                  style={{ ...textareaStyle, fontSize: '13px' }}
                  placeholder="Artista de referencia, emocao desejada, detalhes especificos..."
                  disabled={generating}
                />
              </div>

              {/* Image upload - only if model supports it */}
              {supportsImage && (
                <div style={{ flex: '0 0 auto' }}>
                  <label style={labelStyle}>Imagem para contexto</label>
                  {imagePreview ? (
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          width: '80px',
                          height: '80px',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                        }}
                      />
                      <button
                        onClick={removeImage}
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        ...btnSecondary,
                        padding: '10px 16px',
                        borderStyle: 'dashed',
                      }}
                      disabled={generating}
                    >
                      <ImageIcon size={16} />
                      Enviar imagem
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                  />
                </div>
              )}
            </div>

            {/* Versions + Generate button */}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>Versoes:</span>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setVersions(n)}
                    style={{
                      width: '34px', height: '34px', borderRadius: '8px', border: '1px solid',
                      borderColor: versions === n ? '#3b82f6' : '#e5e7eb',
                      backgroundColor: versions === n ? '#eff6ff' : '#fff',
                      color: versions === n ? '#3b82f6' : '#6b7280',
                      fontWeight: 600, fontSize: '14px', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim() || !selectedModel}
                style={{
                  ...btnPrimary,
                  opacity: (generating || !prompt.trim() || !selectedModel) ? 0.6 : 1,
                  cursor: (generating || !prompt.trim() || !selectedModel) ? 'not-allowed' : 'pointer',
                  padding: '12px 24px',
                  fontSize: '15px',
                }}
              >
                {generating ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={18} />}
                {generating ? 'Gerando...' : `Gerar ${versions > 1 ? versions + ' Versoes' : 'Letra'} com IA`}
              </button>
            </div>
          </div>

          {/* Loading state */}
          {generating && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '32px',
              marginBottom: '20px',
              textAlign: 'center',
            }}>
              <div style={{ marginBottom: '16px' }}>
                <Loader2 size={32} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
              </div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                Gerando letra com IA...
              </div>
              <div style={{ fontSize: '13px', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Clock size={14} />
                Tempo decorrido: {elapsedTime}s
              </div>
              <div style={{ marginTop: '20px' }}>
                <ShimmerBlock />
              </div>
            </div>
          )}

          {/* Result */}
          {result && !generating && (() => {
            const allVersions = result.versions || [{ lyrics: result.lyrics, title: result.title, model: result.model, tokens: result.tokens, cost: result.cost }];
            const current = allVersions[activeVersion] || allVersions[0];
            return (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              {/* Version tabs */}
              {allVersions.length > 1 && (
                <div style={{
                  display: 'flex', gap: '0', borderBottom: '1px solid #e5e7eb',
                  backgroundColor: '#fafbfc', overflow: 'auto',
                }}>
                  {allVersions.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setActiveVersion(i)}
                      style={{
                        padding: '12px 20px', border: 'none', cursor: 'pointer',
                        fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap',
                        backgroundColor: activeVersion === i ? '#fff' : 'transparent',
                        color: activeVersion === i ? '#3b82f6' : '#6b7280',
                        borderBottom: activeVersion === i ? '2px solid #3b82f6' : '2px solid transparent',
                        transition: 'all 0.15s',
                      }}
                    >
                      Versao {i + 1}
                      {v.title && <span style={{ fontWeight: 400, marginLeft: '6px', color: '#9ca3af' }}>— {v.title}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Lyrics content */}
              {current.title && (
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafbfc' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827' }}>{current.title}</h3>
                </div>
              )}

              <div style={{ padding: '20px' }}>
                <pre style={{
                  whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit',
                  fontSize: '14px', lineHeight: '1.7', color: '#1f2937', margin: 0,
                  padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6',
                }}>
                  {current.lyrics}
                </pre>
              </div>

              {/* Info bar */}
              <div style={{
                padding: '12px 20px', borderTop: '1px solid #f3f4f6', backgroundColor: '#fafbfc',
                display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', fontSize: '12px', color: '#6b7280',
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', backgroundColor: '#eff6ff', borderRadius: '6px', color: '#2563eb', fontWeight: 500 }}>
                  Modelo: {shortenModel(current.model || result.model)}
                </span>
                <span style={{ padding: '4px 10px', backgroundColor: '#f0fdf4', borderRadius: '6px', color: '#16a34a', fontWeight: 500 }}>
                  Tokens: {(result.tokens || 0).toLocaleString('pt-BR')}
                </span>
                <span style={{ padding: '4px 10px', backgroundColor: '#fefce8', borderRadius: '6px', color: '#a16207', fontWeight: 500 }}>
                  Custo total: {formatCost(result.cost)}
                </span>
                {allVersions.length > 1 && (
                  <span style={{ padding: '4px 10px', backgroundColor: '#f3e8ff', borderRadius: '6px', color: '#7c3aed', fontWeight: 500 }}>
                    {allVersions.length} versoes geradas
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ padding: '16px 20px', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={handleCopy} style={btnSecondary}>
                  {copied ? <CheckCircle size={16} color="#16a34a" /> : <Copy size={16} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button onClick={handleUseInGenerator} style={{ ...btnPrimary, padding: '8px 16px', fontSize: '13px' }}>
                  <ArrowRight size={16} />
                  Usar no Gerador de Musica
                </button>
                <button onClick={handleRegenerate} style={btnSecondary}>
                  <RotateCcw size={16} />
                  Gerar Novamente
                </button>
              </div>
            </div>
            );
          })()}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
