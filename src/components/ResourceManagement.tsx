import React, { useState, useEffect } from 'react';
import { 
  Monitor, 
  Laptop, 
  Save, 
  RotateCcw, 
  Plus, 
  Trash2, 
  Check, 
  MapPin, 
  Users, 
  AlertTriangle,
  Info,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Resource, ScheduleEntry } from '../types';
import { RESOURCES as DEFAULT_RESOURCES } from '../data/initialData';

interface ResourceManagementProps {
  resources: Resource[];
  schedule: ScheduleEntry[];
  onSaveResources: (updatedResources: Resource[]) => Promise<void> | void;
  onSelectResource?: (resourceId: string) => void;
}

export const ResourceManagement: React.FC<ResourceManagementProps> = ({
  resources,
  schedule,
  onSaveResources,
  onSelectResource
}) => {
  const [items, setItems] = useState<Resource[]>(() => JSON.parse(JSON.stringify(resources)));
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<'all' | 'lab' | 'cart'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // New resource form state
  const [newType, setNewType] = useState<'lab' | 'cart'>('cart');
  const [newName, setNewName] = useState<string>('');
  const [newCapacity, setNewCapacity] = useState<number>(20);
  const [newLocation, setNewLocation] = useState<string>('מסתובבת לפי דרישה');

  // Keep local state in sync when external resources prop changes (e.g. cloud sync)
  useEffect(() => {
    if (!hasChanges) {
      setItems(JSON.parse(JSON.stringify(resources)));
    }
  }, [resources, hasChanges]);

  // Update a single resource's property
  const handleUpdate = (id: string, updates: Partial<Resource>, syncCartNameWithCount = false) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, ...updates };

        // Helper: if it's a cart and user asks or updates count, sync the bracket in name if present
        if (syncCartNameWithCount && updates.capacity !== undefined) {
          // If name has (X מחשבים) or (X יחידות), replace it with the new capacity
          if (updated.name.includes('(') && (updated.name.includes('מחשבים') || updated.name.includes('יחידות'))) {
            const unitWord = updated.name.includes('יחידות') ? 'יחידות' : 'מחשבים';
            updated.name = updated.name.replace(/\(\d+\s*(?:מחשבים|יחידות)\)/, `(${updates.capacity} ${unitWord})`);
          }
        }

        return updated;
      }
      return item;
    }));
    setHasChanges(true);
    setSavedSuccess(false);
  };

  // Adjust capacity by delta
  const handleDeltaCapacity = (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    const newCap = Math.max(1, Math.min(100, item.capacity + delta));
    handleUpdate(id, { capacity: newCap }, true);
  };

  // Save all changes
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSaveResources(items);
      setHasChanges(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving resources:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default factory initial data
  const handleResetToDefault = async () => {
    setIsSaving(true);
    try {
      const resetCopy = JSON.parse(JSON.stringify(DEFAULT_RESOURCES));
      setItems(resetCopy);
      await onSaveResources(resetCopy);
      setHasChanges(false);
      setShowResetConfirm(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  // Add new resource
  const handleAddResource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const id = `${newType}-${Date.now()}`;
    const newRes: Resource = {
      id,
      name: newName.trim(),
      type: newType,
      capacity: Number(newCapacity) || 20,
      location: newLocation.trim() || (newType === 'cart' ? 'מסתובבת לפי דרישה' : 'קומת קרקע')
    };

    const next = [...items, newRes];
    setItems(next);
    setHasChanges(true);
    setShowAddModal(false);
    setNewName('');
    setNewCapacity(20);
  };

  // Delete a resource
  const handleDeleteResource = (id: string) => {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    setHasChanges(true);
  };

  // Metrics
  const totalHardware = items.reduce((sum, r) => sum + r.capacity, 0);
  const labCapacity = items.filter(r => r.type === 'lab').reduce((sum, r) => sum + r.capacity, 0);
  const cartCapacity = items.filter(r => r.type === 'cart').reduce((sum, r) => sum + r.capacity, 0);

  const filteredItems = items.filter(r => {
    if (filterType === 'lab') return r.type === 'lab';
    if (filterType === 'cart') return r.type === 'cart';
    return true;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                <Laptop className="w-5 h-5" />
              </span>
              <h3 className="text-base md:text-lg font-black text-slate-900">
                ניהול ועריכת משאבים: חדרי מחשבים ועגלות ניידים
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">
              כאן ניתן לעדכן את מספר המחשבים והטאבלטים הזמינים בכל חדר מחשבים ובכל עגלה ניידת, לשנות שמות ומיקומים. השינויים מתעדכנים מיידית בכל המערכת ובסנכרון הענן.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer border border-slate-300"
              title="איפוס כמויות המחשבים לערכי ברירת המחדל הראשוניים"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-600" />
              <span>איפוס לברירת מחדל</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer border border-indigo-200"
            >
              <Plus className="w-4 h-4" />
              <span>הוספת חדר / עגלה חדשה</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className={`px-5 py-2 rounded-xl text-xs font-black transition flex items-center gap-2 shadow-sm cursor-pointer ${
                hasChanges
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              }`}
            >
              {isSaving ? (
                <>
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                  <span>שומר שינויים...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>השינויים נשמרו בהצלחה!</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{hasChanges ? 'שמור שינויים עכשיו 💾' : 'כל הנתונים שמורים'}</span>
                </>
              )}
            </button>

          </div>

        </div>

        {/* Global Summary Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-xs">
          
          <div className="bg-indigo-50/60 p-3 rounded-2xl border border-indigo-100">
            <span className="text-slate-500 block text-[11px] font-semibold">סה&quot;כ מחשבים וטאבלטים:</span>
            <div className="text-xl font-black text-indigo-950 mt-0.5 flex items-baseline gap-1">
              <span>{totalHardware}</span>
              <span className="text-[11px] font-bold text-indigo-600">עמדות</span>
            </div>
          </div>

          <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-100">
            <span className="text-slate-500 block text-[11px] font-semibold">עמדות בחדרי מחשבים:</span>
            <div className="text-xl font-black text-sky-950 mt-0.5 flex items-baseline gap-1">
              <span>{labCapacity}</span>
              <span className="text-[11px] font-bold text-sky-600">עמדות</span>
            </div>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-100">
            <span className="text-slate-500 block text-[11px] font-semibold">ניידים וטאבלטים בעגלות:</span>
            <div className="text-xl font-black text-amber-950 mt-0.5 flex items-baseline gap-1">
              <span>{cartCapacity}</span>
              <span className="text-[11px] font-bold text-amber-600">מחשבים</span>
            </div>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100">
            <span className="text-slate-500 block text-[11px] font-semibold">משאבים מוגדרים:</span>
            <div className="text-xl font-black text-emerald-950 mt-0.5 flex items-baseline gap-1">
              <span>{items.length}</span>
              <span className="text-[11px] font-bold text-emerald-600">משאבים פעילים</span>
            </div>
          </div>

        </div>

        {/* Filters and type switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                filterType === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              כל המשאבים ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('lab')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                filterType === 'lab' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>חדרי מחשבים ({items.filter(i => i.type === 'lab').length})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterType('cart')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
                filterType === 'cart' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Laptop className="w-3 h-3" />
              <span>עגלות ניידים וטאבלטים ({items.filter(i => i.type === 'cart').length})</span>
            </button>
          </div>

          {hasChanges && (
            <div className="text-xs font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              <span>ישנם שינויים שלא נשמרו - לחץ &quot;שמור שינויים עכשיו&quot;</span>
            </div>
          )}
        </div>

      </div>

      {/* Grid of Resource Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredItems.map(resource => {
          const isLab = resource.type === 'lab';
          const bookingsCount = schedule.filter(s => s.resourceId === resource.id).length;

          return (
            <div 
              key={resource.id}
              className={`bg-white rounded-3xl p-5 border transition-all shadow-2xs hover:shadow-md flex flex-col justify-between space-y-4 relative ${
                isLab ? 'border-sky-200/80 hover:border-sky-300' : 'border-amber-200/80 hover:border-amber-300'
              }`}
            >
              {/* Header: Icon, Type Badge, Active Bookings count */}
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2.5">
                  <div className={`p-3 rounded-2xl ${isLab ? 'bg-sky-100 text-sky-700' : 'bg-amber-100 text-amber-700'}`}>
                    {isLab ? <Monitor className="w-5 h-5 stroke-[2.5]" /> : <Laptop className="w-5 h-5 stroke-[2.5]" />}
                  </div>
                  <div>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      isLab ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      {isLab ? 'חדר מחשבים קבוע' : 'עגלת ניידים / טאבלטים'}
                    </span>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                      מזהה: <code className="text-slate-600">{resource.id}</code>
                    </div>
                  </div>
                </div>

                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-lg">
                  {bookingsCount} שיבוצים פעילים
                </span>
              </div>

              {/* Resource Name Edit */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 block">
                  שם המשאב:
                </label>
                <input
                  type="text"
                  value={resource.name}
                  onChange={(e) => handleUpdate(resource.id, { name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition"
                  placeholder="שם המשאב..."
                />
              </div>

              {/* Capacity Stepper & Number Edit */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>מספר מחשבים / עמדות:</span>
                  </label>
                  <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                    {resource.capacity} יחידות
                  </span>
                </div>

                {/* Interactive Stepper with +/- */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeltaCapacity(resource.id, -1)}
                    className="w-10 h-10 bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 rounded-xl text-base font-black text-slate-800 flex items-center justify-center transition shadow-2xs cursor-pointer"
                    title="הפחת מחשב אחד (-1)"
                  >
                    -
                  </button>

                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={resource.capacity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val)) {
                        handleUpdate(resource.id, { capacity: Math.max(1, Math.min(100, val)) }, true);
                      }
                    }}
                    className="flex-1 text-center py-2 bg-white border border-slate-300 rounded-xl text-lg font-black text-indigo-950 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none shadow-2xs"
                  />

                  <button
                    type="button"
                    onClick={() => handleDeltaCapacity(resource.id, 1)}
                    className="w-10 h-10 bg-white hover:bg-slate-100 active:scale-95 border border-slate-300 rounded-xl text-base font-black text-slate-800 flex items-center justify-center transition shadow-2xs cursor-pointer"
                    title="הוסף מחשב אחד (+1)"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets (+5, -5) */}
                <div className="flex items-center justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDeltaCapacity(resource.id, -5)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] border border-slate-200 shadow-2xs transition"
                  >
                    -5 מחשבים
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeltaCapacity(resource.id, 5)}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-[10px] border border-slate-200 shadow-2xs transition"
                  >
                    +5 מחשבים
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Round to nearest multiple of 10
                      const rounded = Math.max(10, Math.round(resource.capacity / 5) * 5);
                      handleUpdate(resource.id, { capacity: rounded }, true);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-indigo-600 font-bold rounded-lg text-[10px] border border-slate-200 shadow-2xs transition"
                  >
                    עיגול ל-5
                  </button>
                </div>
              </div>

              {/* Location / Notes Edit */}
              <div className="space-y-1">
                <label className="text-[11px] font-extrabold text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <span>מיקום או הערות שינוע:</span>
                </label>
                <input
                  type="text"
                  value={resource.location}
                  onChange={(e) => handleUpdate(resource.id, { location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-indigo-500 outline-none transition"
                  placeholder="מיקום בבית הספר..."
                />
              </div>

              {/* Card Footer: Quick view schedule link & optional delete if custom */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                {onSelectResource && (
                  <button
                    type="button"
                    onClick={() => onSelectResource(resource.id)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition flex items-center gap-1 cursor-pointer"
                  >
                    <span>צפה בלוח שיבוצים</span>
                    <ArrowRight className="w-3 h-3 rotate-180" />
                  </button>
                )}

                {/* Allow deletion if there are more than 2 resources */}
                {items.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleDeleteResource(resource.id)}
                    className="text-[11px] font-bold text-red-600 hover:text-red-800 transition flex items-center gap-1 cursor-pointer p-1 rounded-lg hover:bg-red-50"
                    title="הסר משאב זה מהמערכת"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>מחק</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Floating Save Bar when user scrolled and has unsaved changes */}
      {hasChanges && (
        <div className="sticky bottom-4 z-40 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-3xl shadow-2xl border border-slate-800 flex flex-wrap justify-between items-center gap-4 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-slate-950 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-black">ביצעת שינויים בכמויות המחשבים או פרטי המשאבים</div>
              <div className="text-[11px] text-slate-300">לחצי על כפתור השמירה כדי לעדכן את המערכת וסנכרון הענן</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setItems(JSON.parse(JSON.stringify(resources)));
                setHasChanges(false);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
            >
              בטל שינויים
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'שומר...' : 'שמור שינויים כעת 💾'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right"
            dir="rtl"
          >
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">הוספת משאב מחשוב חדש</h3>
                <p className="text-xs text-slate-500">הגדרת חדר מחשבים קבוע או עגלת ניידים / טאבלטים חדשה</p>
              </div>
            </div>

            <form onSubmit={handleAddResource} className="space-y-4 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">סוג המשאב:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewType('cart');
                      if (!newName || newName.includes('חדר')) setNewName('עגלת ניידים 4 (25 מחשבים)');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-extrabold border transition flex items-center justify-center gap-2 ${
                      newType === 'cart' ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Laptop className="w-4 h-4" />
                    <span>עגלת ניידים / טאבלטים</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setNewType('lab');
                      if (!newName || newName.includes('עגלת')) setNewName('חדר מחשבים - קומה ג\'');
                    }}
                    className={`py-2.5 px-3 rounded-xl font-extrabold border transition flex items-center justify-center gap-2 ${
                      newType === 'lab' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    <span>חדר מחשבים קבוע</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">שם המשאב:</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={newType === 'cart' ? 'לדוגמה: עגלת ניידים 4 (20 מחשבים)' : 'לדוגמה: חדר מחשבים קומה ג\''}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">מספר מחשבים / קיבולת:</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">מיקום או תיאור שינוע:</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  placeholder="לדוגמה: מסתובבת לפי דרישה / קומה ב'"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>הוסף משאב לרשימה</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div 
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-right"
            dir="rtl"
          >
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">איפוס כמויות המחשבים</h3>
                <p className="text-xs text-slate-500">החזרת רשימת המשאבים וכמויות המחשבים לברירת המחדל הראשונית</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              פעולה זו תאפס את כל שמות החדרים והעגלות ומספרי המחשבים (חדר ב&apos;: 26, חדר א&apos;: 24, עגלה 1: 29, עגלה 2: 18, עגלה 3: 15, טאבלטים: 24). שיבוצי השעות הקיימים יישמרו.
            </p>

            <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleResetToDefault}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>כן, אפס לברירת מחדל</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
