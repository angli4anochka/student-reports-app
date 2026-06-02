const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    // Always get fresh token from localStorage
    const currentToken = localStorage.getItem('token') || this.token;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (currentToken) {
      headers.Authorization = `Bearer ${currentToken}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized - token expired or invalid
    if (response.status === 401) {
      this.clearToken();
      localStorage.removeItem('user');
      // Reload page to redirect to login
      window.location.href = '/login';
      throw new Error('Unauthorized - please login again');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.error || error.message || 'Request failed');
    }

    // Handle 204 No Content responses
    if (response.status === 204) {
      return null as T;
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),

    });

    this.setToken(response.token);
    return response;
  }

  async register(email: string, password: string, fullName: string) {
    const response = await this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, fullName }),
    });

    this.setToken(response.token);
    return response;
  }

  async getMe() {
    return this.request<{ id: string; email: string; fullName: string; role: string; school: string | null; createdAt: string }>('/me');
  }

  async changePassword(oldPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth?action=change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  }

  async forgotPassword(email: string) {
    return this.request<{ message: string; resetLink?: string }>('/auth?action=forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string) {
    return this.request<{ message: string }>('/auth?action=reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // Student endpoints
  async getStudents(filters: { groupId?: string; group?: string; q?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.groupId) params.append('groupId', filters.groupId);
    if (filters.group) params.append('group', filters.group);
    if (filters.q) params.append('q', filters.q);
    
    return this.request<any[]>(`/students?${params.toString()}`);
  }

  async getStudent(id: string) {
    return this.request<any>(`/students/${id}`);
  }

  async createStudent(data: { fullName: string; groupId?: string; notes?: string; teacherId?: string }) {
    return this.request<any>('/students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateStudent(id: string, data: { fullName?: string; group?: string; notes?: string }) {
    return this.request<any>(`/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteStudent(id: string) {
    return this.request(`/students/${id}`, { method: 'DELETE' });
  }

  async reassignStudentTeacher(studentId: string, teacherId: string) {
    return this.request<any>(`/students/${studentId}/teacher`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherId }),
    });
  }

  async reassignGroupTeacher(groupId: string, teacherId: string) {
    return this.request<any>(`/groups/${groupId}/teacher`, {
      method: 'PATCH',
      body: JSON.stringify({ teacherId }),
    });
  }

  // Group endpoints
  async getGroups() {
    return this.request<any[]>('/groups');
  }

  async getGroup(id: string) {
    return this.request<any>(`/groups/${id}`);
  }

  async createGroup(data: { name: string; description?: string; teacherId?: string }) {
    return this.request<any>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAvailableTeachers() {
    return this.request<Array<{ id: string; fullName: string; email: string }>>('/groups/available-teachers');
  }

  async updateGroup(id: string, data: { name?: string; description?: string }) {
    return this.request<any>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGroup(id: string) {
    return this.request(`/groups/${id}`, { method: 'DELETE' });
  }

  // Group collaborators endpoints
  async getGroupCollaborators(groupId: string) {
    return this.request<any[]>(`/group-collaborators?groupId=${groupId}`);
  }

  async addGroupCollaborator(groupId: string, teacherId: string) {
    return this.request<any>(`/group-collaborators?groupId=${groupId}`, {
      method: 'POST',
      body: JSON.stringify({ teacherId }),
    });
  }

  async removeGroupCollaborator(groupId: string, teacherId: string) {
    return this.request(`/group-collaborators?groupId=${groupId}&teacherId=${teacherId}`, {
      method: 'DELETE',
    });
  }

  // Student collaborators endpoints
  async getStudentCollaborators(studentId: string) {
    return this.request<any[]>(`/student-collaborators?studentId=${studentId}`);
  }

  async addStudentCollaborator(studentId: string, teacherId: string) {
    return this.request<any>(`/student-collaborators?studentId=${studentId}`, {
      method: 'POST',
      body: JSON.stringify({ teacherId }),
    });
  }

  async removeStudentCollaborator(studentId: string, teacherId: string) {
    return this.request(`/student-collaborators?studentId=${studentId}&teacherId=${teacherId}`, {
      method: 'DELETE',
    });
  }

  // Grades endpoints
  async getGrades(filters: { studentId?: string; yearId?: string; month?: string } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    
    return this.request<any[]>(`/grades?${params.toString()}`);
  }

  async saveGrade(data: any) {
    return this.request<any>('/grades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Lessons endpoints
  async getLessons(filters: { groupId?: string } = {}) {
    const params = new URLSearchParams();
    if (filters.groupId) params.append('groupId', filters.groupId);

    return this.request<any[]>(`/lessons?${params.toString()}`);
  }

  async getLesson(id: string) {
    return this.request<any>(`/lessons/${id}`);
  }

  async createLesson(data: { date: string; topic: string; homework?: string; comment?: string; groupId?: string; studentId?: string }) {
    return this.request<any>('/lessons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLesson(id: string, data: { date?: string; topic?: string; homework?: string; comment?: string; groupId?: string; studentId?: string }) {
    return this.request<any>(`/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLesson(id: string) {
    return this.request(`/lessons/${id}`, { method: 'DELETE' });
  }

  // Teachers endpoints
  async getTeachers() {
    return this.request<any[]>('/teachers');
  }

  // Admin endpoints
  async getAdminUsers() {
    return this.request<any[]>('/admin/users');
  }

  async createAdminUser(data: { email: string; password: string; fullName: string; role: 'TEACHER' | 'ADMIN' }) {
    return this.request<any>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminUser(id: string, data: { email?: string; password?: string; fullName?: string; role?: 'TEACHER' | 'ADMIN' }) {
    return this.request<any>(`/admin/users?id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminUser(id: string) {
    return this.request(`/admin/users?id=${id}`, { method: 'DELETE' });
  }

  async createFirstAdmin(data: { email: string; password: string; fullName: string; adminSecret: string }) {
    return this.request<any>('/admin/create-admin', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Attendance endpoints
  async getAttendance(filters: { studentId?: string; groupId?: string; dateFrom?: string; dateTo?: string } = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    return this.request<any[]>(`/attendance?${params.toString()}`);
  }

  async saveAttendance(data: { studentId: string; date: string; status: string; groupId?: string }) {
    return this.request<any>('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteAttendance(studentId: string, date: string) {
    return this.request(`/attendance?studentId=${studentId}&date=${date}`, { method: 'DELETE' });
  }

  // Group schedule settings endpoints
  async getGroupScheduleSettings(groupId: string) {
    return this.request<any>(`/group-schedule-settings?groupId=${groupId}`);
  }

  async saveGroupScheduleSettings(data: { groupId: string; weekdays: string }) {
    return this.request<any>('/group-schedule-settings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Teacher schedules endpoints
  async getTeacherSchedules(teacherId: string) {
    return this.request<any[]>(`/teacher-schedules?teacherId=${teacherId}`);
  }

  async saveTeacherSchedule(data: { teacherId: string; day: number; time: string; groupName: string; color?: string }) {
    return this.request<any>('/teacher-schedules', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteTeacherSchedule(teacherId: string, day: number, time: string) {
    return this.request(`/teacher-schedules?teacherId=${teacherId}&day=${day}&time=${time}`, {
      method: 'DELETE'
    });
  }

  // Teacher earnings endpoints
  // Lesson Types
  async getLessonTypes() {
    return this.request<any[]>('/teacher-earnings?entity=lessonTypes');
  }

  async createLessonType(data: { name: string; color: string; pricePerHour: number }) {
    return this.request<any>('/teacher-earnings?entity=lessonTypes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLessonType(id: string, data: { name?: string; color?: string; pricePerHour?: number }) {
    return this.request<any>(`/teacher-earnings?entity=lessonTypes&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLessonType(id: string) {
    return this.request(`/teacher-earnings?entity=lessonTypes&id=${id}`, {
      method: 'DELETE'
    });
  }

  // Personal Schedule
  async getPersonalSchedule() {
    return this.request<any[]>('/teacher-earnings?entity=schedule');
  }

  async createScheduleSlot(data: { dayOfWeek: number; time: string; lessonTypeId: string; studentId?: string; groupId?: string; studentName?: string }) {
    return this.request<any>('/teacher-earnings?entity=schedule', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateScheduleSlot(id: string, data: { dayOfWeek?: number; time?: string; lessonTypeId?: string; studentId?: string; groupId?: string; studentName?: string }) {
    return this.request<any>(`/teacher-earnings?entity=schedule&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteScheduleSlot(id: string) {
    return this.request(`/teacher-earnings?entity=schedule&id=${id}`, {
      method: 'DELETE'
    });
  }

  // Completed Lessons
  async getCompletedLessons(weekStart: string) {
    return this.request<any[]>(`/teacher-earnings?entity=completed&weekStart=${weekStart}`);
  }

  async markLessonCompleted(data: { scheduleSlotId: string; weekStart: string; completed?: boolean; paid?: boolean }) {
    return this.request<any>('/teacher-earnings?entity=completed', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCompletedLesson(
    scheduleSlotId: string,
    weekStart: string,
    data: {
      completed?: boolean;
      paid?: boolean;
      customPrice?: number | null;
      customStudentName?: string | null;
      customStudentId?: string | null;
      customGroupId?: string | null;
      customLessonTypeId?: string | null;
    }
  ) {
    return this.request<any>('/teacher-earnings?entity=completed', {
      method: 'POST',
      body: JSON.stringify({
        scheduleSlotId,
        weekStart,
        ...data
      }),
    });
  }

  // Week Earnings
  async getWeekEarnings(weekStart: string, isPeriod?: boolean) {
    const periodParam = isPeriod !== undefined ? `&isPeriod=${isPeriod}` : '';
    return this.request<any>(`/teacher-earnings?entity=weekEarnings&weekStart=${weekStart}${periodParam}`);
  }

  // Glasses (Points & Badges) endpoints
  // Groups
  async getGlassesGroups() {
    return this.request<any[]>('/glasses?entity=groups');
  }

  async createGlassesGroup(data: { name: string }) {
    return this.request<any>('/glasses?entity=groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteGlassesGroup(id: string) {
    return this.request(`/glasses?entity=groups&id=${id}`, { method: 'DELETE' });
  }

  // Students
  async getGlassesStudents(groupId: string) {
    return this.request<any[]>(`/glasses?entity=students&groupId=${groupId}`);
  }

  async createGlassesStudent(data: { fullName: string; groupId: string }) {
    return this.request<any>('/glasses?entity=students', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGlassesStudent(id: string, data: { points: number }) {
    return this.request<any>(`/glasses?entity=students&id=${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGlassesStudent(id: string) {
    return this.request(`/glasses?entity=students&id=${id}`, { method: 'DELETE' });
  }

  // Notes endpoints
  async getNotes() {
    return this.request<{ id: string; teacherId: string; content: string; createdAt: string; updatedAt: string }>('/notes');
  }

  async updateNotes(content: string) {
    return this.request<{ id: string; teacherId: string; content: string; createdAt: string; updatedAt: string }>('/notes', {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  // Telegram endpoints
  async getTelegramLink(studentId: string) {
    return this.request<{
      linkUrl: string;
      studentId: string;
      studentName: string;
      isLinked: boolean;
      telegramUsername: string | null;
    }>(`/telegram/link/${studentId}`);
  }

  async unlinkTelegram(studentId: string) {
    return this.request<{ success: boolean; message: string }>(`/telegram/unlink/${studentId}`, {
      method: 'DELETE',
    });
  }

  async getTelegramStatuses() {
    return this.request<Array<{
      id: string;
      fullName: string;
      groupName: string | null;
      isLinked: boolean;
      telegramUsername: string | null;
    }>>('/telegram/status');
  }

  // Organization stats endpoint (SCHOOL_MANAGER only)
  async getOrganizationStats() {
    return this.request<{
      organization: {
        id: string;
        name: string;
        type: string;
      };
      summary: {
        totalStudents: number;
        totalGroups: number;
        totalLessons: number;
        totalStaff: number;
      };
      staff: Array<{
        id: string;
        fullName: string;
        email: string;
        role: string;
        createdAt: string;
      }>;
      students: Array<any>;
      groups: Array<any>;
      scheduleSlots: Array<any>;
      financial: {
        currentMonth: {
          start: string;
          byTeacher: Array<{
            teacherId: string;
            teacherName: string;
            teacherEmail: string;
            totalLessons: number;
            completedLessons: number;
            paidLessons: number;
            unpaidLessons: number;
          }>;
          totalPayments: number;
          totalCompleted: number;
          totalPaid: number;
        };
        recentPayments: Array<any>;
      };
      attendance: {
        currentMonth: {
          total_records: number;
          present_count: number;
          absent_count: number;
          unique_students: number;
        };
      };
      recentActivity: Array<any>;
    }>('/organization-stats');
  }

  // Payment endpoints
  async createPayment(data: {
    studentId: string;
    amount: number;
    lessonsCount: number;
    paymentDate: string;
    notes?: string;
  }) {
    return this.request<{
      id: string;
      studentId: string;
      teacherId: string;
      amount: number;
      lessonsCount: number;
      pricePerLesson: number;
      paymentDate: string;
      notes?: string;
      newBalance: number;
      studentName: string;
    }>('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getPayments(studentId?: string) {
    const endpoint = studentId ? `/payments?studentId=${studentId}` : '/payments';
    return this.request<Array<{
      id: string;
      studentId: string;
      teacherId: string;
      amount: number;
      lessonsCount: number;
      pricePerLesson: number;
      paymentDate: string;
      notes?: string;
      student: {
        id: string;
        fullName: string;
        lessonsBalance: number;
      };
    }>>(endpoint);
  }

  async getStudentBalance(studentId: string) {
    return this.request<{
      studentId: string;
      studentName: string;
      currentBalance: number;
      lastUpdated: string | null;
      totalPaid: number;
      totalLessonsPaid: number;
      paymentCount: number;
    }>(`/payments/balance/${studentId}`);
  }

  // Organization schedule (Admin only)
  async getOrganizationSchedule() {
    return this.request<{
      teachers: Array<{
        id: string;
        fullName: string;
        email: string;
        schedule: Array<{
          id: string;
          dayOfWeek: number;
          time: string;
          studentName?: string;
          studentId?: string;
          groupId?: string;
          student?: { id: string; fullName: string };
          group?: { id: string; name: string };
          lessonType?: {
            id: string;
            name: string;
            color: string;
            pricePerHour: number;
          };
        }>;
      }>;
    }>('/organization-schedule');
  }

  // Schedule Overrides endpoints
  async createScheduleOverride(data: {
    scheduleSlotId: string;
    weekStart: string;
    newDayOfWeek: number;
    newTime: string
  }) {
    return this.request<{ success: boolean; override: any; message: string }>('/schedule-overrides', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteScheduleOverride(id: string) {
    return this.request<{ success: boolean; message: string }>(`/schedule-overrides/${id}`, {
      method: 'DELETE',
    });
  }

  async deleteScheduleOverrideBySlotAndWeek(scheduleSlotId: string, weekStart: string) {
    return this.request<{ success: boolean; message: string }>(
      `/schedule-overrides/by-slot/${scheduleSlotId}/${weekStart}`,
      { method: 'DELETE' }
    );
  }
}

export const api = new ApiService();