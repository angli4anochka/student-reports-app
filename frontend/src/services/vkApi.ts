import { vkLaunchQuery } from '../vk/launchParams';

/**
 * API client for the VK Mini App.
 *
 * Separate from the main `api.ts` on purpose:
 *  - it forwards the VK launch params on every call (the backend `verifyVK`
 *    middleware reads `vk_*` + `sign` from `req.query`);
 *  - it must NOT redirect to /login on 401 (a 401 here means an invalid VK
 *    signature, not an expired teacher session).
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://tutorsdesk.ru/api';

export interface VKStudent {
  id: string;
  fullName: string;
  vkUserId: string | null;
  teacher?: { id: string; fullName: string; email?: string } | null;
  group?: { id: string; name: string } | null;
}

export interface HomeworkSubmission {
  id: string;
  text: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileType: string | null;
  submittedAt: string;
  status: 'SUBMITTED' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';
  teacherComment: string | null;
  grade: string | null;
}

export interface HomeworkLesson {
  id: string;
  date: string;
  topic: string | null;
  homework: string | null;
  comment: string | null;
  time: string | null;
  group?: { id: string; name: string } | null;
  homeworkSubmissions: HomeworkSubmission[];
}

/** A 4xx from the VK API, carrying the parsed body so the UI can branch on it. */
export class VKApiError extends Error {
  status: number;
  body: any;
  constructor(status: number, body: any) {
    super(body?.error || body?.message || `Request failed (${status})`);
    this.name = 'VKApiError';
    this.status = status;
    this.body = body;
  }
}

function withLaunchParams(endpoint: string): string {
  if (!vkLaunchQuery) return `${API_BASE_URL}${endpoint}`;
  const sep = endpoint.includes('?') ? '&' : '?';
  return `${API_BASE_URL}${endpoint}${sep}${vkLaunchQuery}`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(withLaunchParams(endpoint), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) return null as T;

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new VKApiError(response.status, body);
  }

  return body as T;
}

export const vkApi = {
  /** Check whether the current VK user is linked to a student. */
  auth(): Promise<{ success: true; student: VKStudent }> {
    return request('/vk/auth', { method: 'POST' });
  },

  /** Link the current VK user to a student by Student ID. */
  link(studentId: string, vkUsername?: string): Promise<{ success: true; message: string; student: VKStudent }> {
    return request('/vk/link', {
      method: 'POST',
      body: JSON.stringify({ studentId, vkUsername }),
    });
  },

  /** Get the student's homework + their submissions. */
  homework(): Promise<{ success: true; homework: HomeworkLesson[]; student: { id: string; fullName: string } }> {
    return request('/vk/homework', { method: 'GET' });
  },

  /** Submit (or re-submit) homework for a lesson. */
  submit(
    lessonId: string,
    payload: { text?: string; fileUrl?: string; fileName?: string; fileType?: string }
  ): Promise<{ success: true; message: string; submission: { id: string; submittedAt: string; status: string } }> {
    return request(`/vk/homework/${lessonId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
};
