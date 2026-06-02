import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Student {
  id: string;
  fullName: string;
  teacherId: string;
  teacher?: {
    id: string;
    fullName: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

interface Teacher {
  id: string;
  fullName: string;
  email: string;
}

const OrganizationStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsData, teachersData] = await Promise.all([
        api.getStudents(),
        api.getAvailableTeachers()
      ]);
      setStudents(studentsData);
      setTeachers(teachersData);
    } catch (err: any) {
      console.error('Failed to load data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleTeacherChange = async (studentId: string, newTeacherId: string) => {
    try {
      setReassigning(studentId);
      await api.reassignStudentTeacher(studentId, newTeacherId);

      // Update local state
      setStudents(prev => prev.map(s =>
        s.id === studentId
          ? { ...s, teacherId: newTeacherId, teacher: teachers.find(t => t.id === newTeacherId) }
          : s
      ));
    } catch (err: any) {
      console.error('Failed to reassign student:', err);
      alert(`Ошибка при переназначении: ${err.message}`);
    } finally {
      setReassigning(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6"
           style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
        <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
          Загрузка студентов...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6"
           style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
        <div className="flex items-center justify-center py-8 text-red-500 text-sm">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6"
         style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-green-100 text-green-600 text-xl">
          👥
        </span>
        Индивидуальные студенты
      </h3>

      {students.length === 0 ? (
        <p className="text-slate-400 text-sm italic">Нет студентов</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col gap-3">
                {/* Student Name */}
                <div>
                  <div className="font-semibold text-slate-800 text-base mb-1">
                    {student.fullName}
                  </div>
                  {student.group && (
                    <div className="text-xs text-slate-500">
                      Группа: {student.group.name}
                    </div>
                  )}
                </div>

                {/* Teacher Selector */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Преподаватель:
                  </label>
                  <select
                    value={student.teacherId}
                    onChange={(e) => handleTeacherChange(student.id, e.target.value)}
                    disabled={reassigning === student.id}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {teachers.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.fullName}
                      </option>
                    ))}
                  </select>
                  {reassigning === student.id && (
                    <div className="text-xs text-blue-600 mt-1">
                      Сохранение...
                    </div>
                  )}
                </div>

                {/* Current Teacher Info */}
                {student.teacher && (
                  <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                    Текущий: {student.teacher.fullName}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrganizationStudents;
