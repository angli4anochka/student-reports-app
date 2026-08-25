import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Group {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  isOwner?: boolean;
  isShared?: boolean;
}

interface Teacher {
  id: string;
  fullName: string;
  email: string;
}

interface Student {
  id: string;
  fullName: string;
  groupId?: string;
  group?: Group;
  notes?: string;
  studyEndDate?: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
  isOwner?: boolean;
  isShared?: boolean;
}

interface StudentFormProps {
  student?: Student | null;
  onClose: () => void;
  onStudentCreated: (student: Student) => void;
  onStudentUpdated: (student: Student) => void;
  onStudentDeleted?: (student: Student) => void;
  onShare?: (student: Student) => void;
  defaultGroupId?: string;
}

const StudentForm: React.FC<StudentFormProps> = ({
  student,
  onClose,
  onStudentCreated,
  onStudentUpdated,
  onStudentDeleted,
  onShare,
  defaultGroupId,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    fullName: '',
    notes: '',
    studyEndDate: '2027-09-01',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [reassigning, setReassigning] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        fullName: student.fullName,
        notes: student.notes || '',
        studyEndDate: student.studyEndDate ? student.studyEndDate.slice(0, 10) : '2027-09-01',
      });
    }
  }, [student]);

  useEffect(() => {
    // Load teachers for admins
    if ((user?.role === 'ADMIN' || user?.role === 'ORG_ADMIN') && student) {
      loadTeachers();
    }
  }, [user, student]);

  const loadTeachers = async () => {
    try {
      const teachersData = await api.getAvailableTeachers();
      setTeachers(teachersData);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    }
  };

  const handleTeacherChange = async (newTeacherId: string) => {
    if (!student) return;

    try {
      setReassigning(true);
      await api.reassignStudentTeacher(student.id, newTeacherId);

      // Update the student object with new teacher
      const updatedStudent = {
        ...student,
        teacherId: newTeacherId,
      };
      onStudentUpdated(updatedStudent);
    } catch (err: any) {
      console.error('Failed to reassign student:', err);
      alert(`Ошибка при переназначении: ${err.message}`);
    } finally {
      setReassigning(false);
    }
  };

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

  const handleDelete = async () => {
    if (!student || !onStudentDeleted) return;

    if (!confirm(`Вы уверены, что хотите удалить ученика "${student.fullName}"?`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.deleteStudent(student.id);
      onStudentDeleted(student);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении');
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
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Учится до</label>
            <input type="date" value={formData.studyEndDate} onChange={(e) => setFormData({ ...formData, studyEndDate: e.target.value })} style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '8px' }} />
          </div>
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

          {/* Teacher Selector for ADMIN/ORG_ADMIN */}
          {(user?.role === 'ADMIN' || user?.role === 'ORG_ADMIN') && student && teachers.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Преподаватель
              </label>
              <select
                value={student.teacherId}
                onChange={(e) => handleTeacherChange(e.target.value)}
                disabled={reassigning}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                  backgroundColor: reassigning ? '#f5f5f5' : 'white',
                  cursor: reassigning ? 'not-allowed' : 'pointer',
                }}
              >
                {teachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName}
                  </option>
                ))}
              </select>
              {reassigning && (
                <div style={{ fontSize: '0.75rem', color: '#2196F3', marginTop: '0.25rem' }}>
                  Сохранение...
                </div>
              )}
            </div>
          )}

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

          <div className="flex gap-2 justify-between">
            <div className="flex gap-2">
              {student && onStudentDeleted && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  🗑️ Удалить
                </button>
              )}
              {student && student.isOwner && onShare && (
                <button
                  type="button"
                  onClick={() => onShare(student)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  👥 Поделиться
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors duration-150"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
              >
                {loading ? 'Сохранение...' : student ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentForm;