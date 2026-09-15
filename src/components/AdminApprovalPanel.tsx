import React, { useState } from 'react';
import { 
  Check, 
  X, 
  Sparkles, 
  Clock, 
  Calendar, 
  User, 
  Monitor, 
  Laptop, 
  ChevronUp, 
  ChevronDown, 
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { ScheduleRequest, Resource } from '../types';
import { PERIODS, DAYS } from '../data/initialData';

interface AdminApprovalPanelProps {
  requests: ScheduleRequest[];
  resources: Resource[];
  selectedResourceId: string;
  onSelectResource: (resourceId: string) => void;
  onApproveRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onRunAutoScheduler: () => Promise<void>;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export const AdminApprovalPanel: React.FC<AdminApprovalPanelProps> = ({
  requests,
  resources,
  selectedResourceId,
  onSelectResource,
  onApproveRequest,
  onRejectRequest,
  onRunAutoScheduler,
  isOpen,
  onToggleOpen
}) => {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isAutoScheduling, setIsAutoScheduling] = useState<boolean>(false);

  const pendingRequests = requests.filter(r => r.status === 'ממתין' || !r.status);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await onApproveRequest(id);
    } finally {
      setApprovingId(null);
    }
  };

  const handleAutoSchedule = async () => {
    setIsAutoScheduling(true);
    try {
      await onRunAutoScheduler();
    } finally {
      setIsAutoScheduling(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 shadow-xs p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
            <Clock className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-slate-800">
            פאנל בקשות לאישור רכזת
          </span>
          {pendingRequests.length > 0 && (
            <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full">
              {pendingRequests.length} ממתינות לאישור
            </span>
          )}
        </div>
        <button
          onClick={onToggleOpen}
          className="text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-xs"
        >
          <span>פתח בקשות במקביל ללוח</span>
          <span>⬅️</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
      
      {/* Top Header */}
      <div className="p-4 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 flex justify-between items-center gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-slate-950 text-amber-400 rounded-xl shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-black text-sm text-slate-950 flex items-center gap-1.5">
              <span>אישור בקשות שיבוץ</span>
              <span className="text-[10px] bg-slate-950 text-amber-300 px-2 py-0.2 rounded-full font-bold">
                {pendingRequests.length} ממתינות
              </span>
            </h3>
            <p className="text-[11px] text-slate-900 font-medium">
              אישור מיידי ישר ללוח השעות שליד
            </p>
          </div>
        </div>

        <button
          onClick={onToggleOpen}
          title="הסתר פאנל"
          className="text-slate-900 hover:bg-black/10 p-1.5 rounded-lg transition text-xs flex items-center gap-1 font-bold"
        >
          <span className="text-[11px]">סגור</span>
          <ChevronUp className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* Auto-Scheduler Action Bar */}
      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
        <div className="text-[11px] text-slate-600 font-semibold">
          אישור בודד או שיבוץ מהיר:
        </div>
        <button
          onClick={handleAutoSchedule}
          disabled={isAutoScheduling || pendingRequests.length === 0}
          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition flex items-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isAutoScheduling ? 'משבץ...' : 'מנוע שיבוץ אוטומטי ⚡'}</span>
        </button>
      </div>

      {/* Requests List */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar text-xs">
        {pendingRequests.length === 0 ? (
          <div className="text-center py-12 px-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 space-y-1">
            <span className="text-3xl block">✅</span>
            <div className="font-bold text-slate-800 text-sm">אין בקשות ממתינות</div>
            <div className="text-[11px] text-slate-500">כל הבקשות שובצו בלוח או טופלו בהצלחה</div>
          </div>
        ) : (
          pendingRequests.map((req) => {
            const res = resources.find(r => r.id === req.resourceId);
            const p = PERIODS.find(x => x.id === Number(req.periodId));
            const dayStr = req.day || DAYS[req.dayIdx] || "יום א'";
            const isCurrentResource = req.resourceId === selectedResourceId;
            const isApproving = approvingId === req.id;

            return (
              <div
                key={req.id}
                className={`p-3 rounded-xl border transition space-y-2 relative shadow-2xs ${
                  isCurrentResource
                    ? 'bg-indigo-50/50 border-indigo-300 ring-1 ring-indigo-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header info */}
                <div className="flex items-center justify-between gap-1">
                  <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-indigo-950">
                      <User className="w-3.5 h-3.5 text-indigo-600" />
                      {req.teacherName}
                    </span>
                    <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold text-[10px]">
                      כיתה {req.className}
                    </span>
                    <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-medium">
                      {req.type || 'שיעור מזדמן'}
                    </span>
                  </div>

                  {/* Resource Match Tag */}
                  {isCurrentResource ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      ✓ בלוח הנוכחי
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectResource(req.resourceId)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 underline font-semibold flex items-center gap-0.5"
                      title="החלף תצוגת לוח למשאב זה"
                    >
                      הצג בלוח <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                {/* Resource and Time */}
                <div className="text-slate-700 flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
                  <span className="flex items-center gap-1">
                    {res?.type === 'lab' ? <Monitor className="w-3 h-3 text-indigo-600" /> : <Laptop className="w-3 h-3 text-amber-600" />}
                    <strong>{res ? res.name : req.resourceId}</strong>
                  </span>
                  <span>•</span>
                  <span>📅 {dayStr}, {p ? p.label : `שעה ${req.periodId}`} ({p ? p.time : ''})</span>
                </div>

                {/* Subject */}
                <div className="text-slate-800 text-xs">
                  📖 נושא: <strong>{req.subject}</strong>
                </div>

                {/* Specific Date */}
                {req.specificDate && (
                  <div className="text-[10px] text-amber-900 bg-amber-100 px-2 py-0.5 rounded font-bold inline-flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>תאריך מבוקש: {req.specificDate}</span>
                  </div>
                )}

                {/* Notes */}
                {req.notes && (
                  <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 italic">
                    📝 {req.notes}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleApprove(req.id)}
                    disabled={isApproving}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold py-1.5 px-2 rounded-xl transition text-xs flex items-center justify-center gap-1 shadow-xs disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isApproving ? 'משבץ...' : 'אשר ושבץ בלוח'}</span>
                  </button>

                  <button
                    onClick={() => onRejectRequest(req.id)}
                    className="bg-red-50 hover:bg-red-100 text-red-700 font-bold py-1.5 px-3 rounded-xl transition text-xs flex items-center gap-1 border border-red-200"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>דחה</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
