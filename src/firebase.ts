import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  Firestore
} from 'firebase/firestore';
import { getAuth, signInAnonymously, Auth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { ScheduleEntry, ScheduleRequest, Announcement, ActivityLogItem, Resource } from './types';
import { PRELOADED_STAFF, DEFAULT_GUIDELINES, DEFAULT_ANNOUNCEMENTS } from './data/initialData';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(app);

// Use custom firestoreDatabaseId if configured
const configAny = firebaseConfig as Record<string, any>;
export const db: Firestore = configAny.firestoreDatabaseId 
  ? getFirestore(app, configAny.firestoreDatabaseId) 
  : getFirestore(app);

// Anonymous sign in to ensure valid auth context for Firestore
export async function ensureAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
    return true;
  } catch (error) {
    console.warn('Anonymous auth failed or not permitted, falling back:', error);
    return false;
  }
}

// Sanitize helper to recursively remove any undefined fields before writing to Firestore
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: Record<string, any> = {};
    for (const [key, val] of Object.entries(data as Record<string, any>)) {
      if (val !== undefined) {
        cleanObj[key] = sanitizeForFirestore(val);
      }
    }
    return cleanObj as T;
  }
  return data;
}

// Local storage helpers
export function loadLocalData<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

export function saveLocalData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
}

// Cloud Firestore operations
export async function saveScheduleEntryToCloud(entry: ScheduleEntry): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    const sanitized = sanitizeForFirestore(entry);
    await setDoc(doc(db, 'schedule', entry.id), sanitized);
    return true;
  } catch (err) {
    console.error('Error saving schedule entry to cloud:', err);
    return false;
  }
}

export async function deleteScheduleEntryFromCloud(entryId: string): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    await deleteDoc(doc(db, 'schedule', entryId));
    return true;
  } catch (err) {
    console.error('Error deleting schedule entry from cloud:', err);
    return false;
  }
}

export async function saveRequestToCloud(request: ScheduleRequest): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    const sanitized = sanitizeForFirestore(request);
    await setDoc(doc(db, 'requests', request.id), sanitized);
    console.log('Successfully persisted booking request to cloud Firestore:', request.id);
    return true;
  } catch (err) {
    console.error('Error saving request to cloud:', err);
    return false;
  }
}

export async function fetchAllRequestsFromCloud(): Promise<ScheduleRequest[]> {
  try {
    await ensureAuth().catch(() => false);
    const snap = await getDocs(collection(db, 'requests'));
    const requests: ScheduleRequest[] = snap.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as ScheduleRequest));
    return requests;
  } catch (err) {
    console.error('Error fetching requests from cloud:', err);
    return [];
  }
}

export async function deleteRequestFromCloud(requestId: string): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    await deleteDoc(doc(db, 'requests', requestId));
    return true;
  } catch (err) {
    console.error('Error deleting request from cloud:', err);
    return false;
  }
}

export async function saveStaffListToCloud(staff: string[]): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    await setDoc(doc(db, 'settings', 'staff_list'), { list: sanitizeForFirestore(staff) });
    return true;
  } catch (err) {
    console.error('Error saving staff list to cloud:', err);
    return false;
  }
}

export async function saveGuidelinesToCloud(guidelines: string[]): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    await setDoc(doc(db, 'settings', 'guidelines'), { list: sanitizeForFirestore(guidelines) });
    return true;
  } catch (err) {
    console.error('Error saving guidelines to cloud:', err);
    return false;
  }
}

export async function saveAnnouncementsToCloud(announcements: Announcement[]): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    await setDoc(doc(db, 'settings', 'announcements'), { list: sanitizeForFirestore(announcements) });
    return true;
  } catch (err) {
    console.error('Error saving announcements to cloud:', err);
    return false;
  }
}

export async function saveResourcesToCloud(resources: Resource[]): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    await setDoc(doc(db, 'settings', 'resources'), { list: sanitizeForFirestore(resources) });
    return true;
  } catch (err) {
    console.error('Error saving resources to cloud:', err);
    return false;
  }
}

export async function saveActivityLogsToCloud(logs: ActivityLogItem[]): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);
    // Keep the most recent 60 logs
    const trimmed = logs.slice(0, 60);
    await setDoc(doc(db, 'settings', 'activity_logs'), { list: sanitizeForFirestore(trimmed) });
    return true;
  } catch (err) {
    console.error('Error saving activity logs to cloud:', err);
    return false;
  }
}

// Full Cloud Sync
export async function syncAllToCloud(data: {
  schedule: ScheduleEntry[];
  requests: ScheduleRequest[];
  staff: string[];
  guidelines: string[];
  announcements: Announcement[];
  resources?: Resource[];
  activityLogs?: ActivityLogItem[];
  wipeExistingFirst?: boolean;
}): Promise<boolean> {
  try {
    await ensureAuth().catch(() => false);

    // If wiping removed entries (during full restore)
    if (data.wipeExistingFirst) {
      try {
        const existingSched = await getDocs(collection(db, 'schedule'));
        const newSchedIds = new Set(data.schedule.map(s => s.id));
        for (const docItem of existingSched.docs) {
          if (!newSchedIds.has(docItem.id)) {
            await deleteDoc(docItem.ref);
          }
        }

        const existingReqs = await getDocs(collection(db, 'requests'));
        const newReqIds = new Set(data.requests.map(r => r.id));
        for (const reqDoc of existingReqs.docs) {
          if (!newReqIds.has(reqDoc.id)) {
            await deleteDoc(reqDoc.ref);
          }
        }
      } catch (e) {
        console.warn('Wiping non-existent docs skipped or failed:', e);
      }
    }

    // Save settings
    const settingsTasks = [
      setDoc(doc(db, 'settings', 'staff_list'), { list: sanitizeForFirestore(data.staff) }),
      setDoc(doc(db, 'settings', 'guidelines'), { list: sanitizeForFirestore(data.guidelines) }),
      setDoc(doc(db, 'settings', 'announcements'), { list: sanitizeForFirestore(data.announcements) })
    ];

    if (data.resources && data.resources.length > 0) {
      settingsTasks.push(
        setDoc(doc(db, 'settings', 'resources'), { list: sanitizeForFirestore(data.resources) })
      );
    }

    if (data.activityLogs && data.activityLogs.length > 0) {
      settingsTasks.push(
        setDoc(doc(db, 'settings', 'activity_logs'), { list: sanitizeForFirestore(data.activityLogs.slice(0, 80)) })
      );
    }

    await Promise.all(settingsTasks);

    // Save schedules
    for (const item of data.schedule) {
      await setDoc(doc(db, 'schedule', item.id), sanitizeForFirestore(item));
    }

    // Save requests
    for (const req of data.requests) {
      await setDoc(doc(db, 'requests', req.id), sanitizeForFirestore(req));
    }

    return true;
  } catch (err) {
    console.error('Sync all to cloud error:', err);
    return false;
  }
}
