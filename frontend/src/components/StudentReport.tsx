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

interface StudentReportProps {
  student: Student;
  years: Year[];
  onClose: () => void;
}

const StudentReport: React.FC<StudentReportProps> = ({ student, years, onClose }) => {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const MONTHS = [
    'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'
  ];

  useEffect(() => {
    if (years.length > 0) {
      setSelectedYear(years[0].id);
    }
  }, [years]);

  const loadReport = async () => {
    if (!selectedYear || !selectedMonth) return;
    
    setLoading(true);
    try {
      const gradesData = await api.getGrades({
        studentId: student.id,
        yearId: selectedYear,
        month: selectedMonth
      });
      setGrades(gradesData);
    } catch (error) {
      console.error('Error loading student report:', error);
      alert('Ошибка при загрузке отчета');
    } finally {
      setLoading(false);
    }
  };

  const formatGrade = (grade: any) => {
    if (!grade) return 'Нет данных';
    
    return (
      <div style={{
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        margin: '0.5rem 0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, color: '#2196F3' }}>
            {grade.month} {years.find(y => y.id === grade.yearId)?.year}
          </h4>
          <div style={{
            backgroundColor: grade.grade === 'A' ? '#4CAF50' : 
                           grade.grade === 'B' ? '#8BC34A' :
                           grade.grade === 'C' ? '#FF9800' :
                           grade.grade === 'D' ? '#FF5722' : '#f44336',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}>
            Оценка: {grade.grade} ({grade.totalScore})
          </div>
        </div>

        {grade.criteriaGrades && grade.criteriaGrades.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <h5 style={{ marginBottom: '0.5rem' }}>Оценки по критериям:</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {grade.criteriaGrades.map((cg: any) => (
                <div key={cg.id} style={{
                  padding: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #ddd'
                }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {cg.criterion?.name || 'Критерий'}
                  </div>
                  <div style={{ color: '#666', fontSize: '0.8rem' }}>
                    {cg.value}/4 - {cg.value === 1 ? 'Низкий' : cg.value === 2 ? 'Средний' : cg.value === 3 ? 'Хороший' : 'Отличный'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {grade.attendance && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Посещаемость:</strong> {grade.attendance}%
          </div>
        )}

        {grade.homework && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Домашнее задание:</strong> {grade.homework}
          </div>
        )}

        {grade.comment && (
          <div style={{ marginBottom: '0.5rem' }}>
            <strong>Комментарий:</strong> {grade.comment}
          </div>
        )}

        {grade.recommendations && (
          <div>
            <strong>Рекомендации:</strong> {grade.recommendations}
          </div>
        )}
      </div>
    );
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
            Отчет по ученику: {student.fullName}
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

        <div style={{
          backgroundColor: '#e3f2fd',
          padding: '1rem',
          borderRadius: '4px',
          marginBottom: '1.5rem'
        }}>
          <div><strong>Группа:</strong> {student.group?.name || 'Не назначена'}</div>
          {student.notes && <div><strong>Заметки:</strong> {student.notes}</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Учебный год *
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
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
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
              }}
            >
              <option value="">Выберите месяц</option>
              {MONTHS.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <div style={{ alignSelf: 'flex-end' }}>
            <button
              onClick={loadReport}
              disabled={loading || !selectedYear || !selectedMonth}
              style={{
                width: '100%',
                padding: '0.75rem',
                backgroundColor: (!selectedYear || !selectedMonth) ? '#ccc' : '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: (!selectedYear || !selectedMonth) ? 'not-allowed' : 'pointer',
                opacity: (!selectedYear || !selectedMonth) ? 0.6 : 1
              }}
            >
              {loading ? 'Загрузка...' : 'Загрузить отчет'}
            </button>
          </div>
        </div>

        <div>
          {grades.length === 0 && !loading && selectedYear && selectedMonth && (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: '#666',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px'
            }}>
              Нет данных за выбранный период
            </div>
          )}

          {grades.map((grade, index) => (
            <div key={index}>
              {formatGrade(grade)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentReport;