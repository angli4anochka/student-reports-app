import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'TEACHER' | 'ADMIN';
  school?: string;
  createdAt: string;
}

const AdminPanel: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<{ school: string | null; role: string } | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'TEACHER' as 'TEACHER' | 'ADMIN',
    school: ''
  });

  useEffect(() => {
    loadCurrentUser();
    loadUsers();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const user = await api.getMe();
      setCurrentUser({ school: user.school, role: user.role });
    } catch (error) {
      console.error('Error loading current user:', error);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Ошибка загрузки пользователей: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.fullName) {
      alert('Заполните все обязательные поля');
      return;
    }

    if (!editingUser && !formData.password) {
      alert('Пароль обязателен для нового пользователя');
      return;
    }

    try {
      setLoading(true);

      if (editingUser) {
        // Update existing user
        await api.updateAdminUser(editingUser.id, formData);
        alert('Пользователь обновлён!');
      } else {
        // Create new user
        await api.createAdminUser(formData);
        alert('Пользователь создан!');
      }

      setFormData({ email: '', password: '', fullName: '', role: 'TEACHER' });
      setEditingUser(null);
      setShowAddForm(false);
      await loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Ошибка: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      fullName: user.fullName,
      role: user.role,
      school: user.school || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Удалить пользователя ${userName}? Все их данные будут удалены!`)) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteAdminUser(userId);
      alert('Пользователь удалён');
      await loadUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Ошибка удаления: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({ email: '', password: '', fullName: '', role: 'TEACHER', school: '' });
    setEditingUser(null);
    setShowAddForm(false);
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
          Панель администратора
        </h1>

        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '0.75rem 1.5rem',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            {showAddForm ? '✕ Отмена' : '➕ Добавить пользователя'}
          </button>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div style={{
            backgroundColor: '#f8f9fa',
            padding: '1.5rem',
            borderRadius: '8px',
            marginBottom: '2rem'
          }}>
            <h3 style={{ marginTop: 0 }}>
              {editingUser ? 'Редактировать пользователя' : 'Новый пользователь'}
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Email:
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Полное имя:
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Пароль {editingUser && '(оставьте пустым, чтобы не менять)'}:
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingUser}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Роль:
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'TEACHER' | 'ADMIN' })}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="TEACHER">Учитель</option>
                    <option value="ADMIN">Администратор</option>
                  </select>
                </div>

                {/* School field - only for super admin */}
                {currentUser && currentUser.school === null ? (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Школа (опционально):
                    </label>
                    <input
                      type="text"
                      value={formData.school}
                      onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                      placeholder="school1, school2, demo, и т.д."
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem'
                      }}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem' }}>
                      Администраторы с одинаковой школой видят всех учеников учителей этой школы
                    </small>
                  </div>
                ) : currentUser && currentUser.school ? (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Школа:
                    </label>
                    <input
                      type="text"
                      value={currentUser.school}
                      disabled
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        backgroundColor: '#f0f0f0',
                        color: '#666'
                      }}
                    />
                    <small style={{ color: '#666', fontSize: '0.85rem' }}>
                      Вы можете создавать учителей только для своей школы ({currentUser.school})
                    </small>
                  </div>
                ) : null}

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '4px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '1rem',
                      opacity: loading ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Сохранение...' : 'Сохранить'}
                  </button>

                  <button
                    type="button"
                    onClick={handleCancel}
                    style={{
                      backgroundColor: '#666',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
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
                  textAlign: 'left'
                }}>
                  Email
                </th>
                <th style={{
                  border: '1px solid #ddd',
                  padding: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  textAlign: 'left'
                }}>
                  Имя
                </th>
                <th style={{
                  border: '1px solid #ddd',
                  padding: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  textAlign: 'center'
                }}>
                  Роль
                </th>
                <th style={{
                  border: '1px solid #ddd',
                  padding: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  textAlign: 'center'
                }}>
                  Школа
                </th>
                <th style={{
                  border: '1px solid #ddd',
                  padding: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  textAlign: 'center'
                }}>
                  Дата создания
                </th>
                <th style={{
                  border: '1px solid #ddd',
                  padding: '0.75rem',
                  backgroundColor: '#e3f2fd',
                  textAlign: 'center'
                }}>
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem'
                  }}>
                    {user.email}
                  </td>
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem'
                  }}>
                    {user.fullName}
                  </td>
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      backgroundColor: user.role === 'ADMIN' ? '#ff9800' : '#4CAF50',
                      color: 'white',
                      fontSize: '0.85rem'
                    }}>
                      {user.role === 'ADMIN' ? 'Админ' : 'Учитель'}
                    </span>
                  </td>
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}>
                    {user.school || '-'}
                  </td>
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}>
                    {new Date(user.createdAt).toLocaleDateString('ru-RU')}
                  </td>
                  <td style={{
                    border: '1px solid #ddd',
                    padding: '0.75rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button
                        onClick={() => handleEdit(user)}
                        style={{
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        ✏️ Редактировать
                      </button>
                      <button
                        onClick={() => handleDelete(user.id, user.fullName)}
                        style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          border: 'none',
                          padding: '0.5rem 1rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && !loading && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#666',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              marginTop: '1rem'
            }}>
              Нет пользователей
            </div>
          )}

          {loading && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#666'
            }}>
              Загрузка...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
