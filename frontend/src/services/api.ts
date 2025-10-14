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

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }));
      throw new Error(error.error || error.message || 'Request failed');
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

  async createStudent(data: { fullName: string; groupId: string; notes?: string }) {
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

  // Group endpoints
  async getGroups() {
    return this.request<any[]>('/groups');
  }

  async getGroup(id: string) {
    return this.request<any>(`/groups/${id}`);
  }

  async createGroup(data: { name: string; description?: string }) {
    return this.request<any>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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

  // Criteria endpoints
  async getCriteria() {
    return this.request<any[]>('/criteria');
  }

  async createCriterion(data: { name: string; weight: number; scale: string; order?: number }) {
    return this.request<any>('/criteria', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCriterion(id: string, data: any) {
    return this.request<any>(`/criteria/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Years endpoints
  async getYears() {
    return this.request<any[]>('/years');
  }

  async createYear(data: { year: string; months?: string[] }) {
    return this.request<any>('/years', {
      method: 'POST',
      body: JSON.stringify(data),
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

  async createLesson(data: { date: string; topic: string; homework?: string; comment?: string; groupId?: string }) {
    return this.request<any>('/lessons', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLesson(id: string, data: { date?: string; topic?: string; homework?: string; comment?: string; groupId?: string }) {
    return this.request<any>(`/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLesson(id: string) {
    return this.request(`/lessons/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiService();