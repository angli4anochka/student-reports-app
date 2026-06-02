import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Component to handle Google OAuth callback
 * Extracts token from URL and logs in the user
 */
const GoogleCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAuthData } = useAuth();
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(getErrorMessage(errorParam));
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      if (!token) {
        setError('Токен не получен от сервера');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      try {
        // Сохраняем токен
        localStorage.setItem('token', token);

        // Получаем данные пользователя
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Не удалось получить данные пользователя');
        }

        const userData = await response.json();

        // Обновляем контекст аутентификации
        if (setAuthData) {
          setAuthData({ token, user: userData });
        }

        // Перенаправляем на главную страницу
        navigate('/');
      } catch (err) {
        console.error('Google callback error:', err);
        setError(err instanceof Error ? err.message : 'Ошибка аутентификации');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuthData]);

  const getErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
      case 'google_auth_failed':
        return 'Не удалось войти через Google. Попробуйте ещё раз.';
      case 'no_user':
        return 'Не удалось создать пользователя';
      case 'callback_failed':
        return 'Ошибка при обработке ответа от Google';
      default:
        return 'Произошла ошибка при входе через Google';
    }
  };

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
        textAlign: 'center',
        maxWidth: '400px'
      }}>
        {error ? (
          <>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>❌</div>
            <h2 style={{ color: '#d32f2f', marginBottom: '1rem' }}>
              Ошибка
            </h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              {error}
            </p>
            <p style={{ color: '#999', fontSize: '0.875rem' }}>
              Перенаправление на страницу входа...
            </p>
          </>
        ) : (
          <>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              animation: 'spin 1s linear infinite'
            }}>🔄</div>
            <h2 style={{ color: '#333', marginBottom: '1rem' }}>
              Вход через Google...
            </h2>
            <p style={{ color: '#666' }}>
              Пожалуйста, подождите
            </p>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default GoogleCallback;
