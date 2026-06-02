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

interface ManageCollaboratorsProps {
  groupId: string;
  groupName: string;
  onClose: () => void;
}

const ManageCollaborators: React.FC<ManageCollaboratorsProps> = ({ groupId, groupName, onClose }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, [groupId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [collab, teachers] = await Promise.all([
        api.getGroupCollaborators(groupId),
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
      await api.addGroupCollaborator(groupId, selectedTeacherId);
      setSelectedTeacherId('');
      await loadData();
      alert('✅ Учитель добавлен в группу!');
    } catch (err) {
      console.error('Error adding collaborator:', err);
      setError(err instanceof Error ? err.message : 'Ошибка добавления учителя');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCollaborator = async (teacherId: string, teacherName: string) => {
    if (!confirm(`Удалить ${teacherName} из группы?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.removeGroupCollaborator(groupId, teacherId);
      await loadData();
      alert('✅ Учитель удалён из группы');
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
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0, color: '#2196F3' }}>
          Совместный доступ: {groupName}
        </h2>

        <p style={{ color: '#666', marginBottom: '1.5rem' }}>
          Пригласите других учителей для совместного ведения этой группы.
          Они смогут видеть учеников, ДЗ, посещаемость и оценки.
        </p>

        {/* Add Collaborator Form */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0 }}>Добавить учителя</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Выберите учителя:
              </label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '1rem',
                }}
              >
                <option value="">-- Выберите учителя --</option>
                {availableTeachers.map(teacher => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.fullName} ({teacher.email})
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddCollaborator}
              disabled={loading || !selectedTeacherId}
              style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1.5rem',
                borderRadius: '4px',
                cursor: loading || !selectedTeacherId ? 'not-allowed' : 'pointer',
                fontSize: '1rem',
                opacity: loading || !selectedTeacherId ? 0.6 : 1,
              }}
            >
              Добавить
            </button>
          </div>
        </div>

        {/* Current Collaborators List */}
        <div>
          <h3>Учителя с доступом ({collaborators.length})</h3>
          {collaborators.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#666',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
            }}>
              Пока нет других учителей с доступом к этой группе
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {collaborators.map(collab => (
                <div
                  key={collab.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'bold' }}>{collab.teacher.fullName}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>{collab.teacher.email}</div>
                  </div>
                  <button
                    onClick={() => handleRemoveCollaborator(collab.teacher.id, collab.teacher.fullName)}
                    disabled={loading}
                    style={{
                      backgroundColor: '#f44336',
                      color: 'white',
                      border: 'none',
                      padding: '0.5rem 1rem',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#ffebee',
              color: '#c62828',
              padding: '0.75rem',
              borderRadius: '4px',
              marginTop: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: '2rem', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#666',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManageCollaborators;
