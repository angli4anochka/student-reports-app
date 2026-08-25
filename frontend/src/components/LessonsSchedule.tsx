import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import LessonNotifications from './LessonNotifications';
import { MONTH_TO_NUMBER } from '../constants/dates';

interface Group {
  id: string;
  name: string;
  description?: string;
  isOwner?: boolean;
  isShared?: boolean;
}

interface Student {
  id: string;
  fullName: string;
  groupId?: string | null;
}

interface Lesson {
  id: string;
  date: string;
  topic: string;
  homework?: string;
  comment?: string;
  lessonPlan?: string;
  time?: string;
  notificationDate?: string;
  groupId?: string;
  group?: Group;
  studentId?: string;
  student?: Student;
  createdAt: string;
  updatedAt: string;
}

const LessonsSchedule: React.FC = () => {
  // Function to get academic year for a given month number (01-12)
  // Academic year: Sep 2025 - Aug 2026
  // Sep-Dec = 2025, Jan-Aug = 2026
  const getAcademicYear = (monthNumber: string): number => {
    const month = parseInt(monthNumber, 10);
    // September (09) - December (12) = 2025
    if (month >= 9 && month <= 12) {
      return 2025;
    }
    // January (01) - August (08) = 2026
    return 2026;
  };

  // Resolve the real calendar year for a lesson date, using the stored year if present
  // (older lessons saved as "DD.MM" have no year, so fall back to the academic-year guess)
  const getLessonYear = (dateStr: string): number => {
    const [, month, yearStr] = dateStr.split('.');
    return yearStr ? parseInt(yearStr, 10) : getAcademicYear(month);
  };

  // Academic year label like "2025-2026" for a lesson date (Sep-Dec belongs to the year starting then)
  const getAcademicYearLabel = (dateStr: string): string => {
    const [, monthStr] = dateStr.split('.');
    const month = parseInt(monthStr, 10);
    const year = getLessonYear(dateStr);
    return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  // Current academic year label based on today's real date
  const getCurrentAcademicYearLabel = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  };

  // Chronological sort key across years, since the stored date string sorts wrong as text
  const getSortableDate = (dateStr: string): number => {
    const [dayStr, monthStr] = dateStr.split('.');
    const year = getLessonYear(dateStr);
    return new Date(year, parseInt(monthStr, 10) - 1, parseInt(dayStr, 10)).getTime();
  };

  // Function to get current month name in Russian
  const getCurrentMonth = () => {
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const currentMonthIndex = new Date().getMonth();
    return monthNames[currentMonthIndex];
  };

  // Get initial month from localStorage or use current month
  const getInitialMonth = () => {
    const savedMonth = localStorage.getItem('selectedMonth');
    if (savedMonth) {
      return savedMonth;
    }
    return getCurrentMonth();
  };

  // Get initial group from localStorage
  const getInitialGroup = () => {
    const savedGroup = localStorage.getItem('selectedGroup');
    return savedGroup || '';
  };

  // Get initial academic year from localStorage or use the current academic year
  const getInitialYear = () => {
    const savedYear = localStorage.getItem('selectedYear');
    if (savedYear) {
      return savedYear;
    }
    return getCurrentAcademicYearLabel();
  };

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filteredLessons, setFilteredLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(getInitialGroup());
  const [selectedMonth, setSelectedMonth] = useState<string>(getInitialMonth());
  const [selectedYear, setSelectedYear] = useState<string>(getInitialYear());
  const [loading, setLoading] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    topic: '',
    homework: '',
    comment: '',
    groupId: '',
    studentId: '',
    time: '',
    notificationDate: '',
    lessonPlan: ''
  });

  // Function to convert URLs in text to clickable links
  const linkifyText = (text: string) => {
    if (!text) return '-';

    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#2196F3',
              textDecoration: 'underline',
              wordBreak: 'break-all'
            }}
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Academic year order: September to August
  const MONTHS = [
    'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август'
  ];

  useEffect(() => {
    loadGroups();
    loadLessons();
    loadStudents();
  }, []);

  useEffect(() => {
    filterLessons();
  }, [lessons, selectedGroup, selectedMonth, selectedYear]);

  // Save selected group to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedGroup', selectedGroup);
  }, [selectedGroup]);

  // Save selected month to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedMonth', selectedMonth);
  }, [selectedMonth]);

  // Save selected academic year to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('selectedYear', selectedYear);
  }, [selectedYear]);

  // Auto-fill group/student when selected tab changes
  useEffect(() => {
    if (selectedGroup && showAddForm && !editingLesson) {
      if (selectedGroup.startsWith('STUDENT:')) {
        const studentId = selectedGroup.replace('STUDENT:', '');
        setFormData(prev => ({ ...prev, groupId: '', studentId }));
      } else {
        setFormData(prev => ({ ...prev, groupId: selectedGroup, studentId: '' }));
      }
    }
  }, [selectedGroup, showAddForm, editingLesson]);

  const filterLessons = () => {
    let filtered = lessons;

    // Filter by group or student
    if (selectedGroup && selectedGroup.startsWith('STUDENT:')) {
      const studentId = selectedGroup.replace('STUDENT:', '');
      filtered = filtered.filter(lesson => lesson.studentId === studentId);
    } else if (selectedGroup) {
      filtered = filtered.filter(lesson => lesson.groupId === selectedGroup);
    }
    // If selectedGroup === '', show ALL lessons (groups + individual)

    // Filter by academic year
    if (selectedYear) {
      filtered = filtered.filter(lesson => getAcademicYearLabel(lesson.date) === selectedYear);
    }

    // Filter by month
    if (selectedMonth) {
      const monthNumber = MONTH_TO_NUMBER[selectedMonth];
      if (monthNumber) {
        filtered = filtered.filter(lesson => {
          const parts = lesson.date.split('.');
          return parts[1] === monthNumber;
        });
      }
    }

    // Sort chronologically (most recent first) — the raw date string sorts wrong across years
    filtered = [...filtered].sort((a, b) => getSortableDate(b.date) - getSortableDate(a.date));

    setFilteredLessons(filtered);
  };

  const loadGroups = async () => {
    try {
      const groupsData = await api.getGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const studentsData = await api.getStudents({});
      setStudents(studentsData);
    } catch (error) {
      console.error('[LessonsSchedule] Error loading students:', error);
    }
  };

  // Get students without a group — they are "individual" students and get their own tab
  const getIndividualStudents = (): Student[] => {
    const individual = students
      .filter(s => !s.groupId)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
    return individual;
  };

  const loadLessons = async () => {
    try {
      setLoading(true);
      // Load all lessons without filters
      const lessonsData = await api.getLessons({});
      setLessons(lessonsData);
    } catch (error) {
      console.error('[LessonsSchedule] Error loading lessons:', error);
      // Set empty array on error so UI doesn't break
      setLessons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await api.updateLesson(editingLesson.id, formData);
      } else {
        await api.createLesson(formData);
      }
      setFormData({ date: '', topic: '', homework: '', comment: '', groupId: '', studentId: '', time: '', notificationDate: '', lessonPlan: '' });
      setEditingLesson(null);
      setShowAddForm(false);
      loadLessons();
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Ошибка при сохранении урока');
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      date: lesson.date,
      topic: lesson.topic,
      homework: lesson.homework || '',
      comment: lesson.comment || '',
      groupId: lesson.groupId || '',
      studentId: lesson.studentId || '',
      time: lesson.time || '',
      notificationDate: lesson.notificationDate || '',
      lessonPlan: lesson.lessonPlan || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот урок?')) return;
    try {
      await api.deleteLesson(id);
      loadLessons();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Ошибка при удалении урока');
    }
  };

  const handleCancel = () => {
    setFormData({ date: '', topic: '', homework: '', comment: '', groupId: '', studentId: '', time: '', notificationDate: '', lessonPlan: '' });
    setEditingLesson(null);
    setShowAddForm(false);
  };

  const inputStyle = {
    width: '100%',
    padding: '0.625rem 0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.9rem',
    background: '#fff',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    boxSizing: 'border-box' as const
  };

  // Academic years present in the loaded lessons, always including the current one
  const currentAcademicYear = getCurrentAcademicYearLabel();
  const nextAcademicYearStart = parseInt(currentAcademicYear, 10) + 1;
  const nextAcademicYear = nextAcademicYearStart + '-' + (nextAcademicYearStart + 1);
  const availableYears = Array.from(
    new Set([currentAcademicYear, nextAcademicYear, ...lessons.map(lesson => getAcademicYearLabel(lesson.date))])
  ).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-slate-400 text-base">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-[400px]">
      <LessonNotifications lessons={lessons} />

      {/* Header row: title + add button */}
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-xl font-bold text-slate-800 m-0">Расписание и ДЗ</h3>
        <button
          onClick={() => {
            if (selectedGroup && selectedGroup.startsWith('STUDENT:')) {
              const studentId = selectedGroup.replace('STUDENT:', '');
              setFormData(prev => ({ ...prev, groupId: '', studentId }));
            } else if (selectedGroup) {
              setFormData(prev => ({ ...prev, groupId: selectedGroup, studentId: '' }));
            }
            setShowAddForm(true);
          }}
          className="px-5 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:bg-emerald-600 transition-all duration-200"
        >
          + Добавить урок
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 space-y-4">
        {/* Group filter */}
        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Группы
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedGroup('')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                selectedGroup === ''
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
              }`}
            >
              <span>📚</span> Все группы
            </button>

            {getIndividualStudents().map((student, index) => {
              const studentColors = [
                '#9B59B6', '#E91E63', '#FF5722', '#607D8B',
                '#795548', '#009688', '#3F51B5', '#F44336'
              ];
              const studentColor = studentColors[index % studentColors.length];
              const isSelected = selectedGroup === `STUDENT:${student.id}`;

              return (
                <button
                  key={`student-${student.id}`}
                  onClick={() => setSelectedGroup(`STUDENT:${student.id}`)}
                  style={isSelected ? { backgroundColor: studentColor, boxShadow: `0 4px 12px ${studentColor}40` } : {}}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-purple-50 hover:border-purple-300 shadow-sm'
                  }`}
                >
                  <span style={{ filter: isSelected ? 'none' : 'grayscale(50%)' }}>👤</span>
                  {student.fullName}
                </button>
              );
            })}

            {groups.map((group, index) => {
              const colors = [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A',
                '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
                '#F8B739', '#52B788', '#E76F51', '#A8DADC'
              ];
              const groupColor = colors[index % colors.length];
              const isSelected = selectedGroup === group.id;

              return (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group.id)}
                  style={isSelected ? { backgroundColor: groupColor, boxShadow: `0 4px 12px ${groupColor}40` } : {}}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    isSelected
                      ? 'text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-300 shadow-sm'
                  }`}
                >
                  <span style={{ filter: isSelected ? 'none' : 'grayscale(50%)' }}>👥</span>
                  {group.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Year filter */}
        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Учебный год
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedYear('')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedYear === ''
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
              }`}
            >
              Все года
            </button>

            {availableYears.map(year => {
              const isSelected = selectedYear === year;
              return (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
                  }`}
                >
                  {year}
                </button>
              );
            })}
          </div>
        </div>

        {/* Month filter */}
        <div>
          <label className="block mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Месяцы
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedMonth('')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedMonth === ''
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
              }`}
            >
              Все месяцы
            </button>

            {MONTHS.map(month => {
              const isSelected = selectedMonth === month;
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(month)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showAddForm && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg p-6 mb-5">
          <h4 className="text-base font-bold text-slate-800 mb-4">
            {editingLesson ? 'Редактировать урок' : 'Добавить урок'}
          </h4>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-slate-600">Дата</label>
                <input
                  type="date"
                  value={formData.date ? (() => {
                    const [day, month, existingYear] = formData.date.split('.');
                    if (day && month) {
                      const year = existingYear || getAcademicYear(month);
                      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                    return '';
                  })() : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-');
                      setFormData({ ...formData, date: `${day}.${month}.${year}` });
                    } else {
                      setFormData({ ...formData, date: '' });
                    }
                  }}
                  required
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-slate-600">Группа</label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value, studentId: e.target.value ? '' : formData.studentId })}
                  style={inputStyle}
                >
                  <option value="">Без группы (индивидуально)</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
              {!formData.groupId && (
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-slate-600">Ученик</label>
                  <select
                    value={formData.studentId}
                    onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">Не указан</option>
                    {students.map(student => (
                      <option key={student.id} value={student.id}>{student.fullName}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block mb-1.5 text-sm font-medium text-slate-600">Тема урока</label>
              <input
                type="text"
                placeholder="повторение"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
                style={inputStyle}
              />
            </div>

            <div className="mb-4">
              <label className="block mb-1.5 text-sm font-medium text-slate-600">Домашнее задание</label>
              <input
                type="text"
                placeholder="нет"
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                style={inputStyle}
              />
            </div>

            <div className="mb-4">
              <label className="block mb-1.5 text-sm font-medium text-slate-600">Комментарий</label>
              <textarea
                placeholder="прошли всю презентацию..."
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-slate-600">Время урока</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-slate-600">Дата уведомления</label>
                <input
                  type="date"
                  value={formData.notificationDate ? (() => {
                    const [day, month, existingYear] = formData.notificationDate.split('.');
                    if (day && month) {
                      const year = existingYear || getAcademicYear(month);
                      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    }
                    return '';
                  })() : ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      const [year, month, day] = e.target.value.split('-');
                      setFormData({ ...formData, notificationDate: `${day}.${month}.${year}` });
                    } else {
                      setFormData({ ...formData, notificationDate: '' });
                    }
                  }}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block mb-1.5 text-sm font-medium text-slate-600">Структура урока (напоминалки)</label>
              <textarea
                placeholder="проверь дз и ссылка, открой этот ресурс чтобы проработать с учеником, закрепи по вот этой ссылке, задай вот это задание"
                value={formData.lessonPlan}
                onChange={(e) => setFormData({ ...formData, lessonPlan: e.target.value })}
                rows={5}
                style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
              />
              <p className="mt-1.5 text-xs text-slate-400">Можно добавлять ссылки — они автоматически станут кликабельными</p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold shadow-md hover:shadow-lg hover:bg-blue-600 transition-all duration-200"
              >
                {editingLesson ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-5 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-all duration-200"
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lessons Table */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[1526px] w-full table-fixed" style={{ borderCollapse: 'collapse' }}>
            <colgroup>
              <col className="w-[90px]" />
              <col className="w-[140px]" />
              <col className="w-[320px]" />
              <col className="w-[360px]" />
              <col className="w-[520px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Дата</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Группа</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Урок</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">ДЗ</th>
                <th className="px-5 py-3.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Комментарий</th>
                <th className="px-5 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLessons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                    Нет уроков по выбранным фильтрам.
                  </td>
                </tr>
              ) : (
                filteredLessons.map((lesson, idx) => (
                  <tr
                    key={lesson.id}
                    className="hover:bg-blue-50 transition-colors duration-150"
                    style={{ borderBottom: idx < filteredLessons.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                  >
                    <td className="px-5 py-4 text-sm text-slate-700 font-medium whitespace-nowrap">{lesson.date}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 whitespace-normal break-words">
                      {lesson.group?.name || (lesson.student?.fullName ? <span>👤 {lesson.student.fullName}</span> : <span className="text-slate-400">—</span>)}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-800 font-medium whitespace-normal break-words">{lesson.topic}</td>
                    <td className="px-5 py-4 text-sm text-slate-600 whitespace-normal break-words">
                      {linkifyText(lesson.homework || '')}
                    </td>
                    <td className="px-5 py-4 text-sm text-slate-600 whitespace-normal break-words">
                      {linkifyText(lesson.comment || '')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(lesson)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 transition-colors duration-150"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(lesson.id)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors duration-150"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LessonsSchedule;
