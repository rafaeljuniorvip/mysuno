import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Music } from 'lucide-react';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  const handleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await api.post('/auth/google', { credential: credentialResponse.credential });
      login(res.data.token, res.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: '#f5f5f5',
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '48px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.1)', textAlign: 'center',
        maxWidth: '400px', width: '100%',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '8px' }}>
          <Music size={32} color="#1976d2" />
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#333' }}>MySuno</h1>
        </div>
        <p style={{ color: '#666', marginBottom: '32px', fontSize: '14px' }}>
          AI Music Generator Manager
        </p>

        {error && (
          <div style={{
            background: '#fce4ec', color: '#c62828', padding: '12px',
            borderRadius: '8px', marginBottom: '24px', fontSize: '14px',
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Google login failed')}
            theme="outline"
            size="large"
            width="300"
          />
        </div>

        <p style={{ color: '#999', marginTop: '32px', fontSize: '12px' }}>
          Only authorized emails can access this application.
        </p>
      </div>
    </div>
  );
}
