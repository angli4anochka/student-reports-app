import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const response = await api.forgotPassword(email);
      setSuccess(true);
      // In development, show the reset link
      if (response.resetLink) {
        setResetLink(response.resetLink);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при отправке ссылки');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '450px'
        }}>
          <div style={{
            textAlign: 'center',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>
              ✅
            </div>
            <h2 style={{ margin: '0 0 1rem 0', color: '#333' }}>
              Ссылка отправлена!
            </h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Если аккаунт с таким email существует, на него была отправлена ссылка для сброса пароля.
            </p>
            <p style={{ color: '#666', fontSize: '0.9rem' }}>
              Проверьте вашу почту и перейдите по ссылке для сброса пароля.
            </p>
          </div>

          {resetLink && (
            <div style={{
              backgroundColor: '#e3f2fd',
              padding: '1rem',
              borderRadius: '4px',
              marginBottom: '1rem',
              border: '1px solid #2196F3'
            }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#1976D2', fontSize: '0.9rem' }}>
                Режим разработки - ссылка для сброса:
              </p>
              <a
                href={resetLink}
                style={{
                  color: '#2196F3',
                  wordBreak: 'break-all',
                  fontSize: '0.85rem'
                }}
              >
                {resetLink}
              </a>
            </div>
          )}

          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            Вернуться ко входу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1rem', color: '#333' }}>
          Забыли пароль?
        </h2>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Введите ваш email и мы отправим вам ссылку для сброса пароля
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#555' }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="example@mail.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            />
          </div>

          {error && (
            <div style={{
              color: '#d32f2f',
              marginBottom: '1rem',
              padding: '0.5rem',
              backgroundColor: '#ffebee',
              borderRadius: '4px',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Отправка...' : 'Отправить ссылку'}
          </button>

          <div style={{ textAlign: 'center', color: '#666' }}>
            Вспомнили пароль?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                background: 'none',
                border: 'none',
                color: '#2196F3',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: 0,
                font: 'inherit'
              }}
            >
              Войти
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
