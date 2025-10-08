import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

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

interface Year {
  id: string;
  year: string;
  months: string;
  createdBy: string;
}
import StudentList from './StudentList';
import StudentForm from './StudentForm';
import GradeEntry from './GradeEntry';
import GradesTable from './GradesTable';
import StudentReport from './StudentReport';

const Dashboard: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showStudentForm, setShowStudentForm] = useState(false);
  const [showGradeEntry, setShowGradeEntry] = useState(false);
  const [showStudentReport, setShowStudentReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ group: '', search: '' });
  const [activeTab, setActiveTab] = useState<'students' | 'grades'>(() => 
    (localStorage.getItem('dashboard_activeTab') as 'students' | 'grades') || 'students'
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    localStorage.setItem('dashboard_activeTab', activeTab);
  }, [activeTab]);

  const loadData = async () => {
    try {
      const [studentsData, yearsData] = await Promise.all([
        api.getStudents(filters),
        api.getYears(),
      ]);
      setStudents(studentsData);
      setYears(yearsData);
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
                  .map(([groupName, groupStudents]) => (
                    <div key={groupName} style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ 
                        backgroundColor: '#e3f2fd', 
                        padding: '0.5rem 1rem', 
                        margin: '0 0 0.5rem 0',
                        borderRadius: '4px',
                        color: '#1976d2',
                        fontSize: '1rem',
                        fontWeight: 'bold'
                      }}>
                        📚 {groupName} ({groupStudents.length} {groupStudents.length === 1 ? 'ученик' : 'учеников'})
                      </h4>
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
                    </div>
                  ))}
              </div>
            </div>

            <div>
              {selectedStudent && (
                <div>
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
            </div>
          </div>
        </>
      )}

      {activeTab === 'grades' && <GradesTable />}

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
          years={years}
          onClose={() => setShowGradeEntry(false)}
        />
      )}

      {showStudentReport && selectedStudent && (
        <StudentReport
          student={selectedStudent}
          years={years}
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