import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  teacherId: string;
}

interface ScheduleSettings {
  groupId: string;
  weekdays: string;
}

const TeacherSchedule: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<{ [groupId: string]: ScheduleSettings }>({});
  const [loading, setLoading] = useState(true);

  const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
  const TIMES = [
    '11:00', '12:00', '13:00', '14:00', '15:00',
    '16:00', '17:00', '18:00', '19:00'
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load teachers (admin users endpoint)
      const usersData = await api.getAdminUsers();
      setTeachers(usersData.filter((u: any) => u.role === 'TEACHER'));

      // Load groups
      const groupsData = await api.getGroups();
      setGroups(groupsData);

      // Load schedule settings for each group
      const settings: { [groupId: string]: ScheduleSettings } = {};
      for (const group of groupsData) {
        try {
          const groupSettings = await api.getGroupScheduleSettings(group.id);
          if (groupSettings.weekdays) {
            settings[group.id] = groupSettings;
          }
        } catch (error) {
          // Group doesn't have settings yet
        }
      }
      setScheduleSettings(settings);
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTeacherGroups = (teacherId: string) => {
    return groups.filter(g => g.teacherId === teacherId);
  };

  const isTeacherBusy = (teacherId: string, dayIndex: number, timeSlot: string) => {
    const teacherGroups = getTeacherGroups(teacherId);

    for (const group of teacherGroups) {
      const settings = scheduleSettings[group.id];
      if (settings && settings.weekdays) {
        const weekdays = settings.weekdays.split(',').map(Number);
        // dayIndex: 0=Пн, 1=Вт, 2=Ср, 3=Чт, 4=Пт
        // weekdays: 1=Пн, 2=Вт, 3=Ср, 4=Чт, 5=Пт
        const mappedDay = dayIndex + 1;

        if (weekdays.includes(mappedDay)) {
          return group.name;
        }
      }
    }

    return null;
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Загрузка...</div>;
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ color: '#2196F3', marginBottom: '2rem' }}>
          📅 Расписание занятости учителей
        </h2>

        {teachers.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#666',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px'
          }}>
            Нет данных об учителях
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.9rem'
            }}>
              <thead>
                <tr>
                  <th style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem',
                    backgroundColor: '#e3f2fd',
                    textAlign: 'left',
                    minWidth: '150px',
                    position: 'sticky',
                    left: 0,
                    zIndex: 10
                  }}>
                    Учитель
                  </th>
                  {WEEKDAYS.map(day => (
                    <th key={day} style={{
                      border: '1px solid #ddd',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      textAlign: 'center',
                      minWidth: '120px'
                    }}>
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teachers.map(teacher => (
                  <tr key={teacher.id}>
                    <td style={{
                      border: '1px solid #ddd',
                      padding: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: '#f0f8ff',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5
                    }}>
                      {teacher.fullName}
                    </td>
                    {WEEKDAYS.map((day, dayIndex) => {
                      const groupName = isTeacherBusy(teacher.id, dayIndex, '');

                      return (
                        <td key={day} style={{
                          border: '1px solid #ddd',
                          padding: '0.5rem',
                          textAlign: 'center',
                          backgroundColor: groupName ? '#c8e6c9' : '#fff',
                          verticalAlign: 'middle'
                        }}>
                          {groupName ? (
                            <div>
                              <div style={{
                                fontWeight: 'bold',
                                color: '#2e7d32',
                                marginBottom: '0.25rem'
                              }}>
                                ✓ Занят
                              </div>
                              <div style={{
                                fontSize: '0.85rem',
                                color: '#555'
                              }}>
                                {groupName}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#999' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          borderLeft: '4px solid #2196F3'
        }}>
          <strong>Примечание:</strong> Расписание формируется на основе выбранных дней недели для каждой группы в разделе "Календарь посещаемости".
        </div>
      </div>
    </div>
  );
};

export default TeacherSchedule;
