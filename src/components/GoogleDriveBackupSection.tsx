import React, { useState, useEffect } from 'react';
import { 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  ExternalLink, 
  FolderCheck, 
  Clock, 
  Calendar, 
  FileText, 
  ShieldCheck, 
  LogOut,
  FolderOpen,
  Sparkles,
  Download
} from 'lucide-react';
import { User } from 'firebase/auth';
import { 
  signInWithGoogleForDrive, 
  getDriveAccessToken, 
  signOutDrive, 
  uploadBackupToGoogleDrive, 
  getStoredBackupStatus, 
  saveBackupStatus, 
  DriveBackupInfo, 
  listDriveBackupFiles, 
  DriveFileItem 
} from '../services/googleDrive';
import { BackupData } from '../types';

interface GoogleDriveBackupSectionProps {
  backupData: BackupData;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const GoogleDriveBackupSection: React.FC<GoogleDriveBackupSectionProps> = ({
  backupData,
  onShowToast
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupStatus, setBackupStatus] = useState<DriveBackupInfo>(() => getStoredBackupStatus());
  const [recentFiles, setRecentFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  // Check current in-memory token on mount
  useEffect(() => {
    const token = getDriveAccessToken();
    if (token) {
      setAccessToken(token);
    }
  }, []);

  // Fetch recent files when token is available
  useEffect(() => {
    if (accessToken) {
      loadRecentFiles(accessToken);
    }
  }, [accessToken]);

  const loadRecentFiles = async (token: string) => {
    setIsLoadingFiles(true);
    try {
      const files = await listDriveBackupFiles(token);
      setRecentFiles(files);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const { user, accessToken: token } = await signInWithGoogleForDrive();
      setCurrentUser(user);
      setAccessToken(token);
      onShowToast(`התחברת בהצלחה עם חשבון Google: ${user.email}`, 'success');
      loadRecentFiles(token);
    } catch (err: any) {
      console.error('Google Drive sign in failed:', err);
      onShowToast(`החיבור ל-Google Drive נכשל: ${err.message || 'נסה שוב'}`, 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutDrive();
    setCurrentUser(null);
    setAccessToken(null);
    setRecentFiles([]);
    onShowToast('התנתקת מחשבון Google Drive', 'info');
  };

  const handleToggleAutoDaily = async () => {
    const updated: DriveBackupInfo = {
      ...backupStatus,
      autoDailyEnabled: !backupStatus.autoDailyEnabled
    };
    setBackupStatus(updated);
    await saveBackupStatus(updated);
    onShowToast(
      updated.autoDailyEnabled 
        ? 'גיבוי יומי אוטומטי הופעל בהצלחה! 🟢' 
        : 'גיבוי יומי אוטומטי נוטרל ⏸️',
      'info'
    );
  };

  // Perform immediate backup to Google Drive with explicit confirmation
  const handlePerformBackup = async () => {
    setConfirmModalOpen(false);
    let token = accessToken || getDriveAccessToken();

    if (!token) {
      try {
        setIsSigningIn(true);
        const res = await signInWithGoogleForDrive();
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        token = res.accessToken;
      } catch (err: any) {
        onShowToast('נדרש חיבור ל-Google כדי לבצע את הגיבוי', 'error');
        return;
      } finally {
        setIsSigningIn(false);
      }
    }

    if (!token) return;

    setIsBackingUp(true);
    onShowToast('מעלה קובץ גיבוי מלא ל-Google Drive... ⏳', 'info');

    try {
      const uploadedFile = await uploadBackupToGoogleDrive(token, backupData);
      const today = new Date().toISOString().split('T')[0];

      const updatedInfo: DriveBackupInfo = {
        ...backupStatus,
        lastBackupDate: today,
        lastBackupTimestamp: new Date().toISOString(),
        fileId: uploadedFile.id,
        fileName: uploadedFile.name,
        webViewLink: uploadedFile.webViewLink,
        status: 'success',
        userEmail: currentUser?.email || undefined
      };

      setBackupStatus(updatedInfo);
      await saveBackupStatus(updatedInfo);

      onShowToast(`הגיבוי הושלם בהצלחה ב-Google Drive! 📁 (${uploadedFile.name})`, 'success');
      loadRecentFiles(token);
    } catch (err: any) {
      console.error('Backup error:', err);
      const failedInfo: DriveBackupInfo = {
        ...backupStatus,
        status: 'error',
        error: err.message || 'שגיאה בעת העלאה ל-Google Drive'
      };
      setBackupStatus(failedInfo);
      await saveBackupStatus(failedInfo);
      onShowToast(`שגיאה בהעלאה ל-Google Drive: ${err.message}`, 'error');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-indigo-950 text-white border border-emerald-800/40 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-slate-950 rounded-2xl shadow-md">
              <Cloud className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base md:text-lg font-black tracking-tight">גיבוי יומי ל-Google Drive</h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold rounded-md">
                  סנכרון ענן מאובטח
                </span>
              </div>
              <p className="text-xs text-emerald-200/90 mt-0.5">
                שמירה אוטומטית פעם ביום של כלל השיבוצים, הבקשות, רשימת המורים וההיסטוריה בתיקייה ייעודית בדרייב
              </p>
            </div>
          </div>

          {/* Connected state / Google Sign In */}
          <div>
            {accessToken ? (
              <div className="flex items-center gap-2 bg-emerald-900/60 border border-emerald-700/60 px-3 py-1.5 rounded-xl text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-emerald-100 truncate max-w-[180px]">
                  {currentUser?.email || 'מחובר ל-Google Drive'}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  title="התנתק מחשבון Drive"
                  className="text-emerald-300 hover:text-white p-1 transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              /* Google Sign In Button styled to official guidelines */
              <button
                type="button"
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-2.5 bg-white text-slate-800 hover:bg-slate-50 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md transition active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isSigningIn ? (
                  <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  </svg>
                )}
                <span>התחבר עם Google להפעלת Drive</span>
              </button>
            )}
          </div>
        </div>

        {/* Content summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-800/60 text-xs">
          <div className="bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-700/40">
            <span className="text-emerald-300 block text-[11px]">שיבוצים שייגובו:</span>
            <span className="text-base font-black text-white">{backupData.schedule.length}</span>
          </div>
          <div className="bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-700/40">
            <span className="text-emerald-300 block text-[11px]">בקשות שיבוץ:</span>
            <span className="text-base font-black text-amber-300">{backupData.requests.length}</span>
          </div>
          <div className="bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-700/40">
            <span className="text-emerald-300 block text-[11px]">מורים והנחיות:</span>
            <span className="text-base font-black text-white">{backupData.staff.length} מורים</span>
          </div>
          <div className="bg-emerald-900/40 p-2.5 rounded-xl border border-emerald-700/40">
            <span className="text-emerald-300 block text-[11px]">תיקיית יעד בדרייב:</span>
            <span className="text-xs font-bold text-white truncate block">גיבויי מערכת תקשוב</span>
          </div>
        </div>
      </div>

      {/* Main Controls Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Card 1: Daily Backup Status & Trigger */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">סטטוס גיבוי יומי</h4>
              <p className="text-xs text-slate-500">הגדרת ביצוע גיבוי אחת ליום או הפעלה יזומה כעת</p>
            </div>
            
            {/* Auto Daily Switch */}
            <button
              type="button"
              onClick={handleToggleAutoDaily}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                backupStatus.autoDailyEnabled
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${backupStatus.autoDailyEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
              <span>{backupStatus.autoDailyEnabled ? 'גיבוי יומי מופעל' : 'גיבוי יומי מושהה'}</span>
            </button>
          </div>

          {/* Last backup info display */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-700">
              <span className="text-slate-500 font-medium flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>מועד גיבוי אחרון:</span>
              </span>
              <span className="font-black text-slate-900">
                {backupStatus.lastBackupTimestamp
                  ? new Date(backupStatus.lastBackupTimestamp).toLocaleString('he-IL')
                  : 'טרם בוצע גיבוי לדרייב'}
              </span>
            </div>

            {backupStatus.fileName && (
              <div className="flex items-center justify-between text-slate-700">
                <span className="text-slate-500 font-medium flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>שם הקובץ:</span>
                </span>
                <span className="font-mono text-[11px] text-indigo-900 font-semibold truncate max-w-[200px]" dir="ltr">
                  {backupStatus.fileName}
                </span>
              </div>
            )}

            {backupStatus.webViewLink && (
              <div className="pt-2 border-t border-slate-200/80 flex justify-end">
                <a
                  href={backupStatus.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>צפה בקובץ הגיבוי ב-Google Drive</span>
                </a>
              </div>
            )}
          </div>

          {/* Backup Action Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              disabled={isBackingUp || isSigningIn}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black py-3 px-4 rounded-2xl text-xs md:text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isBackingUp ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>מבצע גיבוי ל-Google Drive...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>בצע גיבוי עכשיו ל-Google Drive 🚀</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Card 2: Recent Backups in Google Drive */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900">קובצי גיבוי ב-Drive</h4>
                <p className="text-xs text-slate-500">היסטוריית קבצים שנשמרו בחשבונך</p>
              </div>
              {accessToken && (
                <button
                  type="button"
                  onClick={() => loadRecentFiles(accessToken)}
                  disabled={isLoadingFiles}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                  title="רענן רשימה"
                >
                  <RotateCw className={`w-4 h-4 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>

            {/* List */}
            <div className="mt-3 space-y-2">
              {!accessToken ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Cloud className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">חיבור ל-Google Drive אינו פעיל</p>
                  <p className="text-slate-400 mt-1">התחבר/י לעיל כדי לצפות בקובצי הגיבוי השמורים בדרייב</p>
                </div>
              ) : isLoadingFiles ? (
                <div className="p-6 text-center text-xs text-slate-500 space-y-2">
                  <RotateCw className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
                  <p>טוען רשימת קובצי גיבוי מ-Google Drive...</p>
                </div>
              ) : recentFiles.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs bg-slate-50 rounded-2xl border border-slate-200">
                  <FolderOpen className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">טרם נמצאו גיבויים קודמים בדרייב</p>
                  <p className="text-slate-400 mt-1">לחץ/י על "בצע גיבוי עכשיו" כדי ליצור את הגיבוי הראשון</p>
                </div>
              ) : (
                recentFiles.map(file => (
                  <div
                    key={file.id}
                    className="p-3 bg-slate-50 hover:bg-indigo-50/50 rounded-xl border border-slate-200 transition flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate" dir="ltr">
                        {file.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {file.createdTime ? new Date(file.createdTime).toLocaleString('he-IL') : ''}
                      </p>
                    </div>
                    {file.webViewLink && (
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-indigo-600 hover:text-white text-indigo-600 font-bold border border-slate-200 rounded-lg text-xs shadow-2xs transition flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>פתח בדרייב</span>
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <FolderCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>תיקיית יעד: גיבויי מערכת תקשוב - חנה סנש</span>
            </span>
            <span>פורמט קובץ: JSON מלא</span>
          </div>
        </div>
      </div>

      {/* Explicit User Confirmation Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-emerald-800">
              <div className="p-3 bg-emerald-100 rounded-2xl">
                <Cloud className="w-6 h-6 text-emerald-700" />
              </div>
              <h3 className="text-lg font-black text-slate-900">אישור ביצוע גיבוי ל-Google Drive</h3>
            </div>

            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              האם ברצונך לבצע גיבוי מלא כעת?
              <br />
              הפעולה תיצור קובץ גיבוי בתיקיית <strong>"גיבויי מערכת תקשוב - חנה סנש"</strong> בחשבון ה-Google Drive שלך, שיכלול את כל <strong>{backupData.schedule.length} השיבוצים</strong>, <strong>{backupData.requests.length} הבקשות</strong>, רשימת המורים וההנחיות.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>תאריך ושעה:</span>
                <span className="font-bold text-slate-800">{new Date().toLocaleString('he-IL')}</span>
              </div>
              <div className="flex justify-between">
                <span>הרשאה נדרשת:</span>
                <span className="font-bold text-slate-800">Google Drive (שמירת קובץ הגיבוי)</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handlePerformBackup}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>אשר והעלה ל-Drive 🚀</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
