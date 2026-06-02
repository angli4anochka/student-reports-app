import React, { useState, useRef } from 'react';

interface ImageUploadModalProps {
  onSendImage: (file: File) => void;
  onSkip: () => void;
  uploading: boolean;
}

export function ImageUploadModal({ onSendImage, onSkip, uploading }: ImageUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверка типа файла
      if (!file.type.startsWith('image/')) {
        alert('Пожалуйста, выберите изображение');
        return;
      }

      // Проверка размера (макс 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Размер файла не должен превышать 10MB');
        return;
      }

      setSelectedFile(file);

      // Создаем preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if (selectedFile) {
      onSendImage(selectedFile);
    }
  };

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1001,
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '500px',
    width: '90%',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: '16px',
  };

  const buttonStyle = (variant: 'primary' | 'secondary' | 'skip'): React.CSSProperties => ({
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '6px',
    border: variant === 'secondary' ? '1px solid #ddd' : 'none',
    cursor: uploading ? 'not-allowed' : 'pointer',
    opacity: uploading ? 0.6 : 1,
    backgroundColor:
      variant === 'primary' ? '#0088cc' :
      variant === 'skip' ? '#ef4444' :
      'white',
    color: variant === 'secondary' ? '#666' : 'white',
  });

  const uploadAreaStyle: React.CSSProperties = {
    border: '2px dashed #cbd5e1',
    borderRadius: '8px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    marginBottom: '16px',
  };

  const previewStyle: React.CSSProperties = {
    maxWidth: '100%',
    maxHeight: '300px',
    borderRadius: '8px',
    marginBottom: '16px',
  };

  return (
    <div style={overlayStyle} onClick={onSkip}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={titleStyle}>📸 Добавить картинку к ДЗ?</h2>

        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
          Вы можете прикрепить изображение к домашнему заданию. Оно будет отправлено в Telegram.
        </p>

        {!previewUrl ? (
          <div
            style={uploadAreaStyle}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📁</div>
            <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
              Нажмите для выбора файла
            </p>
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
              PNG, JPG, GIF (макс. 10MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
          </div>
        ) : (
          <div>
            <img src={previewUrl} alt="Preview" style={previewStyle} />
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              {selectedFile?.name}
            </p>
            <button
              onClick={() => {
                setSelectedFile(null);
                setPreviewUrl(null);
              }}
              style={{
                ...buttonStyle('secondary'),
                width: '100%',
                marginBottom: '16px',
              }}
            >
              Выбрать другой файл
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between' }}>
          <button
            onClick={onSkip}
            disabled={uploading}
            style={buttonStyle('skip')}
          >
            Пропустить
          </button>

          {selectedFile && (
            <button
              onClick={handleSend}
              disabled={uploading}
              style={buttonStyle('primary')}
            >
              {uploading ? 'Отправка...' : 'Отправить картинку'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
