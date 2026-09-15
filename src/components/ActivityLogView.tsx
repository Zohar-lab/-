import React, { useState, useMemo } from 'react';
import { 
  RotateCcw, 
  History, 
  Search, 
  CheckCircle2, 
  Trash2, 
  CalendarPlus, 
  Edit3, 
  Sparkles, 
  Users, 
  Megaphone, 
  Bookmark, 
  XCircle,
  AlertCircle,
  Clock,
  ArrowRight,
  Filter
} from 'lucide-react';
import { ActivityLogItem, ActionType } from '../types';

interface ActivityLogViewProps {
  logs: ActivityLogItem[];
  onUndoAction: (logId: string) => Promise<void> | void;
  isUndoingId?: string | null;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  logs,
  onUndoAction,
  isUndoingId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'requests' | 'schedule' | 'auto' | 'admin'>('all');

  // Find the most recent action that can still be undone
  const lastUndoableAction = useMemo(() => {
    return logs.find(l => l.canUndo && !l.undone);
  }, [logs]);

  // Filter logs based on search and category
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Search match
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = log.title.toLowerCase().includes(q);
        const matchDesc = log.description.toLowerCase().includes(q);
        if (!matchTitle && !matchDesc) return false;
      }

      // Category filter
      if (filterCategory === 'requests') {
        return log.actionType === 'APPROVE_REQUEST' || log.actionType === 'REJECT_REQUEST';
      }
      if (filterCategory === 'schedule') {
        return log.actionType === 'ADD_SCHEDULE' || log.actionType === 'EDIT_SCHEDULE' || log.actionType === 'DELETE_SCHEDULE';
      }
      if (filterCategory === 'auto') {
        return log.actionType === 'AUTO_SCHEDULE';
      }
      if (filterCategory === 'admin') {
        return ['ADD_STAFF', 'DELETE_STAFF', 'ADD_GUIDELINE', 'DELETE_GUIDELINE', 'ADD_ANNOUNCEMENT', 'DELETE_ANNOUNCEMENT'].includes(log.actionType);
      }

      return true;
    });
  }, [logs, searchQuery, filterCategory]);

  const stats = useMemo(() => {
    const total = logs.length;
    const undoable = logs.filter(l => l.canUndo && !l.undone).length;
    const undone = logs.filter(l => l.undone).length;
    return { total, undoable, undone };
  }, [logs]);

  // Format date and time
  const formatLogTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);

      if (diffMinutes < 1) return 'ממש עכשיו';
      if (diffMinutes < 60) return `לפני ${diffMinutes} דקות`;
      
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `היום ב-${timeStr}`;

      return `${date.toLocaleDateString('he-IL')} ${timeStr}`;
    } catch {
      return isoString;
    }
  };

  // Icon selector
  const getActionIcon = (type: ActionType) => {
    switch (type) {
      case 'APPROVE_REQUEST':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'REJECT_REQUEST':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      case 'ADD_SCHEDULE':
        return <CalendarPlus className="w-5 h-5 text-indigo-600" />;
      case 'EDIT_SCHEDULE':
        return <Edit3 className="w-5 h-5 text-amber-600" />;
      case 'DELETE_SCHEDULE':
        return <Trash2 className="w-5 h-5 text-red-600" />;
      case 'AUTO_SCHEDULE':
        return <Sparkles className="w-5 h-5 text-purple-600" />;
      case 'ADD_STAFF':
      case 'DELETE_STAFF':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'ADD_ANNOUNCEMENT':
      case 'DELETE_ANNOUNCEMENT':
        return <Megaphone className="w-5 h-5 text-amber-600" />;
      case 'ADD_GUIDELINE':
      case 'DELETE_GUIDELINE':
        return <Bookmark className="w-5 h-5 text-teal-600" />;
      default:
        return <History className="w-5 h-5 text-slate-600" />;
    }
  };

  // Badge background selector
  const getBadgeStyle = (type: ActionType) => {
    switch (type) {
      case 'APPROVE_REQUEST':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'REJECT_REQUEST':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'ADD_SCHEDULE':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'EDIT_SCHEDULE':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'DELETE_SCHEDULE':
        return 'bg-red-50 text-red-800 border-red-200';
      case 'AUTO_SCHEDULE':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-50 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Undo */}
      <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-100 text-amber-900 rounded-2xl shadow-xs">
              <History className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                <span>יומן פעולות מערכת וביטול פעולות (לוג)</span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {stats.total} פעולות
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                תיעוד מלא בזמן אמת של אישורי בקשות, שיבוצים, מחיקות ושינויים - עם יכולת ביטול מיידי ושחזור
              </p>
            </div>
          </div>

          {/* Quick Undo Last Action Button */}
          {lastUndoableAction ? (
            <button
              onClick={() => onUndoAction(lastUndoableAction.id)}
              disabled={isUndoingId === lastUndoableAction.id}
              className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-2 shadow-md transition cursor-pointer border border-amber-400"
            >
              <RotateCcw className={`w-4 h-4 text-slate-950 ${isUndoingId === lastUndoableAction.id ? 'animate-spin' : ''}`} />
              <div className="text-right">
                <div className="leading-tight">ביטול פעולה אחרונה ↩️</div>
                <div className="text-[10px] font-semibold text-slate-800 opacity-90 truncate max-w-[180px]">
                  {lastUndoableAction.title}: {lastUndoableAction.description}
                </div>
              </div>
            </button>
          ) : (
            <div className="px-3.5 py-2 rounded-2xl bg-slate-100 text-slate-500 text-xs font-bold flex items-center gap-1.5 border border-slate-200">
              <CheckCircle2 className="w-4 h-4 text-slate-400" />
              <span>אין פעולות הממתינות לביטול</span>
            </div>
          )}
        </div>

        {/* Quick stats pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold">
            סה"כ רשומות בלוג: <strong className="font-extrabold">{stats.total}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 font-semibold">
            ניתנות לביטול: <strong className="font-extrabold">{stats.undoable}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold">
            פעולות שבוטלו בהצלחה: <strong className="font-extrabold">{stats.undone}</strong>
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="חיפוש לפי מורה, כיתה, סוג פעולה או נושא..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-9 pl-3 py-2 bg-slate-50 border border-slate-300 focus:border-indigo-600 rounded-xl text-xs font-medium outline-none transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              נקה
            </button>
          )}
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filterCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            הכל
          </button>
          <button
            onClick={() => setFilterCategory('requests')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filterCategory === 'requests'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            בקשות שיבוץ
          </button>
          <button
            onClick={() => setFilterCategory('schedule')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filterCategory === 'schedule'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            לוח שעות
          </button>
          <button
            onClick={() => setFilterCategory('auto')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filterCategory === 'auto'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            שיבוץ אוטומטי
          </button>
          <button
            onClick={() => setFilterCategory('admin')}
            className={`px-3 py-1.5 rounded-xl font-bold transition ${
              filterCategory === 'admin'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            צוות והודעות
          </button>
        </div>

      </div>

      {/* Log Items List */}
      <div className="space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <History className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-700">לא נמצאו פעולות מתועדות בלוג</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery ? 'נסו לשנות את מילות החיפוש או לבחור קטגוריה אחרת' : 'פעולות שיבוץ, אישורים ומחיקות שיתבצעו במערכת יתועדו כאן וניתן יהיה לבטלן'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isUndoing = isUndoingId === log.id;
            const isUndone = !!log.undone;

            return (
              <div
                key={log.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isUndone 
                    ? 'bg-slate-50 border-slate-200 opacity-75' 
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Left side: Icon, Title, Description, Timestamp */}
                <div className="flex items-start gap-3.5">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 shrink-0 mt-0.5">
                    {getActionIcon(log.actionType)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        {log.title}
                      </span>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getBadgeStyle(log.actionType)}`}>
                        {formatLogTime(log.timestamp)}
                      </span>

                      {isUndone && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                          <RotateCcw className="w-3 h-3" />
                          <span>בוטל ↩️</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {log.description}
                    </p>
                  </div>
                </div>

                {/* Right side: Undo Button or Undone Indicator */}
                <div className="shrink-0 w-full md:w-auto flex items-center justify-end">
                  {log.canUndo && !isUndone ? (
                    <button
                      onClick={() => onUndoAction(log.id)}
                      disabled={isUndoing}
                      className="w-full md:w-auto px-3.5 py-2 bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 hover:text-amber-950 font-extrabold text-xs rounded-xl border border-amber-300 transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      title="ביטול פעולה זו והחזרת המצב לקדמותו"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 text-amber-700 ${isUndoing ? 'animate-spin' : ''}`} />
                      <span>{isUndoing ? 'מבטל פעולה...' : 'בטל פעולה זו ↩️'}</span>
                    </button>
                  ) : isUndone ? (
                    <span className="text-xs text-slate-500 font-bold px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>הפעולה כבר בוטלה</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">
                      לצפייה בלבד
                    </span>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
