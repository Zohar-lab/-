import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'school_db.json');

// Default initial resources
const DEFAULT_RESOURCES = [
  { id: 'lab-b', name: "חדר מחשבים - קומה ב'", type: 'lab', capacity: 26, location: "קומה ב'" },
  { id: 'lab-a', name: "חדר מחשבים - קומה א'", type: 'lab', capacity: 24, location: "קומה א'" },
  { id: 'cart-1', name: "עגלת ניידים 1 (29 מחשבים)", type: 'cart', capacity: 29, location: "מסתובבת לפי דרישה" },
  { id: 'cart-2', name: "עגלת ניידים 2 (18 מחשבים)", type: 'cart', capacity: 18, location: "מסתובבת לפי דרישה" },
  { id: 'cart-3', name: "עגלת ניידים 3 (15 מחשבים)", type: 'cart', capacity: 15, location: "מסתובבת לפי דרישה" },
  { id: 'cart-tab', name: "עגלת טאבלטים (24 יחידות)", type: 'cart', capacity: 24, location: "מסתובבת לפי דרישה" }
];

const DEFAULT_STAFF = [
  "זהר רבינוביץ", "אדוה ווקנין", "אסתר שפירא", "מיטל משומר", "עדן צייגר", "שלוה שינדלר",
  "אילנה אהרון", "אסנת אלבז", "אבבאו אלמו", "סולי אסידו", "סיגלית אפריאט", "אלומה ארנון קדוש",
  "ירדנה ביטון", "מרים ביטון", "שרית בלוקה", "מיכל בן רואי פז", "לילך טל בן שבת", "יולי בר אברהם",
  "קורל בר גיורא", "דועא ג'בארין", "אילנית גולשן", "איילת דגן", "גליה זידנבנד", "זוהר חגי",
  "ליטל חיון", "רהאם חליליה עאבד", "אופק טרז טבול", "איתי יוזיק", "אילונה כץ", "מירי טובה לוין",
  "נוי רחל מאיר", "לירז מיוסט", "סמדר משה", "פלג נחום", "מחמוד נסאר", "דורית עטר",
  "גלילה צרפתי", "שחר קפלן", "נורית קרול", "דניאלה רבאיב", "חן רובין פרץ", "שני שלג עמר", "אסתר שמואלי אבידן"
];

const DEFAULT_GUIDELINES = [
  "השאלת מחשבים: בליווי צוות ו-2 תלמידים לכל היותר.",
  "אבטחת ציוד בהפסקות: אין להשאיר מחשבים על השולחנות בכיתה בזמן הפסקה. מתבקשים לנעול בעגלה או להחזיר לחדר מחשבים.",
  "חיבור לחשמל: יש להחזיר את הניידים לעגלה ולחברם לכבלי הטעינה בסיום השימוש."
];

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: 'ann-org-access',
    title: 'גישה של מורים מתוך הארגון (edu-haifa.org.il)',
    content: 'מורי בית הספר - כתובת הגישה והפניות מתוך הארגון הינה: a@edu-haifa.org.il. כל הבקשות נשמרות ומסונכרנות בזמן אמת.',
    date: '2026-09-09'
  },
  {
    id: 'ann-1',
    title: 'פתיחת הרשמה למערכת השיבוצים',
    content: 'מערכת השיבוצים פתוחה כעת להגשת בקשות ושיבוצים קבועים ומזדמנים בחדרי המחשב ובעגלות.',
    date: '2026-09-01'
  }
];

interface SchoolDB {
  schedule: any[];
  requests: any[];
  staff: string[];
  guidelines: string[];
  announcements: any[];
  resources: any[];
  activityLogs: any[];
  lastUpdated: string;
}

function getInitialDB(): SchoolDB {
  return {
    schedule: [],
    requests: [],
    staff: DEFAULT_STAFF,
    guidelines: DEFAULT_GUIDELINES,
    announcements: DEFAULT_ANNOUNCEMENTS,
    resources: DEFAULT_RESOURCES,
    activityLogs: [],
    lastUpdated: new Date().toISOString()
  };
}

function readDB(): SchoolDB {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDB();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf-8');
      return initial;
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    // Ensure all arrays exist
    return {
      schedule: Array.isArray(parsed.schedule) ? parsed.schedule : [],
      requests: Array.isArray(parsed.requests) ? parsed.requests : [],
      staff: Array.isArray(parsed.staff) && parsed.staff.length > 0 ? parsed.staff : DEFAULT_STAFF,
      guidelines: Array.isArray(parsed.guidelines) && parsed.guidelines.length > 0 ? parsed.guidelines : DEFAULT_GUIDELINES,
      announcements: Array.isArray(parsed.announcements) ? parsed.announcements : DEFAULT_ANNOUNCEMENTS,
      resources: Array.isArray(parsed.resources) && parsed.resources.length > 0 ? parsed.resources : DEFAULT_RESOURCES,
      activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString()
    };
  } catch (err) {
    console.error('Error reading school DB, returning default:', err);
    return getInitialDB();
  }
}

function writeDB(data: SchoolDB): boolean {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing school DB:', err);
    return false;
  }
}

// -------------------------------------------------------------
// API Endpoints (Placed FIRST before Vite/static middlewares)
// -------------------------------------------------------------

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Full data retrieval
app.get('/api/data', (req, res) => {
  const db = readDB();
  res.json(db);
});

// Requests API
app.get('/api/requests', (req, res) => {
  const db = readDB();
  res.json({ requests: db.requests, count: db.requests.length });
});

// Add or update a teacher booking request
app.post('/api/requests', (req, res) => {
  const newRequest = req.body;
  if (!newRequest || !newRequest.teacherName) {
    return res.status(400).json({ error: 'Missing teacherName or invalid request body' });
  }

  // Ensure unique ID
  if (!newRequest.id) {
    newRequest.id = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  if (!newRequest.createdAt) {
    newRequest.createdAt = new Date().toISOString();
  }
  if (!newRequest.status) {
    newRequest.status = 'ממתין';
  }

  const db = readDB();
  // Filter out any existing request with the exact same ID, then append
  const existingIdx = db.requests.findIndex(r => r.id === newRequest.id);
  if (existingIdx >= 0) {
    db.requests[existingIdx] = newRequest;
  } else {
    // Append to list of requests - NEVER overwrite previous requests from other teachers!
    db.requests.push(newRequest);
  }

  writeDB(db);
  console.log(`[API] Saved booking request from ${newRequest.teacherName} (ID: ${newRequest.id}). Total requests now: ${db.requests.length}`);
  res.json({ success: true, request: newRequest, count: db.requests.length, requests: db.requests });
});

// Delete a single request (e.g. upon admin rejection or cancellation)
app.delete('/api/requests/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const initialCount = db.requests.length;
  db.requests = db.requests.filter(r => r.id !== id);
  writeDB(db);
  console.log(`[API] Deleted request ${id}. Remaining: ${db.requests.length}`);
  res.json({ success: true, deleted: initialCount !== db.requests.length, count: db.requests.length });
});

// Approve a request: atomically removes from requests and adds to schedule
app.post('/api/requests/approve', (req, res) => {
  const { requestId, newEntry } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  const db = readDB();
  const reqItem = db.requests.find(r => r.id === requestId);
  db.requests = db.requests.filter(r => r.id !== requestId);

  if (newEntry) {
    // Remove conflicting schedule entry in same slot if any
    db.schedule = db.schedule.filter(s => 
      !(s.resourceId === newEntry.resourceId && 
        Number(s.dayIdx) === Number(newEntry.dayIdx) && 
        Number(s.periodId) === Number(newEntry.periodId))
    );
    db.schedule.push(newEntry);
  }

  writeDB(db);
  console.log(`[API] Approved request ${requestId}. Remaining requests: ${db.requests.length}, Schedule entries: ${db.schedule.length}`);
  res.json({ success: true, schedule: db.schedule, requests: db.requests });
});

// Reject request
app.post('/api/requests/reject', (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  const db = readDB();
  db.requests = db.requests.filter(r => r.id !== requestId);
  writeDB(db);
  console.log(`[API] Rejected request ${requestId}. Remaining requests: ${db.requests.length}`);
  res.json({ success: true, requests: db.requests });
});

// Schedule API
app.get('/api/schedule', (req, res) => {
  const db = readDB();
  res.json({ schedule: db.schedule });
});

app.post('/api/schedule', (req, res) => {
  const entry = req.body;
  if (!entry || !entry.resourceId) {
    return res.status(400).json({ error: 'Invalid schedule entry' });
  }
  if (!entry.id) {
    entry.id = `sched-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  const db = readDB();
  // Filter out any entry in the exact same resource, day, and period
  db.schedule = db.schedule.filter(s => 
    s.id !== entry.id &&
    !(s.resourceId === entry.resourceId && 
      Number(s.dayIdx) === Number(entry.dayIdx) && 
      Number(s.periodId) === Number(entry.periodId))
  );
  db.schedule.push(entry);
  writeDB(db);
  res.json({ success: true, entry, schedule: db.schedule });
});

app.delete('/api/schedule/:id', (req, res) => {
  const { id } = req.params;
  const db = readDB();
  db.schedule = db.schedule.filter(s => s.id !== id);
  writeDB(db);
  res.json({ success: true, schedule: db.schedule });
});

// Settings & Lists API
app.post('/api/settings/:key', (req, res) => {
  const { key } = req.params;
  const { list } = req.body;
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'Expected list to be an array' });
  }

  const db = readDB();
  if (key === 'staff') db.staff = list;
  else if (key === 'guidelines') db.guidelines = list;
  else if (key === 'announcements') db.announcements = list;
  else if (key === 'resources') db.resources = list;
  else if (key === 'activity_logs') db.activityLogs = list.slice(0, 80);
  else return res.status(400).json({ error: 'Unknown settings key' });

  writeDB(db);
  res.json({ success: true, key, count: list.length });
});

// Full Sync & Backup Restore
app.post('/api/sync', (req, res) => {
  const data = req.body;
  const db = readDB();

  if (Array.isArray(data.schedule)) {
    db.schedule = data.schedule;
  }
  if (Array.isArray(data.requests)) {
    if (data.mode === 'merge') {
      const map = new Map<string, any>();
      db.requests.forEach(r => map.set(r.id, r));
      data.requests.forEach((r: any) => map.set(r.id, r));
      db.requests = Array.from(map.values());
    } else {
      db.requests = data.requests;
    }
  }
  if (Array.isArray(data.staff) && data.staff.length > 0) db.staff = data.staff;
  if (Array.isArray(data.guidelines) && data.guidelines.length > 0) db.guidelines = data.guidelines;
  if (Array.isArray(data.announcements) && data.announcements.length > 0) db.announcements = data.announcements;
  if (Array.isArray(data.resources) && data.resources.length > 0) db.resources = data.resources;
  if (Array.isArray(data.activityLogs)) db.activityLogs = data.activityLogs.slice(0, 80);

  writeDB(db);
  res.json({ success: true, db });
});

// -------------------------------------------------------------
// Vite Middleware / Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`School Schedule Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
