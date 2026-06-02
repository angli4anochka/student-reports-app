import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import AddStudentModal from './AddStudentModal';
import AddGroupModal from './AddGroupModal';
import ManageCollaborators from './ManageCollaborators';
import ManageStudentCollaborators from './ManageStudentCollaborators';
import StudentForm from './StudentForm';
import PaymentModal from './PaymentModal';

interface Student {
  id: string;
  fullName: string;
  groupId?: string;
  group?: Group;
  notes?: string;
  isOwner?: boolean;
  isShared?: boolean;
  lessonsBalance?: number;
  teacherId?: string;
  teacher?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface Group {
  id: string;
  name: string;
  description?: string;
  teacherId: string;
  isOwner?: boolean;
  isShared?: boolean;
}

interface Teacher {
  id: string;
  fullName: string;
  email: string;
}

const GradesTable: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showManageCollaborators, setShowManageCollaborators] = useState(false);
  const [collaboratorGroupId, setCollaboratorGroupId] = useState<string>('');
  const [showManageStudentCollaborators, setShowManageStudentCollaborators] = useState(false);
  const [collaboratorStudent, setCollaboratorStudent] = useState<Student | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');
  const [editingSchedule, setEditingSchedule] = useState('');
  const [selectedGroupForStudent, setSelectedGroupForStudent] = useState<string>('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [openGroupModal, setOpenGroupModal] = useState<string | null>(null);
  const [paymentStudent, setPaymentStudent] = useState<Student | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const requests = [
        api.getGroups(),
        api.getStudents({})
      ];

      // Load teachers for admins
      if (user?.role === 'ADMIN' || user?.role === 'ORG_ADMIN') {
        requests.push(api.getAvailableTeachers());
      }

      const results = await Promise.all(requests);
      setGroups(results[0]);
      setStudents(results[1]);

      if (results[2]) {
        setTeachers(results[2]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteGroup = async (group: Group) => {
    if (!confirm(`Удалить группу "${group.name}"? Это действие нельзя отменить.`)) return;
    try {
      await api.deleteGroup(group.id);
      setGroups(prev => prev.filter(g => g.id !== group.id));
      setStudents(prev => prev.map(s => s.groupId === group.id ? { ...s, groupId: undefined, group: undefined } : s));
    } catch (error) {
      console.error('Error deleting group:', error);
      alert('Ошибка при удалении группы');
    }
  };

  const saveGroup = async (group: Group) => {
    if (!editingGroupName.trim()) return;
    try {
      await api.updateGroup(group.id, { name: editingGroupName.trim(), description: editingSchedule.trim() });
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: editingGroupName.trim(), description: editingSchedule.trim() } : g));
      setEditingGroupId(null);
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Ошибка при обновлении группы');
    }
  };

  const handleStudentUpdated = (updated: Student) => {
    setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    setEditingStudent(null);
  };

  const handleStudentDeleted = async (deleted: Student) => {
    setStudents(prev => prev.filter(s => s.id !== deleted.id));
    setEditingStudent(null);
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

  // Group students by group
  const groupedStudents: { [groupId: string]: Student[] } = {};
  const ungroupedStudents: Student[] = [];

  students.forEach(student => {
    if (student.groupId) {
      if (!groupedStudents[student.groupId]) groupedStudents[student.groupId] = [];
      groupedStudents[student.groupId].push(student);
    } else {
      ungroupedStudents.push(student);
    }
  });

  // Sort groups alphabetically
  const sortedGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name));

  const getInitials = (name: string): string => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0][0]?.toUpperCase() || '?';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-slate-500 text-base">Загрузка...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Action bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => { setSelectedGroupForStudent(''); setShowAddStudent(true); }}
          className="px-4 py-2 rounded-xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm text-sm font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors duration-150"
        >
          + Добавить ученика
        </button>
        <button
          onClick={() => setShowAddGroup(true)}
          className="px-4 py-2 rounded-xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-sm text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors duration-150"
        >
          + Создать группу
        </button>
      </div>

      {/* Group cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {sortedGroups.map(group => {
          const members = groupedStudents[group.id] || [];

          return (
            <button
              key={group.id}
              onClick={() => setOpenGroupModal(group.id)}
              className="w-full text-left bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-sm hover:shadow-md transition-all duration-150 p-4"
            >
              {/* Group name */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="text-slate-800 font-semibold text-sm truncate flex-1">
                  {group.name}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${
                  group.isShared
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-slate-100 text-slate-600'
                }`}>
                  {group.isShared ? '👥 Совместная' : '🔒 Личная'}
                </span>
              </div>

              {/* Students count */}
              <div className="text-sm text-slate-500">
                {members.length === 0 ? 'Нет учеников' : `${members.length} ${members.length === 1 ? 'ученик' : members.length < 5 ? 'ученика' : 'учеников'}`}
              </div>

              {/* Mini avatars preview (max 3) */}
              {members.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {members.slice(0, 3).map(student => (
                    <div
                      key={student.id}
                      className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0"
                      title={student.fullName}
                    >
                      <span className="text-white text-xs font-semibold" style={{ fontSize: '9px' }}>{getInitials(student.fullName)}</span>
                    </div>
                  ))}
                  {members.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-slate-600 text-xs font-semibold" style={{ fontSize: '9px' }}>+{members.length - 3}</span>
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}

        {/* Ungrouped students — each as its own card */}
        {ungroupedStudents.map(student => (
          <div
            key={student.id}
            className="w-full bg-white/70 backdrop-blur-xl border border-dashed border-slate-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-150 p-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <button
                onClick={() => setEditingStudent(student)}
                className="text-left flex-1 min-w-0"
              >
                <div className="text-slate-800 font-semibold text-sm truncate flex items-center gap-1">
                  {student.isShared && <span className="text-xs">👥</span>}
                  {student.isOwner && <span className="text-xs">🔒</span>}
                  <span className="truncate">{student.fullName}</span>
                </div>
                {user?.role === 'ADMIN' && student.lessonsBalance !== undefined && student.lessonsBalance !== null && (
                  <div className={`text-xs mt-1 ${student.lessonsBalance < 2 ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                    {student.lessonsBalance < 2 && '⚠️ '}
                    Баланс: {student.lessonsBalance} {student.lessonsBalance === 1 ? 'урок' : student.lessonsBalance < 5 ? 'урока' : 'уроков'}
                  </div>
                )}
              </button>
              <div className="flex items-center gap-2 flex-shrink-0">
                {user?.role === 'ADMIN' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPaymentStudent(student);
                    }}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                    title="Добавить оплату"
                  >
                    💰
                  </button>
                )}
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600">
                  👤 Индивидуально
                </span>
              </div>
            </div>

            {/* Teacher Selector for ADMIN/ORG_ADMIN */}
            {(user?.role === 'ADMIN' || user?.role === 'ORG_ADMIN') && teachers.length > 0 && student.teacherId && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Преподаватель:
                </label>
                <select
                  value={student.teacherId}
                  onChange={(e) => handleTeacherChange(student.id, e.target.value)}
                  disabled={reassigning === student.id}
                  className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={(e) => e.stopPropagation()}
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
            )}

            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-semibold" style={{ fontSize: '9px' }}>{getInitials(student.fullName)}</span>
              </div>
              <span className="text-xs text-slate-400">Индивидуальный ученик</span>
            </div>
          </div>
        ))}

        {/* Empty state: no groups at all */}
        {sortedGroups.length === 0 && ungroupedStudents.length === 0 && (
          <div className="col-span-full text-center py-12">
            <p className="text-slate-400 text-sm mb-3">Пока нет групп и учеников</p>
            <button
              onClick={() => setShowAddGroup(true)}
              className="text-sm font-semibold text-blue-500 hover:text-blue-700"
            >
              Создать первую группу
            </button>
          </div>
        )}
      </div>

      {/* Modals */}

      {/* Group Modal — Students List */}
      {openGroupModal && (() => {
        const group = groups.find(g => g.id === openGroupModal);
        if (!group) return null;
        const members = groupedStudents[group.id] || [];

        return (
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpenGroupModal(null)}
          >
            <div
              className="w-full max-w-lg bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-200/60 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{group.name}</div>
                  <div className="text-sm text-slate-500">Ученики</div>
                  {group.description && (
                    <div className="text-xs text-slate-400 mt-1">{group.description}</div>
                  )}
                </div>
                <button
                  onClick={() => setOpenGroupModal(null)}
                  className="h-9 w-9 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* Students list */}
              <div className="px-6 py-5 max-h-96 overflow-y-auto">
                {members.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-3">В этой группе пока нет учеников</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map(student => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        <div
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => {
                            setOpenGroupModal(null);
                            setEditingStudent(student);
                          }}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-semibold">{getInitials(student.fullName)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-700 truncate flex items-center gap-1">
                              {student.isShared && <span className="text-xs">👥</span>}
                              {student.isOwner && <span className="text-xs">🔒</span>}
                              <span className="truncate">{student.fullName}</span>
                            </div>
                            {user?.role === 'ADMIN' && student.lessonsBalance !== undefined && student.lessonsBalance !== null && (
                              <div className={`text-xs mt-0.5 ${student.lessonsBalance < 2 ? 'text-red-500 font-semibold' : 'text-slate-500'}`}>
                                {student.lessonsBalance < 2 && '⚠️ '}
                                Баланс: {student.lessonsBalance} {student.lessonsBalance === 1 ? 'урок' : student.lessonsBalance < 5 ? 'урока' : 'уроков'}
                              </div>
                            )}
                          </div>
                        </div>
                        {user?.role === 'ADMIN' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentStudent(student);
                              setOpenGroupModal(null);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors flex-shrink-0"
                            title="Добавить оплату"
                          >
                            💰
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Student Button */}
                <button
                  onClick={() => {
                    setSelectedGroupForStudent(group.id);
                    setOpenGroupModal(null);
                    setShowAddStudent(true);
                  }}
                  className="w-full mt-4 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-md hover:bg-emerald-600 transition-colors"
                >
                  + Добавить ученика
                </button>
              </div>

              {/* Footer actions (edit/delete/share) */}
              <div className="px-6 py-3 border-t border-slate-200/60 flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingGroupId(group.id);
                    setEditingGroupName(group.name);
                    setEditingSchedule(group.description || '');
                    setOpenGroupModal(null);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  ✏️ Редактировать
                </button>
                {group.isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCollaboratorGroupId(group.id);
                      setOpenGroupModal(null);
                      setShowManageCollaborators(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 transition-colors"
                  >
                    👥 Поделиться
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenGroupModal(null);
                    deleteGroup(group);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors ml-auto"
                >
                  🗑️ Удалить
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Group Edit Modal */}
      {editingGroupId && (() => {
        const group = groups.find(g => g.id === editingGroupId);
        if (!group) return null;

        return (
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setEditingGroupId(null)}
          >
            <div
              className="w-full max-w-md bg-white/80 backdrop-blur-xl border border-white/60 rounded-3xl shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-200/60">
                <div className="font-semibold text-slate-800">Редактировать группу</div>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Название группы</label>
                  <input
                    type="text"
                    value={editingGroupName}
                    onChange={(e) => setEditingGroupName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveGroup(group);
                      if (e.key === 'Escape') setEditingGroupId(null);
                    }}
                    autoFocus
                    placeholder="Название группы"
                    className="w-full text-sm text-slate-800 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Расписание (опционально)</label>
                  <input
                    type="text"
                    value={editingSchedule}
                    onChange={(e) => setEditingSchedule(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveGroup(group);
                      if (e.key === 'Escape') setEditingGroupId(null);
                    }}
                    placeholder="пн, ср 16:00"
                    className="w-full text-sm text-slate-600 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
                  />
                </div>
              </div>
              <div className="px-6 py-3 border-t border-slate-200/60 flex items-center gap-2 justify-end">
                <button
                  onClick={() => setEditingGroupId(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => saveGroup(group)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <AddStudentModal
        isOpen={showAddStudent}
        onClose={() => setShowAddStudent(false)}
        onStudentAdded={loadData}
        groups={groups}
        selectedGroupId={selectedGroupForStudent}
      />

      <AddGroupModal
        isOpen={showAddGroup}
        onClose={() => setShowAddGroup(false)}
        onGroupAdded={loadData}
      />

      {/* Edit Group Modal */}
      {editingGroupId && (() => {
        const group = groups.find(g => g.id === editingGroupId);
        if (!group) return null;
        return (
          <AddGroupModal
            isOpen={true}
            onClose={() => setEditingGroupId(null)}
            onGroupAdded={loadData}
            group={group}
          />
        );
      })()}

      {editingStudent && (
        <StudentForm
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onStudentCreated={() => {}}
          onStudentUpdated={handleStudentUpdated}
          onStudentDeleted={handleStudentDeleted}
          onShare={(student) => {
            setCollaboratorStudent(student);
            setEditingStudent(null);
            setShowManageStudentCollaborators(true);
          }}
        />
      )}

      {showManageCollaborators && collaboratorGroupId && (
        <ManageCollaborators
          groupId={collaboratorGroupId}
          groupName={groups.find(g => g.id === collaboratorGroupId)?.name || ''}
          onClose={() => setShowManageCollaborators(false)}
        />
      )}

      {showManageStudentCollaborators && collaboratorStudent && (
        <ManageStudentCollaborators
          studentId={collaboratorStudent.id}
          studentName={collaboratorStudent.fullName}
          onClose={() => {
            setShowManageStudentCollaborators(false);
            setCollaboratorStudent(null);
            loadData(); // Reload to update shared status
          }}
          onSuccess={() => loadData()} // Reload immediately when collaborator added/removed
        />
      )}

      {paymentStudent && (
        <PaymentModal
          student={paymentStudent}
          onClose={() => setPaymentStudent(null)}
          onSuccess={() => {
            loadData(); // Reload to update student balances
          }}
        />
      )}
    </div>
  );
};

export default GradesTable;
