import React, { useState, useEffect } from 'react';
import { X, Trash2, Save, Calendar, Sparkles, AlertTriangle } from 'lucide-react';
import { Resource, ScheduleEntry, BookingType } from '../types';
import { CLASSES, DAYS, PERIODS } from '../data/initialData';

interface EditBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceId: string;
  dayIdx: number;
  periodId: number;
  existingEntry?: ScheduleEntry;
  staffList: string[];
  resources: Resource[];
  onSave: (entry: ScheduleEntry) => Promise<void>;
  onDelete: (entryId: string) => Promise<void>;
}

export const EditBookingModal: React.FC<EditBookingModalProps> = ({
  isOpen,
  onClose,
  resourceId,
  dayIdx,
  periodId,
  existingEntry,
  staffList,
  resources,
  onSave,
  onDelete
}) => {
  const [teacherName, setTeacherName] = useState('');
  const [className, setClassName] = useState('');
  const [type, setType] = useState<BookingType>('שיבוץ קבוע');
  const [subject, setSubject] = useState('');
  const [specificDate, setSpecificDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setShowDeleteConfirm(false);
    if (existingEntry) {
      setTeacherName(existingEntry.teacherName || '');
      setClassName(existingEntry.className || '');
      setType((existingEntry.type as BookingType) || 'שיבוץ קבוע');
      setSubject(existingEntry.subject || '');
      setSpecificDate(existingEntry.specificDate || '');
    } else {
      setTeacherName('');
      setClassName('');
      setType('שיבוץ קבוע');
      setSubject('');
      setSpecificDate('');
    }
  }, [existingEntry, isOpen]);

  if (!isOpen) return null;

  const currentRes = resources.find(r => r.id === resourceId);
  const currentPeriod = PERIODS.find(p => p.id === periodId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherName || !className || !subject.trim()) return;

    setIsSaving(true);
    const entryData: ScheduleEntry = {
      id: existingEntry ? existingEntry.id : `sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      resourceId,
      dayIdx: Number(dayIdx),
      day: DAYS[dayIdx] || "יום א'",
      periodId: Number(periodId),
      teacherName,
      className,
      type,
      subject: subject.trim(),
      createdAt: existingEntry?.createdAt || new Date().toISOString()
    };

    if (specificDate && specificDate.trim()) {
      entryData.specificDate = specificDate.trim();
    }

    try {
      await onSave(entryData);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!existingEntry) return;
    setIsDeleting(true);
    try {
      await onDelete(existingEntry.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center">
          <div>
            <h3 className="font-black text-base flex items-center gap-1.5">
              <span>{existingEntry ? 'עריכת שיבוץ קיים' : 'שיבוץ שיעור חדש בלוח'}</span>
            </h3>
            <div className="text-xs text-indigo-200 mt-0.5">
              {currentRes?.name} • {DAYS[dayIdx]} • {currentPeriod?.label} ({currentPeriod?.time})
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-indigo-200 hover:text-white p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Type */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">סוג שיבוץ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as BookingType)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="שיעור מערכת">🏛️ שיעור מערכת (קבוע בלוח בית הספר)</option>
              <option value="שיבוץ קבוע">🌿 שיבוץ קבוע</option>
              <option value="שיעור מזדמן">📘 שיעור מזדמן / חד-פעמי</option>
              <option value="פעילות מיוחדת">🎉 פעילות מיוחדת / אירוע מותאם</option>
            </select>
          </div>

          {/* Specific date if relevant */}
          {(type === 'שיעור מזדמן' || type === 'פעילות מיוחדת') && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">תאריך ספציפי (אופציונלי)</label>
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}

          {/* Teacher */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">מורה מלמד/ת *</label>
            <select
              required
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- בחר/י מורה --</option>
              {staffList.map((t, i) => (
                <option key={i} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Class */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">כיתה *</label>
            <select
              required
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- בחר/י כיתה --</option>
              {CLASSES.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">נושא השיעור / מקצוע *</label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="לדוגמה: תקשוב / מדעים / אנגלית / שפה"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Delete Confirmation Alert Banner */}
          {showDeleteConfirm && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-red-900 font-extrabold text-xs">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>האם את/ה בטוח/ה שברצונך למחוק שיבוץ זה מלוח השעות?</span>
              </div>
              <p className="text-[11px] text-red-700">
                המשבצת תתפנה מיד לשיבוצים חדשים (ניתן יהיה לבטל את המחיקה דרך יומן הפעולות).
              </p>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  לא, בטל
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'מוחק...' : 'כן, אשר מחיקה סופית 🗑️'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            {existingEntry ? (
              !showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isDeleting}
                  className="px-3.5 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>מחק שיבוץ</span>
                </button>
              ) : <div />
            ) : <div />}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="submit"
                disabled={isSaving || showDeleteConfirm}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'שומר...' : 'שמור שיבוץ'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
