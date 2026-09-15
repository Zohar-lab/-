import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';
import { DEFAULT_ADMIN_PASSWORD } from '../data/initialData';

interface AdminPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminPasswordModal: React.FC<AdminPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [password, setPassword] = useState('');
  const [hasError, setHasError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim() === DEFAULT_ADMIN_PASSWORD) {
      setHasError(false);
      setPassword('');
      onSuccess();
    } else {
      setHasError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        <div className="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-amber-400 text-slate-950 rounded-lg">
              <Lock className="w-4 h-4" />
            </span>
            <h3 className="font-extrabold text-sm">כניסת מנהל/ת מערכת</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1.5">
              נא להזין סיסמת הרשאת מנהל:
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setHasError(false);
                }}
                placeholder="הקלד/י סיסמה..."
                className="w-full p-2.5 pr-8 bg-slate-50 border border-slate-300 rounded-xl font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
            </div>
          </div>

          {hasError && (
            <div className="bg-red-50 border border-red-300 text-red-700 p-2.5 rounded-xl font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>סיסמה שגויה! נסו שוב.</span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 leading-relaxed">
            הרשאת מנהל מאפשרת עריכה ידנית של שיבוצים, אישור בקשות, שיבוץ אוטומטי, ניהול מורים והורדת גיבוי.
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl transition shadow-sm"
            >
              אישור כניסה 🚀
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
