import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import AddStudentModal from './AddStudentModal';
import AddGroupModal from './AddGroupModal';

interface Student {
  id: string;
  fullName: string;
  groupId?: string;
  group?: Group;
  notes?: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface Year {
  id: string;
  year: string;
  months: string;
}

interface Criterion {
  id: string;
  name: string;
  weight: number;
  scale: string;
  order: number;
}

interface GradeData {
  [studentId: string]: {
    [criterionId: string]: number | string;
    comment: string;
  };
}

// Константа учебного года (один на всю систему)
const ACADEMIC_YEAR_2025 = {
  id: 'year-2025-2026',
  year: '2025-2026',
  months: 'Сентябрь,Октябрь,Ноябрь,Декабрь,Январь,Февраль,Март,Апрель,Май,Июнь'
};

const GradesTable: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const selectedYear = ACADEMIC_YEAR_2025.id; // Всегда используем текущий учебный год
  const [selectedMonth, setSelectedMonth] = useState<string>(() => 
    localStorage.getItem('gradesTable_selectedMonth') || ''
  );
  const [selectedGroup, setSelectedGroup] = useState<string>(() => 
    localStorage.getItem('gradesTable_selectedGroup') || ''
  );
  const [gradesData, setGradesData] = useState<GradeData>({});
  const [loading, setLoading] = useState(false);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const MONTHS = [
    'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'
  ];

  // Debounce timer for auto-save
  const saveTimerRef = React.useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    console.log('Component mounted, loading initial data...');
    loadInitialData();
  }, []);

  useEffect(() => {
    // Загружать студентов только когда выбраны месяц и группа
    if (selectedMonth && selectedGroup) {
      loadStudents();
    } else {
      // Очищаем список студентов если условия не выполнены
      setStudents([]);
      setGradesData({});
    }
  }, [selectedGroup, selectedMonth, selectedYear]);

  // Сохранение выбранных значений в localStorage
  useEffect(() => {
    localStorage.setItem('gradesTable_selectedMonth', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('gradesTable_selectedGroup', selectedGroup);
  }, [selectedGroup]);

  const loadInitialData = async () => {
    try {
      const [groupsData, criteriaData] = await Promise.all([
        api.getGroups(),
        api.getCriteria()
      ]);

      setGroups(groupsData);
      setCriteria(criteriaData);
      console.log('Using academic year:', ACADEMIC_YEAR_2025.year);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      setLoadingGrades(true); // Set loading state before starting
      const filters: any = {};
      if (selectedGroup) {
        filters.groupId = selectedGroup;
      }

      console.log('Loading students with filters:', filters);
      console.log('selectedGroup value:', selectedGroup);

      const studentsData = await api.getStudents(filters);
      setStudents(studentsData);

      // Load existing grades or initialize with defaults
      await loadGradesForStudents(studentsData);
    } catch (error) {
      console.error('Error loading students:', error);
      setLoadingGrades(false);
    } finally {
      setLoading(false);
    }
  };

  const loadGradesForStudents = async (studentsData: Student[]) => {
    console.log('loadGradesForStudents called with:', { studentsCount: studentsData.length, selectedYear, selectedMonth });

    if (!selectedYear || !selectedMonth) {
      console.warn('Year or month not selected, skipping grades load');
      setLoadingGrades(false);
      return;
    }

    try {
      // Try to load grades from database
      const gradesFilters = {
        yearId: selectedYear,
        month: selectedMonth
      };

      console.log('Loading grades with filters:', gradesFilters);
      const existingGrades = await api.getGrades(gradesFilters);
      console.log('Loaded existing grades from DB:', existingGrades.length, 'records');

      // Debug: log first grade if exists
      if (existingGrades.length > 0) {
        console.log('Sample grade from DB:', {
          studentId: existingGrades[0].studentId,
          month: existingGrades[0].month,
          criteriaGradesCount: existingGrades[0].criteriaGrades?.length,
          criteriaGrades: existingGrades[0].criteriaGrades
        });
      }

      const gradesMap: GradeData = {};

      // FIRST: Load existing grades from database into a temp map
      const existingGradesMap = new Map<string, any>();
      existingGrades.forEach((grade: any) => {
        existingGradesMap.set(grade.studentId, grade);
      });

      // SECOND: Initialize students with data from DB or defaults
      studentsData.forEach((student: Student) => {
        const existingGrade = existingGradesMap.get(student.id);

        gradesMap[student.id] = {
          comment: existingGrade?.comment || ''
        };

        // For each criterion, use DB value if exists, otherwise default to 1
        criteria.forEach((criterion) => {
          let gradeValue = 1; // default

          if (existingGrade?.criteriaGrades && existingGrade.criteriaGrades.length > 0) {
            const criterionGrade = existingGrade.criteriaGrades.find(
              (cg: any) => cg.criterionId === criterion.id
            );
            if (criterionGrade) {
              gradeValue = criterionGrade.value;
              console.log(`Loaded grade for student ${student.id}, criterion ${criterion.id}: ${gradeValue}`);
            } else {
              console.warn(`No grade found for student ${student.id}, criterion ${criterion.id}, using default: 1`);
            }
          } else {
            console.warn(`No criteriaGrades for student ${student.id}, using defaults`);
          }

          gradesMap[student.id][criterion.id] = gradeValue;
        });
      });

      setGradesData(gradesMap);
    } catch (error) {
      console.error('Error loading grades:', error);
      // Fallback to default initialization if grades loading fails
      const initialGrades: GradeData = {};
      studentsData.forEach((student: Student) => {
        initialGrades[student.id] = {
          comment: ''
        };
        criteria.forEach((criterion) => {
          initialGrades[student.id][criterion.id] = 1;
        });
      });
      setGradesData(initialGrades);
    } finally {
      setLoadingGrades(false);
    }
  };

  const updateGrade = async (studentId: string, criterionId: string, value: number) => {
    console.log('updateGrade called:', { studentId, criterionId, value, selectedYear, selectedMonth });

    // Get current student data before updating state
    const currentStudentData = gradesData[studentId] || {};
    const updatedStudentData = { ...currentStudentData, [criterionId]: value };

    setGradesData(prev => ({
      ...prev,
      [studentId]: updatedStudentData
    }));

    // Auto-save to database if year and month are selected
    if (selectedYear && selectedMonth) {
      try {
        const criteriaGrades = criteria.map(criterion => ({
          criterionId: criterion.id,
          value: criterion.id === criterionId ? value : ((updatedStudentData[criterion.id] as number) || 1)
        }));

        const gradeData = {
          studentId,
          yearId: selectedYear,
          month: selectedMonth,
          criteriaGrades: criteriaGrades,
          comment: updatedStudentData.comment || ''
        };

        console.log('Auto-saving grade:', gradeData);
        await api.saveGrade(gradeData);
        console.log('Grade saved successfully');
      } catch (error) {
        console.error('Error auto-saving grade:', error);
      }
    } else {
      console.warn('Cannot auto-save: Year or month not selected', { selectedYear, selectedMonth });
    }
  };

  const updateComment = (studentId: string, comment: string) => {
    // Get current student data before updating state
    const currentStudentData = gradesData[studentId] || {};
    const updatedStudentData = { ...currentStudentData, comment };

    setGradesData(prev => ({
      ...prev,
      [studentId]: updatedStudentData
    }));

    // Clear existing timer for this student
    if (saveTimerRef.current[studentId]) {
      clearTimeout(saveTimerRef.current[studentId]);
    }

    // Set new timer - save after 1 second of no typing
    if (selectedYear && selectedMonth) {
      saveTimerRef.current[studentId] = setTimeout(async () => {
        try {
          const criteriaGrades = criteria.map(criterion => ({
            criterionId: criterion.id,
            value: (updatedStudentData[criterion.id] as number) || 1
          }));

          const gradeData = {
            studentId,
            yearId: selectedYear,
            month: selectedMonth,
            criteriaGrades: criteriaGrades,
            comment: comment
          };

          console.log('Auto-saving comment (debounced):', gradeData);
          await api.saveGrade(gradeData);
          console.log('Comment saved successfully');
        } catch (error) {
          console.error('Error auto-saving comment:', error);
        }
      }, 1000); // Wait 1 second after last keystroke
    }
  };

  const saveAllGrades = async () => {
    if (!selectedMonth) {
      alert('Выберите месяц');
      return;
    }

    if (!selectedYear) {
      alert('Учебный год не установлен');
      return;
    }

    try {
      setLoading(true);
      let savedCount = 0;

      console.log('Saving all grades with year:', selectedYear, 'month:', selectedMonth);

      for (const studentId of Object.keys(gradesData)) {
        const studentGrades = gradesData[studentId];
        const criteriaGrades = criteria.map(criterion => ({
          criterionId: criterion.id,
          value: (studentGrades[criterion.id] as number) || 1
        }));

        const gradeData = {
          studentId,
          yearId: selectedYear,
          month: selectedMonth,
          criteriaGrades: criteriaGrades,
          comment: studentGrades.comment || ''
        };

        console.log('Saving grade for student:', studentId, gradeData);
        await api.saveGrade(gradeData);
        savedCount++;
      }

      alert(`✅ Сохранено оценок для ${savedCount} учеников!`);
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('❌ Ошибка при сохранении оценок: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (value: number): string => {
    switch (value) {
      case 1: return '#ffebee';
      case 2: return '#fff3e0';
      case 3: return '#e8f5e8';
      case 4: return '#e3f2fd';
      default: return '#fff';
    }
  };

  const clearLocalStorage = () => {
    if (confirm('Очистить все сохранённые данные? Это действие нельзя отменить.')) {
      localStorage.removeItem('gradesTable_selectedYear');
      localStorage.removeItem('gradesTable_selectedMonth');
      localStorage.removeItem('gradesTable_selectedGroup');
      localStorage.removeItem('gradesTable_gradesData');
      
      setSelectedYear('');
      setSelectedMonth('');
      setSelectedGroup('');
      setGradesData({});
      
      alert('Данные очищены!');
    }
  };

  const handleGroupNameEdit = (group: Group) => {
    setNewGroupName(group.name);
    setEditingGroupName(true);
  };

  const saveGroupName = async () => {
    if (!selectedGroup || !newGroupName.trim()) return;
    
    try {
      await api.updateGroup(selectedGroup, { name: newGroupName.trim() });
      
      // Обновляем список групп
      const updatedGroups = groups.map(group => 
        group.id === selectedGroup 
          ? { ...group, name: newGroupName.trim() }
          : group
      );
      setGroups(updatedGroups);
      
      setEditingGroupName(false);
      alert('Название группы обновлено!');
    } catch (error) {
      console.error('Error updating group name:', error);
      alert('Ошибка при обновлении названия группы');
    }
  };

  const cancelGroupNameEdit = () => {
    setEditingGroupName(false);
    setNewGroupName('');
  };

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        padding: '2rem',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ textAlign: 'center', color: '#2196F3', marginBottom: '2rem' }}>
          Табличная форма оценок
        </h1>

        {/* Controls */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Учебный год:</label>
            <div style={{
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem',
              backgroundColor: '#f5f5f5',
              color: '#333'
            }}>
              {ACADEMIC_YEAR_2025.year}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Месяц:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ 
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontWeight: 'bold', color: '#555' }}>Группа:</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={{ 
                padding: '0.5rem', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="">Все группы</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={loadStudents}
            disabled={loading || !selectedMonth || !selectedGroup}
            style={{
              backgroundColor: (!selectedMonth || !selectedGroup) ? '#ccc' : '#2196F3',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: (!selectedMonth || !selectedGroup) ? 'not-allowed' : 'pointer',
              fontSize: '1rem',
              alignSelf: 'flex-end',
              opacity: (!selectedMonth || !selectedGroup) ? 0.6 : 1
            }}
          >
            {loading ? 'Загрузка...' : 'Загрузить учеников'}
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          borderTop: '1px solid #ddd',
          paddingTop: '1rem'
        }}>
          <button
            onClick={() => setShowAddStudent(true)}
            style={{
              backgroundColor: '#FF9800',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            ➕ Добавить ученика
          </button>
          
          <button
            onClick={() => setShowAddGroup(true)}
            style={{
              backgroundColor: '#9C27B0',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📚 Создать группу
          </button>
          
          <button
            onClick={saveAllGrades}
            disabled={loading || !selectedMonth}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: loading || !selectedMonth ? 'not-allowed' : 'pointer',
              opacity: (loading || !selectedMonth) ? 0.6 : 1
            }}
          >
            💾 Сохранить все оценки
          </button>
          
          <button
            onClick={clearLocalStorage}
            style={{
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🗑️ Очистить данные
          </button>
        </div>

        {/* Legend */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '1rem',
          padding: '1rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          flexWrap: 'wrap'
        }}>
          {[1, 2, 3, 4].map(level => (
            <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: getGradeColor(level),
                border: '1px solid #ccc',
                borderRadius: '3px'
              }} />
              <span style={{ fontSize: '0.9rem' }}>
                {level} - {level === 1 ? 'Низкий' : level === 2 ? 'Средний' : level === 3 ? 'Хороший' : 'Отличный'}
              </span>
            </div>
          ))}
        </div>

        {/* Group Name Header */}
        {selectedGroup && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '4px',
            borderLeft: '4px solid #2196F3'
          }}>
            <h3 style={{ margin: 0, color: '#2196F3' }}>
              Группа:
            </h3>
            {editingGroupName ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  style={{
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '1rem',
                    minWidth: '300px'
                  }}
                  autoFocus
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') saveGroupName();
                    if (e.key === 'Escape') cancelGroupNameEdit();
                  }}
                />
                <button
                  onClick={saveGroupName}
                  style={{
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ✓
                </button>
                <button
                  onClick={cancelGroupNameEdit}
                  style={{
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>
                  {groups.find(g => g.id === selectedGroup)?.name || 'Неизвестная группа'}
                </span>
                <button
                  onClick={() => handleGroupNameEdit(groups.find(g => g.id === selectedGroup)!)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#2196F3',
                    cursor: 'pointer',
                    padding: '0.25rem',
                    borderRadius: '4px',
                    fontSize: '1rem'
                  }}
                  title="Редактировать название группы"
                >
                  ✏️
                </button>
              </div>
            )}
          </div>
        )}

        {/* Grades Table */}
        {loading || loadingGrades ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            marginTop: '1rem'
          }}>
            <div style={{ fontSize: '1.2rem', color: '#2196F3', marginBottom: '1rem' }}>
              ⏳ Загрузка данных...
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Пожалуйста, подождите
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.95rem'
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
                    ФИО ученика
                  </th>
                  {criteria.map(criterion => (
                    <th key={criterion.id} style={{
                      border: '1px solid #ddd',
                      padding: '0.75rem',
                      backgroundColor: '#f8f9fa',
                      textAlign: 'center',
                      minWidth: '120px',
                      fontSize: '0.9rem',
                      fontWeight: 'bold'
                    }}>
                      {criterion.name}
                    </th>
                  ))}
                  <th style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem',
                    backgroundColor: '#f8f9fa',
                    textAlign: 'center',
                    minWidth: '250px'
                  }}>
                    Комментарий
                  </th>
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
                  {criteria.map(criterion => (
                    <td key={criterion.id} style={{
                      border: '1px solid #ddd',
                      padding: '0.75rem',
                      textAlign: 'center',
                      backgroundColor: getGradeColor(gradesData[student.id]?.[criterion.id] || 1)
                    }}>
                      <select
                        value={gradesData[student.id]?.[criterion.id] || 1}
                        onChange={(e) => updateGrade(student.id, criterion.id, parseInt(e.target.value))}
                        style={{
                          width: '60px',
                          padding: '0.25rem',
                          border: '1px solid #ccc',
                          borderRadius: '4px',
                          fontSize: '0.9rem',
                          textAlign: 'center',
                          backgroundColor: 'transparent'
                        }}
                      >
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                      </select>
                    </td>
                  ))}
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}>
                    <textarea
                      value={gradesData[student.id]?.comment || ''}
                      onChange={(e) => updateComment(student.id, e.target.value)}
                      placeholder="Комментарий..."
                      style={{
                        width: '200px',
                        padding: '0.5rem',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '0.9rem',
                        minHeight: '40px',
                        resize: 'vertical'
                      }}
                    />
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}

        {students.length === 0 && !loading && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: '#666',
            backgroundColor: '#f9f9f9',
            borderRadius: '4px',
            marginTop: '1rem'
          }}>
            {!selectedMonth || !selectedGroup 
              ? 'Выберите месяц и группу для загрузки учеников'
              : 'В выбранной группе нет учеников'
            }
          </div>
        )}

        {/* Modals */}
        <AddStudentModal
          isOpen={showAddStudent}
          onClose={() => setShowAddStudent(false)}
          onStudentAdded={() => {
            loadStudents();
            loadInitialData();
          }}
          groups={groups}
        />

        <AddGroupModal
          isOpen={showAddGroup}
          onClose={() => setShowAddGroup(false)}
          onGroupAdded={() => {
            loadInitialData();
          }}
        />
      </div>
    </div>
  );
};

export default GradesTable;