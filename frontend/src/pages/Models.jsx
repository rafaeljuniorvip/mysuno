import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, Filter, Cpu, Star, Image, DollarSign, Clock,
  ChevronDown, X, Check, Eye, Layers, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

const SORT_OPTIONS = [
  { value: 'name:ASC', label: 'Nome' },
  { value: 'provider:ASC', label: 'Provider' },
  { value: 'context_length:DESC', label: 'Contexto' },
  { value: 'pricing_prompt:ASC', label: 'Preco' },
  { value: 'created:DESC', label: 'Data' },
];

const PROVIDER_COLORS = {
  openai: { bg: '#dcfce7', color: '#166534' },
  anthropic: { bg: '#ffedd5', color: '#9a3412' },
  google: { bg: '#dbeafe', color: '#1e40af' },
  'meta-llama': { bg: '#f3e8ff', color: '#6b21a8' },
  mistralai: { bg: '#fee2e2', color: '#991b1b' },
};

const getProviderColor = (provider) => {
  if (!provider) return { bg: '#f3f4f6', color: '#6b7280' };
  const key = Object.keys(PROVIDER_COLORS).find(k => provider.toLowerCase().includes(k));
  return key ? PROVIDER_COLORS[key] : { bg: '#f3f4f6', color: '#6b7280' };
};

function formatPrice(pricePerToken) {
  if (!pricePerToken) return 'Gratis';
  const perMillion = parseFloat(pricePerToken) * 1000000;
  if (perMillion === 0) return 'Gratis';
  if (perMillion < 0.01) return '<$0.01/1M';
  return '$' + perMillion.toFixed(2) + '/1M';
}

function formatContext(length) {
  if (!length) return '-';
  if (length >= 1000000) return (length / 1000000).toFixed(0) + 'M';
  return (length / 1000).toFixed(0) + 'K';
}

const MODALITY_LABELS = {
  text: 'texto',
  image: 'imagem',
  audio: 'audio',
  video: 'video',
  file: 'arquivo',
};

const inputStyle = {
  padding: '10px 14px',
  border: '1px solid #e5e7eb',
  borderRadius: '8px',
  fontSize: '14px',
  outline: 'none',
  backgroundColor: '#f9fafb',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const buttonPrimary = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '10px 18px',
  background: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 600,
  transition: 'background-color 0.15s',
  whiteSpace: 'nowrap',
};

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

const thStyle = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '14px',
  fontSize: '14px',
  color: '#374151',
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
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
});

const selectStyle = {
  ...inputStyle,
  appearance: 'none',
  paddingRight: '32px',
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  cursor: 'pointer',
  minWidth: '140px',
};

const badgeStyle = (bg, color) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 10px',
  borderRadius: '12px',
  fontSize: '12px',
  fontWeight: 600,
  backgroundColor: bg,
  color: color,
  whiteSpace: 'nowrap',
});

const modalLabelStyle = {
  fontSize: '11px',
  fontWeight: 600,
  color: '#9ca3af',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
};

const modalValueStyle = {
  fontSize: '14px',
  color: '#111827',
  fontWeight: 500,
};

export default function Models() {
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 1 });
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [visionFilter, setVisionFilter] = useState(false);
  const [sortOption, setSortOption] = useState('name:ASC');
  const [defaultModel, setDefaultModel] = useState('');
  const [detailModel, setDetailModel] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [settingDefault, setSettingDefault] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const fetchModels = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortOption.split(':');
      const params = new URLSearchParams({
        page: String(page),
        limit: '50',
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (providerFilter) params.set('provider', providerFilter);
      if (visionFilter) params.set('vision', 'true');

      const { data } = await api.get(`/ai/models?${params}`);
      setModels(data.data || []);
      setProviders(data.providers || []);
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 1 });

      if (data.data && data.data.length > 0) {
        const synced = data.data.find(m => m.synced_at);
        if (synced) setLastSync(synced.synced_at);
      }
    } catch (err) {
      console.error('Erro ao buscar modelos:', err);
    } finally {
      setLoading(false);
    }
  }, [search, providerFilter, visionFilter, sortOption]);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data } = await api.get('/ai/preferences');
      setDefaultModel(data.default_model || '');
    } catch (err) {
      console.error('Erro ao buscar preferencias:', err);
    }
  }, []);

  useEffect(() => {
    fetchModels(1);
  }, [fetchModels]);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post('/ai/models/sync');
      setSyncResult(data);
      fetchModels(1);
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSetDefault = async (modelId) => {
    setSettingDefault(modelId);
    try {
      await api.put('/ai/preferences', { default_model: modelId });
      setDefaultModel(modelId);
    } catch (err) {
      console.error('Erro ao definir modelo padrao:', err);
    } finally {
      setSettingDefault(null);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      fetchModels(1);
    }
  };

  const renderPagination = () => {
    const { page, pages, total } = pagination;
    if (pages <= 1) return null;

    const pageNumbers = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(pages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pageNumbers.push(i);
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '6px', padding: '20px 0',
      }}>
        <button
          onClick={() => fetchModels(page - 1)}
          disabled={page <= 1}
          style={{
            ...actionBtnStyle,
            opacity: page <= 1 ? 0.4 : 1,
            cursor: page <= 1 ? 'default' : 'pointer',
          }}
        >
          <ChevronLeft size={16} />
        </button>

        {start > 1 && (
          <>
            <button onClick={() => fetchModels(1)} style={pageBtn(false)}>1</button>
            {start > 2 && <span style={{ color: '#9ca3af', fontSize: '13px' }}>...</span>}
          </>
        )}

        {pageNumbers.map(n => (
          <button
            key={n}
            onClick={() => fetchModels(n)}
            style={pageBtn(n === page)}
          >
            {n}
          </button>
        ))}

        {end < pages && (
          <>
            {end < pages - 1 && <span style={{ color: '#9ca3af', fontSize: '13px' }}>...</span>}
            <button onClick={() => fetchModels(pages)} style={pageBtn(false)}>{pages}</button>
          </>
        )}

        <button
          onClick={() => fetchModels(page + 1)}
          disabled={page >= pages}
          style={{
            ...actionBtnStyle,
            opacity: page >= pages ? 0.4 : 1,
            cursor: page >= pages ? 'default' : 'pointer',
          }}
        >
          <ChevronRight size={16} />
        </button>

        <span style={{ fontSize: '13px', color: '#9ca3af', marginLeft: '12px' }}>
          Pagina {page} de {pages} ({total} modelos)
        </span>
      </div>
    );
  };

  const pageBtn = (active) => ({
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: active ? '1px solid #3b82f6' : '1px solid #e5e7eb',
    borderRadius: '6px',
    background: active ? '#3b82f6' : '#fff',
    color: active ? '#fff' : '#374151',
    fontSize: '13px',
    fontWeight: active ? 600 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const renderModalities = (inputMods, outputMods) => {
    const mods = new Set();
    if (inputMods) {
      (Array.isArray(inputMods) ? inputMods : [inputMods]).forEach(m => mods.add(m));
    }
    if (outputMods) {
      (Array.isArray(outputMods) ? outputMods : [outputMods]).forEach(m => mods.add(m));
    }
    if (mods.size === 0) return <span style={{ color: '#9ca3af' }}>-</span>;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {[...mods].map(m => {
          const label = MODALITY_LABELS[m] || m;
          const isImage = m === 'image';
          return (
            <span
              key={m}
              style={badgeStyle(
                isImage ? '#fef3c7' : '#f3f4f6',
                isImage ? '#92400e' : '#6b7280'
              )}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!detailModel) return null;
    const m = detailModel;
    const pc = getProviderColor(m.provider);
    const isDefault = defaultModel === m.id;

    return (
      <Modal isOpen={!!detailModel} onClose={() => setDetailModel(null)} title="Detalhes do Modelo">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Name and ID */}
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '4px' }}>
              {isDefault && <Star size={16} style={{ color: '#f59e0b', marginRight: '6px', verticalAlign: 'middle' }} />}
              {m.name}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#9ca3af' }}>{m.id}</div>
          </div>

          {/* Provider badge */}
          <div>
            <div style={modalLabelStyle}>Provider</div>
            <span style={badgeStyle(pc.bg, pc.color)}>{m.provider}</span>
          </div>

          {/* Description */}
          {m.description && (
            <div>
              <div style={modalLabelStyle}>Descricao</div>
              <div style={{ ...modalValueStyle, fontWeight: 400, lineHeight: 1.6 }}>{m.description}</div>
            </div>
          )}

          {/* Info grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px', background: '#f9fafb', padding: '16px', borderRadius: '10px',
            border: '1px solid #f3f4f6',
          }}>
            <div>
              <div style={modalLabelStyle}>Contexto</div>
              <div style={modalValueStyle}>{formatContext(m.context_length)} tokens</div>
            </div>
            <div>
              <div style={modalLabelStyle}>Max Completion</div>
              <div style={modalValueStyle}>{m.max_completion_tokens ? m.max_completion_tokens.toLocaleString() : '-'}</div>
            </div>
            <div>
              <div style={modalLabelStyle}>Preco (Prompt)</div>
              <div style={{ ...modalValueStyle, fontFamily: 'monospace' }}>{formatPrice(m.pricing_prompt)}</div>
            </div>
            <div>
              <div style={modalLabelStyle}>Preco (Completion)</div>
              <div style={{ ...modalValueStyle, fontFamily: 'monospace' }}>{formatPrice(m.pricing_completion)}</div>
            </div>
            <div>
              <div style={modalLabelStyle}>Knowledge Cutoff</div>
              <div style={modalValueStyle}>{m.knowledge_cutoff || '-'}</div>
            </div>
            <div>
              <div style={modalLabelStyle}>Criado em</div>
              <div style={modalValueStyle}>
                {m.created ? new Date(m.created).toLocaleDateString('pt-BR') : '-'}
              </div>
            </div>
          </div>

          {/* Modalities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <div style={modalLabelStyle}>Modalidades de Entrada</div>
              <div style={{ marginTop: '6px' }}>
                {renderModalities(m.input_modalities, null)}
              </div>
            </div>
            <div>
              <div style={modalLabelStyle}>Modalidades de Saida</div>
              <div style={{ marginTop: '6px' }}>
                {renderModalities(null, m.output_modalities)}
              </div>
            </div>
          </div>

          {/* Moderated */}
          <div>
            <div style={modalLabelStyle}>Moderado</div>
            <span style={badgeStyle(
              m.is_moderated ? '#dcfce7' : '#fef3c7',
              m.is_moderated ? '#166534' : '#92400e'
            )}>
              {m.is_moderated ? 'Sim' : 'Nao'}
            </span>
          </div>

          {/* Set as default button */}
          <button
            onClick={() => {
              handleSetDefault(m.id);
              setDetailModel(null);
            }}
            disabled={isDefault}
            style={{
              ...buttonPrimary,
              justifyContent: 'center',
              background: isDefault ? '#9ca3af' : '#f59e0b',
              opacity: isDefault ? 0.7 : 1,
              cursor: isDefault ? 'default' : 'pointer',
            }}
          >
            <Star size={16} />
            {isDefault ? 'Modelo Padrao Atual' : 'Definir como Modelo Padrao'}
          </button>
        </div>
      </Modal>
    );
  };

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '16px', marginBottom: '24px',
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>
            <Cpu size={24} style={{ verticalAlign: 'middle', marginRight: '10px', color: '#6b7280' }} />
            Modelos de IA
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#9ca3af' }}>
            Catalogo de modelos disponiveis via OpenRouter
            {lastSync && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#d1d5db' }}>
                Ultima sincronizacao: {new Date(lastSync).toLocaleString('pt-BR')}
              </span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {syncResult && (
            <span style={{
              fontSize: '13px', color: '#16a34a', fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <Check size={14} />
              {syncResult.synced} modelos sincronizados
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              ...buttonPrimary,
              background: syncing ? '#9ca3af' : '#3b82f6',
              cursor: syncing ? 'default' : 'pointer',
            }}
          >
            {syncing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            {syncing ? 'Sincronizando...' : 'Sincronizar Modelos'}
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '200px' }}>
            <Search size={16} style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)', color: '#9ca3af',
            }} />
            <input
              type="text"
              placeholder="Buscar por nome ou ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{ ...inputStyle, width: '100%', paddingLeft: '36px' }}
            />
          </div>

          <select
            value={providerFilter}
            onChange={(e) => { setProviderFilter(e.target.value); }}
            style={selectStyle}
          >
            <option value="">Todos Providers</option>
            {providers.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={() => setVisionFilter(!visionFilter)}
            style={filterBtnStyle(visionFilter)}
          >
            <Image size={14} />
            Suporta Imagem
          </button>

          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={selectStyle}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>Ordenar: {opt.label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Stats bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '16px',
        padding: '12px 0', fontSize: '13px', color: '#9ca3af', fontWeight: 500,
      }}>
        <span>
          <strong style={{ color: '#374151' }}>{pagination.total}</strong> modelos encontrados
        </span>
        <span style={{ color: '#e5e7eb' }}>|</span>
        <span>
          <strong style={{ color: '#374151' }}>{providers.length}</strong> providers
        </span>
        {defaultModel && (
          <>
            <span style={{ color: '#e5e7eb' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={12} color="#f59e0b" fill="#f59e0b" />
              Padrao: <strong style={{ color: '#374151', fontFamily: 'monospace', fontSize: '12px' }}>{defaultModel}</strong>
            </span>
          </>
        )}
      </div>

      {/* Table */}
      <Card>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                <th style={thStyle}>Nome</th>
                <th style={thStyle}>Provider</th>
                <th style={thStyle}>Contexto</th>
                <th style={thStyle}>Preco (Prompt)</th>
                <th style={thStyle}>Preco (Completion)</th>
                <th style={thStyle}>Modalidades</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                    Carregando modelos...
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                    <Cpu size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                    Nenhum modelo encontrado. Tente sincronizar os modelos.
                  </td>
                </tr>
              ) : (
                models.map((m) => {
                  const pc = getProviderColor(m.provider);
                  const isDefault = defaultModel === m.id;
                  return (
                    <tr
                      key={m.id}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        backgroundColor: isDefault ? '#fffbeb' : 'transparent',
                        transition: 'background-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (!isDefault) e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = isDefault ? '#fffbeb' : 'transparent';
                      }}
                    >
                      {/* Nome */}
                      <td style={{ ...tdStyle, maxWidth: '320px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isDefault && <Star size={14} color="#f59e0b" fill="#f59e0b" />}
                          <div>
                            <div style={{ fontWeight: 600, color: '#111827', fontSize: '14px', lineHeight: 1.3 }}>
                              {m.name}
                            </div>
                            <div style={{
                              fontFamily: 'monospace', fontSize: '11px', color: '#9ca3af',
                              marginTop: '2px', wordBreak: 'break-all',
                            }}>
                              {m.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Provider */}
                      <td style={tdStyle}>
                        <span style={badgeStyle(pc.bg, pc.color)}>
                          {m.provider}
                        </span>
                      </td>

                      {/* Contexto */}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 500 }}>
                        {formatContext(m.context_length)}
                      </td>

                      {/* Preco Prompt */}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                        {formatPrice(m.pricing_prompt)}
                      </td>

                      {/* Preco Completion */}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                        {formatPrice(m.pricing_completion)}
                      </td>

                      {/* Modalidades */}
                      <td style={tdStyle}>
                        {renderModalities(m.input_modalities, m.output_modalities)}
                      </td>

                      {/* Acoes */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                          <button
                            onClick={() => handleSetDefault(m.id)}
                            disabled={isDefault || settingDefault === m.id}
                            title={isDefault ? 'Modelo padrao atual' : 'Definir como padrao'}
                            style={{
                              ...actionBtnStyle,
                              borderColor: isDefault ? '#f59e0b' : '#e0e0e0',
                              color: isDefault ? '#f59e0b' : '#666',
                              opacity: settingDefault === m.id ? 0.5 : 1,
                              cursor: isDefault ? 'default' : 'pointer',
                            }}
                          >
                            {settingDefault === m.id ? (
                              <Loader2 size={14} className="spin" />
                            ) : (
                              <Star size={14} fill={isDefault ? '#f59e0b' : 'none'} />
                            )}
                          </button>
                          <button
                            onClick={() => setDetailModel(m)}
                            title="Detalhes"
                            style={actionBtnStyle}
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Pagination */}
      {renderPagination()}

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
}
