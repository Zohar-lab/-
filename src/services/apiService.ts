import { ScheduleEntry, ScheduleRequest, Resource, Announcement, ActivityLogItem } from '../types';

export interface SchoolDataResponse {
  schedule: ScheduleEntry[];
  requests: ScheduleRequest[];
  staff: string[];
  guidelines: string[];
  announcements: Announcement[];
  resources: Resource[];
  activityLogs: ActivityLogItem[];
  lastUpdated?: string;
}

export const apiService = {
  // Fetch all shared school data
  async fetchAllData(): Promise<SchoolDataResponse | null> {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('[apiService] fetchAllData failed (fallback to local):', err);
      return null;
    }
  },

  // Fetch only requests (for lightweight polling)
  async fetchRequests(): Promise<ScheduleRequest[] | null> {
    try {
      const res = await fetch('/api/requests');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.requests || [];
    } catch (err) {
      console.warn('[apiService] fetchRequests failed:', err);
      return null;
    }
  },

  // Submit/Add a new request from a teacher
  async submitRequest(request: ScheduleRequest): Promise<{ success: boolean; requests?: ScheduleRequest[] }> {
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, requests: data.requests };
    } catch (err) {
      console.error('[apiService] submitRequest error:', err);
      return { success: false };
    }
  },

  // Delete a request by ID
  async deleteRequest(requestId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/requests/${encodeURIComponent(requestId)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error('[apiService] deleteRequest error:', err);
      return false;
    }
  },

  // Approve a request
  async approveRequest(requestId: string, newEntry: ScheduleEntry): Promise<{ success: boolean; schedule?: ScheduleEntry[]; requests?: ScheduleRequest[] }> {
    try {
      const res = await fetch('/api/requests/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, newEntry })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, schedule: data.schedule, requests: data.requests };
    } catch (err) {
      console.error('[apiService] approveRequest error:', err);
      return { success: false };
    }
  },

  // Reject a request
  async rejectRequest(requestId: string): Promise<boolean> {
    try {
      const res = await fetch('/api/requests/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId })
      });
      return res.ok;
    } catch (err) {
      console.error('[apiService] rejectRequest error:', err);
      return false;
    }
  },

  // Save schedule entry
  async saveScheduleEntry(entry: ScheduleEntry): Promise<boolean> {
    try {
      const res = await fetch('/api/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      return res.ok;
    } catch (err) {
      console.error('[apiService] saveScheduleEntry error:', err);
      return false;
    }
  },

  // Delete schedule entry
  async deleteScheduleEntry(entryId: string): Promise<boolean> {
    try {
      const res = await fetch(`/api/schedule/${encodeURIComponent(entryId)}`, {
        method: 'DELETE'
      });
      return res.ok;
    } catch (err) {
      console.error('[apiService] deleteScheduleEntry error:', err);
      return false;
    }
  },

  // Save settings list (staff, guidelines, announcements, resources, activity_logs)
  async saveSettingsList(key: 'staff' | 'guidelines' | 'announcements' | 'resources' | 'activity_logs', list: any[]): Promise<boolean> {
    try {
      const res = await fetch(`/api/settings/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ list })
      });
      return res.ok;
    } catch (err) {
      console.error(`[apiService] saveSettingsList(${key}) error:`, err);
      return false;
    }
  },

  // Full sync (restore backup, etc.)
  async fullSync(data: {
    schedule?: ScheduleEntry[];
    requests?: ScheduleRequest[];
    staff?: string[];
    guidelines?: string[];
    announcements?: Announcement[];
    resources?: Resource[];
    activityLogs?: ActivityLogItem[];
    mode?: 'overwrite' | 'merge';
  }): Promise<boolean> {
    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return res.ok;
    } catch (err) {
      console.error('[apiService] fullSync error:', err);
      return false;
    }
  }
};
