import React, { useState, useEffect, useMemo } from 'react';
import { 
  collection, 
  doc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  db, 
  ensureAuth, 
  loadLocalData, 
  saveLocalData, 
  saveScheduleEntryToCloud, 
  deleteScheduleEntryFromCloud, 
  saveRequestToCloud, 
  deleteRequestFromCloud, 
  fetchAllRequestsFromCloud,
  saveStaffListToCloud, 
  saveGuidelinesToCloud, 
  saveAnnouncementsToCloud, 
  saveActivityLogsToCloud,
  saveResourcesToCloud,
  syncAllToCloud,
  sanitizeForFirestore
} from './firebase';
import { 
  Resource, 
  ScheduleEntry, 
  ScheduleRequest, 
  Announcement,
  ActivityLogItem,
  BackupData
} from './types';
import { 
  RESOURCES, 
  PRELOADED_STAFF, 
  DEFAULT_GUIDELINES, 
  DEFAULT_ANNOUNCEMENTS, 
  DAYS, 
  PERIODS 
} from './data/initialData';
import { Header } from './components/Header';
import { AnnouncementsBanner } from './components/AnnouncementsBanner';
import { ScheduleGrid } from './components/ScheduleGrid';
import { BookingRequestForm } from './components/BookingRequestForm';
import { PendingRequestsView } from './components/PendingRequestsView';
import { AdminPortal } from './components/AdminPortal';
import { EditBookingModal } from './components/EditBookingModal';
import { AdminPasswordModal } from './components/AdminPasswordModal';
import { TeacherBookingPanel } from './components/TeacherBookingPanel';
import { BackupRestoreModal } from './components/BackupRestoreModal';
import { apiService } from './services/apiService';
import { 
  initDriveAuth, 
  getDriveAccessToken, 
  checkAndExecuteDailyBackup, 
  SCOPES 
} from './services/googleDrive';

export default function App() {
  // Check if opened via dedicated teacher-only link (?mode=teacher)
  const isTeacherOnlyMode = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'teacher' || params.get('role') === 'teacher';
  }, []);

  // Navigation & authentication state
  const [activeTab, setActiveTab] = useState<'schedule' | 'request' | 'pending' | 'admin'>('schedule');
  const [selectedResourceId, setSelectedResourceId] = useState<string>('lab-b');
  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    return sessionStorage.getItem('ict_admin_authenticated') === 'true';
  });
  const [adminAuthModalOpen, setAdminAuthModalOpen] = useState<boolean>(false);
  const [backupModalOpen, setBackupModalOpen] = useState<boolean>(false);
  const [pendingAdminSubTab, setPendingAdminSubTab] = useState<'grid-edit' | 'requests' | 'staff' | 'guidelines' | 'announcements' | 'backup'>('grid-edit');
  const [isTeacherPanelOpen, setIsTeacherPanelOpen] = useState<boolean>(true);

  // Pre-fill fields for booking request
  const [requestPreselect, setRequestPreselect] = useState<{
    resourceId?: string;
    dayIdx?: number;
    periodId?: number;
  }>({});

  // Cell edit modal state
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editModalProps, setEditModalProps] = useState<{
    resourceId: string;
    dayIdx: number;
    periodId: number;
    existingEntry?: ScheduleEntry;
  }>({
    resourceId: 'lab-b',
    dayIdx: 0,
    periodId: 1
  });

  // Core Data State (initialized from local storage for fast zero-latency load)
  const [resources, setResources] = useState<Resource[]>(() => 
    loadLocalData('ict_resources', [...RESOURCES])
  );
  const [schedule, setSchedule] = useState<ScheduleEntry[]>(() => 
    loadLocalData('ict_schedule', [])
  );
  const [requests, setRequests] = useState<ScheduleRequest[]>(() => 
    loadLocalData('ict_requests', [])
  );
  const [staffList, setStaffList] = useState<string[]>(() => 
    loadLocalData('ict_staff', [...PRELOADED_STAFF])
  );
  const [guidelines, setGuidelines] = useState<string[]>(() => 
    loadLocalData('ict_guidelines', [...DEFAULT_GUIDELINES])
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => 
    loadLocalData('ict_announcements', [...DEFAULT_ANNOUNCEMENTS])
  );
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>(() => 
    loadLocalData<ActivityLogItem[]>('ict_activity_logs', [])
  );
  const [isUndoingLogId, setIsUndoingLogId] = useState<string | null>(null);

  // Helper to record activity log
  const addActivityLog = async (logData: Omit<ActivityLogItem, 'id' | 'timestamp' | 'undone'>) => {
    const newLog: ActivityLogItem = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      undone: false,
      ...logData
    };
    setActivityLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 60);
      saveLocalData('ict_activity_logs', updated);
      saveActivityLogsToCloud(updated);
      return updated;
    });
    return newLog;
  };

  // Cloud & UI feedback
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'saving' | 'synced' | 'local_only' | 'error'>('synced');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 3500);
  };

  // Real-time Cloud Listeners (Firebase Firestore) & Server API synchronization
  useEffect(() => {
    let unsubscribeSchedule: (() => void) | null = null;
    let unsubscribeRequests: (() => void) | null = null;
    let unsubscribeSettingsStaff: (() => void) | null = null;
    let unsubscribeSettingsGuidelines: (() => void) | null = null;
    let unsubscribeSettingsAnnouncements: (() => void) | null = null;
    let unsubscribeSettingsActivityLogs: (() => void) | null = null;
    let unsubscribeSettingsResources: (() => void) | null = null;
    let isMounted = true;

    // 1. Fetch persistent school data from Server API immediately
    const loadServerData = async () => {
      try {
        const serverData = await apiService.fetchAllData();
        if (serverData && isMounted) {
          // Merge requests with any local requests so no request is ever lost
          if (Array.isArray(serverData.requests)) {
            setRequests(prev => {
              const map = new Map<string, ScheduleRequest>();
              // Keep server requests
              serverData.requests.forEach(r => map.set(r.id, r));
              // Also keep any pending local requests that aren't on server yet
              prev.forEach(r => {
                if (!map.has(r.id)) map.set(r.id, r);
              });
              const merged = Array.from(map.values());
              saveLocalData('ict_requests', merged);
              return merged;
            });
          }
          if (Array.isArray(serverData.schedule) && serverData.schedule.length > 0) {
            setSchedule(serverData.schedule);
            saveLocalData('ict_schedule', serverData.schedule);
          }
          if (Array.isArray(serverData.staff) && serverData.staff.length > 0) {
            setStaffList(serverData.staff);
            saveLocalData('ict_staff', serverData.staff);
          }
          if (Array.isArray(serverData.guidelines) && serverData.guidelines.length > 0) {
            setGuidelines(serverData.guidelines);
            saveLocalData('ict_guidelines', serverData.guidelines);
          }
          if (Array.isArray(serverData.announcements) && serverData.announcements.length > 0) {
            setAnnouncements(serverData.announcements);
            saveLocalData('ict_announcements', serverData.announcements);
          }
          if (Array.isArray(serverData.resources) && serverData.resources.length > 0) {
            setResources(serverData.resources);
            saveLocalData('ict_resources', serverData.resources);
          }
          if (Array.isArray(serverData.activityLogs) && serverData.activityLogs.length > 0) {
            setActivityLogs(serverData.activityLogs);
            saveLocalData('ict_activity_logs', serverData.activityLogs);
          }
          setCloudStatus('synced');
        }
      } catch (err) {
        console.warn('Initial server data load warning:', err);
      }
    };

    loadServerData();

    // 2. Poll server every 3 seconds for new teacher requests across all devices
    const pollTimer = setInterval(async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const latestReqs = await apiService.fetchRequests();
        if (latestReqs && Array.isArray(latestReqs) && isMounted) {
          setRequests(prev => {
            // Only update if list has changed
            const prevIds = prev.map(r => r.id).sort().join(',');
            const newIds = latestReqs.map(r => r.id).sort().join(',');
            if (prevIds !== newIds || prev.length !== latestReqs.length) {
              saveLocalData('ict_requests', latestReqs);
              return latestReqs;
            }
            return prev;
          });
        }
      } catch {
        // Silent poll error
      }
    }, 3000);

    async function setupListeners() {
      try {
        await ensureAuth();
        setCloudStatus('connected');

        // 1. Listen to schedule collection
        unsubscribeSchedule = onSnapshot(
          collection(db, 'schedule'),
          (snapshot) => {
            if (!snapshot.empty) {
              const cloudSchedule: ScheduleEntry[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
              } as ScheduleEntry));
              setSchedule(cloudSchedule);
              saveLocalData('ict_schedule', cloudSchedule);
            }
          },
          (err) => {
            console.warn('Schedule cloud sync warning:', err);
            setCloudStatus('local_only');
          }
        );

        // 2. Listen to requests collection across all users/accounts in real-time
        unsubscribeRequests = onSnapshot(
          collection(db, 'requests'),
          (snapshot) => {
            if (!snapshot.empty) {
              const cloudRequests: ScheduleRequest[] = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
              } as ScheduleRequest));
              // Merge requests by ID - NEVER wipe existing requests with an incomplete snapshot
              setRequests(prev => {
                const map = new Map<string, ScheduleRequest>();
                prev.forEach(r => map.set(r.id, r));
                cloudRequests.forEach(r => map.set(r.id, r));
                const merged = Array.from(map.values());
                saveLocalData('ict_requests', merged);
                return merged;
              });
            }
          },
          (err) => {
            console.warn('Requests cloud sync warning:', err);
          }
        );

        // 3. Listen to settings docs
        unsubscribeSettingsStaff = onSnapshot(doc(db, 'settings', 'staff_list'), (docSnap) => {
          if (docSnap.exists() && docSnap.data().list) {
            const list = docSnap.data().list;
            setStaffList(list);
            saveLocalData('ict_staff', list);
          }
        });

        unsubscribeSettingsGuidelines = onSnapshot(doc(db, 'settings', 'guidelines'), (docSnap) => {
          if (docSnap.exists() && docSnap.data().list) {
            const list = docSnap.data().list;
            setGuidelines(list);
            saveLocalData('ict_guidelines', list);
          }
        });

        unsubscribeSettingsAnnouncements = onSnapshot(doc(db, 'settings', 'announcements'), (docSnap) => {
          if (docSnap.exists() && docSnap.data().list) {
            const list = docSnap.data().list;
            setAnnouncements(list);
            saveLocalData('ict_announcements', list);
          }
        });

        unsubscribeSettingsActivityLogs = onSnapshot(doc(db, 'settings', 'activity_logs'), (docSnap) => {
          if (docSnap.exists() && docSnap.data().list) {
            const list = docSnap.data().list;
            setActivityLogs(list);
            saveLocalData('ict_activity_logs', list);
          }
        });

        unsubscribeSettingsResources = onSnapshot(doc(db, 'settings', 'resources'), (docSnap) => {
          if (docSnap.exists() && docSnap.data().list) {
            const list = docSnap.data().list;
            if (Array.isArray(list) && list.length > 0) {
              setResources(list);
              saveLocalData('ict_resources', list);
            }
          }
        });

      } catch (e) {
        console.warn('Firestore subscription fallback to local:', e);
        setCloudStatus('local_only');
      }
    }

    setupListeners();

    return () => {
      isMounted = false;
      clearInterval(pollTimer);
      if (unsubscribeSchedule) unsubscribeSchedule();
      if (unsubscribeRequests) unsubscribeRequests();
      if (unsubscribeSettingsStaff) unsubscribeSettingsStaff();
      if (unsubscribeSettingsGuidelines) unsubscribeSettingsGuidelines();
      if (unsubscribeSettingsAnnouncements) unsubscribeSettingsAnnouncements();
      if (unsubscribeSettingsActivityLogs) unsubscribeSettingsActivityLogs();
      if (unsubscribeSettingsResources) unsubscribeSettingsResources();
    };
  }, []);

  // Listen to Google Drive auth state
  useEffect(() => {
    const unsubDrive = initDriveAuth();
    return () => {
      if (typeof unsubDrive === 'function') unsubDrive();
    };
  }, []);

  // Automatic daily backup runner when app is active and Google Drive token is present
  useEffect(() => {
    const performAutoDailyCheck = async () => {
      const token = getDriveAccessToken();
      if (!token || schedule.length === 0) return;

      const currentData: BackupData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        schoolName: 'חנה סנש',
        schedule,
        requests,
        resources,
        activityLogs,
        staff: staffList,
        guidelines,
        announcements,
        summary: {
          totalSchedule: schedule.length,
          totalRequests: requests.length,
          totalActivityLogs: activityLogs.length
        }
      };

      try {
        const res = await checkAndExecuteDailyBackup(currentData, token);
        if (res.performed) {
          showToast(res.message, 'success');
        }
      } catch (err) {
        console.warn('Auto daily backup error:', err);
      }
    };

    const timer = setTimeout(performAutoDailyCheck, 3500);
    return () => clearTimeout(timer);
  }, [schedule.length, requests.length]);

  // Admin Login/Logout
  const handleAdminAuthSuccess = () => {
    setIsAdmin(true);
    sessionStorage.setItem('ict_admin_authenticated', 'true');
    setAdminAuthModalOpen(false);
    setActiveTab('admin');
    showToast('התחברת בהצלחה כמנהל/ת מערכת 🔓');
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem('ict_admin_authenticated');
    if (activeTab === 'admin') setActiveTab('schedule');
    showToast('התנתקת ממצב מנהל/ת');
  };

  // Schedule Grid Cell Click Handler
  const handleCellClick = (
    resourceId: string, 
    dayIdx: number, 
    periodId: number, 
    existingEntry?: ScheduleEntry
  ) => {
    if (isAdmin) {
      setEditModalProps({ resourceId, dayIdx, periodId, existingEntry });
      setEditModalOpen(true);
    } else {
      // In teacher mode, if slot is clicked, pre-fill request form
      setRequestPreselect({ resourceId, dayIdx, periodId });
      setActiveTab('request');
    }
  };

  // Save Schedule Entry (Admin)
  const handleSaveScheduleEntry = async (entry: ScheduleEntry) => {
    setCloudStatus('saving');
    // Check if replacing an existing entry
    const existing = schedule.find(s => 
      s.id === entry.id ||
      (s.resourceId === entry.resourceId && 
        Number(s.dayIdx) === Number(entry.dayIdx) && 
        Number(s.periodId) === Number(entry.periodId))
    );

    // 1. Update local state immediately
    const updated = schedule.filter(s => 
      !(s.resourceId === entry.resourceId && 
        Number(s.dayIdx) === Number(entry.dayIdx) && 
        Number(s.periodId) === Number(entry.periodId)) &&
      s.id !== entry.id
    );
    updated.push(entry);
    setSchedule(updated);
    saveLocalData('ict_schedule', updated);

    // 2. Persist to Server API & Firebase
    apiService.saveScheduleEntry(entry).catch(() => {});
    const success = await saveScheduleEntryToCloud(entry);
    setCloudStatus(success ? 'synced' : 'local_only');

    // 3. Record Activity Log with undo capability
    const resName = RESOURCES.find(r => r.id === entry.resourceId)?.name || entry.resourceId;
    const dayName = DAYS[entry.dayIdx] || entry.day;
    if (existing) {
      addActivityLog({
        actionType: 'EDIT_SCHEDULE',
        title: 'עריכת שיבוץ בלוח',
        description: `${entry.teacherName} (${entry.className}) ב-${resName} (${dayName}, שעה ${entry.periodId})`,
        canUndo: true,
        undoPayload: {
          previousScheduleEntry: existing,
          createdScheduleEntryId: entry.id
        }
      });
    } else {
      addActivityLog({
        actionType: 'ADD_SCHEDULE',
        title: 'הוספת שיבוץ חדש ללוח',
        description: `${entry.teacherName} (${entry.className}) ב-${resName} (${dayName}, שעה ${entry.periodId})`,
        canUndo: true,
        undoPayload: {
          createdScheduleEntryId: entry.id
        }
      });
    }

    showToast('השיבוץ נשמר בהצלחה בענן! 💾');
  };

  // Delete Schedule Entry (Admin)
  const handleDeleteScheduleEntry = async (entryId: string) => {
    const toDelete = schedule.find(s => s.id === entryId);
    setCloudStatus('saving');
    const updated = schedule.filter(s => s.id !== entryId);
    setSchedule(updated);
    saveLocalData('ict_schedule', updated);

    // Server API & Cloud
    apiService.deleteScheduleEntry(entryId).catch(() => {});
    const success = await deleteScheduleEntryFromCloud(entryId);
    setCloudStatus(success ? 'synced' : 'local_only');

    if (toDelete) {
      const resName = RESOURCES.find(r => r.id === toDelete.resourceId)?.name || toDelete.resourceId;
      const dayName = DAYS[toDelete.dayIdx] || toDelete.day;
      addActivityLog({
        actionType: 'DELETE_SCHEDULE',
        title: 'מחיקת שיבוץ מהלוח',
        description: `הוסר: ${toDelete.teacherName} (${toDelete.className}) מ-${resName} (${dayName}, שעה ${toDelete.periodId})`,
        canUndo: true,
        undoPayload: {
          previousScheduleEntry: toDelete
        }
      });
    }

    showToast('השיבוץ הוסר מלוח השעות 🗑️');
  };

  // Submit Booking Request (Teacher or Admin)
  const handleSubmitRequest = async (request: ScheduleRequest) => {
    setCloudStatus('saving');
    
    // Ensure guaranteed unique ID
    const reqId = request.id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const fullRequest: ScheduleRequest = {
      ...request,
      id: reqId,
      status: request.status || 'ממתין',
      createdAt: request.createdAt || new Date().toISOString()
    };

    // Sanitize request to prevent Firestore/JSON errors with undefined values
    const cleanRequest = sanitizeForFirestore(fullRequest);

    // 1. Immediately update local state and local storage (instant responsive UI)
    setRequests(prev => {
      const updated = [...prev.filter(r => r.id !== cleanRequest.id), cleanRequest];
      saveLocalData('ict_requests', updated);
      return updated;
    });

    // 2. Persist to central Server API (preserves ALL requests across all devices)
    try {
      const serverRes = await apiService.submitRequest(cleanRequest);
      if (serverRes.success && serverRes.requests) {
        setRequests(serverRes.requests);
        saveLocalData('ict_requests', serverRes.requests);
      }
    } catch (err) {
      console.warn('Server API save request warning:', err);
    }

    // 3. Background sync to Firestore cloud if available
    saveRequestToCloud(cleanRequest).catch((err) => {
      console.warn('Firestore background save warning:', err);
    });

    setCloudStatus('synced');
    showToast('הבקשה נשלחה ונשמרה בהצלחה! כל המורים והרכזת רואים אותה בזמן אמת 🚀');
  };

  // Approve Request (Admin)
  const handleApproveRequest = async (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    if (!req) return;

    setCloudStatus('saving');

    // 1. Prepare new schedule entry
    const newEntry: ScheduleEntry = {
      id: `sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      resourceId: req.resourceId,
      dayIdx: req.dayIdx !== undefined ? Number(req.dayIdx) : DAYS.indexOf(req.day),
      day: req.day || DAYS[req.dayIdx] || "יום א'",
      periodId: Number(req.periodId),
      teacherName: req.teacherName,
      className: req.className,
      subject: req.subject,
      type: req.type || 'שיבוץ קבוע',
      createdAt: new Date().toISOString()
    };
    if (req.specificDate) {
      newEntry.specificDate = req.specificDate;
    }

    // 2. Remove from requests & Add to schedule (local state)
    const updatedReqs = requests.filter(r => r.id !== requestId);
    setRequests(updatedReqs);
    saveLocalData('ict_requests', updatedReqs);

    const updatedSched = schedule.filter(s => 
      !(s.resourceId === newEntry.resourceId && 
        Number(s.dayIdx) === Number(newEntry.dayIdx) && 
        Number(s.periodId) === Number(newEntry.periodId))
    );
    updatedSched.push(newEntry);
    setSchedule(updatedSched);
    saveLocalData('ict_schedule', updatedSched);

    // 3. Atomically update Server API
    apiService.approveRequest(requestId, newEntry).then(res => {
      if (res.success) {
        if (res.requests) setRequests(res.requests);
        if (res.schedule) setSchedule(res.schedule);
      }
    }).catch(() => {});

    // 4. Update cloud Firestore
    deleteRequestFromCloud(requestId).catch(() => {});
    saveScheduleEntryToCloud(newEntry).catch(() => {});

    // 3. Record Activity Log with undo capability
    const resName = RESOURCES.find(r => r.id === req.resourceId)?.name || req.resourceId;
    const dayName = DAYS[newEntry.dayIdx] || newEntry.day;
    addActivityLog({
      actionType: 'APPROVE_REQUEST',
      title: 'אישור בקשת שיבוץ',
      description: `אושר: ${req.teacherName} (${req.className}) ב-${resName} (${dayName}, שעה ${newEntry.periodId})`,
      canUndo: true,
      undoPayload: {
        createdScheduleEntryId: newEntry.id,
        restoredRequest: req
      }
    });

    setCloudStatus('synced');
    showToast(`הבקשה של ${req.teacherName} אושרה ושובצה בלוח! ✅`);
  };

  // Reject Request (Admin)
  const handleRejectRequest = async (requestId: string) => {
    const req = requests.find(r => r.id === requestId);
    setCloudStatus('saving');
    const updated = requests.filter(r => r.id !== requestId);
    setRequests(updated);
    saveLocalData('ict_requests', updated);

    // Server API & Cloud sync
    apiService.rejectRequest(requestId).catch(() => {});
    deleteRequestFromCloud(requestId).catch(() => {});
    setCloudStatus('synced');

    if (req) {
      const resName = RESOURCES.find(r => r.id === req.resourceId)?.name || req.resourceId;
      addActivityLog({
        actionType: 'REJECT_REQUEST',
        title: 'דחיית בקשת שיבוץ',
        description: `נדחה: ${req.teacherName} (${req.className}) ב-${resName}`,
        canUndo: true,
        undoPayload: {
          restoredRequest: req
        }
      });
    }

    showToast('הבקשה נדחתה והוסרה');
  };

  // Auto-Scheduler Engine (Admin)
  const handleRunAutoScheduler = async () => {
    const pending = requests.filter(r => r.status === 'ממתין' || !r.status);
    if (pending.length === 0) {
      showToast('אין בקשות ממתינות לשיבוץ אוטומטי', 'info');
      return;
    }

    setCloudStatus('saving');
    let approvedCount = 0;
    const newEntries: ScheduleEntry[] = [];
    const approvedRequestIds: string[] = [];

    const currentSchedule = [...schedule];

    for (const req of pending) {
      const dayIdx = req.dayIdx !== undefined ? Number(req.dayIdx) : DAYS.indexOf(req.day);
      const dayStr = req.day || DAYS[dayIdx] || "יום א'";
      const periodId = Number(req.periodId);

      // Check if slot is occupied
      const isOccupied = currentSchedule.some(s => 
        s.resourceId === req.resourceId && 
        (Number(s.dayIdx) === dayIdx || s.day === dayStr) && 
        Number(s.periodId) === periodId
      );

      if (!isOccupied) {
        const newSchedItem: ScheduleEntry = {
          id: `sched-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          resourceId: req.resourceId,
          dayIdx,
          day: dayStr,
          periodId,
          teacherName: req.teacherName,
          className: req.className,
          subject: req.subject,
          type: req.type || 'שיבוץ קבוע',
          specificDate: req.specificDate,
          createdAt: new Date().toISOString()
        };

        currentSchedule.push(newSchedItem);
        newEntries.push(newSchedItem);
        approvedRequestIds.push(req.id);
        approvedCount++;
      }
    }

    if (approvedCount > 0) {
      // Save schedule
      setSchedule(currentSchedule);
      saveLocalData('ict_schedule', currentSchedule);

      // Remove approved requests
      const remainingReqs = requests.filter(r => !approvedRequestIds.includes(r.id));
      setRequests(remainingReqs);
      saveLocalData('ict_requests', remainingReqs);

      // Persist to Server API & Cloud
      for (const item of newEntries) {
        apiService.saveScheduleEntry(item).catch(() => {});
        await saveScheduleEntryToCloud(item);
      }
      for (const id of approvedRequestIds) {
        apiService.deleteRequest(id).catch(() => {});
        await deleteRequestFromCloud(id);
      }

      addActivityLog({
        actionType: 'AUTO_SCHEDULE',
        title: 'שיבוץ אוטומטי מהיר',
        description: `שובצו בהצלחה ${approvedCount} בקשות ממתינות ללוח`,
        canUndo: true,
        undoPayload: {
          autoScheduledEntryIds: newEntries.map(e => e.id),
          autoScheduledRequests: pending.filter(r => approvedRequestIds.includes(r.id))
        }
      });

      setCloudStatus('synced');
      showToast(`⚡ שיבוץ אוטומטי הושלם! ${approvedCount} בקשות שובצו בהצלחה.`);
    } else {
      setCloudStatus('synced');
      showToast('כל השעות המבוקשות תפוסות בלוח. לא ניתן לשבץ אוטומטית.', 'info');
    }
  };

  // Staff Management (Admin)
  const handleAddStaff = async (name: string) => {
    if (staffList.includes(name)) {
      showToast('מורה זה כבר קיים ברשימה', 'info');
      return;
    }
    const updated = [...staffList, name].sort();
    setStaffList(updated);
    saveLocalData('ict_staff', updated);
    await saveStaffListToCloud(updated);
    addActivityLog({
      actionType: 'ADD_STAFF',
      title: 'הוספת מורה לצוות',
      description: `נוסף/ה: ${name}`,
      canUndo: true,
      undoPayload: { staffName: name }
    });
    showToast(`המורה ${name} נוסף/ה בהצלחה`);
  };

  const handleDeleteStaff = async (name: string) => {
    const updated = staffList.filter(s => s !== name);
    setStaffList(updated);
    saveLocalData('ict_staff', updated);
    await saveStaffListToCloud(updated);
    addActivityLog({
      actionType: 'DELETE_STAFF',
      title: 'הסרת מורה מהצוות',
      description: `הוסר/ה: ${name}`,
      canUndo: true,
      undoPayload: { staffName: name }
    });
    showToast(`המורה ${name} הוסר/ה`);
  };

  // Guidelines Management (Admin)
  const handleAddGuideline = async (text: string) => {
    const updated = [...guidelines, text];
    setGuidelines(updated);
    saveLocalData('ict_guidelines', updated);
    await saveGuidelinesToCloud(updated);
    addActivityLog({
      actionType: 'ADD_GUIDELINE',
      title: 'הוספת הנחיית תקשוב',
      description: text,
      canUndo: true,
      undoPayload: { guidelineText: text }
    });
    showToast('הנחיה חדשה נוספה למערכת');
  };

  const handleDeleteGuideline = async (text: string) => {
    const updated = guidelines.filter(g => g !== text);
    setGuidelines(updated);
    saveLocalData('ict_guidelines', updated);
    await saveGuidelinesToCloud(updated);
    addActivityLog({
      actionType: 'DELETE_GUIDELINE',
      title: 'הסרת הנחיית תקשוב',
      description: text,
      canUndo: true,
      undoPayload: { guidelineText: text }
    });
    showToast('ההנחיה הוסרה');
  };

  // Announcements Management (Admin)
  const handleAddAnnouncement = async (ann: Announcement) => {
    const updated = [ann, ...announcements];
    setAnnouncements(updated);
    saveLocalData('ict_announcements', updated);
    await saveAnnouncementsToCloud(updated);
    addActivityLog({
      actionType: 'ADD_ANNOUNCEMENT',
      title: 'פרסום מבזק תקשוב',
      description: ann.title,
      canUndo: true,
      undoPayload: { announcement: ann }
    });
    showToast('ההודעה פורסמה בהצלחה');
  };

  const handleDeleteAnnouncement = async (id: string) => {
    const target = announcements.find(a => a.id === id);
    const updated = announcements.filter(a => a.id !== id);
    setAnnouncements(updated);
    saveLocalData('ict_announcements', updated);
    await saveAnnouncementsToCloud(updated);
    if (target) {
      addActivityLog({
        actionType: 'DELETE_ANNOUNCEMENT',
        title: 'מחיקת מבזק תקשוב',
        description: target.title,
        canUndo: true,
        undoPayload: { announcement: target }
      });
    }
    showToast('ההודעה הוסרה');
  };

  // Resources & Capacity Management (Admin)
  const handleSaveResources = async (updatedResources: Resource[]) => {
    setCloudStatus('saving');
    const prevResources = [...resources];
    try {
      setResources(updatedResources);
      saveLocalData('ict_resources', updatedResources);
      await saveResourcesToCloud(updatedResources);
      addActivityLog({
        actionType: 'UPDATE_RESOURCES',
        title: 'עדכון משאבים וכמויות מחשבים',
        description: `עודכנו פרטי המשאבים וכמויות המחשבים בכל חדר/עגלה (${updatedResources.length} משאבים)`,
        canUndo: true,
        undoPayload: {
          previousResources: prevResources,
          resources: updatedResources
        }
      });
      setCloudStatus('synced');
      showToast('המשאבים וכמויות המחשבים נשמרו בהצלחה בענן ובמערכת! 💾');
    } catch (err) {
      console.error('Failed to save resources:', err);
      setCloudStatus('error');
      showToast('שגיאה בשמירת המשאבים בענן', 'error');
    }
  };

  // Undo Action Handler (Reverts action from Activity Log)
  const handleUndoAction = async (logId: string) => {
    const logItem = activityLogs.find(l => l.id === logId);
    if (!logItem) return;
    if (logItem.undone) {
      showToast('פעולה זו כבר בוטלה בעבר', 'info');
      return;
    }

    setIsUndoingLogId(logId);
    setCloudStatus('saving');

    try {
      const { undoPayload, actionType } = logItem;

      switch (actionType) {
        case 'APPROVE_REQUEST': {
          // 1. Remove created schedule entry
          if (undoPayload.createdScheduleEntryId) {
            const updatedSched = schedule.filter(s => s.id !== undoPayload.createdScheduleEntryId);
            setSchedule(updatedSched);
            saveLocalData('ict_schedule', updatedSched);
            await deleteScheduleEntryFromCloud(undoPayload.createdScheduleEntryId);
          }
          // 2. Restore request to requests with status 'ממתין'
          if (undoPayload.restoredRequest) {
            const restoredReq: ScheduleRequest = {
              ...undoPayload.restoredRequest,
              status: 'ממתין'
            };
            const updatedReqs = [...requests.filter(r => r.id !== restoredReq.id), restoredReq];
            setRequests(updatedReqs);
            saveLocalData('ict_requests', updatedReqs);
            await saveRequestToCloud(restoredReq);
          }
          break;
        }

        case 'REJECT_REQUEST': {
          // Restore request back to pending
          if (undoPayload.restoredRequest) {
            const restoredReq: ScheduleRequest = {
              ...undoPayload.restoredRequest,
              status: 'ממתין'
            };
            const updatedReqs = [...requests.filter(r => r.id !== restoredReq.id), restoredReq];
            setRequests(updatedReqs);
            saveLocalData('ict_requests', updatedReqs);
            await saveRequestToCloud(restoredReq);
          }
          break;
        }

        case 'ADD_SCHEDULE': {
          if (undoPayload.createdScheduleEntryId) {
            const updatedSched = schedule.filter(s => s.id !== undoPayload.createdScheduleEntryId);
            setSchedule(updatedSched);
            saveLocalData('ict_schedule', updatedSched);
            await deleteScheduleEntryFromCloud(undoPayload.createdScheduleEntryId);
          }
          break;
        }

        case 'EDIT_SCHEDULE': {
          // Revert to previous schedule entry
          if (undoPayload.previousScheduleEntry) {
            const entryIdToRemove = undoPayload.createdScheduleEntryId || undoPayload.previousScheduleEntry.id;
            const updatedSched = [
              ...schedule.filter(s => s.id !== entryIdToRemove && s.id !== undoPayload.previousScheduleEntry!.id),
              undoPayload.previousScheduleEntry
            ];
            setSchedule(updatedSched);
            saveLocalData('ict_schedule', updatedSched);
            if (undoPayload.createdScheduleEntryId && undoPayload.createdScheduleEntryId !== undoPayload.previousScheduleEntry.id) {
              await deleteScheduleEntryFromCloud(undoPayload.createdScheduleEntryId);
            }
            await saveScheduleEntryToCloud(undoPayload.previousScheduleEntry);
          }
          break;
        }

        case 'DELETE_SCHEDULE': {
          // Restore deleted entry
          if (undoPayload.previousScheduleEntry) {
            const updatedSched = [
              ...schedule.filter(s => s.id !== undoPayload.previousScheduleEntry!.id),
              undoPayload.previousScheduleEntry
            ];
            setSchedule(updatedSched);
            saveLocalData('ict_schedule', updatedSched);
            await saveScheduleEntryToCloud(undoPayload.previousScheduleEntry);
          }
          break;
        }

        case 'AUTO_SCHEDULE': {
          // 1. Delete all auto scheduled entries
          if (undoPayload.autoScheduledEntryIds && undoPayload.autoScheduledEntryIds.length > 0) {
            const idsToDelete = new Set(undoPayload.autoScheduledEntryIds);
            const updatedSched = schedule.filter(s => !idsToDelete.has(s.id));
            setSchedule(updatedSched);
            saveLocalData('ict_schedule', updatedSched);
            for (const id of undoPayload.autoScheduledEntryIds) {
              await deleteScheduleEntryFromCloud(id);
            }
          }
          // 2. Restore all requests
          if (undoPayload.autoScheduledRequests && undoPayload.autoScheduledRequests.length > 0) {
            const restoredList = undoPayload.autoScheduledRequests.map(r => ({ ...r, status: 'ממתין' as const }));
            const existingIds = new Set(restoredList.map(r => r.id));
            const updatedReqs = [...requests.filter(r => !existingIds.has(r.id)), ...restoredList];
            setRequests(updatedReqs);
            saveLocalData('ict_requests', updatedReqs);
            for (const r of restoredList) {
              await saveRequestToCloud(r);
            }
          }
          break;
        }

        case 'ADD_STAFF': {
          if (undoPayload.staffName) {
            const updated = staffList.filter(s => s !== undoPayload.staffName);
            setStaffList(updated);
            saveLocalData('ict_staff', updated);
            await saveStaffListToCloud(updated);
          }
          break;
        }

        case 'DELETE_STAFF': {
          if (undoPayload.staffName && !staffList.includes(undoPayload.staffName)) {
            const updated = [...staffList, undoPayload.staffName].sort();
            setStaffList(updated);
            saveLocalData('ict_staff', updated);
            await saveStaffListToCloud(updated);
          }
          break;
        }

        case 'ADD_GUIDELINE': {
          if (undoPayload.guidelineText) {
            const updated = guidelines.filter(g => g !== undoPayload.guidelineText);
            setGuidelines(updated);
            saveLocalData('ict_guidelines', updated);
            await saveGuidelinesToCloud(updated);
          }
          break;
        }

        case 'DELETE_GUIDELINE': {
          if (undoPayload.guidelineText) {
            const updated = [...guidelines, undoPayload.guidelineText];
            setGuidelines(updated);
            saveLocalData('ict_guidelines', updated);
            await saveGuidelinesToCloud(updated);
          }
          break;
        }

        case 'ADD_ANNOUNCEMENT': {
          if (undoPayload.announcement) {
            const updated = announcements.filter(a => a.id !== undoPayload.announcement!.id);
            setAnnouncements(updated);
            saveLocalData('ict_announcements', updated);
            await saveAnnouncementsToCloud(updated);
          }
          break;
        }

        case 'DELETE_ANNOUNCEMENT': {
          if (undoPayload.announcement) {
            const updated = [undoPayload.announcement, ...announcements.filter(a => a.id !== undoPayload.announcement!.id)];
            setAnnouncements(updated);
            saveLocalData('ict_announcements', updated);
            await saveAnnouncementsToCloud(updated);
          }
          break;
        }

        case 'UPDATE_RESOURCES': {
          if (undoPayload.previousResources) {
            const restored = undoPayload.previousResources;
            setResources(restored);
            saveLocalData('ict_resources', restored);
            await saveResourcesToCloud(restored);
          }
          break;
        }

        case 'RESTORE_BACKUP': {
          if (undoPayload.backupSnapshot) {
            const { schedule: prevSched, requests: prevReqs, resources: prevResources, activityLogs: prevLogs } = undoPayload.backupSnapshot;
            if (prevSched) {
              setSchedule(prevSched);
              saveLocalData('ict_schedule', prevSched);
            }
            if (prevReqs) {
              setRequests(prevReqs);
              saveLocalData('ict_requests', prevReqs);
            }
            if (prevResources) {
              setResources(prevResources);
              saveLocalData('ict_resources', prevResources);
            }
            if (prevLogs) {
              setActivityLogs(prevLogs);
              saveLocalData('ict_activity_logs', prevLogs);
            }
            await syncAllToCloud({
              schedule: prevSched || [],
              requests: prevReqs || [],
              resources: prevResources,
              staff: staffList,
              guidelines,
              announcements,
              activityLogs: prevLogs,
              wipeExistingFirst: true
            });
          }
          break;
        }
      }

      // Mark log item as undone
      setActivityLogs(prevLogs => {
        const updatedLogs = prevLogs.map(l => l.id === logId ? { ...l, undone: true } : l);
        saveLocalData('ict_activity_logs', updatedLogs);
        saveActivityLogsToCloud(updatedLogs);
        return updatedLogs;
      });

      setCloudStatus('synced');
      showToast(`הפעולה "${logItem.title}" בוטלה בהצלחה ושוחזר המצב הקודם ↩️`);
    } catch (err) {
      console.error('Error undoing action:', err);
      showToast('אירעה שגיאה בעת ביטול הפעולה', 'error');
    } finally {
      setIsUndoingLogId(null);
    }
  };

  // Restore backup handler (Full Overwrite or Merge)
  const handleRestoreBackup = async (backupData: BackupData, mode: 'overwrite' | 'merge') => {
    setIsSyncing(true);
    setCloudStatus('saving');

    try {
      // 1. Snapshot previous state for undo capability
      const previousSnapshot = {
        schedule: [...schedule],
        requests: [...requests],
        resources: [...resources],
        activityLogs: [...activityLogs]
      };

      let newSchedule: ScheduleEntry[] = [];
      let newRequests: ScheduleRequest[] = [];
      let newLogs: ActivityLogItem[] = [];

      if (mode === 'overwrite') {
        newSchedule = backupData.schedule || [];
        newRequests = backupData.requests || [];
        newLogs = backupData.activityLogs || [];
      } else {
        // Merge mode - schedule: keep existing, add new if slot is free
        const existingSchedMap = new Map<string, ScheduleEntry>(
          schedule.map(s => [`${s.resourceId}-${s.dayIdx}-${s.periodId}`, s] as [string, ScheduleEntry])
        );
        const incomingSched = backupData.schedule || [];
        incomingSched.forEach(item => {
          const key = `${item.resourceId}-${item.dayIdx}-${item.periodId}`;
          if (!existingSchedMap.has(key)) {
            existingSchedMap.set(key, item);
          }
        });
        newSchedule = Array.from(existingSchedMap.values());

        // Merge requests by ID
        const existingReqMap = new Map<string, ScheduleRequest>(
          requests.map(r => [r.id, r] as [string, ScheduleRequest])
        );
        (backupData.requests || []).forEach(r => {
          existingReqMap.set(r.id, r);
        });
        newRequests = Array.from(existingReqMap.values());

        // Merge activity logs
        const existingLogIds = new Set(activityLogs.map(l => l.id));
        const incomingLogs = (backupData.activityLogs || []).filter(l => !existingLogIds.has(l.id));
        newLogs = [...incomingLogs, ...activityLogs];
      }

      const newResources = backupData.resources && backupData.resources.length > 0 ? backupData.resources : resources;
      const newStaff = backupData.staff && backupData.staff.length > 0 ? backupData.staff : staffList;
      const newGuidelines = backupData.guidelines && backupData.guidelines.length > 0 ? backupData.guidelines : guidelines;
      const newAnnouncements = backupData.announcements && backupData.announcements.length > 0 ? backupData.announcements : announcements;

      // Create undoable log item
      const restoreLog: ActivityLogItem = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        actionType: 'RESTORE_BACKUP',
        title: mode === 'overwrite' ? 'שחזור גיבוי מלא (החלפה)' : 'מיזוג נתוני גיבוי',
        description: `שוחזרו ${newSchedule.length} שיבוצים, ${newRequests.length} בקשות, ${newResources.length} משאבים ו-${newLogs.length} רשומות היסטוריה`,
        canUndo: true,
        undoPayload: {
          backupSnapshot: previousSnapshot
        }
      };

      const finalLogs = [restoreLog, ...newLogs];

      // Update state
      setSchedule(newSchedule);
      setRequests(newRequests);
      setResources(newResources);
      setActivityLogs(finalLogs);
      setStaffList(newStaff);
      setGuidelines(newGuidelines);
      setAnnouncements(newAnnouncements);

      // Save to local storage
      saveLocalData('ict_schedule', newSchedule);
      saveLocalData('ict_requests', newRequests);
      saveLocalData('ict_resources', newResources);
      saveLocalData('ict_activity_logs', finalLogs);
      saveLocalData('ict_staff', newStaff);
      saveLocalData('ict_guidelines', newGuidelines);
      saveLocalData('ict_announcements', newAnnouncements);

      // Sync to Server API & cloud Firestore
      apiService.fullSync({
        schedule: newSchedule,
        requests: newRequests,
        resources: newResources,
        staff: newStaff,
        guidelines: newGuidelines,
        announcements: newAnnouncements,
        activityLogs: finalLogs,
        mode
      }).catch(() => {});

      await syncAllToCloud({
        schedule: newSchedule,
        requests: newRequests,
        resources: newResources,
        staff: newStaff,
        guidelines: newGuidelines,
        announcements: newAnnouncements,
        activityLogs: finalLogs,
        wipeExistingFirst: mode === 'overwrite'
      });

      setCloudStatus('synced');
      showToast(`✅ שחזור נתונים הושלם בהצלחה! (${newSchedule.length} שיבוצים עודכנו)`);
    } catch (err) {
      console.error('Failed to restore backup:', err);
      setCloudStatus('error');
      showToast('שגיאה בעת שחזור קובץ הגיבוי', 'error');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  };

  // Local JSON Backup Export ("הוסף אפשרות להורדה של קובץ גיבוי נתונים")
  const handleExportJSON = () => {
    const byResource: Record<string, number> = {};
    resources.forEach(r => {
      byResource[r.name] = schedule.filter(s => s.resourceId === r.id).length;
    });

    const backupData: BackupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      schoolName: 'חנה סנש',
      schedule,
      requests,
      resources,
      activityLogs,
      staff: staffList,
      guidelines,
      announcements,
      summary: {
        totalSchedule: schedule.length,
        byResource,
        totalRequests: requests.length,
        totalActivityLogs: activityLogs.length
      }
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
    a.href = url;
    a.download = `גיבוי-מערכת-תקשוב-חנה-סנש-${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('קובץ גיבוי מלא (JSON) הכולל שיבוצים, היסטוריה ובקשות הורד בהצלחה! 📥');
  };

  // Local JSON Backup Import / Restore
  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (data.schedule && Array.isArray(data.schedule)) {
          await handleRestoreBackup(data, 'overwrite');
        } else {
          showToast('❌ מבנה קובץ הגיבוי אינו תקין', 'error');
        }
      } catch (err) {
        console.error('Failed to parse JSON backup:', err);
        showToast('❌ שגיאה בקריאת קובץ הגיבוי', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export to Excel / CSV with Hebrew BOM
  const handleExportCSV = () => {
    function escapeCSV(val: any) {
      if (val === undefined || val === null) return '';
      const str = String(val).replace(/"/g, '""');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str}"`;
      }
      return str;
    }

    let csv = '\uFEFF'; // UTF-8 BOM

    // Schedule section
    csv += '--- לוח שעות ושיבוצים תקשוב ---\n';
    csv += 'מזהה,משאב,יום,שעה,מורה,כיתה,נושא,סוג שיבוץ,תאריך ספציפי\n';
    schedule.forEach(s => {
      const res = resources.find(r => r.id === s.resourceId)?.name || s.resourceId;
      const p = PERIODS.find(x => x.id === Number(s.periodId))?.label || s.periodId;
      csv += [
        s.id, res, s.day, p, s.teacherName, s.className, s.subject, s.type, s.specificDate || ''
      ].map(escapeCSV).join(',') + '\n';
    });

    // Requests section
    csv += '\n--- בקשות שיבוץ (ממתינות והיסטוריה) ---\n';
    csv += 'מזהה,מורה,כיתה,משאב,יום,שעה,נושא,סטטוס,הערות\n';
    requests.forEach(r => {
      const res = resources.find(x => x.id === r.resourceId)?.name || r.resourceId;
      const p = PERIODS.find(x => x.id === Number(r.periodId))?.label || r.periodId;
      csv += [
        r.id, r.teacherName, r.className, res, r.day, p, r.subject, r.status || 'ממתין', r.notes || ''
      ].map(escapeCSV).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toLocaleDateString('he-IL').replace(/\./g, '-');
    a.href = url;
    a.download = `דוח-שיבוצי-תקשוב-חנה-סנש-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('דוח Excel (CSV) הופק והורד בהצלחה! 📊');
  };

  // Manual Full Sync to Cloud
  const handleManualSync = async () => {
    setIsSyncing(true);
    setCloudStatus('saving');
    showToast('מבצע סנכרון ענן מלא... 🔄', 'info');

    // 1. Pull latest requests from cloud Firestore if any
    let activeRequests = requests;
    try {
      const cloudReqs = await fetchAllRequestsFromCloud();
      if (cloudReqs.length > 0) {
        // Merge without losing local unsynced ones
        const map = new Map<string, ScheduleRequest>();
        requests.forEach(r => map.set(r.id, r));
        cloudReqs.forEach(r => map.set(r.id, r));
        activeRequests = Array.from(map.values());
        setRequests(activeRequests);
        saveLocalData('ict_requests', activeRequests);
      }
    } catch (e) {
      console.warn('Could not pre-fetch cloud requests during manual sync:', e);
    }

    // 2. Local save
    saveLocalData('ict_schedule', schedule);
    saveLocalData('ict_requests', activeRequests);
    saveLocalData('ict_resources', resources);
    saveLocalData('ict_staff', staffList);
    saveLocalData('ict_guidelines', guidelines);
    saveLocalData('ict_announcements', announcements);

    // 3. Push all data cleanly to Server API & cloud
    apiService.fullSync({
      schedule,
      requests: activeRequests,
      resources,
      staff: staffList,
      guidelines,
      announcements
    }).catch(() => {});

    const success = await syncAllToCloud({
      schedule,
      requests: activeRequests,
      resources,
      staff: staffList,
      guidelines,
      announcements
    });

    setIsSyncing(false);
    setCloudStatus(success ? 'synced' : 'local_only');
    if (success) {
      showToast('הסנכרון מול ענן Firebase הושלם בהצלחה! 🟢');
    } else {
      showToast('הנתונים שמורים באופן מקומי במכשירך 💾', 'info');
    }
  };

  const pendingCount = requests.filter(r => r.status === 'ממתין' || !r.status).length;

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-800 flex flex-col font-sans antialiased selection:bg-indigo-500 selection:text-white">
      
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCount={pendingCount}
        isAdmin={isAdmin}
        onOpenAdminAuth={() => setAdminAuthModalOpen(true)}
        onLogoutAdmin={handleAdminLogout}
        cloudStatus={cloudStatus}
        onManualSync={handleManualSync}
        isSyncing={isSyncing}
        hideAdmin={isTeacherOnlyMode}
        onOpenBackupModal={() => setBackupModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full flex flex-col">
        
        {/* Top Announcements & Guidelines Banner */}
        <AnnouncementsBanner
          announcements={announcements}
          guidelines={guidelines}
          isAdmin={isAdmin}
          onEditGuidelines={() => {
            if (isAdmin) {
              setActiveTab('admin');
              setPendingAdminSubTab('guidelines');
            } else {
              setAdminAuthModalOpen(true);
            }
          }}
          onEditAnnouncements={() => {
            if (isAdmin) {
              setActiveTab('admin');
              setPendingAdminSubTab('announcements');
            } else {
              setAdminAuthModalOpen(true);
            }
          }}
        />

        {/* Tab 1: Schedule Table & Parallel Booking Requests for Teachers */}
        {activeTab === 'schedule' && (
          <div className="space-y-4">
            
            {/* Parallel Mode Top Controller Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="p-1 bg-indigo-50 text-indigo-700 rounded-md font-extrabold text-[11px] border border-indigo-200">
                  👀 תצוגת מורה
                </span>
                <span className="font-bold text-slate-800">
                  לוח שעות ובקשות שיבוץ פתוחים במקביל
                </span>
                <span className="text-slate-400 hidden sm:inline">•</span>
                <span className="text-slate-500 text-[11px] hidden sm:inline">
                  לחיצה על משבצת פנויה בלוח ממלאת מיד את הבקשה
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsTeacherPanelOpen(!isTeacherPanelOpen)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs"
                >
                  <span>{isTeacherPanelOpen ? 'הרחב לוח למסך מלא' : 'פתח בקשות שיבוץ במקביל ללוח'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
              
              {/* Schedule Table */}
              <div className={isTeacherPanelOpen ? "xl:col-span-8 space-y-4" : "xl:col-span-12 space-y-4"}>
                <ScheduleGrid
                  resources={resources}
                  selectedResourceId={selectedResourceId}
                  onSelectResource={setSelectedResourceId}
                  schedule={schedule}
                  isAdmin={isAdmin}
                  onCellClick={handleCellClick}
                  onDeleteScheduleEntry={isAdmin ? handleDeleteScheduleEntry : undefined}
                  onRequestBookingSlot={(resId, dayIdx, periodId) => {
                    setRequestPreselect({ resourceId: resId, dayIdx, periodId });
                    setIsTeacherPanelOpen(true);
                  }}
                />
              </div>

              {/* Parallel Teacher Booking Requests Panel */}
              <div className={isTeacherPanelOpen ? "xl:col-span-4 sticky top-24" : "xl:col-span-12"}>
                <TeacherBookingPanel
                  staffList={staffList}
                  resources={resources}
                  selectedResourceId={selectedResourceId}
                  onSelectResource={setSelectedResourceId}
                  preselect={requestPreselect}
                  onSubmitRequest={handleSubmitRequest}
                  requests={requests}
                  isOpen={isTeacherPanelOpen}
                  onToggleOpen={() => setIsTeacherPanelOpen(!isTeacherPanelOpen)}
                />
              </div>

            </div>

          </div>
        )}

        {/* Tab 2: Request Booking Form */}
        {activeTab === 'request' && (
          <BookingRequestForm
            staffList={staffList}
            resources={resources}
            initialResourceId={requestPreselect.resourceId || selectedResourceId}
            initialDayIdx={requestPreselect.dayIdx}
            initialPeriodId={requestPreselect.periodId}
            onSubmitRequest={handleSubmitRequest}
            onViewPending={() => setActiveTab('pending')}
            onCancel={() => setActiveTab('schedule')}
          />
        )}

        {/* Tab 3: Pending Requests Tracker */}
        {activeTab === 'pending' && (
          <PendingRequestsView
            requests={requests}
            resources={resources}
            isAdmin={isAdmin}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onNewRequest={() => setActiveTab('request')}
          />
        )}

        {/* Tab 4: Admin Portal */}
        {activeTab === 'admin' && (
          <AdminPortal
            schedule={schedule}
            requests={requests}
            staffList={staffList}
            guidelines={guidelines}
            announcements={announcements}
            resources={resources}
            selectedResourceId={selectedResourceId}
            onSelectResource={setSelectedResourceId}
            onCellClick={handleCellClick}
            onDeleteScheduleEntry={handleDeleteScheduleEntry}
            onApproveRequest={handleApproveRequest}
            onRejectRequest={handleRejectRequest}
            onRunAutoScheduler={handleRunAutoScheduler}
            onAddStaff={handleAddStaff}
            onDeleteStaff={handleDeleteStaff}
            onAddGuideline={handleAddGuideline}
            onDeleteGuideline={handleDeleteGuideline}
            onAddAnnouncement={handleAddAnnouncement}
            onDeleteAnnouncement={handleDeleteAnnouncement}
            onExportJSON={handleExportJSON}
            onImportJSON={handleImportJSON}
            onExportCSV={handleExportCSV}
            onManualSync={handleManualSync}
            isSyncing={isSyncing}
            activityLogs={activityLogs}
            onUndoAction={handleUndoAction}
            isUndoingId={isUndoingLogId}
            initialSubTab={pendingAdminSubTab}
            onOpenBackupModal={() => setBackupModalOpen(true)}
            onRestoreBackup={handleRestoreBackup}
            onSaveResources={handleSaveResources}
            onShowToast={showToast}
          />
        )}

      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl border text-xs font-black flex items-center gap-2.5 ${
            toast.type === 'error'
              ? 'bg-red-950 text-red-200 border-red-800'
              : toast.type === 'info'
              ? 'bg-slate-900 text-amber-300 border-slate-700'
              : 'bg-slate-900 text-white border-slate-700'
          }`}>
            <span>{toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✨'}</span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Backup and Restore Modal */}
      <BackupRestoreModal
        isOpen={backupModalOpen}
        onClose={() => setBackupModalOpen(false)}
        schedule={schedule}
        requests={requests}
        activityLogs={activityLogs}
        staffList={staffList}
        guidelines={guidelines}
        announcements={announcements}
        resources={resources}
        onRestoreBackup={handleRestoreBackup}
        onDownloadBackup={handleExportJSON}
        onShowToast={showToast}
      />

      {/* Admin Password Modal */}
      <AdminPasswordModal
        isOpen={adminAuthModalOpen}
        onClose={() => setAdminAuthModalOpen(false)}
        onSuccess={handleAdminAuthSuccess}
      />

      {/* Direct Cell Edit Modal (Admin) */}
      <EditBookingModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        resourceId={editModalProps.resourceId}
        dayIdx={editModalProps.dayIdx}
        periodId={editModalProps.periodId}
        existingEntry={editModalProps.existingEntry}
        staffList={staffList}
        resources={resources}
        onSave={handleSaveScheduleEntry}
        onDelete={handleDeleteScheduleEntry}
      />

      {/* Footer */}
      <footer className="mt-auto py-4 bg-white border-t border-slate-200 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap justify-between items-center gap-2">
          <div>מערכת שיבוץ תקשוב • בית ספר חנה סנש</div>
          <div className="flex items-center gap-3">
            <span>גיבוי וסנכרון ענן (Firebase) פעיל</span>
            <span>•</span>
            <button
              onClick={() => {
                if (isAdmin) handleAdminLogout();
                else setAdminAuthModalOpen(true);
              }}
              className="text-indigo-600 hover:underline font-bold"
            >
              {isAdmin ? 'יציאה ממצב מנהל/ת' : 'כניסת מנהל/ת'}
            </button>
          </div>
        </div>
      </footer>

    </div>
  );
}
