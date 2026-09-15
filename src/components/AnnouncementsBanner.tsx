import React, { useState } from 'react';
import { Megaphone, Bookmark, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { Announcement } from '../types';

interface AnnouncementsBannerProps {
  announcements: Announcement[];
  guidelines: string[];
  isAdmin: boolean;
  onEditGuidelines: () => void;
  onEditAnnouncements: () => void;
}

export const AnnouncementsBanner: React.FC<AnnouncementsBannerProps> = ({
  announcements,
  guidelines,
  isAdmin,
  onEditGuidelines,
  onEditAnnouncements
}) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      {/* Top Bar Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-3 bg-amber-50/80 border-b border-amber-100 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition"
      >
        <div className="flex items-center gap-2.5 text-amber-900 font-bold text-sm">
          <span className="p-1 bg-amber-400 text-slate-950 rounded-md">
            <Megaphone className="w-4 h-4" />
          </span>
          <span>הודעות תקשוב והנחיות שימוש בציוד בית הספר</span>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded font-bold">
              ניתן לעריכה במרחב ניהול
            </span>
          )}
          <button className="text-amber-800 p-1">
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          
          {/* Announcements block */}
          <div className="space-y-2 bg-amber-50/40 p-3 rounded-xl border border-amber-200/60">
            <div className="flex items-center justify-between font-bold text-amber-950 text-xs pb-1 border-b border-amber-200/60">
              <div className="flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                <span>מבזקים והודעות עדכון</span>
              </div>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAnnouncements();
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                >
                  <Edit3 className="w-3 h-3" /> ערוך
                </button>
              )}
            </div>

            {announcements.length === 0 ? (
              <p className="text-slate-500 italic">אין הודעות חדשות כעת.</p>
            ) : (
              <div className="space-y-2">
                {announcements.map((ann) => (
                  <div key={ann.id} className="bg-white p-2.5 rounded-lg border border-amber-200 shadow-xs">
                    <div className="font-extrabold text-slate-900 flex items-center justify-between">
                      <span>{ann.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{ann.date}</span>
                    </div>
                    <p className="text-slate-700 mt-1 leading-relaxed">{ann.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guidelines block */}
          <div className="space-y-2 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100">
            <div className="flex items-center justify-between font-bold text-indigo-950 text-xs pb-1 border-b border-indigo-100">
              <div className="flex items-center gap-1.5">
                <Bookmark className="w-3.5 h-3.5 text-indigo-600" />
                <span>הנחיות השאלה ושימוש במחשבים ניידים</span>
              </div>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditGuidelines();
                  }}
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5"
                >
                  <Edit3 className="w-3 h-3" /> ערוך
                </button>
              )}
            </div>

            {guidelines.length === 0 ? (
              <p className="text-slate-500 italic">לא הוגדרו הנחיות.</p>
            ) : (
              <ul className="space-y-1.5 list-disc list-inside text-slate-700">
                {guidelines.map((g, idx) => (
                  <li key={idx} className="leading-relaxed">
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      )}
    </div>
  );
};
