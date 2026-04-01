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
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    flex: '1 1 0',
    minWidth: '200px',
  }}>
    <div style={{
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      backgroundColor: color + '15',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Icon size={24} color={color} />
    </div>
    <div>
      <div style={{ fontSize: '12px', color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: '#333', marginTop: '2px' }}>
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
      console.error('Failed to fetch reports:', err);
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
      console.error('Failed to fetch period data:', err);
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
    { key: 'type', label: 'Type', render: (val) => <span style={{ fontWeight: 500 }}>{val || 'Unknown'}</span> },
    { key: 'total', label: 'Count' },
    { key: 'credits', label: 'Credits Used' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px', color: '#888' }}>
        Loading reports...
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700, color: '#333' }}>Reports</h1>

      {/* Summary Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <StatCard icon={CreditCard} label="Total Credits Used" value={summary?.total_credits_used} color="#1976d2" />
        <StatCard icon={Music} label="Total Songs" value={summary?.total_songs} color="#7b1fa2" />
        <StatCard icon={Calendar} label="Songs Today" value={summary?.songs_today} color="#2e7d32" />
        <StatCard icon={Zap} label="Total Generations" value={summary?.total_generations} color="#e65100" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Songs by Period */}
        <Card title="Songs by Period">
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>Start</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px',
                  fontSize: '13px', outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '4px' }}>End</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  padding: '6px 10px', border: '1px solid #ddd', borderRadius: '4px',
                  fontSize: '13px', outline: 'none',
                }}
              />
            </div>
          </div>
          {periodData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={periodData}>
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 11, fill: '#888' }}
                  tickFormatter={(val) => {
                    if (!val) return '';
                    const d = new Date(val);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#888' }} allowDecimals={false} />
                <Tooltip
                  labelFormatter={(val) => {
                    if (!val) return '';
                    return new Date(val).toLocaleDateString('pt-BR');
                  }}
                  contentStyle={{ fontSize: '13px', borderRadius: '6px' }}
                />
                <Bar dataKey="total" fill="#1976d2" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
              No data for selected period.
            </div>
          )}
        </Card>

        {/* Songs by Style */}
        <Card title="Songs by Style">
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
                <Tooltip contentStyle={{ fontSize: '13px', borderRadius: '6px' }} />
                <Legend
                  wrapperStyle={{ fontSize: '12px' }}
                  formatter={(value) => <span style={{ color: '#555' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa' }}>
              No style data available.
            </div>
          )}
        </Card>
      </div>

      {/* Generations by Type */}
      <Card title="Generations by Type">
        <Table columns={typeColumns} data={typeData} />
      </Card>
    </div>
  );
}
