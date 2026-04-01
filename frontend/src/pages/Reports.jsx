import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid } from 'recharts';
import { CreditCard, Music, Calendar, Zap, Clock, TrendingUp, Download, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#06b6d4', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316'];

const StatCard = ({ icon: Icon, label, value, color, subtitle }) => (
  <div style={{
    background: `linear-gradient(135deg, ${color}08, ${color}14)`,
    borderRadius: '14px',
    border: `1px solid ${color}20`,
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: '1 1 200px',
    minWidth: '180px',
    transition: 'transform 0.15s, box-shadow 0.15s',
  }}>
    <div style={{
      width: '50px', height: '50px', borderRadius: '14px',
      background: `linear-gradient(135deg, ${color}18, ${color}28)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={22} color={color} strokeWidth={2} />
    </div>
    <div>
      <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#111827', lineHeight: 1 }}>
        {value ?? '--'}
      </div>
      {subtitle && (
        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{subtitle}</div>
      )}
    </div>
  </div>
);

const QuickRangeButton = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '6px 14px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
      border: active ? '1px solid #3b82f6' : '1px solid #e5e7eb',
      background: active ? '#eff6ff' : '#fff',
      color: active ? '#2563eb' : '#6b7280',
      cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
    }}
  >
    {label}
  </button>
);

const HorizontalBar = ({ label, value, maxValue, color, index }) => {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
      <div style={{ width: '24px', fontSize: '13px', color: '#9ca3af', fontWeight: 600, textAlign: 'right' }}>
        {index + 1}.
      </div>
      <div style={{ width: '120px', fontSize: '13px', color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </div>
      <div style={{ flex: 1, height: '24px', background: '#f3f4f6', borderRadius: '6px', overflow: 'hidden', position: 'relative' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: '6px',
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          transition: 'width 0.6s ease-out',
          minWidth: pct > 0 ? '4px' : 0,
        }} />
      </div>
      <div style={{ width: '60px', fontSize: '13px', color: '#6b7280', fontWeight: 600, textAlign: 'right' }}>
        {value} ({pct.toFixed(0)}%)
      </div>
    </div>
  );
};

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [periodData, setPeriodData] = useState([]);
  const [styleData, setStyleData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeRange, setActiveRange] = useState('30d');

  const today = new Date();

  const getRangeStart = (range) => {
    const d = new Date(today);
    switch (range) {
      case '7d': d.setDate(d.getDate() - 7); break;
      case '30d': d.setDate(d.getDate() - 30); break;
      case '90d': d.setDate(d.getDate() - 90); break;
      case 'month': d.setDate(1); break;
      default: d.setDate(d.getDate() - 30);
    }
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getRangeStart('30d'));
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

  const handleRangeClick = (range) => {
    setActiveRange(range);
    if (range !== 'custom') {
      setStartDate(getRangeStart(range));
      setEndDate(today.toISOString().split('T')[0]);
    }
  };

  const fetchSummaryAndCharts = async () => {
    try {
      const [summaryRes, styleRes, typeRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/reports/by-style'),
        api.get('/reports/by-type'),
      ]);
      setSummary(summaryRes.data);
      setStyleData(styleRes.data || []);
      setTypeData(typeRes.data || []);
    } catch (err) {
      console.error('Falha ao carregar relatorios:', err);
    }
  };

  const fetchPeriodData = async () => {
    try {
      const params = new URLSearchParams({ group: 'day' });
      if (startDate) params.set('start', startDate);
      if (endDate) params.set('end', endDate);
      const res = await api.get(`/reports/by-period?${params.toString()}`);
      setPeriodData(res.data || []);
    } catch (err) {
      console.error('Falha ao carregar dados por periodo:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSummaryAndCharts(), fetchPeriodData()]);
      setLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    fetchPeriodData();
  }, [startDate, endDate]);

  // Calcular dados derivados
  const successRate = useMemo(() => {
    if (!typeData.length) return null;
    const total = typeData.reduce((acc, t) => acc + (t.total || 0), 0);
    // Estimar completas baseado nos dados disponiveis
    const completed = summary?.total_songs || 0;
    const generations = summary?.total_generations || 0;
    if (generations === 0) return null;
    return Math.round((completed / generations) * 100);
  }, [typeData, summary]);

  const averageDuration = useMemo(() => {
    // Placeholder - idealmente viria do backend
    return summary?.avg_duration ? `${Math.floor(summary.avg_duration / 60)}:${Math.floor(summary.avg_duration % 60).toString().padStart(2, '0')}` : '--';
  }, [summary]);

  const topStyles = useMemo(() => {
    const sorted = [...styleData].sort((a, b) => b.total - a.total).slice(0, 10);
    return sorted;
  }, [styleData]);

  const topStyleMax = topStyles.length > 0 ? topStyles[0].total : 1;

  // Simular dados de creditos por periodo (baseado nos dados de periodo existentes)
  const creditsOverTime = useMemo(() => {
    return periodData.map((d) => ({
      ...d,
      credits: d.credits || Math.round((d.total || 0) * 10),
    }));
  }, [periodData]);

  const handleExport = () => {
    const report = {
      exportado_em: new Date().toISOString(),
      resumo: summary,
      por_periodo: periodData,
      por_estilo: styleData,
      por_tipo: typeData,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio-mysuno-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeColumns = [
    { key: 'type', label: 'Tipo', render: (val) => <span style={{ fontWeight: 600, color: '#374151' }}>{val || 'Desconhecido'}</span> },
    { key: 'total', label: 'Quantidade', render: (val) => <span style={{ fontWeight: 600 }}>{val}</span> },
    { key: 'credits', label: 'Creditos', render: (val) => <span style={{ color: '#6b7280' }}>{val}</span> },
  ];

  const dateInputStyle = {
    padding: '8px 12px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: '#f9fafb',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  };

  const tooltipStyle = {
    fontSize: '13px', borderRadius: '10px', border: '1px solid #e5e7eb',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '8px 12px',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px', color: '#9ca3af', fontSize: '15px' }}>
        Carregando relatorios...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: '#111827' }}>Relatorios</h1>
        <button onClick={handleExport} style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '10px 20px', background: '#fff', color: '#374151',
          border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer',
          fontSize: '14px', fontWeight: 600, transition: 'all 0.15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}>
          <Download size={16} /> Exportar Relatorio
        </button>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .reports-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Cards de resumo */}
      <div style={{ display: 'flex', gap: '14px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <StatCard icon={CreditCard} label="Creditos Usados" value={summary?.total_credits_used} color="#3b82f6" />
        <StatCard icon={Music} label="Total de Musicas" value={summary?.total_songs} color="#8b5cf6" />
        <StatCard icon={Calendar} label="Musicas Hoje" value={summary?.songs_today} color="#10b981" />
        <StatCard icon={Zap} label="Geracoes" value={summary?.total_generations} color="#f59e0b" />
        <StatCard icon={Clock} label="Duracao Media" value={averageDuration} color="#06b6d4" />
        {successRate !== null && (
          <StatCard
            icon={successRate >= 80 ? CheckCircle : TrendingUp}
            label="Taxa de Sucesso"
            value={`${successRate}%`}
            color={successRate >= 80 ? '#10b981' : '#f59e0b'}
            subtitle={`${summary?.total_songs || 0} de ${summary?.total_generations || 0}`}
          />
        )}
      </div>

      {/* Seletores rapidos de periodo */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 600, marginRight: '4px' }}>Periodo:</span>
        <QuickRangeButton label="7 dias" active={activeRange === '7d'} onClick={() => handleRangeClick('7d')} />
        <QuickRangeButton label="30 dias" active={activeRange === '30d'} onClick={() => handleRangeClick('30d')} />
        <QuickRangeButton label="90 dias" active={activeRange === '90d'} onClick={() => handleRangeClick('90d')} />
        <QuickRangeButton label="Este mes" active={activeRange === 'month'} onClick={() => handleRangeClick('month')} />
        <QuickRangeButton label="Personalizado" active={activeRange === 'custom'} onClick={() => handleRangeClick('custom')} />
        {activeRange === 'custom' && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '8px' }}>
            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>De</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} style={dateInputStyle} />
            <label style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 600 }}>Ate</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={dateInputStyle} />
          </div>
        )}
      </div>

      <div className="reports-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Musicas por Periodo */}
        <Card title="Musicas por Periodo">
          {periodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={periodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  labelFormatter={(val) => val ? new Date(val).toLocaleDateString('pt-BR') : ''}
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Musicas']}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '14px' }}>
              Nenhum dado para o periodo selecionado.
            </div>
          )}
        </Card>

        {/* Creditos por Periodo */}
        <Card title="Creditos Usados por Periodo">
          {creditsOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={creditsOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  }}
                  axisLine={{ stroke: '#e5e7eb' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} axisLine={{ stroke: '#e5e7eb' }} />
                <Tooltip
                  labelFormatter={(val) => val ? new Date(val).toLocaleDateString('pt-BR') : ''}
                  contentStyle={tooltipStyle}
                  formatter={(value) => [value, 'Creditos']}
                />
                <Line type="monotone" dataKey="credits" stroke="#8b5cf6" strokeWidth={2.5} dot={{ fill: '#8b5cf6', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '14px' }}>
              Nenhum dado disponivel.
            </div>
          )}
        </Card>
      </div>

      <div className="reports-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        {/* Top 10 Estilos - Barras Horizontais */}
        <Card title="Estilos Mais Usados (Top 10)">
          {topStyles.length > 0 ? (
            <div style={{ padding: '8px 0' }}>
              {topStyles.map((s, i) => (
                <HorizontalBar
                  key={s.style}
                  label={s.style || 'Desconhecido'}
                  value={s.total}
                  maxValue={topStyleMax}
                  color={COLORS[i % COLORS.length]}
                  index={i}
                />
              ))}
            </div>
          ) : (
            <div style={{ height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '14px' }}>
              Nenhum dado de estilo disponivel.
            </div>
          )}
        </Card>

        {/* Musicas por Estilo - Pie */}
        <Card title="Distribuicao por Estilo">
          {styleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={styleData}
                  dataKey="total"
                  nameKey="style"
                  cx="50%"
                  cy="50%"
                  outerRadius={105}
                  innerRadius={55}
                  label={({ style, percent }) => `${style} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                  fontSize={11}
                >
                  {styleData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [value, name]} />
                <Legend wrapperStyle={{ fontSize: '12px' }} formatter={(value) => <span style={{ color: '#6b7280' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d1d5db', fontSize: '14px' }}>
              Nenhum dado de estilo disponivel.
            </div>
          )}
        </Card>
      </div>

      {/* Geracoes por Tipo */}
      <Card title="Geracoes por Tipo">
        <Table
          columns={typeColumns}
          data={typeData}
          emptyMessage="Nenhum dado de tipo disponivel."
        />
      </Card>
    </div>
  );
}
