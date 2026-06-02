import React, { useState, useEffect } from 'react';
import {
  User,
  UserX,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Search,
  Filter,
  Download
} from 'lucide-react';

interface Student {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  isDeleted: boolean;
  deletedAt?: string;
  personalScheduleSlots?: any[];
  payments?: any[];
}

/**
 * Component for managing students with soft delete functionality
 */
export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleted, setShowDeleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');
  const [statistics, setStatistics] = useState({
    active: 0,
    deleted: 0,
    orphanedSlots: 0
  });

  // Fetch students
  const fetchStudents = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/students?includeDeleted=${showDeleted}&search=${searchTerm}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStudents(data.students);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStatistics = async () => {
    try {
      const response = await fetch('/api/students/statistics/overview', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchStatistics();
  }, [showDeleted, searchTerm]);

  // Soft delete student
  const handleSoftDelete = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        // Show success message
        const result = await response.json();
        alert(`Ученик успешно удален. Деактивировано слотов: ${result.data?.affectedSlots || 0}`);

        // Refresh data
        fetchStudents();
        fetchStatistics();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
      alert('Произошла ошибка при удалении ученика');
    }
  };

  // Hard delete student (permanent)
  const handleHardDelete = async (studentId: string) => {
    const confirmText = prompt(
      'ВНИМАНИЕ! Это действие необратимо!\n' +
      'Все данные ученика будут удалены навсегда.\n' +
      'Введите DELETE для подтверждения:'
    );

    if (confirmText !== 'DELETE') {
      alert('Удаление отменено');
      return;
    }

    try {
      const response = await fetch(`/api/students/${studentId}/hard-delete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          confirmation: 'DELETE',
          keepHistory: true // Archive before deletion
        })
      });

      if (response.ok) {
        const result = await response.json();
        alert(
          `Ученик удален навсегда.\n` +
          `Удалено слотов: ${result.affectedRecords.slots}\n` +
          `Удалено платежей: ${result.affectedRecords.payments}\n` +
          `Данные ${result.archived ? 'архивированы' : 'не архивированы'}`
        );

        fetchStudents();
        fetchStatistics();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error hard deleting student:', error);
      alert('Произошла ошибка при удалении ученика');
    }
  };

  // Restore deleted student
  const handleRestore = async (studentId: string) => {
    try {
      const response = await fetch(`/api/students/${studentId}/restore`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        alert('Ученик успешно восстановлен');
        fetchStudents();
        fetchStatistics();
      } else {
        const error = await response.json();
        alert(`Ошибка: ${error.message}`);
      }
    } catch (error) {
      console.error('Error restoring student:', error);
      alert('Произошла ошибка при восстановлении ученика');
    }
  };

  // Fix orphaned slots
  const handleFixOrphanedSlots = async () => {
    if (!confirm('Деактивировать все слоты без учеников?')) {
      return;
    }

    try {
      const response = await fetch('/api/students/fix-orphaned-slots', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Исправлено слотов: ${result.data?.length || 0}`);
        fetchStatistics();
      }
    } catch (error) {
      console.error('Error fixing orphaned slots:', error);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header with Statistics */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <h1 className="text-2xl font-bold mb-4">Управление учениками</h1>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <div className="bg-green-50 p-3 rounded">
            <div className="text-green-600 font-semibold">Активные</div>
            <div className="text-2xl font-bold">{statistics.active}</div>
          </div>

          <div className="bg-red-50 p-3 rounded">
            <div className="text-red-600 font-semibold">Удаленные</div>
            <div className="text-2xl font-bold">{statistics.deleted}</div>
          </div>

          <div className="bg-yellow-50 p-3 rounded">
            <div className="text-yellow-600 font-semibold">Потерянные слоты</div>
            <div className="text-2xl font-bold">{statistics.orphanedSlots}</div>
          </div>

          <div className="bg-blue-50 p-3 rounded">
            <div className="text-blue-600 font-semibold">Всего</div>
            <div className="text-2xl font-bold">{statistics.active + statistics.deleted}</div>
          </div>
        </div>

        {/* Fix Orphaned Slots Button */}
        {statistics.orphanedSlots > 0 && (
          <div className="bg-yellow-100 border border-yellow-400 rounded p-3 flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
              <span>Обнаружено {statistics.orphanedSlots} слотов без учеников</span>
            </div>
            <button
              onClick={handleFixOrphanedSlots}
              className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            >
              Исправить
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mb-4 flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Поиск учеников..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            checked={showDeleted}
            onChange={(e) => setShowDeleted(e.target.checked)}
            className="rounded"
          />
          <span>Показать удаленных</span>
        </label>

        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
          <Download className="w-5 h-5 inline mr-2" />
          Экспорт
        </button>
      </div>

      {/* Students List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Ученики не найдены</div>
        ) : (
          <div className="divide-y">
            {students.map((student) => (
              <div
                key={student.id}
                className={`p-4 hover:bg-gray-50 ${
                  student.isDeleted ? 'bg-red-50 opacity-75' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <User className={`w-5 h-5 ${student.isDeleted ? 'text-red-400' : 'text-gray-400'}`} />
                      <span className={`font-medium ${student.isDeleted ? 'line-through text-gray-500' : ''}`}>
                        {student.fullName}
                      </span>
                      {student.isDeleted && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          Удален {student.deletedAt && new Date(student.deletedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-gray-500">
                      {student.email && <span className="mr-4">📧 {student.email}</span>}
                      {student.phone && <span className="mr-4">📞 {student.phone}</span>}
                      {student.personalScheduleSlots && (
                        <span className="mr-4">
                          📅 Слотов: {student.personalScheduleSlots.length}
                        </span>
                      )}
                      {student.payments && (
                        <span>💰 Платежей: {student.payments.length}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {student.isDeleted ? (
                      <>
                        <button
                          onClick={() => handleRestore(student.id)}
                          className="p-2 text-green-600 hover:bg-green-100 rounded"
                          title="Восстановить"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setDeleteType('hard');
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-100 rounded"
                          title="Удалить навсегда"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setSelectedStudent(student);
                            setDeleteType('soft');
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-orange-600 hover:bg-orange-100 rounded"
                          title="Удалить"
                        >
                          <UserX className="w-5 h-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">
              {deleteType === 'soft' ? 'Удалить ученика' : 'УДАЛИТЬ НАВСЕГДА'}
            </h2>

            <div className={`p-3 rounded mb-4 ${
              deleteType === 'soft' ? 'bg-orange-100' : 'bg-red-100'
            }`}>
              <p className="font-medium mb-2">
                {selectedStudent.fullName}
              </p>

              {deleteType === 'soft' ? (
                <ul className="text-sm space-y-1">
                  <li>✓ Данные будут сохранены</li>
                  <li>✓ Слоты будут деактивированы</li>
                  <li>✓ Можно будет восстановить</li>
                </ul>
              ) : (
                <ul className="text-sm space-y-1 text-red-700">
                  <li>⚠️ Все данные будут удалены навсегда</li>
                  <li>⚠️ Восстановление будет невозможно</li>
                  <li>⚠️ Слоты: {selectedStudent.personalScheduleSlots?.length || 0}</li>
                  <li>⚠️ Платежи: {selectedStudent.payments?.length || 0}</li>
                </ul>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedStudent(null);
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Отмена
              </button>

              <button
                onClick={() => {
                  if (deleteType === 'soft') {
                    handleSoftDelete(selectedStudent.id);
                  } else {
                    handleHardDelete(selectedStudent.id);
                  }
                  setShowDeleteConfirm(false);
                  setSelectedStudent(null);
                }}
                className={`flex-1 px-4 py-2 text-white rounded ${
                  deleteType === 'soft'
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {deleteType === 'soft' ? 'Удалить' : 'УДАЛИТЬ НАВСЕГДА'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;