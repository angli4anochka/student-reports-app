import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Group {
  id: string;
  name: string;
  description?: string;
}

interface Lesson {
  id: string;
  date: string;
  topic: string;
  homework?: string;
  comment?: string;
  groupId?: string;
  group?: Group;
  createdAt: string;
  updatedAt: string;
}

const LessonsSchedule: React.FC = () => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    date: '',
    topic: '',
    homework: '',
    comment: '',
    groupId: ''
  });

  useEffect(() => {
    loadGroups();
    loadLessons();
  }, []);

  useEffect(() => {
    loadLessons();
  }, [selectedGroup]);

  const loadGroups = async () => {
    try {
      const groupsData = await api.getGroups();
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadLessons = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (selectedGroup) {
        filters.groupId = selectedGroup;
      }
      const lessonsData = await api.getLessons(filters);
      setLessons(lessonsData);
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingLesson) {
        await api.updateLesson(editingLesson.id, formData);
      } else {
        await api.createLesson(formData);
      }
      setFormData({ date: '', topic: '', homework: '', comment: '', groupId: '' });
      setEditingLesson(null);
      setShowAddForm(false);
      loadLessons();
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Ошибка при сохранении урока');
    }
  };

  const handleEdit = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setFormData({
      date: lesson.date,
      topic: lesson.topic,
      homework: lesson.homework || '',
      comment: lesson.comment || '',
      groupId: lesson.groupId || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот урок?')) return;
    try {
      await api.deleteLesson(id);
      loadLessons();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Ошибка при удалении урока');
    }
  };

  const handleCancel = () => {
    setFormData({ date: '', topic: '', homework: '', comment: '', groupId: '' });
    setEditingLesson(null);
    setShowAddForm(false);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Загрузка...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Расписание и ДЗ</h3>
        <button
          onClick={() => setShowAddForm(true)}
          style={{
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '0.5rem 1rem',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Добавить урок
        </button>
      </div>

      {/* Filter */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem' }}>Группа:</label>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #ddd',
            borderRadius: '4px',
            minWidth: '200px'
          }}
        >
          <option value="">Все группы</option>
          {groups.map(group => (
            <option key={group.id} value={group.id}>{group.name}</option>
          ))}
        </select>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div style={{
          backgroundColor: '#f5f5f5',
          padding: '1.5rem',
          borderRadius: '8px',
          marginBottom: '1.5rem'
        }}>
          <h4>{editingLesson ? 'Редактировать урок' : 'Добавить урок'}</h4>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Дата:</label>
                <input
                  type="text"
                  placeholder="08.09"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Группа:</label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid #ddd',
                    borderRadius: '4px'
                  }}
                >
                  <option value="">Без группы</option>
                  {groups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Тема урока:</label>
              <input
                type="text"
                placeholder="повторение"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Домашнее задание:</label>
              <input
                type="text"
                placeholder="нет"
                value={formData.homework}
                onChange={(e) => setFormData({ ...formData, homework: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}
              />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Комментарий:</label>
              <textarea
                placeholder="прошли всю презентацию..."
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  resize: 'vertical'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                style={{
                  backgroundColor: '#2196F3',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {editingLesson ? 'Сохранить' : 'Добавить'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lessons Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#2196F3', color: 'white' }}>
              <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>Дата</th>
              <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>Группа</th>
              <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>Урок</th>
              <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>Домашнее задание</th>
              <th style={{ padding: '1rem', textAlign: 'left', border: '1px solid #ddd' }}>Комментарий</th>
              <th style={{ padding: '1rem', textAlign: 'center', border: '1px solid #ddd', width: '150px' }}>Действия</th>
            </tr>
          </thead>
          <tbody>
            {lessons.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
                  Нет уроков. Добавьте первый урок!
                </td>
              </tr>
            ) : (
              lessons.map((lesson) => (
                <tr key={lesson.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{lesson.date}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {lesson.group?.name || '-'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{lesson.topic}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>{lesson.homework || '-'}</td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd' }}>
                    {lesson.comment || '-'}
                  </td>
                  <td style={{ padding: '0.75rem', border: '1px solid #ddd', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(lesson)}
                      style={{
                        backgroundColor: '#FF9800',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginRight: '0.5rem'
                      }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      style={{
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LessonsSchedule;
