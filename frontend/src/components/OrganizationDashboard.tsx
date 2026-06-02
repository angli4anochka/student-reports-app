import { useState, useEffect } from 'react';
import { api } from '../services/api';

interface OrganizationStats {
  organization: {
    id: string;
    name: string;
    type: string;
  };
  summary: {
    totalStudents: number;
    totalGroups: number;
    totalLessons: number;
    totalStaff: number;
  };
  staff: Array<{
    id: string;
    fullName: string;
    email: string;
    role: string;
    createdAt: string;
  }>;
  students: Array<any>;
  groups: Array<any>;
  financial: {
    currentMonth: {
      start: string;
      byTeacher: Array<{
        teacherId: string;
        teacherName: string;
        teacherEmail: string;
        totalLessons: number;
        completedLessons: number;
        paidLessons: number;
        unpaidLessons: number;
      }>;
      totalPayments: number;
      totalCompleted: number;
      totalPaid: number;
    };
    recentPayments: Array<any>;
  };
  attendance: {
    currentMonth: {
      total_records: number;
      present_count: number;
      absent_count: number;
      unique_students: number;
    };
  };
  recentActivity: Array<any>;
}

export function OrganizationDashboard() {
  const [stats, setStats] = useState<OrganizationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'staff' | 'students' | 'groups' | 'financial' | 'attendance'>('overview');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getOrganizationStats();
      setStats(data);
    } catch (err: any) {
      console.error('Failed to load organization stats:', err);
      setError(err.message || 'Failed to load organization statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Загрузка данных организации...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">
          <p className="text-lg font-semibold">Ошибка</p>
          <p>{error}</p>
          <button
            onClick={loadStats}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const attendancePercentage = stats.attendance.currentMonth.total_records > 0
    ? ((stats.attendance.currentMonth.present_count / stats.attendance.currentMonth.total_records) * 100).toFixed(1)
    : '0';

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {stats.organization.name}
        </h1>
        <p className="text-gray-600">Панель управления организацией</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Обзор' },
            { id: 'staff', label: `Сотрудники (${stats.summary.totalStaff})` },
            { id: 'students', label: `Студенты (${stats.summary.totalStudents})` },
            { id: 'groups', label: `Группы (${stats.summary.totalGroups})` },
            { id: 'financial', label: 'Финансы' },
            { id: 'attendance', label: 'Посещаемость' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Всего студентов</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.summary.totalStudents}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Всего групп</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.summary.totalGroups}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Всего уроков</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.summary.totalLessons}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Сотрудников</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.summary.totalStaff}</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Последняя активность</h2>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 5).map((lesson: any) => (
                <div key={lesson.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{lesson.topic}</div>
                      <div className="text-sm text-gray-600">
                        {lesson.teacher?.fullName}
                        {' • '}
                        {lesson.student?.fullName || lesson.group?.name}
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">{lesson.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Staff Tab */}
      {activeTab === 'staff' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Роль</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Дата добавления</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.staff.map(member => (
                <tr key={member.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {member.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      member.role === 'SCHOOL_MANAGER' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {member.role === 'SCHOOL_MANAGER' ? 'Менеджер' : 'Учитель'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Все студенты организации</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Имя</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Группа</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Учитель</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.students.map((student: any) => (
                <tr key={student.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.group?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.teacher?.fullName}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === 'groups' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Все группы организации</h2>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Учитель</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Студентов</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats.groups.map((group: any) => (
                <tr key={group.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {group.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {group.teacher?.fullName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {group._count?.students || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Financial Tab */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* Financial Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Всего оплат</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">{stats.financial.currentMonth.totalPayments}</div>
              <div className="text-sm text-gray-600 mt-1">Текущий месяц</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Проведено уроков</div>
              <div className="text-3xl font-bold text-green-600 mt-2">{stats.financial.currentMonth.totalCompleted}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Оплачено</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">{stats.financial.currentMonth.totalPaid}</div>
            </div>
          </div>

          {/* By Teacher */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Финансы по учителям</h2>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Учитель</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Всего уроков</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Проведено</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Оплачено</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Не оплачено</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.financial.currentMonth.byTeacher.map(teacher => (
                  <tr key={teacher.teacherId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {teacher.teacherName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {teacher.totalLessons}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {teacher.completedLessons}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {teacher.paidLessons}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {teacher.unpaidLessons}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attendance Tab */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Всего записей</div>
              <div className="text-3xl font-bold text-gray-900 mt-2">
                {stats.attendance.currentMonth.total_records}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Присутствовало</div>
              <div className="text-3xl font-bold text-green-600 mt-2">
                {stats.attendance.currentMonth.present_count}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">Отсутствовало</div>
              <div className="text-3xl font-bold text-red-600 mt-2">
                {stats.attendance.currentMonth.absent_count}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-gray-500 text-sm font-medium">% Посещаемости</div>
              <div className="text-3xl font-bold text-blue-600 mt-2">
                {attendancePercentage}%
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Посещаемость за текущий месяц</h3>
            <p className="text-gray-600">
              Уникальных студентов с записями: {stats.attendance.currentMonth.unique_students}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
