import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { exportAllDataToExcel } from '../services/exportToExcel';

interface Group {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
}

interface Student {
  id: string;
  fullName: string;
  groupId?: string;
  group?: Group;
  notes?: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

import StudentList from './StudentList';
import StudentForm from './StudentForm';
import GradeEntry from './GradeEntry';
import GradesTable from './GradesTable';
import StudentReport from './StudentReport';
import LessonsSchedule from './LessonsSchedule';
import ScheduleCalendar from './ScheduleCalendar';
import AdminPanel from './AdminPanel';
import TeacherSchedule from './TeacherSchedule';
import { useAuth } from '../context/AuthContext';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showGradeEntry, setShowGradeEntry] = useState(false);
  const [showStudentReport, setShowStudentReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ group: '', search: '' });
  const [activeTab, setActiveTab] = useState<'students' | 'grades' | 'schedule' | 'attendance' | 'admin'>(() =>
    (localStorage.getItem('dashboard_activeTab') as 'students' | 'grades' | 'schedule' | 'attendance' | 'admin') || 'students'
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Изначально все группы скрыты
    if (students.length > 0) {
      const allGroups = Array.from(new Set(students.map(s => s.group?.name).filter(Boolean))) as string[];
      setCollapsedGroups(new Set(allGroups));
    }
  }, [students.length]);

  useEffect(() => {
    localStorage.setItem('dashboard_activeTab', activeTab);
  }, [activeTab]);

  const loadData = async () => {
    try {
      const studentsData = await api.getStudents(filters);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentCreated = (student: Student) => {
    setStudents([...students, student]);
    setShowStudentForm(false);
  };

  const handleStudentUpdated = (updatedStudent: Student) => {
    setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    setSelectedStudent(updatedStudent);
  };

  const handleStudentDeleted = (studentId: string) => {
    setStudents(students.filter(s => s.id !== studentId));
    if (selectedStudent?.id === studentId) {
      setSelectedStudent(null);
    }
  };

  const handleGradeEntryClick = (student: Student) => {
    setSelectedStudent(student);
    setShowGradeEntry(true);
  };

  const toggleGroup = (groupName: string) => {
    const newCollapsed = new Set(collapsedGroups);
    if (newCollapsed.has(groupName)) {
      newCollapsed.delete(groupName);
    } else {
      newCollapsed.add(groupName);
    }
    setCollapsedGroups(newCollapsed);
  };

  const handleExportToExcel = async () => {
    try {
      setIsExporting(true);
      await exportAllDataToExcel();
      alert('✅ Данные успешно экспортированы в Excel!');
    } catch (error) {
      console.error('Export error:', error);
      alert('❌ Ошибка при экспорте данных. Попробуйте снова.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        Загрузка...
      </div>
    );
  }

  const uniqueGroups = Array.from(new Set(students.map(s => s.group?.name).filter(Boolean))).sort();
  
  // Группировка студентов по группам
  const groupedStudents = students.reduce((acc, student) => {
    const groupName = student.group?.name || 'Без группы';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }
    acc[groupName].push(student);
    return acc;
  }, {} as { [key: string]: Student[] });

  return (
    <div>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0 }}>Система оценок учеников</h2>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleExportToExcel}
            disabled={isExporting}
            style={{
              backgroundColor: isExporting ? '#9E9E9E' : '#2196F3',
              color: 'white',
              border: 'none',
              padding: '0.5rem 1rem',
              borderRadius: '4px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {isExporting ? '⏳ Экспорт...' : '📊 Экспорт в Excel'}
          </button>
          {activeTab === 'students' && (
            <button
              onClick={() => setShowStudentForm(true)}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Добавить ученика
            </button>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '2px solid #e0e0e0', 
        marginBottom: '2rem' 
      }}>
        <button
          onClick={() => setActiveTab('students')}
          style={{
            backgroundColor: activeTab === 'students' ? '#2196F3' : 'transparent',
            color: activeTab === 'students' ? 'white' : '#2196F3',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            marginRight: '0.5rem',
            transition: 'all 0.2s'
          }}
        >
          📋 Управление учениками
        </button>
        <button
          onClick={() => setActiveTab('grades')}
          style={{
            backgroundColor: activeTab === 'grades' ? '#2196F3' : 'transparent',
            color: activeTab === 'grades' ? 'white' : '#2196F3',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          📊 Табличная форма оценок
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            backgroundColor: activeTab === 'schedule' ? '#2196F3' : 'transparent',
            color: activeTab === 'schedule' ? 'white' : '#2196F3',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          📅 Расписание и ДЗ
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          style={{
            backgroundColor: activeTab === 'attendance' ? '#2196F3' : 'transparent',
            color: activeTab === 'attendance' ? 'white' : '#2196F3',
            border: 'none',
            padding: '1rem 2rem',
            borderRadius: '8px 8px 0 0',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          📆 Календарь посещаемости
        </button>
        {user?.role === 'ADMIN' && (
          <button
            onClick={() => setActiveTab('admin')}
            style={{
              backgroundColor: activeTab === 'admin' ? '#2196F3' : 'transparent',
              color: activeTab === 'admin' ? 'white' : '#2196F3',
              border: 'none',
              padding: '1rem 2rem',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            ⚙️ Админ-панель
          </button>
        )}
      </div>

      {activeTab === 'students' && (
        <>
          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Группа:</label>
              <select
                value={filters.group}
                onChange={(e) => setFilters({ ...filters, group: e.target.value })}
                style={{ 
                  padding: '0.5rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px' 
                }}
              >
                <option value="">Все группы</option>
                {uniqueGroups.map(group => (
                  <option key={group} value={group}>{group}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Поиск:</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Имя ученика..."
                style={{ 
                  padding: '0.5rem', 
                  border: '1px solid #ddd', 
                  borderRadius: '4px',
                  minWidth: '200px'
                }}
              />
            </div>
            
            <div style={{ alignSelf: 'flex-end' }}>
              <button
                onClick={loadData}
                style={{ 
                  backgroundColor: '#2196F3', 
                  color: 'white', 
                  border: 'none', 
                  padding: '0.5rem 1rem', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Обновить
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h3>Список учеников по группам</h3>
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {Object.entries(groupedStudents)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([groupName, groupStudents]) => {
                    const isCollapsed = collapsedGroups.has(groupName);
                    return (
                      <div key={groupName} style={{ marginBottom: '1.5rem' }}>
                        <h4
                          onClick={() => toggleGroup(groupName)}
                          style={{
                            backgroundColor: '#e3f2fd',
                            padding: '0.5rem 1rem',
                            margin: '0 0 0.5rem 0',
                            borderRadius: '4px',
                            color: '#1976d2',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            userSelect: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#bbdefb'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                        >
                          <span>
                            📚 {groupName} ({groupStudents.length} {groupStudents.length === 1 ? 'ученик' : 'учеников'})
                          </span>
                          <span style={{ fontSize: '1.2rem' }}>
                            {isCollapsed ? '▼' : '▲'}
                          </span>
                        </h4>
                        {!isCollapsed && (
                          <StudentList
                            students={groupStudents}
                            onStudentSelect={(student) => {
                              setSelectedStudent(student);
                              setShowStudentReport(true);
                            }}
                            onStudentEdit={(student) => {
                              setSelectedStudent(student);
                              setShowStudentForm(true);
                            }}
                            onStudentDelete={handleStudentDeleted}
                            onGradeEntry={handleGradeEntryClick}
                            selectedStudent={selectedStudent}
                          />
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div>
              {selectedStudent && (
                <div style={{ marginBottom: '2rem' }}>
                  <h3>Информация об ученике</h3>
                  <div style={{
                    backgroundColor: '#f5f5f5',
                    padding: '1rem',
                    borderRadius: '4px',
                    marginBottom: '1rem'
                  }}>
                    <p><strong>Имя:</strong> {selectedStudent.fullName}</p>
                    <p><strong>Группа:</strong> {selectedStudent.group?.name || 'Не назначена'}</p>
                    {selectedStudent.notes && (
                      <p><strong>Заметки:</strong> {selectedStudent.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={() => handleGradeEntryClick(selectedStudent)}
                    style={{
                      backgroundColor: '#FF9800',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      width: '100%'
                    }}
                  >
                    Выставить оценки
                  </button>
                </div>
              )}

              {/* Teacher Schedule Section */}
              <div>
                <TeacherSchedule />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'grades' && <GradesTable />}

      {activeTab === 'schedule' && <LessonsSchedule />}

      {activeTab === 'attendance' && <ScheduleCalendar />}

      {activeTab === 'admin' && user?.role === 'ADMIN' && <AdminPanel />}

      {showStudentForm && (
        <StudentForm
          student={selectedStudent}
          onClose={() => {
            setShowStudentForm(false);
            setSelectedStudent(null);
          }}
          onStudentCreated={handleStudentCreated}
          onStudentUpdated={handleStudentUpdated}
        />
      )}

      {showGradeEntry && selectedStudent && (
        <GradeEntry
          student={selectedStudent}
          onClose={() => setShowGradeEntry(false)}
        />
      )}

      {showStudentReport && selectedStudent && (
        <StudentReport
          student={selectedStudent}
          onClose={() => {
            setShowStudentReport(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;