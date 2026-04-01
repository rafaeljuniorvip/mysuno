import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { CreditCard, Music, Calendar, Zap } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';

const COLORS = ['#1976d2', '#7b1fa2', '#2e7d32', '#e65100', '#0097a7', '#c62828', '#f9a825', '#4527a0', '#00695c', '#ef6c00'];

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div style={{
    background: '#fff',
    borderRadius: '12px',
    border: '1px solid #e8e8e8',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    flex: '1 1 220px',
    minWidth: '200px',
  }}>
    <div style={{
      width: '52px',
      height: '52px',
      borderRadius: '14px',
      backgroundColor: color + '12',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    }}>
      <Icon size={24} color={color} strokeWidth={2} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: '#999', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ fontSize: '30px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
        {value ?? '--'}
      </div>
    </div>
  </div>
);

export default function Reports() {
  const [summary, setSummary] = useState(null);
  const [periodData, setPeriodData] = useState([]);
  const [styleData, setStyleData] = useState([]);
  const [typeData, setTypeData] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [startDate, setStartDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split('T')[0]);

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

  const typeColumns = [
    { key: 'type', label: 'Tipo', render: (val) => <span style={{ fontWeight: 500 }}>{val || 'Desconhecido'}</span> },
    { key: 'total', label: 'Quantidade' },
    { key: 'credits', label: 'Creditos' },
  ];

  const dateInputStyle = {
    padding: '8px 12px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    backgroundColor: '#fafafa',
    transition: 'border-color 0.2s',
    fontFamily: 'inherit',
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#888', fontSize: '15px' }}>
        Carregando relatorios...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 28px 0', fontSize: '26px', fontWeight: 700, color: '#1a1a1a' }}>Relatorios</h1>

      {/* Cards de resumo */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <StatCard icon={CreditCard} label="Creditos Usados" value={summary?.total_credits_used} color="#1976d2" />
        <StatCard icon={Music} label="Total de Musicas" value={summary?.total_songs} color="#7b1fa2" />
        <StatCard icon={Calendar} label="Musicas Hoje" value={summary?.songs_today} color="#2e7d32" />
        <StatCard icon={Zap} label="Total de Geracoes" value={summary?.total_generations} color="#e65100" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Musicas por Periodo */}
        <Card title="Musicas por Periodo">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#999', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>De</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={dateInputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#999', fontWeight: 600, display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Ate</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={dateInputStyle}
              />
            </div>
          </div>
          {periodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={periodData}>
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: '#999' }}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#999' }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(val) => {
                    if (!val) return '';
                    return new Date(val).toLocaleDateString('pt-BR');
                  }}
                  contentStyle={{ fontSize: '13px', borderRadius: '8px', border: '1px solid #e0e0e0' }}
                  formatter={(value) => [value, 'Total']}
                />
                <Bar dataKey="total" fill="#1976d2" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '14px' }}>
              Nenhum dado para o periodo selecionado.
            </div>
          )}
        </Card>

        {/* Musicas por Estilo */}
        <Card title="Musicas por Estilo">
          {styleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={styleData}
                  dataKey="total"
                  nameKey="style"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={50}
                  label={({ style, percent }) => `${style} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={true}
                  fontSize={12}
                >
                  {styleData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: '13px', borderRadius: '8px', border: '1px solid #e0e0e0' }} />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span style={{ color: '#555' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '14px' }}>
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
