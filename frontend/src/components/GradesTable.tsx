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

const GradesTable: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>(() => 
    localStorage.getItem('gradesTable_selectedYear') || ''
  );
  const [selectedMonth, setSelectedMonth] = useState<string>(() => 
    localStorage.getItem('gradesTable_selectedMonth') || ''
  );
  const [selectedGroup, setSelectedGroup] = useState<string>(() => 
    localStorage.getItem('gradesTable_selectedGroup') || ''
  );
  const [gradesData, setGradesData] = useState<GradeData>({});
  const [loading, setLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [editingGroupName, setEditingGroupName] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const MONTHS = [
    'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'
  ];

  useEffect(() => {
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

  // Reload grades when year or month changes
  useEffect(() => {
    if (selectedYear && selectedMonth && students.length > 0) {
      loadGradesForStudents(students);
    }
  }, [selectedYear, selectedMonth, criteria, students.length]);

  // Сохранение выбранных значений в localStorage
  useEffect(() => {
    localStorage.setItem('gradesTable_selectedYear', selectedYear);
  }, [selectedYear]);

  useEffect(() => {
    localStorage.setItem('gradesTable_selectedMonth', selectedMonth);
  }, [selectedMonth]);

  useEffect(() => {
    localStorage.setItem('gradesTable_selectedGroup', selectedGroup);
  }, [selectedGroup]);

  const loadInitialData = async () => {
    try {
      const [groupsData, yearsData, criteriaData] = await Promise.all([
        api.getGroups(),
        api.getYears(),
        api.getCriteria()
      ]);
      
      setGroups(groupsData);
      setYears(yearsData);
      setCriteria(criteriaData);
      
      if (yearsData.length > 0) {
        setSelectedYear(yearsData[0].id);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const loadGradesForStudents = async (studentsData: Student[]) => {
    if (!selectedYear || !selectedMonth) {
      // If no year/month selected, just preserve localStorage data
      return;
    }

    try {
      // Try to load grades from database
      const gradesFilters = {
        yearId: selectedYear,
        month: selectedMonth
      };
      
      const existingGrades = await api.getGrades(gradesFilters);
      console.log('Loaded existing grades from DB:', existingGrades);
      const gradesMap: GradeData = {};
      
      // Initialize all students with default values
      studentsData.forEach((student: Student) => {
        gradesMap[student.id] = {
          comment: ''
        };
        criteria.forEach((criterion) => {
          gradesMap[student.id][criterion.id] = 1;
        });
      });
      
      // Override with existing grades from database
      existingGrades.forEach((grade: any) => {
        if (gradesMap[grade.studentId]) {
          gradesMap[grade.studentId].comment = grade.comment || '';
          if (grade.criteriaGrades) {
            grade.criteriaGrades.forEach((criterionGrade: any) => {
              gradesMap[grade.studentId][criterionGrade.criterionId] = criterionGrade.value;
            });
          }
        }
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
    }
  };

  const updateGrade = async (studentId: string, criterionId: string, value: number) => {
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
    }
  };

  const updateComment = async (studentId: string, comment: string) => {
    // Get current student data before updating state
    const currentStudentData = gradesData[studentId] || {};
    const updatedStudentData = { ...currentStudentData, comment };

    setGradesData(prev => ({
      ...prev,
      [studentId]: updatedStudentData
    }));

    // Auto-save to database if year and month are selected
    if (selectedYear && selectedMonth) {
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

        console.log('Auto-saving comment:', gradeData);
        await api.saveGrade(gradeData);
        console.log('Comment saved successfully');
      } catch (error) {
        console.error('Error auto-saving comment:', error);
      }
    }
  };

  const saveAllGrades = async () => {
    if (!selectedYear || !selectedMonth) {
      alert('Выберите учебный год и месяц');
      return;
    }

    try {
      setLoading(true);
      let savedCount = 0;

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

        await api.saveGrade(gradeData);
        savedCount++;
      }

      alert(`Сохранено оценок для ${savedCount} учеников!`);
    } catch (error) {
      console.error('Error saving grades:', error);
      alert('Ошибка при сохранении оценок');
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
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ 
                padding: '0.5rem', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                fontSize: '1rem'
              }}
            >
              <option value="">Выберите год</option>
              {years.map(year => (
                <option key={year.id} value={year.id}>{year.year}</option>
              ))}
            </select>
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
            disabled={loading || !selectedYear || !selectedMonth}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              opacity: (loading || !selectedYear || !selectedMonth) ? 0.6 : 1
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