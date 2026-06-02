import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface AddGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupAdded: () => void;
  group?: Group | null;
}

interface Teacher {
  id: string;
  fullName: string;
  email: string;
}

interface Group {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
}

const AddGroupModal: React.FC<AddGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupAdded,
  group
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'ORG_ADMIN';

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teacherId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [reassigning, setReassigning] = useState(false);

  // Load group data when editing
  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name,
        description: group.description || '',
        teacherId: group.teacherId
      });
    } else {
      setFormData({ name: '', description: '', teacherId: '' });
    }
  }, [group]);

  // Load teachers when modal opens and user is admin
  useEffect(() => {
    if (isOpen && isAdmin) {
      loadTeachers();
    }

    if (!isOpen) {
      setFormData({ name: '', description: '', teacherId: '' });
      setError('');
    }
  }, [isOpen, isAdmin]);

  const loadTeachers = async () => {
    try {
      const data = await api.getAvailableTeachers();
      setTeachers(data);
    } catch (err: any) {
      console.error('Failed to load teachers:', err);
    }
  };

  const handleTeacherChange = async (newTeacherId: string) => {
    if (!group) {
      // If creating new group, just update form data
      setFormData(prev => ({ ...prev, teacherId: newTeacherId }));
      return;
    }

    // If editing existing group, reassign immediately
    try {
      setReassigning(true);
      await api.reassignGroupTeacher(group.id, newTeacherId);

      setFormData(prev => ({ ...prev, teacherId: newTeacherId }));
      onGroupAdded(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to reassign group:', err);
      alert(`Ошибка при переназначении: ${err.message}`);
      // Revert on error
      setFormData(prev => ({ ...prev, teacherId: group.teacherId }));
    } finally {
      setReassigning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Название группы обязательно для заполнения');
      return;
    }

    if (isAdmin && !formData.teacherId && !group) {
      setError('Выберите преподавателя');
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (group) {
        // Update existing group
        await api.updateGroup(group.id, {
          name: formData.name.trim(),
          description: formData.description.trim() || undefined
        });
      } else {
        // Create new group
        await api.createGroup({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          teacherId: isAdmin ? formData.teacherId : undefined
        });
      }

      onGroupAdded();
      onClose();
    } catch (error: any) {
      setError(error.message || (group ? 'Ошибка при обновлении группы' : 'Ошибка при создании группы'));
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={handleBackdropClick}
    >
      <div style={{
        background: 'white',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1.5rem',
          borderBottom: '1px solid #ddd',
          backgroundColor: '#f8f9fa'
        }}>
          <h3 style={{ margin: 0, color: '#333' }}>{group ? 'Редактировать группу' : 'Создать новую группу'}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666',
              padding: '0',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.color = '#333';
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.color = '#666';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', maxHeight: '60vh', overflowY: 'auto' }}>
            {isAdmin && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontWeight: 'bold',
                  color: '#555'
                }}>
                  Преподаватель *
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) => handleTeacherChange(e.target.value)}
                  required={!group}
                  disabled={reassigning}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '1rem',
                    transition: 'border-color 0.2s',
                    backgroundColor: reassigning ? '#f5f5f5' : 'white',
                    cursor: reassigning ? 'not-allowed' : 'pointer'
                  }}
                  onFocus={(e) => !reassigning && (e.currentTarget.style.borderColor = '#2196F3')}
                  onBlur={(e) => e.currentTarget.style.borderColor = '#ddd'}
                >
                  <option value="">-- Выберите преподавателя --</option>
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.fullName} ({teacher.email})
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

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 'bold',
                color: '#555'
              }}>
                Название группы *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: A2 Tue 19:00"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
              <div style={{
                fontSize: '0.875rem',
                color: '#666',
                marginTop: '0.25rem'
              }}>
                Рекомендуемый формат: Уровень День Время (например: A1 Mon 18:00)
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: 'bold',
                color: '#555'
              }}>
                Описание
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Описание группы, уровень, особенности..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  transition: 'border-color 0.2s',
                  resize: 'vertical',
                  minHeight: '80px'
                }}
                onFocus={(e) => e.target.style.borderColor = '#2196F3'}
                onBlur={(e) => e.target.style.borderColor = '#ddd'}
              />
            </div>

            {error && (
              <div style={{
                backgroundColor: '#ffebee',
                color: '#d32f2f',
                padding: '0.75rem',
                borderRadius: '4px',
                marginTop: '1rem',
                fontSize: '0.9rem'
              }}>
                {error}
              </div>
            )}
          </div>

          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end',
            padding: '1.5rem',
            borderTop: '1px solid #ddd',
            backgroundColor: '#f8f9fa'
          }}>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '1rem',
                backgroundColor: 'white',
                color: '#666'
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
                cursor: 'pointer',
                fontSize: '1rem',
                backgroundColor: '#4CAF50',
                color: 'white',
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? (group ? 'Сохранение...' : 'Создание...') : (group ? 'Сохранить' : 'Создать группу')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddGroupModal;