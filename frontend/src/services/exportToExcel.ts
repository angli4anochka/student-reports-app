import * as XLSX from 'xlsx';
import { api } from './api';

interface ExportData {
  students: any[];
  grades: any[];
  attendance: any[];
  lessons: any[];
  groups: any[];
  criteria: any[];
}

export async function exportAllDataToExcel() {
  try {
    console.log('Starting data export...');

    // Fetch all data in parallel
    const [students, grades, attendance, lessons, groups, criteria] = await Promise.all([
      api.getStudents({}).catch(() => []),
      api.getGrades({}).catch(() => []),
      api.getAttendance({}).catch(() => []),
      api.getLessons({}).catch(() => []),
      api.getGroups().catch(() => []),
      api.getCriteria().catch(() => []),
    ]);

    console.log('Data fetched:', { students: students.length, grades: grades.length, attendance: attendance.length, lessons: lessons.length });

    // Create a new workbook
    const workbook = XLSX.utils.book_new();

    // Sheet 1: Students
    const studentsData = students.map((student) => ({
      'ID': student.id,
      'Имя': student.fullName,
      'Группа': student.group?.name || 'Без группы',
      'Заметки': student.notes || '',
      'Создан': new Date(student.createdAt).toLocaleDateString('ru-RU'),
    }));
    const studentsSheet = XLSX.utils.json_to_sheet(studentsData);
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Ученики');

    // Sheet 2: Groups
    const groupsData = groups.map((group) => ({
      'ID': group.id,
      'Название': group.name,
      'Описание': group.description || '',
      'Создана': new Date(group.createdAt).toLocaleDateString('ru-RU'),
    }));
    const groupsSheet = XLSX.utils.json_to_sheet(groupsData);
    XLSX.utils.book_append_sheet(workbook, groupsSheet, 'Группы');

    // Sheet 3: Grades
    const gradesData = grades.map((grade) => {
      const student = students.find((s) => s.id === grade.studentId);
      const criteriaGradesText = grade.criteriaGrades?.map((cg: any) => {
        const criterion = criteria.find((c) => c.id === cg.criterionId);
        return `${criterion?.name || 'N/A'}: ${cg.value}`;
      }).join(', ') || '';

      return {
        'Ученик': student?.fullName || 'N/A',
        'Группа': student?.group?.name || 'Без группы',
        'Месяц': grade.month,
        'Посещаемость %': grade.attendance || '',
        'Оценки по критериям': criteriaGradesText,
        'Итоговый балл': grade.totalScore || '',
        'Оценка': grade.grade || '',
        'Домашнее задание': grade.homework || '',
        'Комментарий': grade.comment || '',
        'Рекомендации': grade.recommendations || '',
        'Дата создания': new Date(grade.createdAt).toLocaleDateString('ru-RU'),
      };
    });
    const gradesSheet = XLSX.utils.json_to_sheet(gradesData);
    XLSX.utils.book_append_sheet(workbook, gradesSheet, 'Оценки');

    // Sheet 4: Attendance
    const attendanceData = attendance.map((att) => {
      const student = students.find((s) => s.id === att.studentId);
      return {
        'Ученик': student?.fullName || 'N/A',
        'Группа': student?.group?.name || 'Без группы',
        'Дата': att.date,
        'Статус': att.status,
        'Создано': new Date(att.createdAt).toLocaleDateString('ru-RU'),
      };
    });
    const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
    XLSX.utils.book_append_sheet(workbook, attendanceSheet, 'Посещаемость');

    // Sheet 5: Lessons
    const lessonsData = lessons.map((lesson) => {
      const group = groups.find((g) => g.id === lesson.groupId);
      return {
        'Дата': lesson.date,
        'Группа': group?.name || 'Без группы',
        'Тема урока': lesson.topic,
        'Домашнее задание': lesson.homework || '',
        'Комментарий': lesson.comment || '',
        'Создан': new Date(lesson.createdAt).toLocaleDateString('ru-RU'),
      };
    });
    const lessonsSheet = XLSX.utils.json_to_sheet(lessonsData);
    XLSX.utils.book_append_sheet(workbook, lessonsSheet, 'Уроки');

    // Sheet 6: Criteria
    const criteriaData = criteria.map((criterion) => ({
      'ID': criterion.id,
      'Название': criterion.name,
      'Вес': criterion.weight,
      'Шкала': criterion.scale,
      'Порядок': criterion.order,
    }));
    const criteriaSheet = XLSX.utils.json_to_sheet(criteriaData);
    XLSX.utils.book_append_sheet(workbook, criteriaSheet, 'Критерии оценивания');

    // Generate file name with current date
    const today = new Date();
    const dateStr = today.toLocaleDateString('ru-RU').replace(/\./g, '-');
    const fileName = `Все_данные_${dateStr}.xlsx`;

    // Write the file
    XLSX.writeFile(workbook, fileName);

    console.log('Export completed successfully!');
    return true;
  } catch (error) {
    console.error('Error exporting data to Excel:', error);
    throw error;
  }
}
