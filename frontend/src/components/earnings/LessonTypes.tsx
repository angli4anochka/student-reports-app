import React from 'react';
import { LessonType, TypeFormData } from '../../types/earnings';

interface LessonTypesProps {
  lessonTypes: LessonType[];
  showAddType: boolean;
  editingType: LessonType | null;
  typeForm: TypeFormData;
  onShowAddType: (show: boolean) => void;
  onSetEditingType: (type: LessonType | null) => void;
  onSetTypeForm: (form: TypeFormData) => void;
  onCreateType: (data: TypeFormData) => void;
  onUpdateType: (id: string, data: TypeFormData) => void;
  onDeleteType: (id: string) => void;
}

export const LessonTypes: React.FC<LessonTypesProps> = ({
  lessonTypes,
  showAddType,
  editingType,
  typeForm,
  onShowAddType,
  onSetEditingType,
  onSetTypeForm,
  onCreateType,
  onUpdateType,
  onDeleteType,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType) {
      onUpdateType(editingType.id, typeForm);
    } else {
      onCreateType(typeForm);
    }
  };

  const handleEdit = (type: LessonType) => {
    onSetEditingType(type);
    onSetTypeForm({
      name: type.name,
      color: type.color,
      pricePerHour: type.pricePerHour,
    });
    onShowAddType(true);
  };

  const handleCancel = () => {
    onShowAddType(false);
    onSetEditingType(null);
    onSetTypeForm({ name: '', color: '#4CAF50', pricePerHour: 0 });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Типы уроков</h3>
        {!showAddType && (
          <button
            onClick={() => onShowAddType(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            + Добавить тип
          </button>
        )}
      </div>

      {showAddType && (
        <form onSubmit={handleSubmit} className="mb-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-3">
            {editingType ? 'Редактировать тип урока' : 'Добавить тип урока'}
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Название
              </label>
              <input
                type="text"
                value={typeForm.name}
                onChange={(e) => onSetTypeForm({ ...typeForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цвет
                </label>
                <input
                  type="color"
                  value={typeForm.color}
                  onChange={(e) => onSetTypeForm({ ...typeForm, color: e.target.value })}
                  className="w-full h-10 border rounded-lg cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цена за час
                </label>
                <input
                  type="number"
                  value={typeForm.pricePerHour}
                  onChange={(e) =>
                    onSetTypeForm({ ...typeForm, pricePerHour: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                {editingType ? 'Обновить' : 'Сохранить'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Отмена
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-2">
        {lessonTypes.map((type) => (
          <div
            key={type.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: type.color }}
              />
              <span className="font-medium">{type.name}</span>
              <span className="text-gray-600">{type.pricePerHour} ₽/час</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(type)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Редактировать"
              >
                ✏️
              </button>
              <button
                onClick={() => onDeleteType(type.id)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Удалить"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};