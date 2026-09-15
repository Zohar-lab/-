import React from 'react';
import { 
  Clock, 
  Calendar, 
  Check, 
  X, 
  Monitor, 
  Laptop, 
  User, 
  FilePlus, 
  CheckCircle2 
} from 'lucide-react';
import { ScheduleRequest, Resource } from '../types';
import { PERIODS, DAYS } from '../data/initialData';

interface PendingRequestsViewProps {
  requests: ScheduleRequest[];
  resources: Resource[];
  isAdmin: boolean;
  onApproveRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onNewRequest: () => void;
}

export const PendingRequestsView: React.FC<PendingRequestsViewProps> = ({
  requests,
  resources,
  isAdmin,
  onApproveRequest,
  onRejectRequest,
  onNewRequest
}) => {
  const pending = requests.filter(r => r.status === 'ממתין' || !r.status);

  return (
    <div className="max-w-4xl mx-auto w-full space-y-4">
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 space-y-5">
        
        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5 text-indigo-950 font-black text-lg md:text-xl">
              <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </span>
              <h2>בקשות שיבוץ הממתינות לאישור רכזת ({pending.length})</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              רשימת כלל הבקשות שהוגשו על ידי המורים בבית הספר וטרם שובצו באופן סופי
            </p>
          </div>

          <button
            onClick={onNewRequest}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
          >
            <FilePlus className="w-4 h-4" />
            <span>הגשת בקשה חדשה</span>
          </button>
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <span className="text-4xl block">🎉</span>
            <h3 className="font-extrabold text-slate-800 text-sm">אין כרגע בקשות ממתינות במערכת</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              כל הבקשות שהוגשו טופלו ושובצו בלוח השעות. להגשת בקשה חדשה לחצו על הכפתור למעלה.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((req) => {
              const res = resources.find(r => r.id === req.resourceId);
              const p = PERIODS.find(x => x.id === Number(req.periodId));
              const dayStr = req.day || DAYS[req.dayIdx] || "יום א'";

              return (
                <div
                  key={req.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-2xs hover:border-indigo-200 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 font-black text-indigo-950 text-sm flex-wrap">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-indigo-600" />
                        {req.teacherName}
                      </span>
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-md text-xs">
                        כיתה {req.className}
                      </span>
                      <span className="bg-slate-200 text-slate-700 font-medium px-2 py-0.2 rounded-md text-[11px]">
                        {req.type || 'שיעור מזדמן'}
                      </span>
                    </div>

                    <div className="text-slate-700 font-semibold flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-slate-800">
                        {res?.type === 'lab' ? <Monitor className="w-3 h-3 text-indigo-600" /> : <Laptop className="w-3 h-3 text-amber-600" />}
                        {res ? res.name : req.resourceId}
                      </span>
                      <span>•</span>
                      <span>📅 {dayStr}, {p ? p.label : `שעה ${req.periodId}`} ({p ? p.time : ''})</span>
                      {req.specificDate && (
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                          <Calendar className="w-2.5 h-2.5" />
                          {req.specificDate}
                        </span>
                      )}
                    </div>

                    <div className="text-slate-700">
                      📖 נושא: <strong className="text-slate-900">{req.subject}</strong>
                    </div>

                    {req.notes && (
                      <div className="text-slate-500 italic text-[11px] bg-white/70 p-1.5 rounded-lg border border-slate-200">
                        📝 הערה: {req.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-end">
                    {isAdmin ? (
                      <>
                        <button
                          onClick={() => onApproveRequest(req.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 text-xs shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>אשר שיבוץ</span>
                        </button>
                        <button
                          onClick={() => onRejectRequest(req.id)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 text-xs"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>דחה</span>
                        </button>
                      </>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold px-3 py-1 rounded-full text-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        ממתין לאישור
                      </span>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
};
