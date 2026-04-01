import { useState } from 'react';
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
      setError(err.response?.data?.error || 'Falha ao realizar login.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-brand-icon">
            <Music size={24} />
          </div>
          <h1>MySuno</h1>
        </div>
        <p className="login-subtitle">Gerador de Musicas com IA</p>

        {error && <div className="login-error">{error}</div>}

        <div className="login-google-btn">
          <GoogleLogin
            onSuccess={handleSuccess}
            onError={() => setError('Falha no login com Google.')}
            theme="outline"
            size="large"
            width="300"
          />
        </div>

        <p className="login-footer">Apenas emails autorizados podem acessar.</p>
      </div>
    </div>
  );
}
