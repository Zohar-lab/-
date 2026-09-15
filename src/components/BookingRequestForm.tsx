import React, { useState, useEffect } from 'react';
import { Send, CheckCircle2, AlertCircle, Clock, Calendar, Sparkles, X } from 'lucide-react';
import { Resource, ScheduleRequest, BookingType } from '../types';
import { CLASSES, DAYS, PERIODS } from '../data/initialData';

interface BookingRequestFormProps {
  staffList: string[];
  resources: Resource[];
  initialResourceId?: string;
  initialDayIdx?: number;
  initialPeriodId?: number;
  onSubmitRequest: (request: ScheduleRequest) => Promise<void>;
  onViewPending: () => void;
  onCancel?: () => void;
}

export const BookingRequestForm: React.FC<BookingRequestFormProps> = ({
  staffList,
  resources,
  initialResourceId,
  initialDayIdx,
  initialPeriodId,
  onSubmitRequest,
  onViewPending,
  onCancel
}) => {
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [resourceId, setResourceId] = useState(initialResourceId || (resources[0]?.id || ''));
  const [dayIdx, setDayIdx] = useState<number>(initialDayIdx !== undefined ? initialDayIdx : 0);
  const [periodId, setPeriodId] = useState<number>(initialPeriodId || 1);
  const [type, setType] = useState<BookingType>('שיעור מזדמן');
  const [specificDate, setSpecificDate] = useState('');
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialResourceId) setResourceId(initialResourceId);
    if (initialDayIdx !== undefined) setDayIdx(initialDayIdx);
    if (initialPeriodId) setPeriodId(initialPeriodId);
  }, [initialResourceId, initialDayIdx, initialPeriodId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!teacherName) {
      setErrorMessage('נא לבחור את שם המורה המבקש/ת');
      return;
    }
    if (!className) {
      setErrorMessage('נא לבחור כיתה');
      return;
    }
    if (!subject.trim()) {
      setErrorMessage('נא למלא את נושא השיעור או תיאור הפעילות');
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
      // Reset subject & notes
      setSubject('');
      setNotes('');
      setSpecificDate('');
    } catch {
      setErrorMessage('אירעה שגיאה בשמירת הבקשה, נסה שוב.');
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
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-md border border-slate-200 space-y-6">
        
        <div className="border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5 text-indigo-950 font-black text-lg md:text-xl">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2>טופס בקשת שיבוץ בחדרי מחשב ועגלות</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            הבקשה תועבר לרכזת התקשוב לאישור ותישמר בענן בזמן אמת.
          </p>
        </div>

        {/* Success alert */}
        {submittedSuccess && (
          <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-emerald-950 text-xs space-y-2">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>הבקשה נקלטה ונשמרה בהצלחה במערכת ובענן!</span>
            </div>
            <p className="text-emerald-800">
              בקשתך הועברה לאישור רכזת התקשוב. באפשרותך לעקוב אחר סטאטוס הבקשה במסך הבקשות הממתינות.
            </p>
            <div className="pt-1 flex gap-3">
              <button
                type="button"
                onClick={onViewPending}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 py-1.5 rounded-lg transition text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>צפה בבקשות ממתינות</span>
              </button>
              <button
                type="button"
                onClick={() => setSubmittedSuccess(false)}
                className="text-emerald-900 hover:underline font-bold text-xs"
              >
                הגש בקשה נוספת
              </button>
            </div>
          </div>
        )}

        {/* Error alert */}
        {errorMessage && (
          <div className="bg-red-50 border border-red-300 p-3 rounded-xl text-red-900 text-xs flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Teacher */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                שם המורה המבקש/ת *
              </label>
              <select
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              >
                <option value="">-- בחר/י מורה מהרשימה --</option>
                {staffList.map((teacher, idx) => (
                  <option key={idx} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                כיתה *
              </label>
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              >
                <option value="">-- בחר/י כיתה --</option>
                {CLASSES.map((cls, idx) => (
                  <option key={idx} value={cls}>{cls}</option>
                ))}
              </select>
            </div>

            {/* Resource */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                משאב תקשוב מבוקש *
              </label>
              <select
                value={resourceId}
                onChange={(e) => setResourceId(e.target.value)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              >
                {resources.map((res) => (
                  <option key={res.id} value={res.id}>
                    {res.name} (קיבולת: {res.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                יום בשבוע *
              </label>
              <select
                value={dayIdx}
                onChange={(e) => setDayIdx(Number(e.target.value))}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              >
                {DAYS.map((day, idx) => (
                  <option key={idx} value={idx}>{day}</option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                שעת שיעור *
              </label>
              <select
                value={periodId}
                onChange={(e) => setPeriodId(Number(e.target.value))}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              >
                {PERIODS.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.label} ({period.time})
                  </option>
                ))}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                סוג שיבוץ *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as BookingType)}
                required
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
              >
                <option value="שיעור מזדמן">שיעור מזדמן / חד-פעמי</option>
                <option value="שיבוץ קבוע">שיבוץ קבוע במערכת</option>
                <option value="פעילות מיוחדת">🎉 פעילות מיוחדת / אירוע בית ספרי</option>
              </select>
            </div>

          </div>

          {/* Specific date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              תאריך ספציפי (מומלץ עבור שיעור חד-פעמי או פעילות מיוחדת)
            </label>
            <input
              type="date"
              value={specificDate}
              onChange={(e) => setSpecificDate(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              נושא השיעור / תיאור הפעילות *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="לדוגמה: משימת תקשוב במדעים / מבדק שכבתי מקוון / כתיבת עבודה"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              הערות או בקשות מיוחדות לרכזת
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="דרישות תוכנה ספציפיות, מחשבים עם אזניות, מקרן ועוד..."
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold py-3 px-6 rounded-xl transition shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? 'שומר בענן...' : 'שלח בקשת שיבוץ לרכזת'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetForm}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-slate-300 cursor-pointer"
              title="ביטול ואיפוס הטופס"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
              <span>בטל</span>
            </button>

            <button
              type="button"
              onClick={onViewPending}
              className="bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold px-4 py-3 rounded-xl transition text-xs flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>צפייה בבקשות ממתינות</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
