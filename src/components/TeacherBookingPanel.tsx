import React, { useState } from 'react';
import { 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Calendar, 
  Sparkles, 
  User, 
  FileText, 
  ListChecks, 
  ChevronDown, 
  ChevronUp, 
  Monitor, 
  Laptop,
  Mail,
  Copy,
  Check,
  X
} from 'lucide-react';
import { Resource, ScheduleRequest, BookingType } from '../types';
import { CLASSES, DAYS, PERIODS } from '../data/initialData';

interface TeacherBookingPanelProps {
  staffList: string[];
  resources: Resource[];
  selectedResourceId: string;
  onSelectResource: (id: string) => void;
  preselect: {
    resourceId?: string;
    dayIdx?: number;
    periodId?: number;
  };
  onSubmitRequest: (request: ScheduleRequest) => Promise<void>;
  requests: ScheduleRequest[];
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const TeacherBookingPanel: React.FC<TeacherBookingPanelProps> = ({
  staffList,
  resources,
  selectedResourceId,
  onSelectResource,
  preselect,
  onSubmitRequest,
  requests,
  isOpen,
  onToggleOpen
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'form' | 'list'>('form');

  // Form states
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [resourceId, setResourceId] = useState(preselect.resourceId || selectedResourceId);
  const [dayIdx, setDayIdx] = useState<number>(preselect.dayIdx !== undefined ? preselect.dayIdx : 0);
  const [periodId, setPeriodId] = useState<number>(preselect.periodId || 1);
  const [type, setType] = useState<BookingType>('שיעור מזדמן');
  const [specificDate, setSpecificDate] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Sync with preselect when user clicks an empty cell on the schedule board
  React.useEffect(() => {
    if (preselect.resourceId) setResourceId(preselect.resourceId);
    if (preselect.dayIdx !== undefined) setDayIdx(preselect.dayIdx);
    if (preselect.periodId !== undefined) setPeriodId(preselect.periodId);
    if (preselect.dayIdx !== undefined || preselect.periodId !== undefined) {
      setActiveSubTab('form');
      setSubmittedSuccess(false);
    }
  }, [preselect]);

  const pendingRequests = requests.filter(r => r.status === 'ממתין' || !r.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!teacherName) {
      setErrorMessage('נא לבחור מורה מהרשימה');
      return;
    }
    if (!className) {
      setErrorMessage('נא לבחור כיתה');
      return;
    }
    if (!subject.trim()) {
      setErrorMessage('נא למלא את נושא השיעור');
      return;
    }

    setIsSubmitting(true);

    const newRequest: ScheduleRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      teacherName,
      className,
      resourceId,
      dayIdx: Number(dayIdx),
      day: DAYS[dayIdx] || "יום א'",
      periodId: Number(periodId),
      type,
      subject: subject.trim(),
      status: 'ממתין',
      createdAt: new Date().toISOString()
    };

    if (specificDate && specificDate.trim()) {
      newRequest.specificDate = specificDate.trim();
    }
    if (notes && notes.trim()) {
      newRequest.notes = notes.trim();
    }

    try {
      await onSubmitRequest(newRequest);
      setSubmittedSuccess(true);
      setSubject('');
      setNotes('');
      setSpecificDate('');
    } catch {
      setErrorMessage('שגיאה בשמירת הבקשה, אנא נסה/י שוב.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setTeacherName('');
    setClassName('');
    setSubject('');
    setNotes('');
    setSpecificDate('');
    setType('שיעור מזדמן');
    setErrorMessage('');
    setSubmittedSuccess(false);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText('a@edu-haifa.org.il');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  if (!isOpen) {
    return (
      <div className="bg-white rounded-2xl border border-indigo-200 shadow-xs p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <FileText className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-slate-800">
            פאנל בקשות שיבוץ מורים
          </span>
          {pendingRequests.length > 0 && (
            <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
              {pendingRequests.length} ממתינות
            </span>
          )}
        </div>
        <button
          onClick={onToggleOpen}
          className="text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition flex items-center gap-1"
        >
          <span>פתח במקביל ללוח</span>
          <span>⬅️</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      
      {/* Top Header of the Parallel Panel */}
      <div className="p-4 bg-gradient-to-r from-indigo-900 to-slate-900 text-white flex justify-between items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-amber-400 text-slate-950 rounded-xl">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm text-white flex items-center gap-1.5">
              <span>בקשות שיבוץ מורים</span>
              <span className="text-[10px] bg-indigo-500/40 text-indigo-200 px-1.5 py-0.2 rounded-md font-bold">
                במקביל ללוח
              </span>
            </h3>
            <p className="text-[11px] text-slate-300">
              הגשת בקשה ומעקב בזמן אמת
            </p>
          </div>
        </div>

        <button
          onClick={onToggleOpen}
          title="הסתר פאנל"
          className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition text-xs flex items-center gap-1"
        >
          <span className="text-[11px]">סגור</span>
          <ChevronUp className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* Organizational access helper banner */}
      <div className="bg-amber-50/90 border-b border-amber-200 px-3 py-2 flex items-center justify-between text-[11px] text-amber-950">
        <div className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5 text-amber-700 shrink-0" />
          <span>גישה מתוך הארגון:</span>
          <a href="mailto:a@edu-haifa.org.il" className="font-extrabold text-indigo-900 hover:underline">
            a@edu-haifa.org.il
          </a>
        </div>
        <button
          onClick={handleCopyEmail}
          className="text-[10px] bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold transition flex items-center gap-1"
        >
          {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
          <span>{copiedEmail ? 'הועתק!' : 'העתק'}</span>
        </button>
      </div>

      {/* Sub tabs: Form vs Pending List */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold gap-1">
        <button
          onClick={() => setActiveSubTab('form')}
          className={`py-1.5 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'form'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>טופס בקשת שיבוץ</span>
        </button>

        <button
          onClick={() => setActiveSubTab('list')}
          className={`py-1.5 px-2 rounded-xl transition flex items-center justify-center gap-1.5 ${
            activeSubTab === 'list'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>ממתינות ({pendingRequests.length})</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar text-xs">
        
        {activeSubTab === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            
            {/* Quick helper tip */}
            <div className="bg-indigo-50/70 border border-indigo-100 p-2.5 rounded-xl text-[11px] text-indigo-900 flex items-start gap-2">
              <span className="text-sm shrink-0">💡</span>
              <span>
                <strong>טיפ שיבוץ:</strong> לחצו על כל משבצת פנויה בלוח השיבוץ במקביל, והיא תמלא אוטומטית את היום והשעה בטופס כאן!
              </span>
            </div>

            {/* Success Alert */}
            {submittedSuccess && (
              <div className="bg-emerald-50 border border-emerald-300 p-3 rounded-xl text-emerald-950 text-xs space-y-1.5">
                <div className="flex items-center gap-1.5 font-black text-emerald-900">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>הבקשה נשלחה ונשמרה בענן בהצלחה!</span>
                </div>
                <p className="text-[11px] text-emerald-800">
                  בקשתך הועברה לאישור רכזת התקשוב. תוכלי לצפות בסטטוס בטאב "ממתינות".
                </p>
                <div className="pt-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveSubTab('list')}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg transition"
                  >
                    צפייה בבקשה בטאב ממתינות
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubmittedSuccess(false)}
                    className="text-emerald-900 hover:underline font-bold text-[11px]"
                  >
                    הגשת בקשה נוספת
                  </button>
                </div>
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="bg-red-50 border border-red-300 p-2.5 rounded-xl text-red-900 text-xs flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Teacher name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                שם המורה המבקש/ת *
              </label>
              <select
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl p-2 text-xs font-semibold"
              >
                <option value="">-- בחרו מורה מהצוות --</option>
                {staffList.map((st, i) => (
                  <option key={i} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                כיתה *
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl p-2 text-xs font-semibold"
              >
                <option value="">-- בחרו כיתה --</option>
                {CLASSES.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Resource */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                משאב מבוקש *
              </label>
              <select
                value={resourceId}
                onChange={(e) => {
                  setResourceId(e.target.value);
                  onSelectResource(e.target.value);
                }}
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 rounded-xl p-2 text-xs font-semibold"
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.type === 'lab' ? '🖥️ ' : '💻 '} {r.name} ({r.capacity} עמדות)
                  </option>
                ))}
              </select>
            </div>

            {/* Day & Period */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  יום *
                </label>
                <select
                  value={dayIdx}
                  onChange={(e) => setDayIdx(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl p-2 text-xs font-semibold"
                >
                  {DAYS.map((d, idx) => (
                    <option key={idx} value={idx}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  שעה *
                </label>
                <select
                  value={periodId}
                  onChange={(e) => setPeriodId(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl p-2 text-xs font-semibold"
                >
                  {PERIODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} ({p.time})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Specific Date & Type */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  תאריך ספציפי (אופציונלי)
                </label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl p-2 text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  סוג שיבוץ
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as BookingType)}
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl p-2 text-xs font-semibold"
                >
                  <option value="שיעור מזדמן">שיעור מזדמן</option>
                  <option value="שיבוץ קבוע">שיבוץ קבוע</option>
                  <option value="פעילות מיוחדת">פעילות מיוחדת</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                נושא השיעור / פעילות *
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="לדוגמה: עברית - חקר ברשת, מתמטיקה"
                required
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl p-2 text-xs font-medium"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                הערות או בקשות מיוחדות
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="בקשת התקנת תוכנה, חיבור מקרן וכו'..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl p-2 text-xs font-medium"
              />
            </div>

            {/* Submit and Cancel buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold py-2.5 px-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'שולח בקשה...' : 'שליחת בקשת שיבוץ לרכזת'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 active:scale-98 text-slate-700 font-bold rounded-xl transition text-xs flex items-center justify-center gap-1 border border-slate-300 cursor-pointer"
                title="ביטול ואיפוס השדות בטופס"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>בטל</span>
              </button>
            </div>

          </form>
        ) : (
          /* Pending Requests Tracking List */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-slate-700 font-bold text-xs pb-1 border-b border-slate-100">
              <span>בקשות שהוגשו וממתינות לאישור ({pendingRequests.length})</span>
              <button
                onClick={() => setActiveSubTab('form')}
                className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold"
              >
                + בקשה חדשה
              </button>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-10 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 space-y-1">
                <span className="text-2xl block">🎉</span>
                <div className="font-bold text-slate-700 text-xs">אין כרגע בקשות ממתינות</div>
                <div className="text-[11px]">כל הבקשות שובצו בלוח או טופלו</div>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map((req) => {
                  const res = resources.find(r => r.id === req.resourceId);
                  const p = PERIODS.find(x => x.id === Number(req.periodId));
                  const dayStr = req.day || DAYS[req.dayIdx] || "יום א'";

                  return (
                    <div
                      key={req.id}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 rounded-xl transition text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between font-extrabold text-slate-900">
                        <span className="text-indigo-950 flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-600" />
                          {req.teacherName}
                        </span>
                        <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold text-[10px]">
                          {req.className}
                        </span>
                      </div>

                      <div className="text-slate-600 flex items-center gap-1 text-[11px]">
                        {res?.type === 'lab' ? <Monitor className="w-3 h-3 text-indigo-600" /> : <Laptop className="w-3 h-3 text-amber-600" />}
                        <span className="font-bold text-slate-800">{res ? res.name : req.resourceId}</span>
                        <span>•</span>
                        <span>{dayStr}, {p ? p.label : `שעה ${req.periodId}`}</span>
                      </div>

                      <div className="text-slate-700 font-medium">
                        📖 {req.subject}
                      </div>

                      {req.specificDate && (
                        <div className="text-[10px] text-amber-900 bg-amber-100/70 px-1.5 py-0.5 rounded flex items-center gap-1 font-semibold w-fit">
                          <Calendar className="w-2.5 h-2.5" />
                          {req.specificDate}
                        </div>
                      )}

                      <div className="pt-1 flex items-center justify-between text-[10px] border-t border-slate-200/60 text-amber-800 font-bold">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          ממתין לאישור רכזת
                        </span>
                        <span className="text-slate-400 font-normal">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString('he-IL') : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
};
