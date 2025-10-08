import React, { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', minHeight: '100vh' }}>
      {user && (
        <header style={{ 
          backgroundColor: '#2196F3', 
          color: 'white', 
          padding: '1rem 2rem', 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h1 style={{ margin: 0 }}>Ежемесячные отчёты по ученикам</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Добро пожаловать, {user.fullName}</span>
            <button 
              onClick={logout}
              style={{ 
                backgroundColor: '#1976D2', 
                color: 'white', 
                border: 'none', 
                padding: '0.5rem 1rem', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Выйти
            </button>
          </div>
        </header>
      )}
      
      <main style={{ padding: user ? '2rem' : '0' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;