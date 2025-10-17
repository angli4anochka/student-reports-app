import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface Student {
  id: string;
  fullName: string;
  groupId?: string;
}

interface Attendance {
  [studentId: string]: {
    [date: string]: 'present' | 'absent' | 'late' | '';
  };
}

const ScheduleCalendar: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear] = useState<number>(2025);
  const [weekDays, setWeekDays] = useState<number[]>([2, 4]); // Вт=2, Чт=4
  const [lessonDates, setLessonDates] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<Attendance>({});
  const [loading, setLoading] = useState(false);

  const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const WEEKDAYS = [
    { value: 1, label: 'Пн' },
    { value: 2, label: 'Вт' },
    { value: 3, label: 'Ср' },
    { value: 4, label: 'Чт' },
    { value: 5, label: 'Пт' },
    { value: 6, label: 'Сб' },
    { value: 0, label: 'Вс' }
  ];

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadStudents();
      loadGroupScheduleSettings();
    }
  }, [selectedGroup]);

  useEffect(() => {
    if (selectedMonth) {
      calculateLessonDates();
      // Reload attendance data when month changes
      if (students.length > 0) {
        loadAttendanceData(students);
      }
    }
  }, [selectedMonth, weekDays]);

  const loadGroups = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getStudents({ groupId: selectedGroup });
      setStudents(data);

      // Load existing attendance data
      await loadAttendanceData(data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceData = async (studentsData: Student[]) => {
    if (!selectedMonth || studentsData.length === 0) return;

    try {
      const monthIndex = MONTHS.indexOf(selectedMonth);
      if (monthIndex === -1) return;

      // Calculate date range for the selected month
      const firstDay = `01.${String(monthIndex + 1).padStart(2, '0')}.${selectedYear}`;
      const lastDay = `${new Date(selectedYear, monthIndex + 1, 0).getDate()}.${String(monthIndex + 1).padStart(2, '0')}.${selectedYear}`;

      // Load attendance records from database
      const attendanceData = await api.getAttendance({
        groupId: selectedGroup,
        dateFrom: firstDay,
        dateTo: lastDay
      });

      console.log('Loaded attendance data:', attendanceData);

      // Initialize attendance object
      const loadedAttendance: Attendance = {};
      studentsData.forEach((student: Student) => {
        loadedAttendance[student.id] = {};
      });

      // Fill in the loaded attendance data
      attendanceData.forEach((record: any) => {
        if (loadedAttendance[record.studentId]) {
          // Extract date in DD.MM format from DD.MM.YYYY
          const dateMatch = record.date.match(/^(\d{2}\.\d{2})\.\d{4}$/);
          if (dateMatch) {
            const shortDate = dateMatch[1];
            loadedAttendance[record.studentId][shortDate] = record.status.toLowerCase();
          }
        }
      });

      setAttendance(loadedAttendance);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const calculateLessonDates = () => {
    if (!selectedMonth) return;

    const monthIndex = MONTHS.indexOf(selectedMonth);
    if (monthIndex === -1) return;

    const dates: string[] = [];
    const year = selectedYear;
    const month = monthIndex;

    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Loop through all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();

      // Check if this day is in selected weekdays
      if (weekDays.includes(dayOfWeek)) {
        const dateString = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`;
        dates.push(dateString);
      }
    }

    setLessonDates(dates);
  };

  const loadGroupScheduleSettings = async () => {
    if (!selectedGroup) return;

    try {
      const settings = await api.getGroupScheduleSettings(selectedGroup);
      if (settings.weekdays) {
        const days = settings.weekdays.split(',').map(Number);
        setWeekDays(days);
        console.log('Loaded schedule settings for group:', days);
      }
    } catch (error) {
      console.error('Error loading group schedule settings:', error);
    }
  };

  const toggleWeekday = async (day: number) => {
    let newWeekDays: number[];
    if (weekDays.includes(day)) {
      newWeekDays = weekDays.filter(d => d !== day);
    } else {
      newWeekDays = [...weekDays, day].sort();
    }

    setWeekDays(newWeekDays);

    // Save to database
    if (selectedGroup) {
      try {
        await api.saveGroupScheduleSettings({
          groupId: selectedGroup,
          weekdays: newWeekDays.join(',')
        });
        console.log('Saved weekday settings:', newWeekDays);
      } catch (error) {
        console.error('Error saving weekday settings:', error);
      }
    }
  };

  const updateAttendance = async (studentId: string, date: string, status: 'present' | 'absent' | 'late' | '') => {
    // Update local state
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [date]: status
      }
    }));

    // Save to database
    if (status === '') {
      // Delete attendance record if status is empty
      try {
        const fullDate = `${date}.${selectedYear}`;
        await api.deleteAttendance(studentId, fullDate);
        console.log('Deleted attendance:', studentId, fullDate);
      } catch (error) {
        console.error('Error deleting attendance:', error);
      }
    } else {
      // Save or update attendance record
      try {
        const fullDate = `${date}.${selectedYear}`;
        const apiStatus = status.toUpperCase(); // Convert to PRESENT, ABSENT, LATE
        await api.saveAttendance({
          studentId,
          date: fullDate,
          status: apiStatus,
          groupId: selectedGroup
        });
        console.log('Saved attendance:', studentId, fullDate, apiStatus);
      } catch (error) {
        console.error('Error saving attendance:', error);
      }
    }
  };

  const getAttendanceColor = (status: 'present' | 'absent' | 'late' | '') => {
    switch (status) {
      case 'present': return '#c8e6c9';
      case 'absent': return '#ffcdd2';
      case 'late': return '#fff9c4';
      default: return '#fff';
    }
  };

  const getAttendanceSymbol = (status: 'present' | 'absent' | 'late' | '') => {
    switch (status) {
      case 'present': return '✓';
      case 'absent': return '✗';
      case 'late': return '!';
      default: return '';
    }
  };

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '2rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ textAlign: 'center', color: '#2196F3', marginBottom: '2rem' }}>
          Календарь посещаемости
        </h1>

        {/* Controls */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Группа:
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="">Выберите группу</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Месяц:
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="">Выберите месяц</option>
              {MONTHS.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Учебный год:
            </label>
            <div style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              backgroundColor: '#f5f5f5'
            }}>
              2025-2026
            </div>
          </div>
        </div>

        {/* Weekday selection */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Дни занятий:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {WEEKDAYS.map(day => (
              <button
                key={day.value}
                onClick={() => toggleWeekday(day.value)}
                style={{
                  padding: '0.5rem 1rem',
                  border: '2px solid',
                  borderColor: weekDays.includes(day.value) ? '#2196F3' : '#ddd',
                  borderRadius: '4px',
                  backgroundColor: weekDays.includes(day.value) ? '#e3f2fd' : 'white',
                  cursor: 'pointer',
                  fontWeight: weekDays.includes(day.value) ? 'bold' : 'normal',
                  color: weekDays.includes(day.value) ? '#2196F3' : '#666'
                }}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info banner */}
        {selectedGroupData && selectedMonth && lessonDates.length > 0 && (
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            borderLeft: '4px solid #2196F3'
          }}>
            <strong>{selectedGroupData.name}</strong> — {selectedMonth.toUpperCase()} {selectedYear}, {lessonDates.length} занятий
          </div>
        )}

        {/* Attendance Table */}
        {selectedGroup && selectedMonth && lessonDates.length > 0 && (
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
                    minWidth: '200px',
                    position: 'sticky',
                    left: 0,
                    zIndex: 5
                  }}>
                    ФИ ученика
                  </th>
                  {lessonDates.map(date => (
                    <th key={date} style={{
                      border: '1px solid #ddd',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      textAlign: 'center',
                      minWidth: '80px'
                    }}>
                      {date}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id}>
                    <td style={{
                      border: '1px solid #ddd',
                      padding: '0.75rem',
                      fontWeight: '600',
                      backgroundColor: '#f0f8ff',
                      position: 'sticky',
                      left: 0,
                      zIndex: 5
                    }}>
                      {student.fullName}
                    </td>
                    {lessonDates.map(date => {
                      const status = attendance[student.id]?.[date] || '';
                      return (
                        <td
                          key={date}
                          onClick={() => {
                            const nextStatus = status === '' ? 'present' :
                                             status === 'present' ? 'late' :
                                             status === 'late' ? 'absent' : '';
                            updateAttendance(student.id, date, nextStatus);
                          }}
                          style={{
                            border: '1px solid #ddd',
                            padding: '0.75rem',
                            textAlign: 'center',
                            backgroundColor: getAttendanceColor(status),
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            userSelect: 'none'
                          }}
                          title="Клик для изменения: пусто → присутствовал → опоздал → отсутствовал"
                        >
                          {getAttendanceSymbol(status)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Legend */}
        {selectedGroup && selectedMonth && lessonDates.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '1.5rem',
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#c8e6c9',
                border: '1px solid #ddd',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>✓</div>
              <span>Присутствовал</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#fff9c4',
                border: '1px solid #ddd',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>!</div>
              <span>Опоздал</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#ffcdd2',
                border: '1px solid #ddd',
                borderRadius: '3px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem'
              }}>✗</div>
              <span>Отсутствовал</span>
            </div>
          </div>
        )}

        {!selectedGroup && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#666',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px'
          }}>
            Выберите группу и месяц для отображения календаря
          </div>
        )}

        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#666'
          }}>
            Загрузка...
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
