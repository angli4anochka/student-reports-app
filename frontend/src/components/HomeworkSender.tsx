import React, { useState, useEffect } from 'react';
import {
  Send,
  Calendar,
  Clock,
  User,
  Users,
  Paperclip,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  BookOpen,
  Link,
  Save,
  FileText
} from 'lucide-react';

interface Student {
  id: string;
  fullName: string;
  telegramChatId?: string;
  parentTelegramId?: string;
  hasT elegram?: boolean;
}

interface HomeworkTemplate {
  id: string;
  name: string;
  subject?: string;
  content: string;
  materials?: string[];
  tags?: string[];
  usageCount: number;
}

interface HomeworkSenderProps {
  studentId?: string;
  lessonDate?: string;
  onSent?: () => void;
}

/**
 * Компонент для отправки домашнего задания через Telegram
 */
export const HomeworkSender: React.FC<HomeworkSenderProps> = ({
  studentId: initialStudentId,
  lessonDate = new Date().toISOString().split('T')[0],
  onSent
}) => {
  // Состояния
  const [selectedStudents, setSelectedStudents] = useState<string[]>(
    initialStudentId ? [initialStudentId] : []
  );
  const [students, setStudents] = useState<Student[]>([]);
  const [templates, setTemplates] = useState<HomeworkTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [loading, setSending] = useState(false);
  const [showBulkMode, setShowBulkMode] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [registrationInfo, setRegistrationInfo] = useState<any>(null);

  // Форма домашнего задания
  const [homework, setHomework] = useState({
    subject: 'English',
    content: '',
    lessonDate: lessonDate,
    dueDate: '',
    materials: [] as string[],
    notes: ''
  });

  // Результат отправки
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    needsRegistration?: boolean;
    studentId?: string;
  } | null>(null);

  // Загружаем список учеников
  useEffect(() => {
    fetchStudents();
    fetchTemplates();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/students', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const studentsWithTelegramStatus = data.students.map((s: any) => ({
          ...s,
          hasTelegram: !!(s.telegramChatId || s.parentTelegramId)
        }));
        setStudents(studentsWithTelegramStatus);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/homework/templates', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // Отправка домашнего задания
  const sendHomework = async () => {
    if (!homework.content.trim()) {
      alert('Введите текст домашнего задания');
      return;
    }

    if (selectedStudents.length === 0) {
      alert('Выберите хотя бы одного ученика');
      return;
    }

    setSending(true);
    setSendResult(null);

    try {
      const endpoint = selectedStudents.length === 1
        ? '/api/homework/send'
        : '/api/homework/send-group';

      const body = selectedStudents.length === 1
        ? {
            studentId: selectedStudents[0],
            homework: homework.content,
            subject: homework.subject,
            lessonDate: homework.lessonDate,
            dueDate: homework.dueDate || undefined,
            materials: homework.materials.filter(m => m.trim()),
            notes: homework.notes || undefined
          }
        : {
            studentIds: selectedStudents,
            homework: homework.content,
            subject: homework.subject,
            lessonDate: homework.lessonDate,
            dueDate: homework.dueDate || undefined,
            materials: homework.materials.filter(m => m.trim()),
            notes: homework.notes || undefined
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();

      if (response.ok) {
        setSendResult({
          success: true,
          message: result.message || 'Домашнее задание отправлено!'
        });

        // Очищаем форму после успешной отправки
        setHomework(prev => ({ ...prev, content: '', notes: '', materials: [] }));
        setSelectedStudents([]);

        if (onSent) onSent();
      } else {
        // Проверяем, нужна ли регистрация Telegram
        if (result.needsRegistration) {
          setSendResult({
            success: false,
            message: result.message,
            needsRegistration: true,
            studentId: result.studentId
          });
          // Получаем инструкции для регистрации
          fetchRegistrationInstructions(result.studentId);
        } else {
          setSendResult({
            success: false,
            message: result.error || 'Ошибка при отправке'
          });
        }
      }
    } catch (error) {
      console.error('Error sending homework:', error);
      setSendResult({
        success: false,
        message: 'Произошла ошибка при отправке'
      });
    } finally {
      setSending(false);
    }
  };

  // Получение инструкций для регистрации Telegram
  const fetchRegistrationInstructions = async (studentId: string) => {
    try {
      const response = await fetch(`/api/homework/register/${studentId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRegistrationInfo(data);
        setShowRegistration(true);
      }
    } catch (error) {
      console.error('Error fetching registration info:', error);
    }
  };

  // Применение шаблона
  const applyTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setHomework(prev => ({
        ...prev,
        content: template.content,
        subject: template.subject || prev.subject,
        materials: template.materials || []
      }));
      setShowTemplates(false);
    }
  };

  // Сохранение как шаблона
  const saveAsTemplate = async () => {
    const name = prompt('Название шаблона:');
    if (!name) return;

    try {
      const response = await fetch('/api/homework/templates', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          content: homework.content,
          subject: homework.subject,
          materials: homework.materials,
          tags: []
        })
      });

      if (response.ok) {
        alert('Шаблон сохранен!');
        fetchTemplates(); // Обновляем список шаблонов
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  // Добавление материала
  const addMaterial = () => {
    const url = prompt('Введите ссылку на материал или описание:');
    if (url) {
      setHomework(prev => ({
        ...prev,
        materials: [...prev.materials, url]
      }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Send className="w-6 h-6 text-blue-500" />
          Отправка домашнего задания в Telegram
        </h2>

        <div className="flex gap-2">
          <button
            onClick={() => setShowBulkMode(!showBulkMode)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              showBulkMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {showBulkMode ? <Users className="w-5 h-5" /> : <User className="w-5 h-5" />}
            <span className="ml-2">
              {showBulkMode ? 'Группа' : 'Один ученик'}
            </span>
          </button>

          <button
            onClick={() => setShowTemplates(!showTemplates)}
            className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <FileText className="w-5 h-5" />
            <span className="ml-2">Шаблоны</span>
          </button>
        </div>
      </div>

      {/* Результат отправки */}
      {sendResult && (
        <div className={`mb-4 p-4 rounded-lg flex items-start gap-3 ${
          sendResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {sendResult.success ? (
            <CheckCircle className="w-5 h-5 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 mt-0.5" />
          )}
          <div className="flex-1">
            <p>{sendResult.message}</p>
            {sendResult.needsRegistration && (
              <button
                onClick={() => setShowRegistration(true)}
                className="mt-2 text-blue-600 underline text-sm"
              >
                Показать инструкции для подключения Telegram
              </button>
            )}
          </div>
        </div>
      )}

      {/* Выбор учеников */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {showBulkMode ? 'Выберите учеников' : 'Выберите ученика'}
        </label>

        {showBulkMode ? (
          <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
            {students.map(student => (
              <label
                key={student.id}
                className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedStudents.includes(student.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedStudents([...selectedStudents, student.id]);
                    } else {
                      setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                    }
                  }}
                  className="mr-3"
                />
                <span className="flex-1">{student.fullName}</span>
                {student.hasTelegram ? (
                  <span className="text-green-500" title="Telegram подключен">✓</span>
                ) : (
                  <span className="text-gray-400" title="Telegram не подключен">○</span>
                )}
              </label>
            ))}
          </div>
        ) : (
          <select
            value={selectedStudents[0] || ''}
            onChange={(e) => setSelectedStudents(e.target.value ? [e.target.value] : [])}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">-- Выберите ученика --</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.fullName} {student.hasTelegram ? '✓' : '(Telegram не подключен)'}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Параметры задания */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <BookOpen className="w-4 h-4 inline mr-1" />
            Предмет
          </label>
          <select
            value={homework.subject}
            onChange={(e) => setHomework({ ...homework, subject: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            <option value="English">English</option>
            <option value="Math">Математика</option>
            <option value="Russian">Русский язык</option>
            <option value="Other">Другое</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            Дата урока
          </label>
          <input
            type="date"
            value={homework.lessonDate}
            onChange={(e) => setHomework({ ...homework, lessonDate: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="w-4 h-4 inline mr-1" />
            Сдать до (опционально)
          </label>
          <input
            type="date"
            value={homework.dueDate}
            onChange={(e) => setHomework({ ...homework, dueDate: e.target.value })}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            min={homework.lessonDate}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Paperclip className="w-4 h-4 inline mr-1" />
            Материалы
          </label>
          <button
            onClick={addMaterial}
            className="w-full p-2 border border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
          >
            + Добавить материал
          </button>
        </div>
      </div>

      {/* Список материалов */}
      {homework.materials.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Прикрепленные материалы:</div>
          {homework.materials.map((material, index) => (
            <div key={index} className="flex items-center justify-between py-1">
              <span className="text-sm flex items-center">
                <Link className="w-4 h-4 mr-2 text-blue-500" />
                {material}
              </span>
              <button
                onClick={() => {
                  setHomework(prev => ({
                    ...prev,
                    materials: prev.materials.filter((_, i) => i !== index)
                  }));
                }}
                className="text-red-500 hover:text-red-700"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Текст домашнего задания */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Домашнее задание *
        </label>
        <textarea
          value={homework.content}
          onChange={(e) => setHomework({ ...homework, content: e.target.value })}
          placeholder="Например:
1. Выучить слова на стр. 45
2. Выполнить упражнения 3.1 - 3.5
3. Написать короткое эссе о своем хобби (5-7 предложений)"
          className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Дополнительные заметки */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MessageSquare className="w-4 h-4 inline mr-1" />
          Примечания (опционально)
        </label>
        <input
          type="text"
          value={homework.notes}
          onChange={(e) => setHomework({ ...homework, notes: e.target.value })}
          placeholder="Например: Обратить внимание на произношение"
          className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Кнопки действий */}
      <div className="flex justify-between">
        <button
          onClick={saveAsTemplate}
          disabled={!homework.content.trim()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
        >
          <Save className="w-5 h-5 mr-2" />
          Сохранить как шаблон
        </button>

        <button
          onClick={sendHomework}
          disabled={loading || selectedStudents.length === 0 || !homework.content.trim()}
          className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center ${
            loading || selectedStudents.length === 0 || !homework.content.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600 shadow-lg hover:shadow-xl'
          }`}
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2" />
              Отправляется...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Отправить в Telegram
            </>
          )}
        </button>
      </div>

      {/* Модальное окно с шаблонами */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Шаблоны домашних заданий</h3>

            {templates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">У вас пока нет сохраненных шаблонов</p>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => applyTemplate(template.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{template.name}</h4>
                      <span className="text-xs text-gray-500">
                        Использовано: {template.usageCount} раз
                      </span>
                    </div>
                    {template.subject && (
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded mb-2">
                        {template.subject}
                      </span>
                    )}
                    <p className="text-sm text-gray-600 whitespace-pre-line">
                      {template.content.substring(0, 150)}...
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowTemplates(false)}
              className="mt-4 w-full py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно с инструкциями для регистрации */}
      {showRegistration && registrationInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-xl font-bold mb-4">
              Подключение Telegram для получения ДЗ
            </h3>

            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="mb-3">Отправьте эту инструкцию ученику или родителю:</p>
              <div className="bg-white p-3 rounded border-2 border-blue-200">
                <pre className="text-sm whitespace-pre-wrap">{registrationInfo.instructions}</pre>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(registrationInfo.instructions);
                  alert('Инструкции скопированы в буфер обмена');
                }}
                className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Копировать инструкции
              </button>

              <button
                onClick={() => setShowRegistration(false)}
                className="flex-1 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeworkSender;