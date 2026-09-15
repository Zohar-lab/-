import React, { useState, useRef } from 'react';
import { 
  X, 
  Download, 
  Upload, 
  Database, 
  Calendar, 
  Clock, 
  History, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Laptop, 
  Monitor, 
  Sparkles, 
  FileSpreadsheet, 
  RotateCw, 
  Info,
  Cloud
} from 'lucide-react';
import { ScheduleEntry, ScheduleRequest, ActivityLogItem, Announcement, Resource, BackupData } from '../types';
import { RESOURCES } from '../data/initialData';
import { GoogleDriveBackupSection } from './GoogleDriveBackupSection';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: ScheduleEntry[];
  requests: ScheduleRequest[];
  activityLogs: ActivityLogItem[];
  staffList: string[];
  guidelines: string[];
  announcements: Announcement[];
  resources?: Resource[];
  onRestoreBackup: (backup: BackupData, mode: 'overwrite' | 'merge') => Promise<void>;
  onExportCSV?: () => void;
  onDownloadBackup?: () => void;
  isSyncing?: boolean;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
  initialTab?: 'download' | 'upload' | 'drive';
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({
  isOpen,
  onClose,
  schedule,
  requests,
  activityLogs,
  staffList,
  guidelines,
  announcements,
  resources,
  onRestoreBackup,
  onExportCSV,
  onDownloadBackup,
  isSyncing = false,
  onShowToast = () => {},
  initialTab = 'download'
}) => {
  const activeResources = resources || RESOURCES;
  const [activeTab, setActiveTab] = useState<'download' | 'upload' | 'drive'>(initialTab);
  const [dragOver, setDragOver] = useState(false);
  const [parsedBackup, setParsedBackup] = useState<BackupData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [restoreMode, setRestoreMode] = useState<'overwrite' | 'merge'>('overwrite');
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Compute live current stats
  const currentResourceCounts: Record<string, number> = {};
  const byResource: Record<string, number> = {};
  activeResources.forEach(r => {
    const count = schedule.filter(s => s.resourceId === r.id).length;
    currentResourceCounts[r.id] = count;
    byResource[r.name] = count;
  });

  const currentBackupData: BackupData = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    schoolName: 'חנה סנש',
    schedule,
    requests,
    resources: activeResources,
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

  // Handle Download Backup JSON
  const handleDownloadBackup = () => {
    if (onDownloadBackup) {
      onDownloadBackup();
      return;
    }
    const now = new Date();
    const dateStr = now.toLocaleDateString('he-IL').replace(/\./g, '-');
    const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;

    const jsonString = JSON.stringify(currentBackupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `גיבוי_מערכת_תקשוב_חנה_סנש_${dateStr}_${timeStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Process uploaded JSON file
  const handleFileProcess = (file: File) => {
    setParseError(null);
    setRestoreSuccess(false);
    setFileName(file.name);

    if (!file.name.endsWith('.json')) {
      setParseError('נא לבחור קובץ בסיומת .json בלבד');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // Validation check
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('הקובץ אינו מכיל מבנה JSON תקני');
        }

        if (!Array.isArray(parsed.schedule)) {
          throw new Error('הקובץ אינו מכיל רשימת שיבוצים (schedule)');
        }

        const validBackup: BackupData = {
          version: parsed.version || '1.0',
          exportedAt: parsed.exportedAt || new Date().toISOString(),
          schoolName: parsed.schoolName || 'חנה סנש',
          schedule: parsed.schedule,
          requests: Array.isArray(parsed.requests) ? parsed.requests : [],
          activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
          staff: Array.isArray(parsed.staff) ? parsed.staff : undefined,
          guidelines: Array.isArray(parsed.guidelines) ? parsed.guidelines : undefined,
          announcements: Array.isArray(parsed.announcements) ? parsed.announcements : undefined,
          summary: parsed.summary
        };

        setParsedBackup(validBackup);
      } catch (err: any) {
        console.error('Failed to parse backup:', err);
        setParseError(err.message || 'שגיאה בפענוח קובץ הגיבוי. ודאי שהקובץ תקין ולא פגום.');
        setParsedBackup(null);
      }
    };
    reader.readAsText(file);
  };

  // Trigger restore action
  const handleExecuteRestore = async () => {
    if (!parsedBackup) return;
    setIsRestoring(true);
    try {
      await onRestoreBackup(parsedBackup, restoreMode);
      setRestoreSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error during restore:', err);
      setParseError('אירעה שגיאה בעת שחזור הנתונים וסנכרונם לענן');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] text-right animate-in fade-in zoom-in-95 duration-200" 
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex justify-between items-center border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-400 text-slate-950 rounded-2xl shadow-sm">
              <Database className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black tracking-tight">
                גיבוי ושחזור נתוני המערכת
              </h2>
              <p className="text-xs text-indigo-200">
                שיבוצים בכל המשאבים • היסטוריה ולוגים • בקשות שיבוץ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 bg-slate-50 p-2 gap-2">
          <button
            onClick={() => {
              setActiveTab('download');
              setParsedBackup(null);
              setParseError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'download'
                ? 'bg-white text-indigo-950 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Download className="w-4 h-4 text-purple-600" />
            <span>הורדת קובץ למחשב</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('drive');
              setParsedBackup(null);
              setParseError(null);
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer relative ${
              activeTab === 'drive'
                ? 'bg-white text-emerald-950 shadow-sm border border-emerald-300'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Cloud className="w-4 h-4 text-emerald-600" />
            <span>גיבוי ב-Google Drive</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </button>

          <button
            onClick={() => {
              setActiveTab('upload');
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-white text-indigo-950 shadow-sm border border-slate-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Upload className="w-4 h-4 text-indigo-600" />
            <span>טעינה ושחזור מקובץ</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* TAB 1: DOWNLOAD BACKUP */}
          {activeTab === 'download' && (
            <div className="space-y-5">
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs text-indigo-950 space-y-1.5">
                <div className="font-extrabold flex items-center gap-1.5 text-sm text-indigo-900">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>קובץ הגיבוי כולל תמונת מצב מלאה ומדויקת:</span>
                </div>
                <p className="text-slate-600 text-[11px] leading-relaxed">
                  הקובץ נשמר בפורמט JSON תקני וכולל את כל שיבוצי לוח השעות בכל המעבדות והעגלות, כל הבקשות (ממתינות, מאושרות ונדחות), היסטוריית הפעולות המלאה, ורשימת המורים וההנחיות.
                </p>
              </div>

              {/* Data Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>שיבוצים בלוח</span>
                    <Calendar className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="text-xl font-black text-indigo-950">{schedule.length}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">בכל 6 המשאבים</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>בקשות שיבוץ</span>
                    <Clock className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-black text-amber-900">{requests.length}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">ממתינות ומטופלות</div>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl col-span-2 sm:col-span-1">
                  <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
                    <span>היסטוריית פעולות</span>
                    <History className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-black text-emerald-950">{activityLogs.length}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">רשומות יומן פעולות</div>
                </div>
              </div>

              {/* Breakdown by resource */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-2.5">
                <div className="text-xs font-black text-slate-800 flex items-center justify-between">
                  <span>פירוט שיבוצים לפי משאבים (כלול בגיבוי):</span>
                  <span className="text-[11px] font-normal text-slate-500">6 משאבים פעילים</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {RESOURCES.map(res => (
                    <div key={res.id} className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between">
                      <span className="font-semibold text-slate-700 flex items-center gap-1 truncate">
                        {res.type === 'lab' ? <Monitor className="w-3 h-3 text-indigo-500 shrink-0" /> : <Laptop className="w-3 h-3 text-purple-500 shrink-0" />}
                        <span className="truncate">{res.name}</span>
                      </span>
                      <span className="font-black text-indigo-700 mr-1.5 px-1.5 py-0.2 bg-indigo-50 rounded">
                        {currentResourceCounts[res.id] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadBackup}
                  className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-98 text-white font-black rounded-2xl text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>הורד עכשיו קובץ גיבוי מלא (JSON) 💾</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('drive')}
                  className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-200"
                >
                  <Cloud className="w-4 h-4 text-emerald-600" />
                  <span>מעבר להגדרת גיבוי יומי אוטומטי ל-Google Drive ☁️</span>
                </button>

                <button
                  type="button"
                  onClick={onExportCSV}
                  className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>ייצוא דוח שעות ל-Excel (CSV עם תמיכה בעברית)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: UPLOAD & RESTORE */}
          {activeTab === 'upload' && (
            <div className="space-y-5">
              
              {/* Drop / Select Area */}
              {!parsedBackup && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleFileProcess(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    dragOver 
                      ? 'border-indigo-500 bg-indigo-50/50' 
                      : 'border-slate-300 hover:border-indigo-400 bg-slate-50/60 hover:bg-indigo-50/20'
                  }`}
                >
                  <div className="p-4 bg-indigo-100 text-indigo-700 rounded-3xl">
                    <Upload className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sm text-slate-900">
                      גררי לכאן קובץ גיבוי (JSON) או לחצי לבחירה
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      הקובץ ייסרק ויוצג לתצוגה מקדימה לפני ביצוע השחזור בפועל
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileProcess(file);
                    }}
                  />
                </div>
              )}

              {/* Error Alert */}
              {parseError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>שגיאה בקריאת הקובץ</span>
                  </div>
                  <p>{parseError}</p>
                </div>
              )}

              {/* Parsed Backup Preview */}
              {parsedBackup && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="font-black text-xs text-emerald-950">קובץ הגיבוי אומת בהצלחה:</div>
                        <div className="text-[11px] text-emerald-800 font-semibold">{fileName}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setParsedBackup(null);
                        setFileName('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    >
                      בחר קובץ אחר
                    </button>
                  </div>

                  {/* Backup Content Stats */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 text-xs">
                    <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-2 flex justify-between items-center">
                      <span>תכולת קובץ הגיבוי:</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        תאריך ייצוא: {new Date(parsedBackup.exportedAt).toLocaleString('he-IL')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center">
                        <span className="text-slate-500 text-[11px] block">שיבוצים</span>
                        <span className="text-lg font-black text-indigo-700">{parsedBackup.schedule.length}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center">
                        <span className="text-slate-500 text-[11px] block">בקשות שיבוץ</span>
                        <span className="text-lg font-black text-amber-700">{parsedBackup.requests.length}</span>
                      </div>
                      <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-center">
                        <span className="text-slate-500 text-[11px] block">היסטוריית פעולות</span>
                        <span className="text-lg font-black text-emerald-700">{parsedBackup.activityLogs.length}</span>
                      </div>
                    </div>

                    {parsedBackup.staff && (
                      <div className="text-[11px] text-slate-600">
                        👥 מורים ברשימה: <strong className="text-slate-800">{parsedBackup.staff.length}</strong>
                      </div>
                    )}

                    {parsedBackup.resources && (
                      <div className="text-[11px] text-slate-600">
                        💻 משאבים וכמויות מחשבים מותאמות: <strong className="text-slate-800">{parsedBackup.resources.length} משאבים</strong>
                      </div>
                    )}
                  </div>

                  {/* Restore Mode Selector */}
                  <div className="border border-slate-200 rounded-2xl p-4 space-y-3 bg-white">
                    <div className="text-xs font-black text-slate-900">
                      אופן ביצוע השחזור:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                      <label 
                        onClick={() => setRestoreMode('overwrite')}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          restoreMode === 'overwrite'
                            ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-2 ring-indigo-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-extrabold flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'overwrite'}
                            onChange={() => setRestoreMode('overwrite')}
                            className="text-indigo-600"
                          />
                          <span>שחזור מלא (החלפה) ⭐</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 mr-5">
                          מחליף את לוח השעות, הבקשות וההיסטוריה בנתוני הגיבוי. מומלץ לשחזור נקי ומדויק.
                        </p>
                      </label>

                      <label 
                        onClick={() => setRestoreMode('merge')}
                        className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                          restoreMode === 'merge'
                            ? 'bg-indigo-50/80 border-indigo-400 text-indigo-950 ring-2 ring-indigo-300'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="font-extrabold flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="restoreMode"
                            checked={restoreMode === 'merge'}
                            onChange={() => setRestoreMode('merge')}
                            className="text-indigo-600"
                          />
                          <span>מיזוג נתונים (Merge)</span>
                        </div>
                        <p className="text-[11px] text-slate-600 mt-1 mr-5">
                          מוסיף את השיבוצים והבקשות החדשות מבלי למחוק שיבוצים קיימים שלא מתנגשים.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Restore Success Confirmation */}
                  {restoreSuccess && (
                    <div className="p-4 bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-extrabold flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <span>השחזור הושלם וסונכרן בהצלחה לענן! חלון זה ייסגר מיד...</span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      disabled={isRestoring}
                      onClick={() => {
                        setParsedBackup(null);
                        setFileName('');
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      ביטול
                    </button>

                    <button
                      type="button"
                      disabled={isRestoring || restoreSuccess}
                      onClick={handleExecuteRestore}
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isRestoring ? (
                        <>
                          <RotateCw className="w-4 h-4 animate-spin" />
                          <span>משחזר נתונים ומסנכרן ענן...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>אשר שחזור נתונים והחל על המערכת 🚀</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* TAB 3: GOOGLE DRIVE DAILY BACKUP */}
          {activeTab === 'drive' && (
            <GoogleDriveBackupSection
              backupData={currentBackupData}
              onShowToast={onShowToast}
            />
          )}

        </div>

        {/* Modal Footer Note */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          כל שחזור מסונכרן מיידית לענן Firebase ונשמר גם ביומן הפעולות (Activity Log).
        </div>
      </div>
    </div>
  );
};
