import React, { useState } from 'react';
import { api } from '../services/api';

interface PaymentModalProps {
  student: {
    id: string;
    fullName: string;
    lessonsBalance?: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ student, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    amount: '',
    lessonsCount: '',
    paymentDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pricePerLesson = formData.amount && formData.lessonsCount
    ? (parseFloat(formData.amount) / parseInt(formData.lessonsCount)).toFixed(2)
    : '0';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.amount || !formData.lessonsCount || !formData.paymentDate) {
      setError('Заполните все обязательные поля');
      return;
    }

    const amount = parseFloat(formData.amount);
    const lessonsCount = parseInt(formData.lessonsCount);

    if (amount <= 0 || lessonsCount <= 0) {
      setError('Сумма и количество уроков должны быть больше 0');
      return;
    }

    try {
      setLoading(true);
      await api.createPayment({
        studentId: student.id,
        amount,
        lessonsCount,
        paymentDate: formData.paymentDate,
        notes: formData.notes || undefined
      });
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating payment:', err);
      setError('Ошибка при создании оплаты: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          💰 Добавить оплату
        </h2>

        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-sm text-slate-600">Студент:</p>
          <p className="font-semibold text-slate-800">{student.fullName}</p>
          {student.lessonsBalance !== undefined && (
            <p className="text-sm text-blue-600 mt-1">
              Текущий баланс: <span className="font-semibold">{student.lessonsBalance} уроков</span>
            </p>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Сумма оплаты (₽) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Например: 6400"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Количество уроков <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={formData.lessonsCount}
              onChange={(e) => setFormData({ ...formData, lessonsCount: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Например: 8"
              disabled={loading}
            />
          </div>

          {formData.amount && formData.lessonsCount && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-700">
                Цена за урок: <span className="font-semibold">{pricePerLesson} ₽</span>
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Дата оплаты <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.paymentDate}
              onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Примечания (необязательно)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Например: Оплата за февраль"
              disabled={loading}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Сохранение...' : 'Добавить оплату'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PaymentModal;
