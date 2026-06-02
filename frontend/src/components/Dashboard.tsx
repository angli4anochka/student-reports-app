import React, { useState, useEffect } from 'react';

import GradesTable from './GradesTable';
import LessonsSchedule from './LessonsSchedule';
import ScheduleCalendar from './ScheduleCalendar';
import AdminPanel from './AdminPanel';
import TeacherEarnings from './TeacherEarnings';
import ManagementDashboard from './ManagementDashboard';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'management' | 'students' | 'schedule' | 'attendance' | 'earnings' | 'admin'>(() =>
    (localStorage.getItem('dashboard_activeTab') as 'management' | 'students' | 'schedule' | 'attendance' | 'earnings' | 'admin') || 'management'
  );

  useEffect(() => {
    localStorage.setItem('dashboard_activeTab', activeTab);
  }, [activeTab]);

  const tabs = [
    { key: 'management' as const, label: '📋 Управление' },
    { key: 'students' as const, label: '👥 Студенты' },
    { key: 'schedule' as const, label: '📅 Расписание и ДЗ' },
    { key: 'attendance' as const, label: '📆 Календарь посещаемости' },
    ...(user?.role === 'ADMIN' ? [{ key: 'admin' as const, label: '⚙️ Админ-панель' }] : []),
    ...(user?.role === 'TEACHER' ? [{ key: 'earnings' as const, label: '💰 Оплаты' }] : []),
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">

      {/* Navigation Tabs — pill style */}
      <div className="flex flex-wrap gap-2 bg-white/70 backdrop-blur-xl rounded-2xl p-2 shadow-sm mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'management' && <ManagementDashboard />}

      {activeTab === 'students' && <GradesTable />}

      {activeTab === 'schedule' && <LessonsSchedule />}

      {activeTab === 'attendance' && <ScheduleCalendar />}


      {activeTab === 'earnings' && <TeacherEarnings />}

      {activeTab === 'admin' && user?.role === 'ADMIN' && <AdminPanel />}
    </div>
  );
};

export default Dashboard;
