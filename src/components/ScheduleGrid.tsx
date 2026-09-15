import React, { useState } from 'react';
import { 
  Monitor, 
  Laptop, 
  MapPin, 
  Users, 
  Plus, 
  Calendar as CalendarIcon, 
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { Resource, ScheduleEntry, Period } from '../types';
import { DAYS, PERIODS, RESOURCES } from '../data/initialData';

interface ScheduleGridProps {
  resources: Resource[];
  selectedResourceId: string;
  onSelectResource: (resourceId: string) => void;
  schedule: ScheduleEntry[];
  isAdmin: boolean;
  onCellClick: (resourceId: string, dayIdx: number, periodId: number, existingEntry?: ScheduleEntry) => void;
  onRequestBookingSlot?: (resourceId: string, dayIdx: number, periodId: number) => void;
  onDeleteScheduleEntry?: (entryId: string) => Promise<void> | void;
}

export const ScheduleGrid: React.FC<ScheduleGridProps> = ({
  resources,
  selectedResourceId,
  onSelectResource,
  schedule,
  isAdmin,
  onCellClick,
  onRequestBookingSlot,
  onDeleteScheduleEntry
}) => {
  const [entryToDelete, setEntryToDelete] = useState<ScheduleEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const currentResource = resources.find(r => r.id === selectedResourceId) || resources[0];

  const labs = resources.filter(r => r.type === 'lab');
  const carts = resources.filter(r => r.type === 'cart');

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'שיעור מערכת':
        return {
          card: 'bg-amber-50 border-amber-300 text-amber-950 hover:border-amber-400',
          badge: 'bg-amber-100 text-amber-900 border border-amber-300',
          indicator: 'bg-amber-500'
        };
      case 'שיבוץ קבוע':
        return {
          card: 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:border-emerald-400',
          badge: 'bg-emerald-100 text-emerald-900 border border-emerald-300',
          indicator: 'bg-emerald-500'
        };
      case 'שיעור מזדמן':
        return {
          card: 'bg-sky-50 border-sky-300 text-sky-950 hover:border-sky-400',
          badge: 'bg-sky-100 text-sky-900 border border-sky-300',
          indicator: 'bg-sky-500'
        };
      case 'פעילות מיוחדת':
        return {
          card: 'bg-purple-50 border-purple-300 text-purple-950 hover:border-purple-400',
          badge: 'bg-purple-100 text-purple-900 border border-purple-300',
          indicator: 'bg-purple-500'
        };
      default:
        return {
          card: 'bg-slate-50 border-slate-300 text-slate-900 hover:border-slate-400',
          badge: 'bg-slate-100 text-slate-800 border border-slate-300',
          indicator: 'bg-slate-400'
        };
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Resource selector bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        
        {/* Labs */}
        <div className="space-y-1.5 flex-1">
          <div className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-indigo-600" />
            <span>חדרי מחשבים קבועים:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {labs.map(lab => {
              const active = lab.id === selectedResourceId;
              return (
                <button
                  key={lab.id}
                  onClick={() => onSelectResource(lab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md scale-102 ring-2 ring-indigo-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>{lab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Carts */}
        <div className="space-y-1.5 flex-1">
          <div className="text-xs font-extrabold text-slate-500 flex items-center gap-1.5">
            <Laptop className="w-3.5 h-3.5 text-indigo-600" />
            <span>עגלות ניידים וטאבלטים:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {carts.map(cart => {
              const active = cart.id === selectedResourceId;
              return (
                <button
                  key={cart.id}
                  onClick={() => onSelectResource(cart.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    active
                      ? 'bg-indigo-600 text-white shadow-md scale-102 ring-2 ring-indigo-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>{cart.name}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Selected resource banner */}
      <div className="bg-gradient-to-l from-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl border border-white/10">
            {currentResource.type === 'lab' ? (
              <Monitor className="w-6 h-6 text-indigo-300" />
            ) : (
              <Laptop className="w-6 h-6 text-amber-300" />
            )}
          </div>
          <div>
            <div className="text-xs text-indigo-200 font-semibold">לוח שיבוצים עבור:</div>
            <h2 className="text-lg md:text-xl font-black text-white">{currentResource.name}</h2>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <Users className="w-3.5 h-3.5 text-indigo-300" />
            <span>קיבולת: <strong>{currentResource.capacity} עמדות/מחשבים</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10">
            <MapPin className="w-3.5 h-3.5 text-amber-300" />
            <span>מיקום: <strong>{currentResource.location}</strong></span>
          </div>
        </div>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-600 font-medium">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-slate-700">מקרא צבעים:</span>
          <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-900 px-2 py-0.5 rounded-md font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            שיעור מערכת
          </span>
          <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-900 px-2 py-0.5 rounded-md font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            שיבוץ קבוע
          </span>
          <span className="inline-flex items-center gap-1 bg-sky-50 border border-sky-300 text-sky-900 px-2 py-0.5 rounded-md font-bold">
            <span className="w-2 h-2 rounded-full bg-sky-500"></span>
            שיעור מזדמן
          </span>
          <span className="inline-flex items-center gap-1 bg-purple-50 border border-purple-300 text-purple-900 px-2 py-0.5 rounded-md font-bold">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            פעילות מיוחדת
          </span>
        </div>

        {isAdmin && (
          <div className="text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg text-xs font-bold">
            💡 מצב מנהל פעיל: לחץ/י על כל משבצת כדי לערוך, לשבץ או למחוק
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto custom-scrollbar">
        <table className="w-full text-right border-collapse min-w-[760px]">
          <thead>
            <tr className="bg-slate-50/90 text-slate-700 text-xs font-extrabold border-b border-slate-200">
              <th className="p-3 w-32 text-center border-l border-slate-200">שעה / זמן</th>
              {DAYS.map((day, idx) => (
                <th key={idx} className="p-3 text-center border-l border-slate-200 last:border-l-0">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {PERIODS.map(period => (
              <tr key={period.id} className="hover:bg-slate-50/50 transition">
                
                {/* Period label */}
                <td className="p-2.5 border-l border-slate-200 bg-slate-50/80 text-center font-bold text-slate-800">
                  <div className="font-extrabold text-indigo-950">{period.label}</div>
                  <div className="text-[10px] text-slate-400 font-medium mt-0.5" dir="ltr">
                    {period.time}
                  </div>
                </td>

                {/* Day columns */}
                {DAYS.map((dayName, dayIdx) => {
                  const entry = schedule.find(s => 
                    s.resourceId === selectedResourceId &&
                    (Number(s.dayIdx) === dayIdx || s.day === dayName) &&
                    Number(s.periodId) === period.id
                  );

                  if (entry) {
                    const styles = getBadgeStyle(entry.type);
                    return (
                      <td key={dayIdx} className="p-2 border-l border-slate-200 last:border-l-0 align-top h-28 w-[14.5%]">
                        <div
                          onClick={() => onCellClick(selectedResourceId, dayIdx, period.id, entry)}
                          className={`h-full p-2.5 rounded-xl border ${styles.card} flex flex-col justify-between shadow-xs transition-all relative group ${
                            isAdmin ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : 'cursor-default'
                          }`}
                        >
                          {/* Admin Direct Delete Quick Action */}
                          {isAdmin && onDeleteScheduleEntry && (
                            <button
                              type="button"
                              title="מחק שיבוץ זה מהלוח"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEntryToDelete(entry);
                              }}
                              className="absolute top-1 left-1 p-1 rounded-lg bg-white/95 hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 shadow-2xs opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <div>
                            <div className="font-black text-xs leading-tight text-slate-900 mb-0.5 pl-4">
                              {entry.className} • {entry.teacherName}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-700 line-clamp-2">
                              {entry.subject}
                            </div>
                          </div>

                          <div className="mt-1 flex items-center justify-between text-[10px] font-bold border-t border-slate-200/80 pt-1">
                            <span className={`px-1.5 py-0.2 rounded-md ${styles.badge}`}>
                              {entry.type || 'שיבוץ'}
                            </span>
                            {entry.specificDate ? (
                              <span className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5">
                                <CalendarIcon className="w-2.5 h-2.5" />
                                {entry.specificDate}
                              </span>
                            ) : isAdmin ? (
                              <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition">
                                <span className="text-indigo-600 font-bold flex items-center gap-0.5">
                                  <Edit2 className="w-2.5 h-2.5" /> ערוך
                                </span>
                                {onDeleteScheduleEntry && (
                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEntryToDelete(entry);
                                    }}
                                    className="text-red-600 hover:text-red-700 font-bold flex items-center gap-0.5 mr-0.5 cursor-pointer"
                                    title="מחק שיבוץ זה מהלוח"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" /> מחק
                                  </span>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  // Empty Slot
                  return (
                    <td key={dayIdx} className="p-2 border-l border-slate-200 last:border-l-0 align-top h-28 w-[14.5%]">
                      {isAdmin ? (
                        <button
                          onClick={() => onCellClick(selectedResourceId, dayIdx, period.id)}
                          className="w-full h-full rounded-xl border border-dashed border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50 hover:border-indigo-400 text-indigo-700 transition flex flex-col items-center justify-center gap-1 p-2 group cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition" />
                          <span className="text-[11px] font-bold">שבץ שיעור</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onRequestBookingSlot && onRequestBookingSlot(selectedResourceId, dayIdx, period.id)}
                          title="לחצ/י להגשת בקשת שיבוץ לשעה זו"
                          className="w-full h-full rounded-xl border border-dashed border-slate-200 bg-slate-50/40 hover:bg-indigo-50/40 hover:border-indigo-300 text-slate-400 hover:text-indigo-600 transition flex flex-col items-center justify-center gap-1 p-2 group"
                        >
                          <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600">פנוי</span>
                          <span className="text-[10px] text-slate-400 group-hover:text-indigo-600 font-medium flex items-center gap-0.5">
                            + בקש שיבוץ
                          </span>
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Schedule Entry Confirmation Dialog */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right" 
            dir="rtl"
          >
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-3 bg-red-100 text-red-600 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  אישור מחיקת שיבוץ מהלוח
                </h3>
                <p className="text-xs text-slate-500">
                  המשבצת תתפנה מיד למורים אחרים
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500">משאב / מיקום:</span>
                <span className="font-bold text-slate-800">{currentResource.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500">מועד השיעור:</span>
                <span className="font-bold text-indigo-900">
                  {DAYS[entryToDelete.dayIdx]} • שעה {entryToDelete.periodId}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/80 pb-1.5">
                <span className="text-slate-500">מורה וכיתה:</span>
                <span className="font-bold text-slate-800">
                  {entryToDelete.teacherName} ({entryToDelete.className})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">נושא השיעור:</span>
                <span className="font-bold text-slate-800">{entryToDelete.subject}</span>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                המחיקה תסונכרן מיידית לענן. במידת הצורך, ניתן לבטל את המחיקה בכל עת דרך כפתור <strong>&quot;ביטול פעולה אחרונה ↩️&quot;</strong> בפורטל הניהול.
              </span>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!onDeleteScheduleEntry || !entryToDelete) return;
                  setIsDeleting(true);
                  try {
                    await onDeleteScheduleEntry(entryToDelete.id);
                    setEntryToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'מוחק מהענן...' : 'כן, אשר מחיקה 🗑️'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
