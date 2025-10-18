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

interface ScheduleCell {
  teacherId: string;
  day: number;
  time: string;
  groupName: string;
}

const TeacherSchedule: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [schedule, setSchedule] = useState<{ [key: string]: ScheduleCell }>({});
  const [loading, setLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница'];
  const TIMES = ['11', '12', '13', '14', '15', '16', '17', '18', '19'];

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

      // Load schedule from localStorage
      const savedSchedule = localStorage.getItem('teacher_schedule');
      if (savedSchedule) {
        setSchedule(JSON.parse(savedSchedule));
      }
    } catch (error) {
      console.error('Error loading schedule data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCellKey = (teacherId: string, day: number, time: string) => {
    return `${teacherId}-${day}-${time}`;
  };

  const getCellValue = (teacherId: string, day: number, time: string) => {
    const key = getCellKey(teacherId, day, time);
    return schedule[key]?.groupName || '';
  };

  const handleCellClick = (teacherId: string, day: number, time: string) => {
    const key = getCellKey(teacherId, day, time);
    setEditingCell(key);
    setEditValue(getCellValue(teacherId, day, time));
  };

  const handleCellSave = (teacherId: string, day: number, time: string) => {
    const key = getCellKey(teacherId, day, time);
    const newSchedule = { ...schedule };

    if (editValue.trim()) {
      newSchedule[key] = {
        teacherId,
        day,
        time,
        groupName: editValue.trim()
      };
    } else {
      delete newSchedule[key];
    }

    setSchedule(newSchedule);
    localStorage.setItem('teacher_schedule', JSON.stringify(newSchedule));
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, teacherId: string, day: number, time: string) => {
    if (e.key === 'Enter') {
      handleCellSave(teacherId, day, time);
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
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
            {teachers.map(teacher => (
              <div key={teacher.id} style={{ marginBottom: '2rem' }}>
                <h3 style={{
                  backgroundColor: '#e3f2fd',
                  padding: '0.75rem',
                  margin: '0 0 0.5rem 0',
                  borderRadius: '4px',
                  color: '#1976d2'
                }}>
                  👤 {teacher.fullName}
                </h3>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.85rem'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        border: '1px solid #ddd',
                        padding: '0.5rem',
                        backgroundColor: '#f8f9fa',
                        textAlign: 'center',
                        minWidth: '60px'
                      }}>
                        Время
                      </th>
                      {WEEKDAYS.map(day => (
                        <th key={day} style={{
                          border: '1px solid #ddd',
                          padding: '0.5rem',
                          backgroundColor: '#f8f9fa',
                          textAlign: 'center',
                          minWidth: '100px'
                        }}>
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {TIMES.map(time => (
                      <tr key={time}>
                        <td style={{
                          border: '1px solid #ddd',
                          padding: '0.5rem',
                          textAlign: 'center',
                          fontWeight: '600',
                          backgroundColor: '#f0f8ff'
                        }}>
                          {time}:00
                        </td>
                        {WEEKDAYS.map((day, dayIndex) => {
                          const key = getCellKey(teacher.id, dayIndex, time);
                          const cellValue = getCellValue(teacher.id, dayIndex, time);
                          const isEditing = editingCell === key;

                          return (
                            <td
                              key={day}
                              onClick={() => !isEditing && handleCellClick(teacher.id, dayIndex, time)}
                              style={{
                                border: '1px solid #ddd',
                                padding: '0.5rem',
                                textAlign: 'center',
                                backgroundColor: cellValue ? '#fff3cd' : '#fff',
                                cursor: 'pointer',
                                verticalAlign: 'middle'
                              }}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => handleCellSave(teacher.id, dayIndex, time)}
                                  onKeyDown={(e) => handleKeyDown(e, teacher.id, dayIndex, time)}
                                  autoFocus
                                  style={{
                                    width: '100%',
                                    padding: '0.25rem',
                                    border: '1px solid #2196F3',
                                    borderRadius: '2px',
                                    fontSize: '0.85rem'
                                  }}
                                />
                              ) : (
                                <span style={{
                                  color: cellValue ? '#333' : '#999',
                                  fontSize: '0.85rem'
                                }}>
                                  {cellValue || '—'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          borderLeft: '4px solid #2196F3'
        }}>
          <strong>Примечание:</strong> Кликните на ячейку, чтобы добавить или изменить название класса. Enter - сохранить, Escape - отменить.
        </div>
      </div>
    </div>
  );
};

export default TeacherSchedule;
