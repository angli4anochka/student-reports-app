import React from 'react';
import { useAuth } from '../context/AuthContext';
import AllTeachersSchedule from './AllTeachersSchedule';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();

  // Get first name
  const firstName = user?.fullName?.split(' ')[1] || user?.fullName?.split(' ')[0] || 'Администратор';

  const getGreeting = (): string => {
    const h = new Date().getHours();
    if (h < 12) return 'Доброе утро';
    if (h < 18) return 'Добрый день';
    return 'Добрый вечер';
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Greeting Card */}
      <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6"
           style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-200 opacity-30 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <p className="text-slate-500 text-sm mb-0.5">
            {getGreeting()}, {firstName}
          </p>
          <h2 className="text-xl font-bold text-slate-800 mt-0 mb-2">
            Панель управления организацией
          </h2>
          <p className="text-slate-600 text-sm">
            Управляйте расписанием всех учителей, студентами и группами
          </p>
        </div>
      </div>

      {/* All Teachers Schedule */}
      <AllTeachersSchedule />
    </div>
  );
};

export default AdminDashboard;
