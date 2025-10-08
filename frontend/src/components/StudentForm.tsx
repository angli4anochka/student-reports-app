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

interface StudentFormProps {
  student?: Student | null;
  onClose: () => void;
  onStudentCreated: (student: Student) => void;
  onStudentUpdated: (student: Student) => void;
}

const StudentForm: React.FC<StudentFormProps> = ({
  student,
  onClose,
  onStudentCreated,
  onStudentUpdated,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    group: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (student) {
      setFormData({
        fullName: student.fullName,
        group: student.group?.id || '',
        notes: student.notes || '',
      });
    }
  }, [student]);

  const validateFullName = (name: string): boolean => {
    const nameParts = name.trim().split(/\s+/);
    return nameParts.length >= 2 && nameParts.every(part => part.length > 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate ФИО
    if (!validateFullName(formData.fullName)) {
      setError('ФИО должно содержать как минимум имя и фамилию');
      setLoading(false);
      return;
    }

    try {
      if (student) {
        const updatedStudent = await api.updateStudent(student.id, formData);
        onStudentUpdated(updatedStudent);
      } else {
        const newStudent = await api.createStudent(formData);
        onStudentCreated(newStudent);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>
            {student ? 'Редактировать ученика' : 'Добавить ученика'}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              ФИО ученика *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                transition: 'border-color 0.2s',
              }}
              placeholder="Фамилия Имя Отчество (например: Иванов Иван Иванович)"
              onFocus={(e) => e.target.style.borderColor = '#2196F3'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.25rem' }}>
              Введите полное ФИО ученика в формате: Фамилия Имя Отчество
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Группа *
            </label>
            <input
              type="text"
              value={formData.group}
              onChange={(e) => setFormData({ ...formData, group: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
              }}
              placeholder="Например: A1 Mon 18:00"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Заметки
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                resize: 'vertical',
              }}
              placeholder="Индивидуальные особенности, заметки..."
            />
          </div>

          {error && (
            <div style={{
              color: '#d32f2f',
              marginBottom: '1rem',
              padding: '0.5rem',
              backgroundColor: '#ffebee',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#4CAF50',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Сохранение...' : student ? 'Обновить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;