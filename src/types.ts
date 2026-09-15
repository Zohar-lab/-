export type ResourceType = 'lab' | 'cart';

export type BookingType = 'שיעור מערכת' | 'שיבוץ קבוע' | 'שיעור מזדמן' | 'פעילות מיוחדת';

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  capacity: number;
  location: string;
}

export interface ScheduleEntry {
  id: string;
  resourceId: string;
  dayIdx: number;
  day: string;
  periodId: number;
  teacherName: string;
  className: string;
  subject: string;
  type: BookingType | string;
  specificDate?: string;
  createdAt?: string;
}

export interface ScheduleRequest {
  id: string;
  teacherName: string;
  className: string;
  resourceId: string;
  dayIdx: number;
  day: string;
  periodId: number;
  type: BookingType | string;
  specificDate?: string;
  subject: string;
  notes?: string;
  status: 'ממתין' | 'אושר' | 'נדחה';
  createdAt: string;
}

export interface Period {
  id: number;
  label: string;
  time: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type ActionType = 
  | 'ADD_SCHEDULE'
  | 'EDIT_SCHEDULE'
  | 'DELETE_SCHEDULE'
  | 'APPROVE_REQUEST'
  | 'REJECT_REQUEST'
  | 'AUTO_SCHEDULE'
  | 'ADD_STAFF'
  | 'DELETE_STAFF'
  | 'ADD_GUIDELINE'
  | 'DELETE_GUIDELINE'
  | 'ADD_ANNOUNCEMENT'
  | 'DELETE_ANNOUNCEMENT'
  | 'RESTORE_BACKUP'
  | 'UPDATE_RESOURCES';

export interface ActivityLogItem {
  id: string;
  timestamp: string;
  actionType: ActionType;
  title: string;
  description: string;
  canUndo: boolean;
  undone?: boolean;
  undoPayload: {
    previousScheduleEntry?: ScheduleEntry;
    createdScheduleEntryId?: string;
    restoredRequest?: ScheduleRequest;
    autoScheduledEntryIds?: string[];
    autoScheduledRequests?: ScheduleRequest[];
    staffName?: string;
    guidelineText?: string;
    announcement?: Announcement;
    previousResources?: Resource[];
    resources?: Resource[];
    backupSnapshot?: {
      schedule: ScheduleEntry[];
      requests: ScheduleRequest[];
      activityLogs: ActivityLogItem[];
      resources?: Resource[];
    };
  };
}

export interface BackupData {
  version: string;
  exportedAt: string;
  schoolName: string;
  schedule: ScheduleEntry[];
  requests: ScheduleRequest[];
  activityLogs: ActivityLogItem[];
  resources?: Resource[];
  staff?: string[];
  guidelines?: string[];
  announcements?: Announcement[];
  summary?: {
    totalSchedule: number;
    byResource?: Record<string, number>;
    totalRequests: number;
    totalActivityLogs: number;
  };
}

