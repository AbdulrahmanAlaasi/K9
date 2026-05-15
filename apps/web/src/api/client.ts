import type { ApiResponse } from '@k9/shared';

const BASE_URL = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {};
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(url, {
    headers: { ...headers, ...options?.headers },
    ...options,
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    const errorMessage = json?.error?.message ?? `Request failed: ${res.status}`;
    throw new Error(errorMessage);
  }

  return (json as ApiResponse<T>).data;
}

export const api = {
  // Dashboard
  getDashboardStats: () => request<import('@k9/shared').DashboardStats>('/dashboard/stats'),

  // Projects
  getProjects: () => request<import('@k9/shared').Project[]>('/projects'),

  getProject: (id: string) =>
    request<import('@k9/shared').Project & { tests: import('@k9/shared').TestConfig[] }>(
      `/projects/${id}`,
    ),

  createProject: (data: import('@k9/shared').CreateProjectInput) =>
    request<import('@k9/shared').Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateProject: (id: string, data: import('@k9/shared').UpdateProjectInput) =>
    request<import('@k9/shared').Project>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteProject: (id: string) =>
    request<{ deleted: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  // Tests
  getTestConfig: (id: string) =>
    request<import('@k9/shared').TestConfig>(`/tests/${id}`),

  createTestConfig: (projectId: string, data: Omit<import('@k9/shared').CreateTestConfigInput, 'projectId'>) =>
    request<import('@k9/shared').TestConfig>(`/projects/${projectId}/tests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateTestConfig: (id: string, data: import('@k9/shared').UpdateTestConfigInput) =>
    request<import('@k9/shared').TestConfig>(`/tests/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteTestConfig: (id: string) =>
    request<{ deleted: boolean }>(`/tests/${id}`, { method: 'DELETE' }),

  // Runs
  startTestRun: (testId: string) =>
    request<{ runId: string; status: string }>(`/tests/${testId}/run`, { method: 'POST' }),

  cancelTestRun: (runId: string) =>
    request<{ cancelled: boolean }>(`/runs/${runId}/cancel`, { method: 'POST' }),

  getTestRun: (runId: string) =>
    request<import('@k9/shared').TestRun>(`/runs/${runId}`),

  getProjectRuns: (projectId: string) =>
    request<import('@k9/shared').TestRun[]>(`/projects/${projectId}/runs`),

  // Settings
  getSettings: () => request<import('@k9/shared').AppSettings>('/settings'),

  updateSettings: (data: import('@k9/shared').UpdateSettingsInput) =>
    request<import('@k9/shared').AppSettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
