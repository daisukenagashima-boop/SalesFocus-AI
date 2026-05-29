async function req<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `エラー: ${res.status}`);
  return data as T;
}

export const api = {
  meta: () => req<import('../types').Meta>('/api/meta'),
  members: () => req<import('../types').Member[]>('/api/members'),
  addMember: (body: any) => req('/api/members', { method: 'POST', body: JSON.stringify(body) }),
  updateMember: (id: number, body: any) => req(`/api/members/${id}`, { method: 'PUT', body: JSON.stringify(body) }),

  products: () => req<import('../types').Product[]>('/api/products'),
  addProduct: (body: any) => req('/api/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: number, body: any) => req(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteProduct: (id: number) => req(`/api/products/${id}`, { method: 'DELETE' }),

  importExcel: (path?: string) =>
    req<{ months: string[]; targets: number; isTargets: number }>('/api/import/excel', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),

  targets: (month: string) => req<import('../types').Target[]>(`/api/targets?month=${month}`),
  saveTarget: (body: any) => req('/api/targets', { method: 'PUT', body: JSON.stringify(body) }),

  dashboard: (month: string) => req<import('../types').Dashboard>(`/api/dashboard?month=${month}`),

  actuals: (month: string) =>
    req<{ actuals: import('../types').Actual[]; activity: import('../types').ActivityActual[] }>(`/api/actuals?month=${month}`),
  saveActual: (body: any) => req('/api/actuals', { method: 'PUT', body: JSON.stringify(body) }),
  saveActivity: (body: any) => req('/api/activity', { method: 'PUT', body: JSON.stringify(body) }),

  is: (month: string) =>
    req<{ targets: import('../types').IsTarget[]; actuals: import('../types').IsActual[] }>(`/api/is?month=${month}`),
  saveIsActual: (body: any) => req('/api/is/actual', { method: 'PUT', body: JSON.stringify(body) }),

  syncNotion: () => req<any>('/api/notion/sync', { method: 'POST' }),
  syncLog: () => req<import('../types').SyncLog[]>('/api/sync-log'),

  memberDetail: (id: number, month: string) =>
    req<import('../types').MemberDetail>(`/api/member/${id}?month=${month}`),
  saveProgressNote: (body: any) => req('/api/progress-notes', { method: 'PUT', body: JSON.stringify(body) }),
  saveWorkingHours: (body: any) => req('/api/working-hours', { method: 'PUT', body: JSON.stringify(body) }),
  management: (month: string) =>
    req<import('../types').ManagementRow[]>(`/api/management?month=${month}`),
};
