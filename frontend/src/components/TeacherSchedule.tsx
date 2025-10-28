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
  const [selectedTeacherIndex, setSelectedTeacherIndex] = useState(0);

  const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'];
  const TIMES = ['11', '12', '13', '14', '15', '16', '17', '18', '19'];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load teachers and groups in parallel
      const [teachersData, groupsData] = await Promise.all([
        api.getTeachers(),
        api.getGroups()
      ]);

      setTeachers(teachersData);
      setGroups(groupsData);

      // Load schedules from API for all teachers in parallel
      const scheduleData: { [key: string]: ScheduleCell } = {};

      // Create array of promises for all teachers
      const schedulePromises = teachersData.map(teacher =>
        api.getTeacherSchedules(teacher.id)
          .then(teacherSchedules => {
            teacherSchedules.forEach((schedule: any) => {
              const key = getCellKey(schedule.teacherId, schedule.day, schedule.time);
              scheduleData[key] = {
                teacherId: schedule.teacherId,
                day: schedule.day,
                time: schedule.time,
                groupName: schedule.groupName
              };
            });
          })
          .catch(error => {
            console.error(`Error loading schedule for teacher ${teacher.id}:`, error);
          })
      );

      // Wait for all schedule requests to complete
      await Promise.all(schedulePromises);

      setSchedule(scheduleData);
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

  const handleCellSave = async (teacherId: string, day: number, time: string) => {
    const key = getCellKey(teacherId, day, time);
    const newSchedule = { ...schedule };

    try {
      if (editValue.trim()) {
        // Save to API
        await api.saveTeacherSchedule({
          teacherId,
          day,
          time,
          groupName: editValue.trim()
        });

        newSchedule[key] = {
          teacherId,
          day,
          time,
          groupName: editValue.trim()
        };
      } else {
        // Delete from API
        await api.saveTeacherSchedule({
          teacherId,
          day,
          time,
          groupName: ''
        });

        delete newSchedule[key];
      }

      setSchedule(newSchedule);
      setEditingCell(null);
      setEditValue('');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Ошибка при сохранении расписания');
    }
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
    <div>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '1rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ color: '#2196F3', marginBottom: '1rem', fontSize: '1.1rem' }}>
          📅 Расписание учителей
        </h3>

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
          <div>
            {/* Teacher Navigation */}
            {teachers.length > 1 && (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '1rem',
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px'
              }}>
                <button
                  onClick={() => setSelectedTeacherIndex(Math.max(0, selectedTeacherIndex - 1))}
                  disabled={selectedTeacherIndex === 0}
                  style={{
                    backgroundColor: selectedTeacherIndex === 0 ? '#e0e0e0' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: selectedTeacherIndex === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold'
                  }}
                >
                  ←
                </button>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#1976d2',
                  minWidth: '250px',
                  textAlign: 'center'
                }}>
                  👤 {teachers[selectedTeacherIndex]?.fullName || ''}
                  <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                    {selectedTeacherIndex + 1} из {teachers.length}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTeacherIndex(Math.min(teachers.length - 1, selectedTeacherIndex + 1))}
                  disabled={selectedTeacherIndex === teachers.length - 1}
                  style={{
                    backgroundColor: selectedTeacherIndex === teachers.length - 1 ? '#e0e0e0' : '#2196F3',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: selectedTeacherIndex === teachers.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: '1.2rem',
                    fontWeight: 'bold'
                  }}
                >
                  →
                </button>
              </div>
            )}

            {/* Schedule Table */}
            <div style={{ overflowX: 'auto' }}>
              {teachers[selectedTeacherIndex] && (
                <div key={teachers[selectedTeacherIndex].id}>
                  {teachers.length === 1 && (
                    <h4 style={{
                      backgroundColor: '#e3f2fd',
                      padding: '0.4rem 0.6rem',
                      margin: '0 0 0.3rem 0',
                      borderRadius: '4px',
                      color: '#1976d2',
                      fontSize: '0.9rem'
                    }}>
                      👤 {teachers[selectedTeacherIndex].fullName}
                    </h4>
                  )}
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '0.75rem'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        border: '1px solid #ddd',
                        padding: '0.25rem',
                        backgroundColor: '#f8f9fa',
                        textAlign: 'center',
                        width: '45px',
                        fontSize: '0.7rem'
                      }}>
                        Время
                      </th>
                      {WEEKDAYS.map(day => (
                        <th key={day} style={{
                          border: '1px solid #ddd',
                          padding: '0.25rem',
                          backgroundColor: '#f8f9fa',
                          textAlign: 'center',
                          fontSize: '0.7rem'
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
                          padding: '0.2rem',
                          textAlign: 'center',
                          fontWeight: '600',
                          backgroundColor: '#f0f8ff',
                          fontSize: '0.7rem'
                        }}>
                          {time}:00
                        </td>
                        {WEEKDAYS.map((day, dayIndex) => {
                          const key = getCellKey(teachers[selectedTeacherIndex].id, dayIndex, time);
                          const cellValue = getCellValue(teachers[selectedTeacherIndex].id, dayIndex, time);
                          const isEditing = editingCell === key;

                          return (
                            <td
                              key={day}
                              onClick={() => !isEditing && handleCellClick(teachers[selectedTeacherIndex].id, dayIndex, time)}
                              style={{
                                border: '1px solid #ddd',
                                padding: '0.2rem',
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
                                  onBlur={() => handleCellSave(teachers[selectedTeacherIndex].id, dayIndex, time)}
                                  onKeyDown={(e) => handleKeyDown(e, teachers[selectedTeacherIndex].id, dayIndex, time)}
                                  autoFocus
                                  style={{
                                    width: '100%',
                                    padding: '0.15rem',
                                    border: '1px solid #2196F3',
                                    borderRadius: '2px',
                                    fontSize: '0.7rem'
                                  }}
                                />
                              ) : (
                                <span style={{
                                  color: cellValue ? '#333' : '#999',
                                  fontSize: '0.7rem'
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
              )}
            </div>
          </div>
        )}

        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          borderLeft: '4px solid #2196F3',
          fontSize: '0.75rem'
        }}>
          <strong>Примечание:</strong> Кликните на ячейку для редактирования. Enter - сохранить, Escape - отменить.
        </div>
      </div>
    </div>
  );
};

export default TeacherSchedule;
