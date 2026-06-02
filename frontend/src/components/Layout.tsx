import React, { ReactNode, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ChangePassword from './ChangePassword';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showChangePassword, setShowChangePassword] = useState(false);


  return (
    <div className="min-h-screen" style={{ fontFamily: 'Arial, sans-serif' }}>
      {user && (
        <header className="bg-white/80 backdrop-blur-xl border-b border-white/60 shadow-sm px-6 py-3">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-lg font-bold text-slate-800 m-0">📚 TutorFlow</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 font-medium">Добро пожаловать, {user.fullName}</span>
              {(user.role === 'ORG_ADMIN' || user.role === 'ADMIN') && (
                <button
                  onClick={() => navigate('/organization')}
                  title="Панель организации"
                  className="px-3 py-1.5 rounded-lg bg-blue-100 text-blue-600 text-xs font-semibold hover:bg-blue-200 transition-colors duration-150"
                >
                  🏫 Организация
                </button>
              )}
              <button
                onClick={() => setShowChangePassword(true)}
                title="Изменить пароль"
                className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors duration-150"
              >
                🔑 Сменить пароль
              </button>
              <button
                onClick={logout}
                className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 transition-colors duration-150"
              >
                Выйти
              </button>
            </div>
          </div>
        </header>
      )}

      <main style={{ padding: user ? '0' : '0' }}>
        {children}
      </main>

      {showChangePassword && (
        <ChangePassword onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
};

export default Layout;