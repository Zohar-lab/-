import React, { useState } from 'react';
import { 
  Calendar, 
  FileText, 
  Clock, 
  Shield, 
  ShieldCheck, 
  RotateCw, 
  Cloud, 
  CloudOff, 
  CheckCircle2, 
  Laptop, 
  Mail, 
  Copy, 
  Check, 
  Building, 
  Share2, 
  ExternalLink, 
  MessageCircle, 
  Database,
  X 
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'schedule' | 'request' | 'pending' | 'admin';
  setActiveTab: (tab: 'schedule' | 'request' | 'pending' | 'admin') => void;
  pendingCount: number;
  isAdmin: boolean;
  onOpenAdminAuth: () => void;
  onLogoutAdmin: () => void;
  cloudStatus: 'connected' | 'saving' | 'synced' | 'local_only' | 'error';
  onManualSync: () => void;
  isSyncing: boolean;
  hideAdmin?: boolean;
  onOpenBackupModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  isAdmin,
  onOpenAdminAuth,
  onLogoutAdmin,
  cloudStatus,
  onManualSync,
  isSyncing,
  hideAdmin = false,
  onOpenBackupModal
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedTeacherLink, setCopiedTeacherLink] = useState(false);
  const [copiedGeneralLink, setCopiedGeneralLink] = useState(false);

  // Determine production/current app URL
  const getAppBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')) {
      return window.location.origin;
    }
    return 'https://ais-pre-z2f3jsfhbix2zlqvzuqlyb-6430820713.europe-west2.run.app';
  };

  const teacherOnlyUrl = `${getAppBaseUrl()}?mode=teacher`;
  const generalUrl = getAppBaseUrl();

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('a@edu-haifa.org.il');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleCopyTeacherLink = () => {
    navigator.clipboard.writeText(teacherOnlyUrl);
    setCopiedTeacherLink(true);
    setTimeout(() => setCopiedTeacherLink(false), 2500);
  };

  const handleCopyGeneralLink = () => {
    navigator.clipboard.writeText(generalUrl);
    setCopiedGeneralLink(true);
    setTimeout(() => setCopiedGeneralLink(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `שלום לכולם 👋
להלן הקישור למערכת שיבוץ תקשוב - בית ספר חנה סנש:
${teacherOnlyUrl}

ניתן לצפות בלוח השעות של כל חדר ועגלה, ולהגיש בקשת שיבוץ בלחיצה פשוטה!`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };
  return (
    <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap justify-between items-center gap-4">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-amber-400 text-slate-950 p-2.5 rounded-xl font-black text-xl shadow-md flex items-center justify-center">
            <Laptop className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg md:text-xl font-black tracking-tight text-white">
                מערכת שיבוץ תקשוב
              </h1>
              <span className="bg-indigo-500/30 text-indigo-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/30">
                חנה סנש
              </span>
            </div>
            <p className="text-xs text-slate-400">
              שיבוץ חדרי מחשבים, עגלות ניידים וטאבלטים בבית הספר
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800">
          <button
            id="nav-tab-schedule"
            onClick={() => setActiveTab('schedule')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>מערכת שעות</span>
          </button>

          <button
            id="nav-tab-request"
            onClick={() => setActiveTab('request')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'request'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>בקשת שיבוץ</span>
          </button>

          <button
            id="nav-tab-pending"
            onClick={() => setActiveTab('pending')}
            className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 relative ${
              activeTab === 'pending'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>בקשות ממתינות</span>
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>

          {!hideAdmin && (
            <button
              id="nav-tab-admin"
              onClick={() => {
                if (isAdmin) {
                  setActiveTab('admin');
                } else {
                  onOpenAdminAuth();
                }
              }}
              className={`px-3.5 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-1.5 relative ${
                activeTab === 'admin'
                  ? 'bg-amber-500 text-slate-950 font-black shadow'
                  : 'text-amber-400 hover:bg-slate-800/60'
              }`}
            >
              {isAdmin ? <ShieldCheck className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
              <span>מרחב ניהול</span>
              {pendingCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
                  {pendingCount}
                </span>
              )}
              <span className="text-xs">{isAdmin ? '🔓' : '🔒'}</span>
            </button>
          )}
        </nav>

        {/* Sync & Admin State & Share */}
        <div className="flex items-center gap-2">
          {/* Share with teachers button */}
          <button
            id="btn-share-teacher-link"
            onClick={() => setIsShareModalOpen(true)}
            title="פרסום ושיתוף קישור למורים"
            className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shadow-sm cursor-pointer border border-indigo-500"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="font-extrabold">פרסם קישור למורים</span>
          </button>

          {/* Cloud sync badge */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700 text-xs">
            {cloudStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-amber-300">
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>שומר בענן...</span>
              </span>
            ) : cloudStatus === 'synced' || cloudStatus === 'connected' ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ענן מסונכרן</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-400">
                <CloudOff className="w-3.5 h-3.5" />
                <span>שמירה מקומית</span>
              </span>
            )}
          </div>

          {/* Manual sync button */}
          <button
            id="btn-manual-sync"
            onClick={onManualSync}
            disabled={isSyncing}
            title="סנכרון מיידי עם הענן (Firebase)"
            className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">סנכרון ענן</span>
          </button>

          {/* Backup and restore modal button */}
          {onOpenBackupModal && (
            <button
              id="btn-open-backup-modal"
              onClick={onOpenBackupModal}
              title="גיבוי ושחזור נתונים (שיבוצים, בקשות והיסטוריה)"
              className="bg-purple-800/80 hover:bg-purple-700 active:scale-95 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-purple-600/50 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Database className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">גיבוי ושחזור</span>
            </button>
          )}

          {/* Admin auth toggle */}
          {!hideAdmin && (
            isAdmin ? (
              <button
                id="btn-admin-logout"
                onClick={onLogoutAdmin}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1"
              >
                <span>מנהל/ת</span>
                <span>🔓</span>
              </button>
            ) : (
              <button
                id="btn-admin-login"
                onClick={onOpenAdminAuth}
                className="bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1"
              >
                <span>כניסת מנהל</span>
                <span>🔒</span>
              </button>
            )
          )}
        </div>

      </div>

      {/* Published Organizational Access Bar for School Staff */}
      <div className="bg-slate-950 border-t border-slate-800/80 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center gap-2">
          
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-md font-extrabold text-[11px] flex items-center gap-1">
              <Building className="w-3.5 h-3.5" />
              <span>גישה ארגונית למורים</span>
            </span>
            <span className="text-slate-300 flex items-center gap-1.5">
              <span>כתובת לגישה של מורים מתוך הארגון:</span>
              <a 
                href="mailto:a@edu-haifa.org.il" 
                className="font-black text-amber-300 hover:text-amber-200 underline decoration-amber-400/50 flex items-center gap-1 dir-ltr"
                dir="ltr"
              >
                <Mail className="w-3 h-3" />
                <span>a@edu-haifa.org.il</span>
              </a>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="hidden sm:inline bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
              דומיין ארגוני: edu-haifa.org.il
            </span>

            <button
              onClick={() => setIsShareModalOpen(true)}
              className="bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 hover:text-white px-2.5 py-1 rounded-lg border border-indigo-700/60 transition flex items-center gap-1 font-bold text-xs"
            >
              <Share2 className="w-3 h-3 text-indigo-400" />
              <span>קישור ישיר</span>
            </button>

            <button
              onClick={handleCopyEmail}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1 font-bold text-xs"
              title="העתק כתובת ארגונית"
            >
              {copiedEmail ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400">הועתק ללוח!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>העתק כתובת</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Share / Publish Modal for Teachers */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            className="bg-white text-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150"
            dir="rtl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    פרסום ושיתוף קישור למורים
                  </h3>
                  <p className="text-xs text-slate-500">
                    מורים נכנסים ישירות ללא צורך ב-AI Studio וללא צורך בהתחברות
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AI Studio Share Note */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <span className="text-base leading-none">⚠️</span>
              <div className="space-y-1">
                <p className="font-bold">
                  הפעלת הקישור בפעם הראשונה (אם מתקבלת שגיאת Page not found):
                </p>
                <p className="text-amber-800 leading-relaxed text-[11px]">
                  בסביבת Google AI Studio, לחץ/י על כפתור <strong>&quot;Share&quot;</strong> הכחול בפינה העליונה (ליד שם הפרויקט) ולאחר מכן על <strong>Publish</strong>. פעולה זו מפרסמת את האפליקציה בענן ומפעילה את הקישור לכלל המורים.
                </p>
              </div>
            </div>

            {/* Teacher Direct Link Box (Clean view without admin) */}
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full">
                    מומלץ למורים ✨
                  </span>
                  <span className="font-bold text-xs text-indigo-950">
                    קישור ייעודי למורים (תצוגה נקייה ללא כפתור ניהול)
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-indigo-200">
                <input
                  type="text"
                  readOnly
                  value={teacherOnlyUrl}
                  className="w-full text-xs font-mono text-slate-600 bg-transparent outline-none dir-ltr truncate select-all"
                  dir="ltr"
                />
                <button
                  onClick={handleCopyTeacherLink}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg transition active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedTeacherLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-indigo-700/90 leading-relaxed">
                קישור זה פותח את לוח השעות ובקשות השיבוץ בלבד, ומסתיר לחלוטין את כפתור "כניסת מנהל" למניעת בלבול.
              </p>
            </div>

            {/* Standard Link Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-700">
                  קישור רגיל למערכת (כולל אפשרות כניסה לניהול בסיסמה)
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                <input
                  type="text"
                  readOnly
                  value={generalUrl}
                  className="w-full text-xs font-mono text-slate-600 bg-transparent outline-none dir-ltr truncate select-all"
                  dir="ltr"
                />
                <button
                  onClick={handleCopyGeneralLink}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                >
                  {copiedGeneralLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>הועתק!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>העתק</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Share via WhatsApp */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl font-black text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>שתף עכשיו בוואטסאפ לחדר המורים</span>
              </button>

              <button
                onClick={() => window.open(teacherOnlyUrl, '_blank')}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>פתיחה בלשונית חדשה</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
