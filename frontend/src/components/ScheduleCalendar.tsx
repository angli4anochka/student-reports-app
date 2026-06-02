import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface Group {
  id: string;
  name: string;
  description?: string;
  isOwner?: boolean;
  isShared?: boolean;
}

interface Student {
  id: string;
  fullName: string;
  groupId?: string;
}

interface Lesson {
  id: string;
  date: string;
  groupId?: string;
  studentId?: string;
  topic: string;
}

interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  time: string;
  groupId?: string;
  studentId?: string;
}

interface Attendance {
  [studentId: string]: {
    [date: string]: 'present' | 'absent' | 'late' | '';
  };
}

const ScheduleCalendar: React.FC = () => {
  // Map month names to their numbers
  const MONTH_TO_NUMBER: { [key: string]: number } = {
    'Январь': 1, 'Февраль': 2, 'Март': 3, 'Апрель': 4,
    'Май': 5, 'Июнь': 6, 'Июль': 7, 'Август': 8,
    'Сентябрь': 9, 'Октябрь': 10, 'Ноябрь': 11, 'Декабрь': 12
  };

  // Function to get academic year for a given month name
  // Academic year: Sep 2025 - Aug 2026
  // Sep-Dec = 2025, Jan-Aug = 2026
  const getAcademicYear = (monthName: string): number => {
    const monthNumber = MONTH_TO_NUMBER[monthName];
    if (!monthNumber) return 2025; // fallback
    // September (9) - December (12) = 2025
    if (monthNumber >= 9 && monthNumber <= 12) {
      return 2025;
    }
    // January (1) - August (8) = 2026
    return 2026;
  };

  // Function to get current month name in Russian
  const getCurrentMonth = () => {
    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    const currentMonthIndex = new Date().getMonth();
    return monthNames[currentMonthIndex];
  };

  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>(() => {
    return localStorage.getItem('scheduleCalendar_selectedGroup') || '';
  });
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const savedMonth = localStorage.getItem('scheduleCalendar_selectedMonth');
    // If there's a saved month, use it; otherwise use current month
    return savedMonth || getCurrentMonth();
  });
  // Calculate year based on selected month (academic year)
  const selectedYear = getAcademicYear(selectedMonth);
  const [weekDays, setWeekDays] = useState<number[]>([2, 4]); // Вт=2, Чт=4
  const [lessonDates, setLessonDates] = useState<string[]>([]);
  const [attendance, setAttendance] = useState<Attendance>({});
  const [loading, setLoading] = useState(false);

  const MONTHS = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  // Using standard JavaScript Date.getDay() format: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  const WEEKDAYS = [
    { value: 1, label: 'Пн' },
    { value: 2, label: 'Вт' },
    { value: 3, label: 'Ср' },
    { value: 4, label: 'Чт' },
    { value: 5, label: 'Пт' },
    { value: 6, label: 'Сб' },
    { value: 0, label: 'Вс' }
  ];

  useEffect(() => {
    loadGroups();
  }, []);

  // Сохранение выбранной группы в localStorage
  useEffect(() => {
    if (selectedGroup) {
      localStorage.setItem('scheduleCalendar_selectedGroup', selectedGroup);
      loadStudents();
      loadLessons();
      loadScheduleSlots();
    }
  }, [selectedGroup]);

  // Сохранение выбранного месяца в localStorage
  useEffect(() => {
    if (selectedMonth) {
      localStorage.setItem('scheduleCalendar_selectedMonth', selectedMonth);
      calculateLessonDates();
      loadLessons();
    }
  }, [selectedMonth, weekDays]);

  // Update weekDays when schedule slots change
  useEffect(() => {
    if (scheduleSlots.length > 0) {
      loadGroupScheduleSettings();
    }
  }, [scheduleSlots]);

  // Load attendance data when students and lessons are loaded
  useEffect(() => {
    if (selectedMonth && students.length > 0 && lessonDates.length > 0 && lessons.length >= 0) {
      loadAttendanceData(students);
    }
  }, [students, lessonDates, selectedMonth, lessons, scheduleSlots]);

  const loadGroups = async () => {
    try {
      const data = await api.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    }
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      let data;

      if (selectedGroup === '__individual__') {
        // Load all students and filter those without a group
        const allStudents = await api.getStudents({});
        data = allStudents.filter((s: Student) => !s.groupId);

        // For individual students, set all days except Saturday
        // Using JS Date.getDay() format: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
        setWeekDays([0, 1, 2, 3, 4, 5]); // All days except Saturday
      } else {
        // Load students for specific group
        data = await api.getStudents({ groupId: selectedGroup });
      }

      setStudents(data);

      // Load existing attendance data
      await loadAttendanceData(data);
    } catch (error) {
      console.error('Error loading students:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadScheduleSlots = async () => {
    try {
      console.log('=== Loading schedule slots ===');
      const slots = await api.getPersonalSchedule();
      console.log('Total schedule slots loaded:', slots.length);

      // Filter slots by selected group or individual students
      let filteredSlots = slots;
      if (selectedGroup && selectedGroup !== '__individual__') {
        filteredSlots = slots.filter((slot: ScheduleSlot) => slot.groupId === selectedGroup);
        console.log('Filtered slots for group:', filteredSlots.length);
      } else if (selectedGroup === '__individual__') {
        filteredSlots = slots.filter((slot: ScheduleSlot) => slot.studentId && !slot.groupId);
        console.log('Filtered slots for individuals:', filteredSlots.length);
      }

      setScheduleSlots(filteredSlots);
    } catch (error) {
      console.error('Error loading schedule slots:', error);
      setScheduleSlots([]);
    }
  };

  const loadLessons = async () => {
    if (!selectedMonth || !selectedGroup) {
      console.log('loadLessons skipped - selectedMonth:', selectedMonth, 'selectedGroup:', selectedGroup);
      return;
    }

    try {
      console.log('=== Loading lessons for calendar ===');
      console.log('Selected group:', selectedGroup);
      console.log('Selected month:', selectedMonth);
      console.log('Selected year:', selectedYear);

      const monthIndex = MONTHS.indexOf(selectedMonth);
      if (monthIndex === -1) {
        console.log('Invalid month index');
        return;
      }

      // Load all lessons for the group
      const filters: any = {};

      // For specific group, filter by groupId
      if (selectedGroup !== '__individual__') {
        filters.groupId = selectedGroup;
        console.log('Using groupId filter:', filters.groupId);
      } else {
        console.log('Loading individual student lessons');
      }

      console.log('Calling api.getLessons with filters:', filters);
      const allLessons = await api.getLessons(filters);
      console.log('API returned', allLessons.length, 'lessons');

      // Filter lessons by selected month and year on client side
      const monthStr = String(monthIndex + 1).padStart(2, '0');
      console.log('Filtering by month:', monthStr, 'year:', selectedYear);

      const filteredLessons = allLessons.filter((lesson: Lesson) => {
        // Support both DD.MM and DD.MM.YYYY formats
        const parts = lesson.date.split('.');

        if (parts.length === 2) {
          // Format: DD.MM (without year)
          const lessonMonth = parts[1];
          const matches = lessonMonth === monthStr;
          if (!matches) {
            console.log('  Lesson filtered out:', lesson.date, lesson.topic);
          }
          return matches;
        } else if (parts.length === 3) {
          // Format: DD.MM.YYYY (with year)
          const lessonMonth = parts[1];
          const lessonYear = parts[2];
          const matches = lessonMonth === monthStr && lessonYear === String(selectedYear);
          if (!matches) {
            console.log('  Lesson filtered out:', lesson.date, lesson.topic);
          }
          return matches;
        }

        console.log('  Invalid date format:', lesson.date);
        return false;
      });

      console.log('Filtered lessons:', filteredLessons.length, 'out of', allLessons.length);
      console.log('=== Lessons loading complete ===');
      setLessons(filteredLessons);
    } catch (error) {
      console.error('Error loading lessons:', error);
      setLessons([]);
    }
  };

  const loadAttendanceData = async (studentsData: Student[]) => {
    if (!selectedMonth || studentsData.length === 0) return;

    try {
      const monthIndex = MONTHS.indexOf(selectedMonth);
      if (monthIndex === -1) return;

      // Calculate date range for the selected month
      const firstDay = `01.${String(monthIndex + 1).padStart(2, '0')}.${selectedYear}`;
      const lastDay = `${new Date(selectedYear, monthIndex + 1, 0).getDate()}.${String(monthIndex + 1).padStart(2, '0')}.${selectedYear}`;

      // Load attendance records from database
      const filters: any = {
        dateFrom: firstDay,
        dateTo: lastDay
      };

      // For individual students, don't pass groupId
      if (selectedGroup !== '__individual__') {
        filters.groupId = selectedGroup;
      }

      const attendanceData = await api.getAttendance(filters);

      console.log('Loaded attendance data:', attendanceData);

      // Initialize attendance object
      const loadedAttendance: Attendance = {};
      studentsData.forEach((student: Student) => {
        loadedAttendance[student.id] = {};
      });

      // DISABLED: Auto-fill attendance from lessons
      // Now we rely only on database attendance records
      console.log('=== Skipping auto-fill from lessons (using database only) ===');

      // DISABLED: Auto-fill from completed lessons
      // Now we rely only on database attendance records
      console.log('=== Skipping auto-fill from completed lessons (using database only) ===');

      if (false) { // Disabled block
      try {
        // Get all weeks in the selected month
        const year = selectedYear;
        const month = monthIndex;
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const weeks: string[] = [];
        let currentMonday = new Date(firstDay);

        // Find first Monday on or before first day of month
        while (currentMonday.getDay() !== 1) {
          currentMonday.setDate(currentMonday.getDate() - 1);
        }

        // Collect all Monday dates (week starts) that overlap with this month
        while (currentMonday <= lastDay) {
          const weekStart = `${currentMonday.getFullYear()}-${String(currentMonday.getMonth() + 1).padStart(2, '0')}-${String(currentMonday.getDate()).padStart(2, '0')}`;
          weeks.push(weekStart);
          currentMonday.setDate(currentMonday.getDate() + 7);
        }

        console.log('Weeks in month:', weeks);

        // Load completed lessons for each week
        for (const weekStart of weeks) {
          const slots = await api.getCompletedLessons(weekStart);
          console.log(`Week ${weekStart}: ${slots.length} schedule slots`);

          let markedCount = 0;

          slots.forEach((slot: any, index: number) => {
            // Find completed lesson for this specific week
            const completedLesson = slot.completedLessons?.find((cl: any) => cl.weekStart === weekStart);

            if (index < 3) {
              console.log(`  Slot ${index + 1}:`, {
                dayOfWeek: slot.dayOfWeek,
                time: slot.time,
                studentId: slot.studentId,
                groupId: slot.groupId,
                hasCompletedLessons: !!slot.completedLessons,
                completedLessonsCount: slot.completedLessons?.length || 0,
                thisWeekCompleted: completedLesson?.completed || false,
                thisWeekPaid: completedLesson?.paid || false,
                weekStart: weekStart
              });
            }

            if (!completedLesson || !completedLesson.completed) return; // Skip if not marked as completed

            // ✅ CRITICAL FIX: Verify that completedLesson.weekStart matches current iteration week
            if (completedLesson.weekStart !== weekStart) {
              console.log(`  ⚠️ Skipping: completedLesson.weekStart (${completedLesson.weekStart}) != current week (${weekStart})`);
              return; // Skip lessons from different weeks
            }

            // Calculate the actual date from weekStart + dayOfWeek
            // weekStart is Monday (first day of the work week)
            // slot.dayOfWeek uses standard JS format: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
            // Convert to offset from Monday: 1=Mon(0), 2=Tue(1), 3=Wed(2), 4=Thu(3), 5=Fri(4), 6=Sat(5), 0=Sun(6)
            let dayOffset: number;
            if (slot.dayOfWeek === 0) {
              // Sunday is 6 days after Monday
              dayOffset = 6;
            } else {
              // Monday=1 → offset 0, Tuesday=2 → offset 1, etc.
              dayOffset = slot.dayOfWeek - 1;
            }
            const weekStartDate = new Date(weekStart);
            const lessonDate = new Date(weekStartDate);
            lessonDate.setDate(weekStartDate.getDate() + dayOffset);

            // ✅ ADDITIONAL CHECK: Verify the calculated date is within selected month
            const calculatedMonth = lessonDate.getMonth();
            const calculatedYear = lessonDate.getFullYear();
            if (calculatedMonth !== monthIndex || calculatedYear !== selectedYear) {
              console.log(`  ⚠️ Skipping: calculated date ${lessonDate.toISOString()} is outside selected month ${selectedMonth} ${selectedYear}`);
              return; // Skip dates outside selected month
            }

            // Format as DD.MM
            const dateStr = `${String(lessonDate.getDate()).padStart(2, '0')}.${String(lessonDate.getMonth() + 1).padStart(2, '0')}`;

            console.log(`  ✅ Marking completed lesson on ${dateStr}:`, {
              dayOfWeek: slot.dayOfWeek,
              time: slot.time,
              groupId: slot.groupId,
              studentId: slot.studentId,
              weekStart: weekStart
            });

            // For group lessons
            if (slot.groupId) {
              studentsData.forEach((student: Student) => {
                if (student.groupId === slot.groupId) {
                  if (loadedAttendance[student.id] && !loadedAttendance[student.id][dateStr]) {
                    loadedAttendance[student.id][dateStr] = 'present';
                    markedCount++;
                    console.log(`    ✅ Marked ${student.fullName} as present on ${dateStr}`);
                    // NOTE: Data is pre-filled from database, no need to save here
                  }
                }
              });
            }

            // For individual student lessons
            if (slot.studentId) {
              if (loadedAttendance[slot.studentId] && !loadedAttendance[slot.studentId][dateStr]) {
                loadedAttendance[slot.studentId][dateStr] = 'present';
                markedCount++;
                console.log(`    ✅ Marked individual student as present on ${dateStr}`);
                // NOTE: Data is pre-filled from database, no need to save here
              }
            }
          });

          console.log(`  Total students marked for week ${weekStart}: ${markedCount}`);
        }

        console.log('=== Completed lessons auto-fill complete ===');
      } catch (error) {
        console.error('Error loading completed lessons:', error);
      }
      } // End of disabled block

      // Load attendance records from database ONLY
      attendanceData.forEach((record: any) => {
        // Initialize student attendance if not exists
        if (!loadedAttendance[record.studentId]) {
          loadedAttendance[record.studentId] = {};
        }

        // Extract date in DD.MM format from DD.MM.YYYY or DD.MM
        let shortDate: string;
        const parts = record.date.split('.');

        if (parts.length === 3) {
          // Format: DD.MM.YYYY - extract DD.MM
          shortDate = `${parts[0]}.${parts[1]}`;
        } else if (parts.length === 2) {
          // Format: DD.MM - use as is
          shortDate = record.date;
        } else {
          console.log('Invalid date format in attendance:', record.date);
          return;
        }

        loadedAttendance[record.studentId][shortDate] = record.status.toLowerCase();
      });

      setAttendance(loadedAttendance);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const calculateLessonDates = () => {
    if (!selectedMonth) return;

    const monthIndex = MONTHS.indexOf(selectedMonth);
    if (monthIndex === -1) return;

    const dates: string[] = [];
    const year = selectedYear;
    const month = monthIndex;

    // Get number of days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Loop through all days in the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

      // Check if this day is in selected weekdays (using same format as DB: 0=Sun, 1=Mon, etc.)
      if (weekDays.includes(dayOfWeek)) {
        const dateString = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`;
        dates.push(dateString);
      }
    }

    setLessonDates(dates);
  };

  const loadGroupScheduleSettings = async () => {
    if (!selectedGroup) return;

    try {
      // Instead of using group_schedule_settings, calculate weekDays from actual schedule slots
      console.log('Calculating weekdays from schedule slots...');

      // Get unique days of week from schedule slots
      const uniqueDays = [...new Set(scheduleSlots.map((slot: ScheduleSlot) => slot.dayOfWeek))];
      const sortedDays = uniqueDays.sort((a, b) => a - b);

      if (sortedDays.length > 0) {
        setWeekDays(sortedDays);
        console.log('Loaded schedule settings from slots:', sortedDays);
      } else {
        // Fallback to group_schedule_settings if no slots
        const settings = await api.getGroupScheduleSettings(selectedGroup);
        if (settings.weekdays) {
          const days = settings.weekdays.split(',').map(Number);
          setWeekDays(days);
          console.log('Loaded schedule settings from DB:', days);
        }
      }
    } catch (error) {
      console.error('Error loading group schedule settings:', error);
    }
  };

  const toggleWeekday = async (day: number) => {
    let newWeekDays: number[];
    if (weekDays.includes(day)) {
      newWeekDays = weekDays.filter(d => d !== day);
    } else {
      newWeekDays = [...weekDays, day].sort();
    }

    setWeekDays(newWeekDays);

    // Save to database
    if (selectedGroup) {
      try {
        await api.saveGroupScheduleSettings({
          groupId: selectedGroup,
          weekdays: newWeekDays.join(',')
        });
        console.log('Saved weekday settings:', newWeekDays);
      } catch (error) {
        console.error('Error saving weekday settings:', error);
      }
    }
  };

  const updateAttendance = async (studentId: string, date: string, status: 'present' | 'absent' | 'late' | '') => {
    // Update local state
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [date]: status
      }
    }));

    // Save to database
    if (status === '') {
      // Delete attendance record if status is empty
      try {
        const fullDate = `${date}.${selectedYear}`;
        await api.deleteAttendance(studentId, fullDate);
        console.log('Deleted attendance:', studentId, fullDate);
      } catch (error) {
        console.error('Error deleting attendance:', error);
      }
    } else {
      // Save or update attendance record
      try {
        const fullDate = `${date}.${selectedYear}`;
        const apiStatus = status.toUpperCase(); // Convert to PRESENT, ABSENT, LATE
        const data: any = {
          studentId,
          date: fullDate,
          status: apiStatus
        };

        // Only add groupId if not individual students
        if (selectedGroup !== '__individual__') {
          data.groupId = selectedGroup;
        }

        await api.saveAttendance(data);
        console.log('Saved attendance:', studentId, fullDate, apiStatus);
      } catch (error) {
        console.error('Error saving attendance:', error);
      }
    }
  };

  const selectedGroupData = groups.find(g => g.id === selectedGroup);

  const inputStyle: React.CSSProperties = {
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    backgroundColor: 'white',
    color: '#334155',
    outline: 'none',
  };

  return (
    <div className="p-6">
      {/* Glass card container */}
      <div className="bg-white/80 backdrop-blur-xl border border-white/60 rounded-2xl p-6"
           style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.35)' }}>

        {/* Title */}
        <h1 className="text-xl font-bold text-slate-800 text-center mb-5">
          📅 Календарь посещаемости
        </h1>

        {/* Controls row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Группа</label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              style={inputStyle}
            >
              <option value="">Выберите группу</option>
              <option value="__individual__">Индивидуальные ученики</option>
              {groups.map(group => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Месяц</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={inputStyle}
            >
              <option value="">Выберите месяц</option>
              {MONTHS.map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Учебный год</label>
            <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-600">
              2025–2026
            </div>
          </div>
        </div>

        {/* Weekday pills */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-600 mb-2">Дни занятий</label>
          <div className="flex gap-2 flex-wrap">
            {WEEKDAYS.map(day => (
              <button
                key={day.value}
                onClick={() => toggleWeekday(day.value)}
                className={[
                  'px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150',
                  weekDays.includes(day.value)
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                ].join(' ')}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        {/* Info banner */}
        {selectedGroup && selectedMonth && lessonDates.length > 0 && (
          <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
            <span className="text-lg">📋</span>
            <span className="text-sm text-slate-700">
              <span className="font-semibold">
                {selectedGroup === '__individual__' ? 'Индивидуальные ученики' : selectedGroupData?.name}
              </span>
              {' '}&mdash; {selectedMonth.toUpperCase()} {selectedYear},{' '}
              <span className="text-blue-600 font-semibold">{lessonDates.length} занятий</span>
            </span>
          </div>
        )}

        {/* Attendance Table */}
        {selectedGroup && selectedMonth && students.length > 0 && (
          lessonDates.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="sticky left-0 z-10 bg-slate-50/90 backdrop-blur text-left px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200 border-r border-slate-200"
                        style={{ minWidth: '180px' }}>
                      ФИ ученика
                    </th>
                    {lessonDates.map(date => (
                      <th key={date} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 border-b border-slate-200 border-r border-slate-100 bg-slate-50/80"
                          style={{ minWidth: '60px' }}>
                        {date}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-blue-50/60 transition-colors duration-100">
                      <td className="sticky left-0 z-10 bg-white/85 backdrop-blur px-4 py-3 text-sm font-semibold text-slate-700 border-b border-slate-100 border-r border-slate-200"
                          style={{ minWidth: '180px' }}>
                        {student.fullName}
                      </td>
                      {lessonDates.map(date => {
                        const status = attendance[student.id]?.[date] || '';
                        // Determine badge classes based on status
                        let badgeBg = '';
                        let badgeText = '';
                        let badgeSymbol = '';
                        if (status === 'present') {
                          badgeBg = 'bg-emerald-500/15';
                          badgeText = 'text-emerald-600';
                          badgeSymbol = '✓';
                        } else if (status === 'late') {
                          badgeBg = 'bg-amber-500/15';
                          badgeText = 'text-amber-600';
                          badgeSymbol = '!';
                        } else if (status === 'absent') {
                          badgeBg = 'bg-rose-500/15';
                          badgeText = 'text-rose-600';
                          badgeSymbol = '✕';
                        }

                        return (
                          <td
                            key={date}
                            onClick={() => {
                              const nextStatus = status === '' ? 'present' :
                                               status === 'present' ? 'late' :
                                               status === 'late' ? 'absent' : '';
                              updateAttendance(student.id, date, nextStatus);
                            }}
                            className="px-2 py-2.5 border-b border-slate-100 border-r border-slate-100 cursor-pointer select-none"
                            title="Клик для изменения: пусто → присутствовал → опоздал → отсутствовал"
                          >
                            <div className="flex items-center justify-center">
                              {status ? (
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold ${badgeBg} ${badgeText}`}>
                                  {badgeSymbol}
                                </span>
                              ) : (
                                <span className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-300 bg-slate-50 hover:bg-slate-100 transition-colors">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-slate-50 rounded-xl border border-slate-200 mt-2">
              <p className="text-slate-500 text-sm">В выбранном месяце нет занятий по указанным дням недели.</p>
              <p className="text-slate-400 text-xs mt-1">Выберите дни занятий выше.</p>
            </div>
          )
        )}

        {/* Legend */}
        {selectedGroup && selectedMonth && lessonDates.length > 0 && (
          <div className="flex gap-4 mt-4 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center text-sm font-bold">✓</span>
              <span className="text-xs text-slate-600">Присутствовал</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center text-sm font-bold">!</span>
              <span className="text-xs text-slate-600">Опоздал</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-rose-500/15 text-rose-600 flex items-center justify-center text-sm font-bold">✕</span>
              <span className="text-xs text-slate-600">Отсутствовал</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-slate-50 text-slate-300 flex items-center justify-center text-sm font-bold border border-slate-200">—</span>
              <span className="text-xs text-slate-600">Не указано</span>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!selectedGroup && (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-slate-500 text-sm">Выберите группу и месяц для отображения календаря</p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-6">
            <p className="text-slate-400 text-sm">Загрузка...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleCalendar;
