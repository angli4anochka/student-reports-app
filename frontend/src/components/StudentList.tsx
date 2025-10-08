import React from 'react';
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

interface StudentListProps {
  students: Student[];
  onStudentSelect: (student: Student) => void;
  onStudentEdit: (student: Student) => void;
  onStudentDelete: (studentId: string) => void;
  onGradeEntry: (student: Student) => void;
  selectedStudent: Student | null;
}

const StudentList: React.FC<StudentListProps> = ({
  students,
  onStudentSelect,
  onStudentEdit,
  onStudentDelete,
  onGradeEntry,
  selectedStudent,
}) => {
  const handleDelete = async (student: Student) => {
    if (window.confirm(`Удалить ученика ${student.fullName}?`)) {
      try {
        await api.deleteStudent(student.id);
        onStudentDelete(student.id);
      } catch (error) {
        alert('Ошибка при удалении ученика');
        console.error(error);
      }
    }
  };

  if (students.length === 0) {
    return (
      <div style={{ 
        textAlign: 'center', 
        padding: '2rem', 
        color: '#666',
        backgroundColor: '#f9f9f9',
        borderRadius: '4px'
      }}>
        Учеников не найдено
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', borderRadius: '4px', overflow: 'hidden' }}>
      {students.map((student) => (
        <div
          key={student.id}
          style={{
            padding: '1rem',
            borderBottom: '1px solid #eee',
            backgroundColor: selectedStudent?.id === student.id ? '#e3f2fd' : 'white',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onClick={() => onStudentSelect(student)}
          onMouseEnter={(e) => {
            if (selectedStudent?.id !== student.id) {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
            }
          }}
          onMouseLeave={(e) => {
            if (selectedStudent?.id !== student.id) {
              e.currentTarget.style.backgroundColor = 'white';
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ 
                margin: '0 0 0.25rem 0', 
                color: '#333', 
                fontSize: '1.1rem',
                fontWeight: '600' 
              }}>
                {student.fullName}
              </h4>
              <p style={{ 
                margin: 0, 
                color: '#666', 
                fontSize: '0.875rem',
                fontWeight: '500'
              }}>
                Группа: {student.group?.name || 'Не назначена'}
              </p>
              {student.notes && (
                <p style={{ 
                  margin: '0.25rem 0 0 0', 
                  color: '#888', 
                  fontSize: '0.75rem',
                  fontStyle: 'italic'
                }}>
                  {student.notes}
                </p>
              )}
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onGradeEntry(student);
                }}
                style={{
                  backgroundColor: '#FF9800',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
                title="Выставить оценки"
              >
                Оценки
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onStudentEdit(student);
                }}
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
                title="Редактировать"
              >
                Редакт.
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(student);
                }}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
                title="Удалить"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StudentList;