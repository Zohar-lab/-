import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, sanitizeForFirestore, loadLocalData, saveLocalData } from '../firebase';
import { BackupData } from '../types';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file'
];

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
// Request offline access prompt when needed
provider.setCustomParameters({
  prompt: 'select_account'
});

// Cache the access token in memory (never in localStorage per security requirements)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveBackupInfo {
  lastBackupDate: string; // YYYY-MM-DD
  lastBackupTimestamp: string; // ISO string
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  status: 'idle' | 'in_progress' | 'success' | 'error';
  error?: string;
  userEmail?: string;
  autoDailyEnabled: boolean;
}

export interface DriveFileItem {
  id: string;
  name: string;
  createdTime?: string;
  webViewLink?: string;
  size?: string;
}

// Listen to auth state changes and manage cached token
export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && !user.isAnonymous) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not cached in this session yet; caller may trigger sign-in when user asks for Drive action
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google and request Google Drive permissions
export const signInWithGoogleForDrive = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('לא התקבל Access Token מ-Google. יש לנסות שנית.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Drive Sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const signOutDrive = async (): Promise<void> => {
  try {
    cachedAccessToken = null;
    await signOut(auth);
  } catch (err) {
    console.error('Error signing out:', err);
  }
};

// Find or create dedicated folder in Google Drive
async function getOrCreateBackupFolder(accessToken: string): Promise<string | null> {
  try {
    const folderName = 'גיבויי מערכת תקשוב - חנה סנש';
    const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // Create new folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        description: 'תיקיית גיבויים אוטומטיים של מערכת שיבוץ תקשוב בית ספר חנה סנש'
      })
    });

    if (createRes.ok) {
      const createdFolder = await createRes.json();
      return createdFolder.id;
    }
    return null;
  } catch (err) {
    console.warn('Could not check/create Drive folder, backing up to root instead:', err);
    return null;
  }
}

// Upload backup JSON payload to Google Drive using Drive v3 multipart upload
export async function uploadBackupToGoogleDrive(
  accessToken: string,
  backupData: BackupData
): Promise<{ id: string; name: string; webViewLink?: string }> {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const timeStr = `${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`;
  const fileName = `גיבוי_שיבוצים_ובקשות_חנה_סנש_${dateStr}_${timeStr}.json`;

  const folderId = await getOrCreateBackupFolder(accessToken);

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: 'application/json',
    description: `גיבוי מערכת שיבוץ תקשוב חנה סנש שבוצע ב-${now.toLocaleString('he-IL')}. מכיל ${backupData.schedule.length} שיבוצים ו-${backupData.requests.length} בקשות.`
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  const boundary = '-------GoogleDriveSchedulerBoundary314159';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(backupData, null, 2) +
    closeDelimiter;

  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,createdTime',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`שגיאה בהעלאת הגיבוי ל-Google Drive: ${response.status} ${errorText}`);
  }

  const fileData = await response.json();
  return {
    id: fileData.id,
    name: fileData.name || fileName,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`
  };
}

// Fetch list of previous backup files created in Drive
export async function listDriveBackupFiles(accessToken: string): Promise<DriveFileItem[]> {
  try {
    const query = encodeURIComponent(`name contains 'גיבוי_שיבוצים_ובקשות' and trashed = false`);
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=createdTime%20desc&pageSize=10&fields=files(id,name,createdTime,webViewLink,size)`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.warn('Failed to list drive backup files:', err);
    return [];
  }
}

// Load daily backup status
export function getStoredBackupStatus(): DriveBackupInfo {
  return loadLocalData<DriveBackupInfo>('ict_drive_backup_status', {
    lastBackupDate: '',
    lastBackupTimestamp: '',
    status: 'idle',
    autoDailyEnabled: true
  });
}

// Save daily backup status locally and sync to cloud settings
export async function saveBackupStatus(status: DriveBackupInfo): Promise<void> {
  saveLocalData('ict_drive_backup_status', status);
  try {
    await setDoc(doc(db, 'settings', 'drive_backup_status'), sanitizeForFirestore(status));
  } catch (err) {
    console.warn('Failed to save drive backup status to cloud Firestore:', err);
  }
}

// Check if daily backup is needed today and perform if token available
export async function checkAndExecuteDailyBackup(
  backupData: BackupData,
  accessToken?: string | null
): Promise<{ performed: boolean; info: DriveBackupInfo; message: string }> {
  const currentStatus = getStoredBackupStatus();
  const today = new Date().toISOString().split('T')[0];

  // If already backed up today, return existing status
  if (currentStatus.lastBackupDate === today && currentStatus.status === 'success') {
    return {
      performed: false,
      info: currentStatus,
      message: 'הגיבוי היומי ל-Google Drive כבר בוצע היום בהצלחה.'
    };
  }

  // If auto-daily is disabled
  if (currentStatus.autoDailyEnabled === false) {
    return {
      performed: false,
      info: currentStatus,
      message: 'גיבוי יומי אוטומטי מנוטרל בהגדרות.'
    };
  }

  const tokenToUse = accessToken || cachedAccessToken;
  if (!tokenToUse) {
    return {
      performed: false,
      info: currentStatus,
      message: 'נדרש חיבור ל-Google Drive כדי לבצע את הגיבוי היומי האוטומטי.'
    };
  }

  // Execute backup
  try {
    const uploadedFile = await uploadBackupToGoogleDrive(tokenToUse, backupData);
    const updatedInfo: DriveBackupInfo = {
      ...currentStatus,
      lastBackupDate: today,
      lastBackupTimestamp: new Date().toISOString(),
      fileId: uploadedFile.id,
      fileName: uploadedFile.name,
      webViewLink: uploadedFile.webViewLink,
      status: 'success',
      error: undefined,
      autoDailyEnabled: currentStatus.autoDailyEnabled
    };

    await saveBackupStatus(updatedInfo);
    return {
      performed: true,
      info: updatedInfo,
      message: `הגיבוי היומי של כל נתוני השיבוץ והבקשות בוצע ונשמר בהצלחה ב-Google Drive! (${uploadedFile.name})`
    };
  } catch (err: any) {
    const failedInfo: DriveBackupInfo = {
      ...currentStatus,
      status: 'error',
      error: err.message || 'שגיאה לא ידועה בגיבוי'
    };
    await saveBackupStatus(failedInfo);
    return {
      performed: false,
      info: failedInfo,
      message: `נכשל הגיבוי היומי ל-Google Drive: ${err.message || ''}`
    };
  }
}
