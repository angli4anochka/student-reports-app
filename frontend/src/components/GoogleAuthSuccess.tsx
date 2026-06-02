import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const GoogleAuthSuccess: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // Save token to localStorage
      localStorage.setItem('token', token);

      // Set token in auth context
      if (setAuthToken) {
        setAuthToken(token);
      }

      // Redirect to dashboard
      setTimeout(() => {
        navigate('/');
      }, 500);
    } else {
      // No token, redirect to login with error
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, setAuthToken]);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>Вход через Google...</h2>
        <p>Пожалуйста, подождите...</p>
      </div>
    </div>
  );
};

export default GoogleAuthSuccess;
