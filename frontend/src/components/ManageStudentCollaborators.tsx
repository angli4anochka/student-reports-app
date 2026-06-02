import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Teacher {
  id: string;
  fullName: string;
  email: string;
}

interface Collaborator {
  id: string;
  teacher: Teacher;
}

interface ManageStudentCollaboratorsProps {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ManageStudentCollaborators: React.FC<ManageStudentCollaboratorsProps> = ({ studentId, studentName, onClose, onSuccess }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [collab, teachers] = await Promise.all([
        api.getStudentCollaborators(studentId),
        api.getTeachers()
      ]);
      setCollaborators(collab);
      setAllTeachers(teachers);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCollaborator = async () => {
    if (!selectedTeacherId) {
      setError('Выберите учителя');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.addStudentCollaborator(studentId, selectedTeacherId);
      setSelectedTeacherId('');
      await loadData();
      if (onSuccess) onSuccess();
      alert('✅ Учитель добавлен к ученику!');
    } catch (err) {
      console.error('Error adding collaborator:', err);
      setError(err instanceof Error ? err.message : 'Ошибка добавления учителя');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Убрать ${teacherName} от ученика?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.removeStudentCollaborator(studentId, teacherId);
      await loadData();
      if (onSuccess) onSuccess();
      alert('✅ Учитель убран от ученика');
    } catch (err) {
      console.error('Error removing collaborator:', err);
      setError(err instanceof Error ? err.message : 'Ошибка удаления учителя');
    } finally {
      setLoading(false);
    }
  };

  // Filter out teachers who are already collaborators
  const availableTeachers = allTeachers.filter(
    t => !collaborators.some(c => c.teacher.id === t.id)
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ margin: 0 }}>Поделиться учеником</h3>
            <p style={{ margin: '0.5rem 0 0', color: '#666', fontSize: '0.875rem' }}>{studentName}</p>
          </div>
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

        {error && (
          <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '0.75rem',
            borderRadius: '6px',
            marginBottom: '1rem',
            fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {/* Current collaborators */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#666' }}>
            Учителя с доступом
          </h4>
          {collaborators.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#999', margin: 0 }}>
              Нет совместных учителей
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {collaborators.map(collab => (
                <div
                  key={collab.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem',
                    backgroundColor: '#f5f5f5',
                    borderRadius: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{collab.teacher.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>{collab.teacher.email}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.teacher.id, collab.teacher.fullName)}
                    disabled={loading}
                    style={{
                      padding: '0.375rem 0.75rem',
                      backgroundColor: '#fee',
                      color: '#c00',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    Убрать
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add new collaborator */}
        <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: '#666' }}>
            Добавить учителя
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              disabled={loading || availableTeachers.length === 0}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '0.875rem',
                cursor: loading || availableTeachers.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">
                {availableTeachers.length === 0 ? 'Нет доступных учителей' : 'Выберите учителя'}
              </option>
              {availableTeachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.fullName} ({teacher.email})
                </option>
              ))}
            </select>
            <button
              onClick={handleAddCollaborator}
              disabled={loading || !selectedTeacherId}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: selectedTeacherId && !loading ? '#10b981' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading || !selectedTeacherId ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 600,
              }}
            >
              {loading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageStudentCollaborators;
