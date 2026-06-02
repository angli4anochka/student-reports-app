import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface TelegramStatus {
  id: string;
  fullName: string;
  groupName: string | null;
  isLinked: boolean;
  telegramUsername: string | null;
}

export function TelegramSettings() {
  const [students, setStudents] = useState<TelegramStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<TelegramStatus | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await api.getTelegramStatuses();
      setStudents(data);
    } catch (error) {
      console.error('Error loading Telegram statuses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLink = async (student: TelegramStatus) => {
    try {
      const data = await api.getTelegramLink(student.id);
      setLinkUrl(data.linkUrl);
      setSelectedStudent(student);
      setShowLinkModal(true);
      setCopySuccess(false);
    } catch (error) {
      console.error('Error getting Telegram link:', error);
      alert('Ошибка при получении ссылки');
    }
  };

  const handleUnlink = async (studentId: string) => {
    if (!confirm('Вы уверены, что хотите отвязать Telegram?')) {
      return;
    }

    try {
      await api.unlinkTelegram(studentId);
      await loadStudents();
    } catch (error) {
      console.error('Error unlinking Telegram:', error);
      alert('Ошибка при отвязке Telegram');
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(linkUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };

  const headerStyle: React.CSSProperties = {
    marginBottom: '24px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '8px'
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden'
  };

  const theadStyle: React.CSSProperties = {
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb'
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  };

  const tdStyle: React.CSSProperties = {
    padding: '16px',
    borderBottom: '1px solid #f3f4f6'
  };

  const badgeStyle = (isLinked: boolean): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
    backgroundColor: isLinked ? '#dcfce7' : '#fee2e2',
    color: isLinked ? '#166534' : '#991b1b'
  });

  const buttonStyle = (variant: 'primary' | 'danger'): React.CSSProperties => ({
    padding: '6px 12px',
    fontSize: '13px',
    fontWeight: '500',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: variant === 'primary' ? '#3b82f6' : '#ef4444',
    color: 'white'
  });

  const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  };

  const modalContentStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
  };

  const modalTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px'
  };

  const linkBoxStyle: React.CSSProperties = {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '16px',
    wordBreak: 'break-all',
    fontSize: '14px',
    color: '#374151'
  };

  const buttonGroupStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Загрузка...
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>Telegram уведомления</h1>
        <p style={descriptionStyle}>
          Настройте автоматическую отправку домашних заданий ученикам через Telegram
        </p>
      </div>

      <table style={tableStyle}>
        <thead style={theadStyle}>
          <tr>
            <th style={thStyle}>Ученик</th>
            <th style={thStyle}>Группа</th>
            <th style={thStyle}>Статус</th>
            <th style={thStyle}>Telegram</th>
            <th style={thStyle}>Действия</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td style={tdStyle}>
                <div style={{ fontWeight: '500', color: '#1f2937' }}>
                  {student.fullName}
                </div>
              </td>
              <td style={tdStyle}>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  {student.groupName || '—'}
                </div>
              </td>
              <td style={tdStyle}>
                <span style={badgeStyle(student.isLinked)}>
                  {student.isLinked ? (
                    <>
                      <span>✓</span>
                      Подключен
                    </>
                  ) : (
                    <>
                      <span>○</span>
                      Не подключен
                    </>
                  )}
                </span>
              </td>
              <td style={tdStyle}>
                <div style={{ color: '#6b7280', fontSize: '14px' }}>
                  {student.telegramUsername ? `@${student.telegramUsername}` : '—'}
                </div>
              </td>
              <td style={tdStyle}>
                {student.isLinked ? (
                  <button
                    onClick={() => handleUnlink(student.id)}
                    style={buttonStyle('danger')}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dc2626')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ef4444')}
                  >
                    Отвязать
                  </button>
                ) : (
                  <button
                    onClick={() => handleGetLink(student)}
                    style={buttonStyle('primary')}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
                  >
                    Получить ссылку
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {students.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
          Нет учеников для отображения
        </div>
      )}

      {showLinkModal && selectedStudent && (
        <div style={modalOverlayStyle} onClick={() => setShowLinkModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={modalTitleStyle}>
              Ссылка для подключения: {selectedStudent.fullName}
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              Отправьте эту ссылку ученику. После перехода по ссылке и нажатия кнопки "Start" в боте,
              ученик будет автоматически получать домашние задания.
            </p>
            <div style={linkBoxStyle}>
              {linkUrl}
            </div>
            <div style={buttonGroupStyle}>
              <button
                onClick={copyToClipboard}
                style={{
                  ...buttonStyle('primary'),
                  backgroundColor: copySuccess ? '#10b981' : '#3b82f6'
                }}
              >
                {copySuccess ? '✓ Скопировано' : 'Копировать'}
              </button>
              <button
                onClick={() => setShowLinkModal(false)}
                style={{
                  padding: '6px 12px',
                  fontSize: '13px',
                  fontWeight: '500',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  backgroundColor: 'white',
                  color: '#374151'
                }}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
