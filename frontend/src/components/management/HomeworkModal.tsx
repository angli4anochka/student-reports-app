import React from 'react';
import { HomeworkModalProps } from '../../types/management';
import { formatTime } from '../../utils/dateUtils';

export const HomeworkModal: React.FC<HomeworkModalProps> = ({
  isOpen,
  slot,
  selectedDate,
  homeworkData,
  sendingToTelegram,
  onClose,
  onDataChange,
  onSave,
  onSendToTelegram,
}) => {
  if (!isOpen || !slot) return null;

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
          padding: '2rem',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>
            Домашнее задание
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

        <div style={{ marginBottom: '0.75rem', color: '#666', fontSize: '0.875rem' }}>
          {slot.student?.fullName || slot.studentName || slot.group?.name} • {formatTime(slot.time || '')} • {new Date(selectedDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
            Тема урока
          </label>
          <input
            type="text"
            value={homeworkData.topic}
            onChange={(e) => onDataChange({ ...homeworkData, topic: e.target.value })}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.875rem',
            }}
            placeholder="Например: Повторение времен"
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
            Домашнее задание
          </label>
          <textarea
            value={homeworkData.homework}
            onChange={(e) => onDataChange({ ...homeworkData, homework: e.target.value })}
            rows={4}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
            placeholder="Опишите домашнее задание..."
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', fontSize: '0.875rem' }}>
            Комментарий
          </label>
          <textarea
            value={homeworkData.comment}
            onChange={(e) => onDataChange({ ...homeworkData, comment: e.target.value })}
            rows={3}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              fontSize: '0.875rem',
              resize: 'vertical',
            }}
            placeholder="Дополнительные заметки..."
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={onSendToTelegram}
            disabled={sendingToTelegram}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: '#0088cc',
              color: 'white',
              cursor: sendingToTelegram ? 'not-allowed' : 'pointer',
              fontSize: '0.875rem',
              fontWeight: '600',
              opacity: sendingToTelegram ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
            title="Отправить в Telegram"
          >
            <span style={{ fontSize: '1.2rem' }}>📱</span>
            {sendingToTelegram ? 'Отправка...' : 'Telegram'}
          </button>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                backgroundColor: 'white',
                color: '#666',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}
            >
              Отмена
            </button>
            <button
              onClick={onSave}
              style={{
                padding: '0.5rem 1.5rem',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: '#3b82f6',
                color: 'white',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: '600',
              }}
            >
              Отправить ДЗ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};