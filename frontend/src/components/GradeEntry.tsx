import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Group {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
}

interface Student {
  id: string;
  fullName: string;
  groupId?: string;
  group?: Group;
  notes?: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

interface Year {
  id: string;
  year: string;
  months: string;
  createdBy: string;
}

interface Criterion {
  id: string;
  name: string;
  weight: number;
  scale: string;
  order: number;
}

interface GradeInput {
  criterionId: string;
  value: number;
}

interface GradeFormData {
  studentId: string;
  yearId: string;
  month: string;
  criteria: GradeInput[];
  attendance?: number;
  homework?: string;
  comment?: string;
  recommendations?: string;
}

interface GradeEntryProps {
  student: Student;
  years: Year[];
  onClose: () => void;
}

const GradeEntry: React.FC<GradeEntryProps> = ({ student, years, onClose }) => {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [grades, setGrades] = useState<{ [criterionId: string]: number }>({});
  const [attendance, setAttendance] = useState<number | ''>('');
  const [homework, setHomework] = useState('');
  const [comment, setComment] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalScore, setTotalScore] = useState(0);
  const [letterGrade, setLetterGrade] = useState('');

  useEffect(() => {
    loadCriteria();
    if (years.length > 0) {
      setSelectedYear(years[0]);
    }
  }, [years]);

  useEffect(() => {
    calculateTotal();
  }, [grades, criteria]);

  const loadCriteria = async () => {
    try {
      const criteriaData = await api.getCriteria();
      setCriteria(criteriaData);
      
      // Initialize grades with 0
      const initialGrades: { [criterionId: string]: number } = {};
      criteriaData.forEach((criterion: Criterion) => {
        initialGrades[criterion.id] = 0;
      });
      setGrades(initialGrades);
    } catch (error) {
      console.error('Error loading criteria:', error);
    }
  };

  const calculateTotal = () => {
    if (criteria.length === 0) return;

    let weightedSum = 0;
    let totalWeight = 0;

    criteria.forEach((criterion) => {
      const grade = grades[criterion.id] || 0;
      weightedSum += grade * criterion.weight;
      totalWeight += criterion.weight;
    });

    const total = totalWeight > 0 ? weightedSum / totalWeight : 0;
    setTotalScore(Math.round(total * 100) / 100);

    // Calculate letter grade
    if (total >= 4.5) setLetterGrade('A');
    else if (total >= 3.8) setLetterGrade('B');
    else if (total >= 3.0) setLetterGrade('C');
    else if (total >= 2.2) setLetterGrade('D');
    else if (total >= 1.5) setLetterGrade('E');
    else setLetterGrade('F');
  };

  const handleGradeChange = (criterionId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setGrades({ ...grades, [criterionId]: numValue });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedYear || !selectedMonth) {
      setError('Выберите учебный год и месяц');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData: GradeFormData = {
        studentId: student.id,
        yearId: selectedYear.id,
        month: selectedMonth,
        criteria: Object.entries(grades).map(([criterionId, value]) => ({
          criterionId,
          value,
        })),
        attendance: attendance === '' ? undefined : Number(attendance),
        homework: homework || undefined,
        comment: comment || undefined,
        recommendations: recommendations || undefined,
      };

      await api.saveGrade(formData);
      alert('Оценки успешно сохранены!');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении оценок');
    } finally {
      setLoading(false);
    }
  };

  const getMonths = (): string[] => {
    if (!selectedYear) return [];
    try {
      return JSON.parse(selectedYear.months);
    } catch {
      return [];
    }
  };

  return (
    <div style={{
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
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0 }}>
            Оценки для {student.fullName}
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

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Учебный год *
              </label>
              <select
                value={selectedYear?.id || ''}
                onChange={(e) => {
                  const year = years.find(y => y.id === e.target.value);
                  setSelectedYear(year || null);
                  setSelectedMonth('');
                }}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="">Выберите год</option>
                {years.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Месяц *
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
              >
                <option value="">Выберите месяц</option>
                {getMonths().map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <h4>Критерии оценки</h4>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {criteria.map((criterion) => (
                <div key={criterion.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                }}>
                  <div>
                    <strong>{criterion.name}</strong>
                    <div style={{ fontSize: '0.875rem', color: '#666' }}>
                      Вес: {criterion.weight} | Шкала: {criterion.scale}
                    </div>
                  </div>
                  
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={grades[criterion.id] || 0}
                    onChange={(e) => handleGradeChange(criterion.id, e.target.value)}
                    style={{
                      padding: '0.5rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                    }}
                  />
                  
                  <div style={{ textAlign: 'center', color: '#666' }}>
                    {((grades[criterion.id] || 0) * criterion.weight).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1.5rem',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
              Итоговая оценка: {totalScore} ({letterGrade})
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Посещаемость (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value === '' ? '' : Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                placeholder="92"
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Домашнее задание
              </label>
              <input
                type="text"
                value={homework}
                onChange={(e) => setHomework(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                }}
                placeholder="выполнено 80%"
              />
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Общий комментарий
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
              }}
              placeholder="Общее впечатление о прогрессе ученика..."
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Рекомендации
            </label>
            <textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                resize: 'vertical',
              }}
              placeholder="Рекомендации для улучшения обучения..."
            />
          </div>

          {error && (
            <div style={{
              color: '#d32f2f',
              marginBottom: '1rem',
              padding: '0.5rem',
              backgroundColor: '#ffebee',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '4px',
                backgroundColor: '#4CAF50',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить оценки'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GradeEntry;