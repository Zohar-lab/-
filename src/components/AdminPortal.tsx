import React, { useState } from 'react';
import { 
  Calendar, 
  Clock, 
  Users, 
  Bookmark, 
  Megaphone, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  Check, 
  X, 
  Trash2, 
  Plus, 
  RotateCw,
  ShieldCheck,
  Laptop,
  Monitor,
  Mail,
  Copy,
  RotateCcw,
  History,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  Database
} from 'lucide-react';
import { ScheduleEntry, ScheduleRequest, Resource, Announcement, ActivityLogItem, BackupData } from '../types';
import { DAYS, PERIODS, CLASSES } from '../data/initialData';
import { ScheduleGrid } from './ScheduleGrid';
import { AdminApprovalPanel } from './AdminApprovalPanel';
import { ActivityLogView } from './ActivityLogView';
import { ResourceManagement } from './ResourceManagement';
import { GoogleDriveBackupSection } from './GoogleDriveBackupSection';

interface AdminPortalProps {
  schedule: ScheduleEntry[];
  requests: ScheduleRequest[];
  staffList: string[];
  guidelines: string[];
  announcements: Announcement[];
  resources: Resource[];
  selectedResourceId: string;
  onSelectResource: (resourceId: string) => void;
  onCellClick: (resourceId: string, dayIdx: number, periodId: number, existingEntry?: ScheduleEntry) => void;
  onDeleteScheduleEntry: (entryId: string) => Promise<void>;
  onApproveRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onRunAutoScheduler: () => Promise<void>;
  onAddStaff: (name: string) => Promise<void>;
  onDeleteStaff: (name: string) => Promise<void>;
  onAddGuideline: (text: string) => Promise<void>;
  onDeleteGuideline: (text: string) => Promise<void>;
  onAddAnnouncement: (ann: Announcement) => Promise<void>;
  onDeleteAnnouncement: (id: string) => Promise<void>;
  onExportJSON: () => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportCSV: () => void;
  onManualSync: () => void;
  isSyncing: boolean;
  activityLogs?: ActivityLogItem[];
  onUndoAction?: (logId: string) => Promise<void> | void;
  isUndoingId?: string | null;
  initialSubTab?: 'grid-edit' | 'resources' | 'requests' | 'activity-log' | 'staff' | 'guidelines' | 'announcements' | 'backup';
  onOpenBackupModal?: () => void;
  onRestoreBackup?: (backup: BackupData, mode: 'overwrite' | 'merge') => Promise<void>;
  onSaveResources?: (updatedResources: Resource[]) => Promise<void> | void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  schedule,
  requests,
  staffList,
  guidelines,
  announcements,
  resources,
  selectedResourceId,
  onSelectResource,
  onCellClick,
  onDeleteScheduleEntry,
  onApproveRequest,
  onRejectRequest,
  onRunAutoScheduler,
  onAddStaff,
  onDeleteStaff,
  onAddGuideline,
  onDeleteGuideline,
  onAddAnnouncement,
  onDeleteAnnouncement,
  onExportJSON,
  onImportJSON,
  onExportCSV,
  onManualSync,
  isSyncing,
  activityLogs = [],
  onUndoAction,
  isUndoingId,
  initialSubTab = 'grid-edit',
  onOpenBackupModal,
  onRestoreBackup,
  onSaveResources,
  onShowToast = () => {}
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'grid-edit' | 'resources' | 'requests' | 'activity-log' | 'staff' | 'guidelines' | 'announcements' | 'backup'>(
    initialSubTab === 'all-bookings' as any ? 'resources' : initialSubTab
  );
  const [isApprovalPanelOpen, setIsApprovalPanelOpen] = useState<boolean>(true);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Find the last undoable action for the quick undo button
  const lastUndoableAction = activityLogs.find(l => l.canUndo && !l.undone);
  const undoableCount = activityLogs.filter(l => l.canUndo && !l.undone).length;

  // Forms local states
  const [newStaffName, setNewStaffName] = useState('');
  const [newGuidelineText, setNewGuidelineText] = useState('');
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnContent, setNewAnnContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingRequests = requests.filter(r => r.status === 'ממתין' || !r.status);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('a@edu-haifa.org.il');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    await onAddStaff(newStaffName.trim());
    setNewStaffName('');
  };

  const handleGuidelineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuidelineText.trim()) return;
    await onAddGuideline(newGuidelineText.trim());
    setNewGuidelineText('');
  };

  const handleAnnouncementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnTitle.trim() || !newAnnContent.trim()) return;
    const newAnn: Announcement = {
      id: `ann-${Date.now()}`,
      title: newAnnTitle.trim(),
      content: newAnnContent.trim(),
      date: new Date().toLocaleDateString('he-IL')
    };
    await onAddAnnouncement(newAnn);
    setNewAnnTitle('');
    setNewAnnContent('');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Admin Navigation Header */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
        
        <div>
          <div className="flex items-center gap-2 text-indigo-950 font-black text-lg">
            <span className="p-1.5 bg-amber-400 text-slate-950 rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h2>מרחב ניהול ורכזת תקשוב</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            עריכת לוח שעות, אישור בקשות שיבוץ במקביל, מנוע שיבוץ אוטומטי, גיבויים וסנכרון ענן
          </p>
          <div className="mt-2 flex items-center gap-2 text-xs flex-wrap">
            <span className="bg-amber-100 text-amber-950 px-2.5 py-0.5 rounded-md font-bold text-[11px] border border-amber-300 flex items-center gap-1">
              <Mail className="w-3 h-3 text-amber-800" />
              <span>גישה ארגונית של המורים:</span>
            </span>
            <a 
              href="mailto:a@edu-haifa.org.il" 
              className="font-extrabold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 dir-ltr"
              dir="ltr"
            >
              a@edu-haifa.org.il
            </a>
            <button
              onClick={handleCopyEmail}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded transition border border-slate-300 flex items-center gap-1"
            >
              {copiedEmail ? 'הועתק!' : 'העתק כתובת'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">

          {onUndoAction && lastUndoableAction && (
            <button
              onClick={() => onUndoAction(lastUndoableAction.id)}
              disabled={isUndoingId === lastUndoableAction.id}
              className="px-3.5 py-1.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-sm flex items-center gap-1.5 transition active:scale-95 cursor-pointer border border-amber-400"
              title={`ביטול פעולה אחרונה: ${lastUndoableAction.title} (${lastUndoableAction.description})`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isUndoingId === lastUndoableAction.id ? 'animate-spin' : ''}`} />
              <span>ביטול פעולה אחרונה ↩️</span>
            </button>
          )}
          
          <button
            onClick={onExportJSON}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs flex items-center gap-1 transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>הורדת גיבוי JSON</span>
          </button>

          <label className="cursor-pointer px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white shadow-xs flex items-center gap-1 transition active:scale-95">
            <Upload className="w-3.5 h-3.5" />
            <span>שחזור מגיבוי</span>
            <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
          </label>

          <button
            onClick={onExportCSV}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1 transition active:scale-95"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>דוח Excel/CSV</span>
          </button>

          <button
            onClick={onManualSync}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1 transition active:scale-95 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>סנכרן ענן</span>
          </button>
        </div>

      </div>

      {/* Sub tabs pills */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        
        <button
          onClick={() => setActiveSubTab('grid-edit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'grid-edit'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>לוח שיבוצים ובקשות (במקביל)</span>
          {pendingRequests.length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('resources')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'resources'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Laptop className="w-4 h-4 text-amber-500" />
          <span>עריכת משאבים ומחשבים ({resources.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('requests')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
            activeSubTab === 'requests'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>אישור בקשות מרוכז</span>
          {pendingRequests.length > 0 && (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('activity-log')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 relative ${
            activeSubTab === 'activity-log'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>לוג וביטול פעולות</span>
          {undoableCount > 0 ? (
            <span className="bg-amber-400 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full flex items-center gap-0.5">
              <RotateCcw className="w-2.5 h-2.5" />
              <span>{undoableCount}</span>
            </span>
          ) : activityLogs.length > 0 ? (
            <span className="bg-slate-200 text-slate-800 text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {activityLogs.length}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => setActiveSubTab('staff')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'staff'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>ניהול צוות ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('guidelines')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'guidelines'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          <span>עריכת הנחיות</span>
        </button>

        <button
          onClick={() => setActiveSubTab('announcements')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'announcements'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>הודעות ומבזקים</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            activeSubTab === 'backup'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Download className="w-4 h-4" />
          <span>גיבויים וסנכרון ענן</span>
        </button>

      </div>

      {/* Sub Tab 1: Grid Direct Edit with Parallel Approval Panel */}
      {activeSubTab === 'grid-edit' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 font-semibold flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span>💡 לחצי על כל שיבוץ בלוח לעריכה, או על סמל הפח 🗑️ למחיקה ישירה מהירה! ניתן גם לעבור ללשונית &quot;רשימת שיבוצים ומחיקה&quot; לחיפוש ומחיקה מרוכזת.</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-indigo-900">הרשאת מנהלת פעילה 🔓</span>
              <button
                onClick={() => setIsApprovalPanelOpen(!isApprovalPanelOpen)}
                className="bg-white border border-amber-300 hover:bg-amber-100 text-amber-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition flex items-center gap-1 shadow-2xs"
              >
                <span>{isApprovalPanelOpen ? 'הרחב לוח למסך מלא' : 'פתח בקשות לאישור במקביל ללוח'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            
            {/* Interactive Schedule Grid with Admin powers */}
            <div className={isApprovalPanelOpen ? "xl:col-span-8 space-y-4" : "xl:col-span-12 space-y-4"}>
              <ScheduleGrid
                resources={resources}
                selectedResourceId={selectedResourceId}
                onSelectResource={onSelectResource}
                schedule={schedule}
                isAdmin={true}
                onCellClick={onCellClick}
                onDeleteScheduleEntry={onDeleteScheduleEntry}
              />
            </div>

            {/* Parallel Requests for Approval Panel */}
            <div className={isApprovalPanelOpen ? "xl:col-span-4 sticky top-24" : "xl:col-span-12"}>
              <AdminApprovalPanel
                requests={requests}
                resources={resources}
                selectedResourceId={selectedResourceId}
                onSelectResource={onSelectResource}
                onApproveRequest={onApproveRequest}
                onRejectRequest={onRejectRequest}
                onRunAutoScheduler={onRunAutoScheduler}
                isOpen={isApprovalPanelOpen}
                onToggleOpen={() => setIsApprovalPanelOpen(!isApprovalPanelOpen)}
              />
            </div>

          </div>
        </div>
      )}

      {/* Sub Tab: Resource Management (Edit computers per room and cart) */}
      {activeSubTab === 'resources' && (
        <ResourceManagement
          resources={resources}
          schedule={schedule}
          onSaveResources={onSaveResources || (async () => {})}
          onSelectResource={(resId) => {
            onSelectResource(resId);
            setActiveSubTab('grid-edit');
          }}
        />
      )}

      {/* Sub Tab 2: Requests Management & Auto Scheduler */}
      {activeSubTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                בקשות ממתינות לאישור ({pendingRequests.length})
              </h3>
              <p className="text-xs text-slate-500">
                אשרי או דחי בקשות בנפרד, או השתמשי במנוע השיבוץ האוטומטי לשבץ את כל הבקשות הפנויות
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={onRunAutoScheduler}
                disabled={pendingRequests.length === 0}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>מנוע שיבוץ אוטומטי ⚡</span>
              </button>
            </div>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-500 space-y-1">
              <span className="text-3xl block">✅</span>
              <div className="font-bold text-slate-700 text-sm">אין בקשות ממתינות כעת</div>
              <div>כל הבקשות שהוגשו אושרו או טופלו</div>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map(req => {
                const res = resources.find(r => r.id === req.resourceId);
                const p = PERIODS.find(x => x.id === Number(req.periodId));
                const dayDisplay = req.day || DAYS[req.dayIdx] || "יום א'";

                return (
                  <div
                    key={req.id}
                    className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="font-extrabold text-indigo-950 text-sm flex items-center gap-2 flex-wrap">
                        <span>👤 {req.teacherName}</span>
                        <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-md font-bold">
                          כיתה {req.className}
                        </span>
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.2 rounded-md font-medium text-[11px]">
                          {req.type || 'שיעור מזדמן'}
                        </span>
                      </div>

                      <div className="text-slate-700 font-semibold flex flex-wrap items-center gap-2">
                        <span>🖥️ {res ? res.name : req.resourceId}</span>
                        <span>•</span>
                        <span>📅 {dayDisplay}, {p ? p.label : `שעה ${req.periodId}`} ({p ? p.time : ''})</span>
                        {req.specificDate && (
                          <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                            תאריך: {req.specificDate}
                          </span>
                        )}
                      </div>

                      <div className="text-slate-600">
                        📖 נושא: <strong className="text-slate-800">{req.subject}</strong>
                      </div>

                      {req.notes && (
                        <div className="text-slate-500 italic text-[11px] bg-slate-50 p-1.5 rounded-lg">
                          📝 הערה: {req.notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onApproveRequest(req.id)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-xs flex items-center gap-1 text-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>אשר ושבץ</span>
                      </button>
                      <button
                        onClick={() => onRejectRequest(req.id)}
                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition flex items-center gap-1 text-xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>דחה</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sub Tab: Activity Log & Undo Actions */}
      {activeSubTab === 'activity-log' && (
        <ActivityLogView
          logs={activityLogs}
          onUndoAction={onUndoAction || (() => {})}
          isUndoingId={isUndoingId}
        />
      )}

      {/* Sub Tab 3: Staff Management */}
      {activeSubTab === 'staff' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">ניהול רשימת צוות ההוראה</h3>
              <p className="text-xs text-slate-500">שמות המורים מופיעים בטופס הבקשה ובחלון השיבוץ</p>
            </div>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
              סה״כ {staffList.length} מורים
            </span>
          </div>

          {/* Add staff form */}
          <form onSubmit={handleStaffSubmit} className="flex gap-2 max-w-md">
            <input
              type="text"
              required
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="שם המורה החדש/ה להוספה..."
              className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף מורה</span>
            </button>
          </form>

          {/* Staff list grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 text-xs">
            {staffList.map((staff, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl flex justify-between items-center transition"
              >
                <span className="font-semibold text-slate-800">{staff}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`האם להסיר את המורה ${staff}?`)) {
                      onDeleteStaff(staff);
                    }
                  }}
                  title="הסר מורה"
                  className="text-slate-400 hover:text-red-600 p-1 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab 4: Guidelines Management */}
      {activeSubTab === 'guidelines' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">עריכת הנחיות שימוש בתקשוב וציוד</h3>
            <p className="text-xs text-slate-500">הנחיות אלו מוצגות בראש העמוד לכלל מורי בית הספר</p>
          </div>

          <form onSubmit={handleGuidelineSubmit} className="flex gap-2">
            <input
              type="text"
              required
              value={newGuidelineText}
              onChange={(e) => setNewGuidelineText(e.target.value)}
              placeholder="רשום הנחיה חדשה (למשל: השאלת מחשבים רק בליווי מורה)..."
              className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף הנחיה</span>
            </button>
          </form>

          <div className="space-y-2 text-xs">
            {guidelines.map((g, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center gap-3"
              >
                <span className="font-medium text-slate-800 leading-relaxed">{g}</span>
                <button
                  type="button"
                  onClick={() => onDeleteGuideline(g)}
                  className="text-slate-400 hover:text-red-600 p-1 transition shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab 5: Announcements Management */}
      {activeSubTab === 'announcements' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-extrabold text-slate-900">עריכת הודעות עדכון ומבזקי תקשוב</h3>
            <p className="text-xs text-slate-500">הודעות המפורסמות כאן מופיעות בראש המערכת לכל המשתמשים</p>
          </div>

          <form onSubmit={handleAnnouncementSubmit} className="space-y-3 max-w-lg">
            <input
              type="text"
              required
              value={newAnnTitle}
              onChange={(e) => setNewAnnTitle(e.target.value)}
              placeholder="כותרת ההודעה (למשל: פתיחת הרשמה לשיבוצים)..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <textarea
              required
              rows={3}
              value={newAnnContent}
              onChange={(e) => setNewAnnContent(e.target.value)}
              placeholder="תוכן ההודעה והפרטים..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition flex items-center gap-1 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>פרסם הודעה</span>
            </button>
          </form>

          <div className="space-y-2.5 text-xs">
            {announcements.map(ann => (
              <div
                key={ann.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"
              >
                <div className="flex justify-between items-center font-bold text-slate-900">
                  <span className="text-sm">{ann.title} ({ann.date})</span>
                  <button
                    onClick={() => onDeleteAnnouncement(ann.id)}
                    className="text-slate-400 hover:text-red-600 p-1 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-slate-700 leading-relaxed">{ann.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub Tab 6: Backup & Restore Management */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          
          {/* Top Banner explaining what the backup contains */}
          <div className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white p-5 rounded-3xl shadow-sm space-y-3">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl shadow-sm">
                  <Database className="w-6 h-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base md:text-lg font-black tracking-tight">
                    גיבוי ושחזור נתוני המערכת
                  </h3>
                  <p className="text-xs text-purple-200">
                    הורדת קובץ גיבוי וטעינתו כוללים תמונת מצב מלאה: שיבוצי כל המשאבים, היסטוריה ובקשות שיבוץ
                  </p>
                </div>
              </div>

              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={onOpenBackupModal}
                  className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow transition flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>פתח חלונית גיבוי ושחזור 🚀</span>
                </button>
              )}
            </div>

            {/* Quick Counters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-purple-800/60 text-xs">
              <div className="p-2.5 bg-purple-800/40 rounded-xl border border-purple-700/50">
                <span className="text-purple-300 block text-[11px]">שיבוצים בכל המשאבים:</span>
                <span className="text-base font-black text-white">{schedule.length}</span>
              </div>
              <div className="p-2.5 bg-purple-800/40 rounded-xl border border-purple-700/50">
                <span className="text-purple-300 block text-[11px]">בקשות שיבוץ:</span>
                <span className="text-base font-black text-amber-300">{requests.length}</span>
              </div>
              <div className="p-2.5 bg-purple-800/40 rounded-xl border border-purple-700/50">
                <span className="text-purple-300 block text-[11px]">היסטוריית פעולות (Logs):</span>
                <span className="text-base font-black text-emerald-300">{activityLogs.length}</span>
              </div>
              <div className="p-2.5 bg-purple-800/40 rounded-xl border border-purple-700/50">
                <span className="text-purple-300 block text-[11px]">צוות מורים והנחיות:</span>
                <span className="text-base font-black text-white">{staffList.length} מורים</span>
              </div>
            </div>
          </div>

          {/* Google Drive Daily Backup Section */}
          <GoogleDriveBackupSection
            backupData={{
              version: '2.0',
              exportedAt: new Date().toISOString(),
              schoolName: 'חנה סנש',
              schedule,
              requests,
              resources,
              activityLogs: activityLogs || [],
              staff: staffList,
              guidelines,
              announcements,
              summary: {
                totalSchedule: schedule.length,
                totalRequests: requests.length,
                totalActivityLogs: (activityLogs || []).length
              }
            }}
            onShowToast={onShowToast}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Box 1: Download Backup */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-base">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h4>הורדת קובץ גיבוי נתונים</h4>
                    <span className="text-xs font-semibold text-slate-500">קובץ JSON מלא למחשב האישי</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  קובץ הגיבוי כולל את כל השיבוצים הקיימים בכל המעבדות והעגלות, את כל בקשות השיבוץ הממתינות והמאושרות, ואת כל היסטוריית הפעולות (יומן שחזורים).
                </p>

                {/* Resource breakdown preview */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1.5">
                  <div className="font-extrabold text-slate-800 text-[11px]">חלוקת שיבוצים שייכללו בגיבוי:</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600">
                    {resources.map(res => {
                      const count = schedule.filter(s => s.resourceId === res.id).length;
                      return (
                        <div key={res.id} className="flex justify-between items-center bg-white px-2 py-1 rounded-lg border border-slate-200/70">
                          <span className="truncate">{res.name}:</span>
                          <span className="font-bold text-indigo-700 mr-1">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-2.5 pt-3">
                <button
                  type="button"
                  onClick={onExportJSON}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>הורדת קובץ גיבוי מלא (JSON) 📥</span>
                </button>

                <button
                  type="button"
                  onClick={onExportCSV}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-slate-200"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ייצוא דוח מלא ל-Excel (CSV תומך עברית)</span>
                </button>
              </div>
            </div>

            {/* Box 2: Upload & Restore Backup */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-950 font-black text-base">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h4>טעינה ושחזור מקובץ גיבוי</h4>
                    <span className="text-xs font-semibold text-slate-500">שחזור נתוני שיבוצים, בקשות והיסטוריה</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  ניתן לבחור קובץ JSON שגובה בעבר כדי לשחזר את מערכת השעות, הבקשות וההיסטוריה. המערכת תבצע בדיקת תקינות ותסנכרן את הנתונים ישירות לענן.
                </p>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 space-y-1">
                  <div className="font-extrabold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>אבטחה ושחזור בטוח:</span>
                  </div>
                  <p>
                    פעולת השחזור ניתנת לביטול! לפני החלת הנתונים נשמר צילום מצב ביומן הפעולות, וניתן ללחוץ <strong>&quot;ביטול פעולה אחרונה ↩️&quot;</strong> בכל עת.
                  </p>
                </div>
              </div>

              <div className="space-y-2.5 pt-3">
                {onOpenBackupModal ? (
                  <button
                    type="button"
                    onClick={onOpenBackupModal}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
                  >
                    <Upload className="w-4 h-4" />
                    <span>פתח חלונית טעינת גיבוי ושחזור 🚀</span>
                  </button>
                ) : (
                  <label className="w-full cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition shadow-sm">
                    <Upload className="w-4 h-4" />
                    <span>טעינת קובץ גיבוי קיים (JSON)</span>
                    <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
                  </label>
                )}

                <label className="w-full cursor-pointer bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition">
                  <RotateCw className="w-4 h-4 text-slate-600" />
                  <span>טעינה ישירה מהירה (File Selector)</span>
                  <input type="file" accept=".json" onChange={onImportJSON} className="hidden" />
                </label>
              </div>
            </div>

          </div>

          {/* Cloud Sync Status Strip */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
                <RotateCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900">סנכרון רציף מול ענן Firebase Firestore</h4>
                <p className="text-[11px] text-slate-500">
                  כל שיבוץ, ביטול או שחזור נשמרים בענן ומסונכרנים אוטומטית לכלל המורים והמנהלים.
                </p>
              </div>
            </div>

            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'מבצע סנכרון ענן...' : 'בצע סנכרון ענן מלא כעת'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
