export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
export const TOKEN_KEY = 'clearflow_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
}

type ApiOptions = RequestInit & { raw?: boolean };

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (!options.raw) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const error: any = new Error('API request failed');
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: 'GET' });
}

export function apiPost<T>(path: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined
  });
}

export function apiPatch<T>(path: string, body?: any): Promise<T> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined
  });
}
