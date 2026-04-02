import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, Search, Filter, Cpu, Star, Image, DollarSign, Clock,
  ChevronDown, ChevronUp, X, Check, Eye, Layers, ChevronLeft, ChevronRight, Loader2,
  Shield, Volume2, Type, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown
} from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';

const SORT_OPTIONS = [
  { value: 'name:ASC', label: 'Nome A-Z' },
  { value: 'name:DESC', label: 'Nome Z-A' },
  { value: 'provider:ASC', label: 'Provider A-Z' },
  { value: 'provider:DESC', label: 'Provider Z-A' },
  { value: 'context_length:DESC', label: 'Contexto: Maior' },
  { value: 'context_length:ASC', label: 'Contexto: Menor' },
  { value: 'pricing_prompt:ASC', label: 'Preco: Menor' },
  { value: 'pricing_prompt:DESC', label: 'Preco: Maior' },
  { value: 'created:DESC', label: 'Mais recente' },
  { value: 'created:ASC', label: 'Mais antigo' },
  { value: 'pricing_completion:ASC', label: 'Completion: Menor' },
  { value: 'pricing_completion:DESC', label: 'Completion: Maior' },
  { value: 'max_completion_tokens:DESC', label: 'Max Tokens: Maior' },
];

const COLUMN_SORT_MAP = {
  nome: 'name',
  provider: 'provider',
  contexto: 'context_length',
  max_output: 'max_completion_tokens',
  preco_prompt: 'pricing_prompt',
  preco_completion: 'pricing_completion',
  data: 'created',
};

const LIMIT_OPTIONS = [25, 50, 100];

const PROVIDER_COLORS = {
  openai: { bg: '#dcfce7', color: '#166534' },
  anthropic: { bg: '#ffedd5', color: '#9a3412' },
  google: { bg: '#dbeafe', color: '#1e40af' },
  'meta-llama': { bg: '#f3e8ff', color: '#6b21a8' },
  mistralai: { bg: '#fee2e2', color: '#991b1b' },
  cohere: { bg: '#fef3c7', color: '#92400e' },
  deepseek: { bg: '#e0f2fe', color: '#0369a1' },
  microsoft: { bg: '#f0fdf4', color: '#15803d' },
  perplexity: { bg: '#ede9fe', color: '#5b21b6' },
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
  if (length >= 1000000) return (length / 1000000).toFixed(length % 1000000 === 0 ? 0 : 1) + 'M';
  return (length / 1000).toFixed(0) + 'K';
}

function formatContextInput(value) {
  if (!value) return '';
  const num = parseInt(value, 10);
  if (isNaN(num)) return value;
  if (num >= 1000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
  return String(num);
}

const MODALITY_LABELS = {
  text: 'texto',
  image: 'imagem',
  audio: 'audio',
  video: 'video',
  file: 'arquivo',
};

const MODALITY_COLORS = {
  text: { bg: '#f3f4f6', color: '#6b7280' },
  image: { bg: '#fef3c7', color: '#92400e' },
  audio: { bg: '#ede9fe', color: '#5b21b6' },
  video: { bg: '#fce7f3', color: '#9d174d' },
  file: { bg: '#e0f2fe', color: '#0369a1' },
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

const thClickableStyle = {
  ...thStyle,
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'color 0.15s',
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

const chipStyle = (active) => ({
  padding: '6px 14px',
  border: '1px solid',
  borderColor: active ? '#3b82f6' : '#e0e0e0',
  borderRadius: '20px',
  backgroundColor: active ? '#eff6ff' : '#fff',
  color: active ? '#1d4ed8' : '#6b7280',
  fontSize: '13px',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.15s',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  whiteSpace: 'nowrap',
});

const activeFilterPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '4px 12px',
  borderRadius: '16px',
  backgroundColor: '#eff6ff',
  color: '#1d4ed8',
  fontSize: '12px',
  fontWeight: 500,
  border: '1px solid #bfdbfe',
  whiteSpace: 'nowrap',
};

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

const statBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 14px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 500,
  backgroundColor: '#f9fafb',
  color: '#374151',
  border: '1px solid #f3f4f6',
};

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

const smallInputStyle = {
  ...inputStyle,
  padding: '8px 10px',
  fontSize: '13px',
  width: '100px',
};

export default function Models() {
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, pages: 1 });
  const [limit, setLimit] = useState(25);
  const [search, setSearch] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [visionFilter, setVisionFilter] = useState(false);
  const [freeFilter, setFreeFilter] = useState(false);
  const [moderatedFilter, setModeratedFilter] = useState('');
  const [inputModalities, setInputModalities] = useState([]);
  const [outputModality, setOutputModality] = useState('');
  const [minContext, setMinContext] = useState('');
  const [maxContext, setMaxContext] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sortOption, setSortOption] = useState('name:ASC');
  const [defaultModel, setDefaultModel] = useState('');
  const [defaultImageModel, setDefaultImageModel] = useState('');
  const [detailModel, setDetailModel] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [settingDefault, setSettingDefault] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchModels = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const [sortField, sortOrder] = sortOption.split(':');
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        sort: sortField,
        order: sortOrder,
      });
      if (search) params.set('search', search);
      if (providerFilter) params.set('provider', providerFilter);
      if (visionFilter) params.set('vision', 'true');
      if (freeFilter) params.set('free', 'true');
      if (moderatedFilter) params.set('moderated', moderatedFilter);
      if (inputModalities.length > 0) {
        inputModalities.forEach(mod => params.append('input_modality', mod));
      }
      if (outputModality) params.set('output_modality', outputModality);
      if (minContext) params.set('min_context', minContext);
      if (maxContext) params.set('max_context', maxContext);
      if (minPrice) {
        const perToken = parseFloat(minPrice) / 1000000;
        params.set('min_price', String(perToken));
      }
      if (maxPrice) {
        const perToken = parseFloat(maxPrice) / 1000000;
        params.set('max_price', String(perToken));
      }

      const { data } = await api.get(`/ai/models?${params}`);
      setModels(data.data || []);
      setProviders(data.providers || []);
      setStats(data.stats || null);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, pages: 1 });
    } catch (err) {
      console.error('Erro ao buscar modelos:', err);
    } finally {
      setLoading(false);
    }
  }, [search, providerFilter, visionFilter, freeFilter, moderatedFilter, inputModalities, outputModality, minContext, maxContext, minPrice, maxPrice, sortOption, limit]);

  const fetchSyncInfo = useCallback(async () => {
    try {
      const { data } = await api.get('/ai/models/sync-info');
      if (data.last_sync) setLastSync(data.last_sync);
    } catch (err) {
      // sync-info endpoint may not exist yet
    }
  }, []);

  const fetchPreferences = useCallback(async () => {
    try {
      const { data } = await api.get('/ai/preferences');
      setDefaultModel(data.default_model || '');
      setDefaultImageModel(data.default_image_model || '');
    } catch (err) {
      console.error('Erro ao buscar preferencias:', err);
    }
  }, []);

  useEffect(() => {
    fetchModels(1);
  }, [fetchModels]);

  useEffect(() => {
    fetchPreferences();
    fetchSyncInfo();
  }, [fetchPreferences, fetchSyncInfo]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data } = await api.post('/ai/models/sync');
      setSyncResult(data);
      fetchModels(1);
      fetchSyncInfo();
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleSetDefault = async (modelId, type = 'text') => {
    setSettingDefault(`${type}:${modelId}`);
    try {
      if (type === 'image') {
        await api.put('/ai/preferences', { default_image_model: modelId });
        setDefaultImageModel(modelId);
      } else {
        await api.put('/ai/preferences', { default_model: modelId });
        setDefaultModel(modelId);
      }
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

  const handleColumnSort = (columnKey) => {
    const sortField = COLUMN_SORT_MAP[columnKey];
    if (!sortField) return;
    const [currentField, currentOrder] = sortOption.split(':');
    if (currentField === sortField) {
      setSortOption(`${sortField}:${currentOrder === 'ASC' ? 'DESC' : 'ASC'}`);
    } else {
      const defaultOrder = ['pricing_prompt', 'pricing_completion'].includes(sortField) ? 'ASC' : 'DESC';
      setSortOption(`${sortField}:${sortField === 'name' || sortField === 'provider' ? 'ASC' : defaultOrder}`);
    }
  };

  const toggleInputModality = (mod) => {
    setInputModalities(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const clearAllFilters = () => {
    setSearch('');
    setProviderFilter('');
    setVisionFilter(false);
    setFreeFilter(false);
    setModeratedFilter('');
    setInputModalities([]);
    setOutputModality('');
    setMinContext('');
    setMaxContext('');
    setMinPrice('');
    setMaxPrice('');
    setSortOption('name:ASC');
  };

  const hasActiveFilters = search || providerFilter || visionFilter || freeFilter || moderatedFilter ||
    inputModalities.length > 0 || outputModality || minContext || maxContext || minPrice || maxPrice;

  const getActiveFilters = () => {
    const filters = [];
    if (providerFilter) filters.push({ key: 'provider', label: `Provider: ${providerFilter}`, clear: () => setProviderFilter('') });
    if (freeFilter) filters.push({ key: 'free', label: 'Gratuito', clear: () => setFreeFilter(false) });
    if (visionFilter) filters.push({ key: 'vision', label: 'Com Visao', clear: () => setVisionFilter(false) });
    if (moderatedFilter === 'true') filters.push({ key: 'moderated', label: 'Moderado', clear: () => setModeratedFilter('') });
    if (moderatedFilter === 'false') filters.push({ key: 'moderated', label: 'Nao Moderado', clear: () => setModeratedFilter('') });
    inputModalities.forEach(mod => {
      filters.push({
        key: `input_${mod}`,
        label: `Entrada: ${MODALITY_LABELS[mod] || mod}`,
        clear: () => setInputModalities(prev => prev.filter(m => m !== mod)),
      });
    });
    if (outputModality) filters.push({ key: 'output', label: `Saida: ${MODALITY_LABELS[outputModality] || outputModality}`, clear: () => setOutputModality('') });
    if (minContext) filters.push({ key: 'minCtx', label: `Contexto: >${formatContextInput(minContext)}`, clear: () => setMinContext('') });
    if (maxContext) filters.push({ key: 'maxCtx', label: `Contexto: <${formatContextInput(maxContext)}`, clear: () => setMaxContext('') });
    if (minPrice) filters.push({ key: 'minPrice', label: `Preco: >$${minPrice}/1M`, clear: () => setMinPrice('') });
    if (maxPrice) filters.push({ key: 'maxPrice', label: `Preco: <$${maxPrice}/1M`, clear: () => setMaxPrice('') });
    if (search) filters.push({ key: 'search', label: `Busca: "${search}"`, clear: () => setSearch('') });
    return filters;
  };

  const renderSortIcon = (columnKey) => {
    const sortField = COLUMN_SORT_MAP[columnKey];
    const [currentField, currentOrder] = sortOption.split(':');
    if (currentField !== sortField) {
      return <ArrowUpDown size={12} style={{ opacity: 0.3, marginLeft: '4px' }} />;
    }
    return currentOrder === 'ASC'
      ? <ArrowUp size={12} style={{ color: '#3b82f6', marginLeft: '4px' }} />
      : <ArrowDown size={12} style={{ color: '#3b82f6', marginLeft: '4px' }} />;
  };

  const renderPagination = () => {
    const { page, pages, total } = pagination;

    const pageNumbers = [];
    if (pages > 1) {
      const maxVisible = 5;
      let start = Math.max(1, page - Math.floor(maxVisible / 2));
      let end = Math.min(pages, start + maxVisible - 1);
      if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
      }
      for (let i = start; i <= end; i++) {
        pageNumbers.push(i);
      }
    }

    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', padding: '20px 0',
      }}>
        {/* Items per page */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
          <span>Itens por pagina:</span>
          {LIMIT_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => { setLimit(opt); }}
              style={{
                padding: '4px 10px',
                border: limit === opt ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                borderRadius: '6px',
                background: limit === opt ? '#eff6ff' : '#fff',
                color: limit === opt ? '#1d4ed8' : '#374151',
                fontSize: '13px',
                fontWeight: limit === opt ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        {/* Page navigation */}
        {pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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

            {pageNumbers[0] > 1 && (
              <>
                <button onClick={() => fetchModels(1)} style={pageBtn(false)}>1</button>
                {pageNumbers[0] > 2 && <span style={{ color: '#9ca3af', fontSize: '13px' }}>...</span>}
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

            {pageNumbers[pageNumbers.length - 1] < pages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < pages - 1 && <span style={{ color: '#9ca3af', fontSize: '13px' }}>...</span>}
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
          </div>
        )}

        <span style={{ fontSize: '13px', color: '#9ca3af' }}>
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

  const renderModalityBadges = (mods) => {
    if (!mods) return <span style={{ color: '#9ca3af' }}>-</span>;
    const list = Array.isArray(mods) ? mods : [mods];
    if (list.length === 0) return <span style={{ color: '#9ca3af' }}>-</span>;

    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {list.map(m => {
          const label = MODALITY_LABELS[m] || m;
          const colors = MODALITY_COLORS[m] || { bg: '#f3f4f6', color: '#6b7280' };
          return (
            <span key={m} style={badgeStyle(colors.bg, colors.color)}>
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
    const isDefault = defaultModel === m.id || defaultImageModel === m.id;

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
              <div style={{
                ...modalValueStyle, fontWeight: 400, lineHeight: 1.6,
                maxHeight: '200px', overflowY: 'auto',
                padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px',
                border: '1px solid #f3f4f6', fontSize: '13px',
              }}>
                {m.description}
              </div>
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
                {renderModalityBadges(m.input_modalities)}
              </div>
            </div>
            <div>
              <div style={modalLabelStyle}>Modalidades de Saida</div>
              <div style={{ marginTop: '6px' }}>
                {renderModalityBadges(m.output_modalities)}
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
              <Shield size={12} />
              {m.is_moderated ? 'Sim' : 'Nao'}
            </span>
          </div>

          {/* Last synced */}
          {m.synced_at && (
            <div>
              <div style={modalLabelStyle}>Ultima Sincronizacao</div>
              <div style={{ ...modalValueStyle, fontSize: '13px', color: '#6b7280' }}>
                {new Date(m.synced_at).toLocaleString('pt-BR')}
              </div>
            </div>
          )}

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
            {stats && (
              <span style={{ marginLeft: '8px', fontSize: '13px', color: '#6b7280' }}>
                - {stats.total} modelos cadastrados
              </span>
            )}
            {lastSync && (
              <span style={{ marginLeft: '12px', fontSize: '12px', color: '#d1d5db' }}>
                | Ultima sincronizacao: {new Date(lastSync).toLocaleString('pt-BR')}
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

      {/* Stats Badges */}
      {stats && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '16px',
        }}>
          <span style={statBadgeStyle}>
            <Cpu size={14} style={{ color: '#6b7280' }} />
            <strong>{stats.total}</strong> modelos
          </span>
          <span style={statBadgeStyle}>
            <Eye size={14} style={{ color: '#6b7280' }} />
            <strong>{stats.vision_count}</strong> com visao
          </span>
          <span style={statBadgeStyle}>
            <DollarSign size={14} style={{ color: '#16a34a' }} />
            <strong>{stats.free_count}</strong> gratuitos
          </span>
          <span style={statBadgeStyle}>
            <Shield size={14} style={{ color: '#6b7280' }} />
            <strong>{stats.moderated_count}</strong> moderados
          </span>
          {stats.min_ctx && stats.max_ctx && (
            <span style={statBadgeStyle}>
              <Layers size={14} style={{ color: '#6b7280' }} />
              Contexto: {formatContext(stats.min_ctx)} - {formatContext(stats.max_ctx)}
            </span>
          )}
        </div>
      )}

      {/* Filters */}
      <Card>
        {/* Main filter row - always visible */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          flexWrap: 'wrap',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 250px', minWidth: '200px' }}>
            <Search size={16} style={{
              position: 'absolute', left: '12px', top: '50%',
              transform: 'translateY(-50%)', color: '#9ca3af',
            }} />
            <input
              type="text"
              placeholder="Buscar por nome, ID ou descricao..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              style={{ ...inputStyle, width: '100%', paddingLeft: '36px' }}
            />
          </div>

          {/* Provider dropdown */}
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">Todos Providers</option>
            {providers.map(p => (
              <option key={p.provider || p} value={p.provider || p}>
                {p.provider || p}{p.count ? ` (${p.count})` : ''}
              </option>
            ))}
          </select>

          {/* Sort dropdown */}
          <select
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
            style={selectStyle}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>Ordenar: {opt.label}</option>
            ))}
          </select>

          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              ...filterBtnStyle(showAdvanced),
              borderColor: showAdvanced ? '#3b82f6' : '#e0e0e0',
              backgroundColor: showAdvanced ? '#eff6ff' : '#fff',
              color: showAdvanced ? '#1d4ed8' : '#666',
            }}
          >
            <SlidersHorizontal size={14} />
            Filtros Avancados
            {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Advanced filters - collapsible */}
        {showAdvanced && (
          <div style={{
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {/* Toggle chips row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>
                Tipo:
              </span>
              <button onClick={() => setFreeFilter(!freeFilter)} style={chipStyle(freeFilter)}>
                <DollarSign size={13} />
                Gratuitos
              </button>
              <button onClick={() => setVisionFilter(!visionFilter)} style={chipStyle(visionFilter)}>
                <Image size={13} />
                Com Visao
              </button>
              <button
                onClick={() => setModeratedFilter(moderatedFilter === 'true' ? '' : 'true')}
                style={chipStyle(moderatedFilter === 'true')}
              >
                <Shield size={13} />
                Moderados
              </button>
            </div>

            {/* Input modality row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', marginRight: '4px' }}>
                Entrada:
              </span>
              <button onClick={() => toggleInputModality('text')} style={chipStyle(inputModalities.includes('text'))}>
                <Type size={13} />
                Texto
              </button>
              <button onClick={() => toggleInputModality('image')} style={chipStyle(inputModalities.includes('image'))}>
                <Image size={13} />
                Imagem
              </button>
              <button onClick={() => toggleInputModality('audio')} style={chipStyle(inputModalities.includes('audio'))}>
                <Volume2 size={13} />
                Audio
              </button>
            </div>

            {/* Context range */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Contexto Min
                </label>
                <input
                  type="number"
                  placeholder="ex: 128000"
                  value={minContext}
                  onChange={(e) => setMinContext(e.target.value)}
                  style={smallInputStyle}
                />
                {minContext && (
                  <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                    ({formatContextInput(minContext)})
                  </span>
                )}
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Contexto Max
                </label>
                <input
                  type="number"
                  placeholder="ex: 1000000"
                  value={maxContext}
                  onChange={(e) => setMaxContext(e.target.value)}
                  style={smallInputStyle}
                />
                {maxContext && (
                  <span style={{ fontSize: '11px', color: '#6b7280', marginLeft: '6px' }}>
                    ({formatContextInput(maxContext)})
                  </span>
                )}
              </div>

              <div style={{ width: '1px', height: '36px', backgroundColor: '#e5e7eb' }} />

              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Preco Min ($/1M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ex: 0.10"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  style={smallInputStyle}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '6px' }}>
                  Preco Max ($/1M)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="ex: 10.00"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  style={smallInputStyle}
                />
              </div>

              <div style={{ flex: 1 }} />

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    ...filterBtnStyle(false),
                    color: '#ef4444',
                    borderColor: '#fecaca',
                  }}
                >
                  <X size={14} />
                  Limpar Filtros
                </button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '8px',
          padding: '12px 0', alignItems: 'center',
        }}>
          <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 500, marginRight: '4px' }}>
            Filtros ativos:
          </span>
          {getActiveFilters().map(f => (
            <span key={f.key} style={activeFilterPillStyle}>
              {f.label}
              <button
                onClick={f.clear}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0', display: 'flex', alignItems: 'center',
                  color: '#1d4ed8',
                }}
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '12px', color: '#ef4444', fontWeight: 500,
              padding: '4px 8px',
            }}
          >
            Limpar todos
          </button>
        </div>
      )}

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
              <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#3b82f6', fontSize: '10px', fontWeight: 700 }}>TXT</span>
              <strong style={{ color: '#374151', fontFamily: 'monospace', fontSize: '12px' }}>{defaultModel.split('/').pop()}</strong>
            </span>
          </>
        )}
        {defaultImageModel && (
          <>
            <span style={{ color: '#e5e7eb' }}>|</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: '#f3e8ff', color: '#8b5cf6', fontSize: '10px', fontWeight: 700 }}>IMG</span>
              <strong style={{ color: '#374151', fontFamily: 'monospace', fontSize: '12px' }}>{defaultImageModel.split('/').pop()}</strong>
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
                <th style={thClickableStyle} onClick={() => handleColumnSort('nome')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Nome {renderSortIcon('nome')}
                  </span>
                </th>
                <th style={thClickableStyle} onClick={() => handleColumnSort('provider')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Provider {renderSortIcon('provider')}
                  </span>
                </th>
                <th style={thClickableStyle} onClick={() => handleColumnSort('contexto')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Contexto {renderSortIcon('contexto')}
                  </span>
                </th>
                <th style={thClickableStyle} onClick={() => handleColumnSort('max_output')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Max Output {renderSortIcon('max_output')}
                  </span>
                </th>
                <th style={thClickableStyle} onClick={() => handleColumnSort('preco_prompt')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Preco Prompt {renderSortIcon('preco_prompt')}
                  </span>
                </th>
                <th style={thClickableStyle} onClick={() => handleColumnSort('preco_completion')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Preco Completion {renderSortIcon('preco_completion')}
                  </span>
                </th>
                <th style={thStyle}>Entrada</th>
                <th style={thStyle}>Saida</th>
                <th style={thClickableStyle} onClick={() => handleColumnSort('data')}>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    Data {renderSortIcon('data')}
                  </span>
                </th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                    <Loader2 size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                    Carregando modelos...
                  </td>
                </tr>
              ) : models.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
                    <Cpu size={32} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                    Nenhum modelo encontrado. Tente sincronizar os modelos.
                  </td>
                </tr>
              ) : (
                models.map((m) => {
                  const pc = getProviderColor(m.provider);
                  const isDefault = defaultModel === m.id || defaultImageModel === m.id;
                  const providerObj = providers.find(p => (p.provider || p) === m.provider);
                  const providerCount = providerObj && providerObj.count ? providerObj.count : null;
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
                          {isDefault && <Star size={14} color="#f59e0b" fill="#f59e0b" style={{ flexShrink: 0 }} />}
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
                          {providerCount && (
                            <span style={{ fontSize: '10px', opacity: 0.7, marginLeft: '2px' }}>
                              ({providerCount})
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Contexto */}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 500 }}>
                        {formatContext(m.context_length)}
                      </td>

                      {/* Max Output */}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontWeight: 500, fontSize: '13px' }}>
                        {m.max_completion_tokens ? formatContext(m.max_completion_tokens) : '-'}
                      </td>

                      {/* Preco Prompt */}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                        <span style={{
                          color: !m.pricing_prompt || parseFloat(m.pricing_prompt) === 0 ? '#16a34a' : '#374151',
                        }}>
                          {formatPrice(m.pricing_prompt)}
                        </span>
                      </td>

                      {/* Preco Completion */}
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: '13px' }}>
                        <span style={{
                          color: !m.pricing_completion || parseFloat(m.pricing_completion) === 0 ? '#16a34a' : '#374151',
                        }}>
                          {formatPrice(m.pricing_completion)}
                        </span>
                      </td>

                      {/* Entrada */}
                      <td style={tdStyle}>
                        {renderModalityBadges(m.input_modalities)}
                      </td>

                      {/* Saida */}
                      <td style={tdStyle}>
                        {renderModalityBadges(m.output_modalities)}
                      </td>

                      {/* Data */}
                      <td style={{ ...tdStyle, fontSize: '12px', color: '#9ca3af', whiteSpace: 'nowrap' }}>
                        {m.created ? new Date(m.created * 1000).toLocaleDateString('pt-BR') : '-'}
                      </td>

                      {/* Acoes */}
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          {(() => {
                            const isTextDefault = defaultModel === m.id;
                            const isImgDefault = defaultImageModel === m.id;
                            const supportsVision = m.input_modalities?.includes('image');
                            return (
                              <>
                                <button
                                  onClick={() => handleSetDefault(m.id, 'text')}
                                  disabled={isTextDefault || settingDefault === `text:${m.id}`}
                                  title={isTextDefault ? 'Modelo padrao para letras' : 'Definir como padrao para letras'}
                                  style={{
                                    ...actionBtnStyle,
                                    borderColor: isTextDefault ? '#3b82f6' : '#e0e0e0',
                                    color: isTextDefault ? '#3b82f6' : '#666',
                                    opacity: settingDefault === `text:${m.id}` ? 0.5 : 1,
                                    cursor: isTextDefault ? 'default' : 'pointer',
                                    fontSize: '10px', fontWeight: 700, padding: '4px 6px',
                                  }}
                                >
                                  {settingDefault === `text:${m.id}` ? <Loader2 size={12} className="spin" /> : 'TXT'}
                                </button>
                                {supportsVision && (
                                  <button
                                    onClick={() => handleSetDefault(m.id, 'image')}
                                    disabled={isImgDefault || settingDefault === `image:${m.id}`}
                                    title={isImgDefault ? 'Modelo padrao para imagem' : 'Definir como padrao para imagem'}
                                    style={{
                                      ...actionBtnStyle,
                                      borderColor: isImgDefault ? '#8b5cf6' : '#e0e0e0',
                                      color: isImgDefault ? '#8b5cf6' : '#666',
                                      opacity: settingDefault === `image:${m.id}` ? 0.5 : 1,
                                      cursor: isImgDefault ? 'default' : 'pointer',
                                      fontSize: '10px', fontWeight: 700, padding: '4px 6px',
                                    }}
                                  >
                                    {settingDefault === `image:${m.id}` ? <Loader2 size={12} className="spin" /> : 'IMG'}
                                  </button>
                                )}
                              </>
                            );
                          })()}
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
