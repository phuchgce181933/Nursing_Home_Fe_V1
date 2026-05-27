import { getApps, initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getDatabase, onValue, ref } from 'firebase/database';
import authService from './auth.service';

const envDatabaseURL = import.meta.env.VITE_FIREBASE_DATABASE_URL;

// Omit databaseURL so initializeApp does not auto-bind a default RTDB instance.
const firebaseAppConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

const FIREBASE_APP_NAME = 'readiness-realtime';

let appInstance = null;
let authInstance = null;
let dbInstance = null;
let loginPromise = null;

const getIdValue = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id || value.id || null;
};

const normalizeAreaIds = (areas) => {
  if (!Array.isArray(areas)) return [];
  return areas
    .map((area) => getIdValue(area))
    .filter(Boolean)
    .map((id) => id.toString());
};

const normalizeDatabaseUrl = (url) => {
  if (!url || typeof url !== 'string') return url;
  return url.trim().replace(/\/+$/, '');
};

const shouldEnableRealtime = () => {
  if (import.meta.env.VITE_READINESS_REALTIME_ENABLED === 'false') return false;
  return Boolean(firebaseAppConfig.apiKey && envDatabaseURL);
};

const ensureApp = () => {
  if (appInstance) return appInstance;
  const existing = getApps().find((app) => app.name === FIREBASE_APP_NAME);
  appInstance = existing || initializeApp(firebaseAppConfig, FIREBASE_APP_NAME);
  authInstance = getAuth(appInstance);
  return appInstance;
};

const ensureDatabase = (databaseURL) => {
  if (dbInstance) return dbInstance;
  ensureApp();
  const url = normalizeDatabaseUrl(databaseURL || envDatabaseURL);
  if (!url) throw new Error('Firebase database URL is not configured');
  dbInstance = getDatabase(appInstance, url);
  return dbInstance;
};

const ensureFirebase = async () => {
  ensureApp();

  if (!authInstance.currentUser) {
    if (!loginPromise) {
      loginPromise = authService
        .getFirebaseToken()
        .then(async ({ firebaseToken, databaseURL }) => {
          if (!firebaseToken) throw new Error('Missing firebaseToken');
          ensureDatabase(databaseURL);
          await signInWithCustomToken(authInstance, firebaseToken);
        })
        .finally(() => {
          loginPromise = null;
        });
    }
    await loginPromise;
  }

  if (!dbInstance) {
    ensureDatabase();
  }

  return dbInstance;
};

const applyClientFilter = (rows, { role, floorId } = {}) => {
  let filtered = rows;

  if (role) {
    filtered = filtered.filter((row) => row.role === role);
  }

  if (floorId) {
    const floorIdStr = floorId.toString();
    filtered = filtered.filter((row) => {
      const areas = normalizeAreaIds(row.staffProfile?.responsibleAreaIds);
      return areas.includes(floorIdStr);
    });
  }

  return filtered;
};

const normalizeSnapshot = (snapshotValue, filters) => {
  const value = snapshotValue || {};
  const staffMap = value.staff && typeof value.staff === 'object' ? value.staff : {};
  const rows = Object.values(staffMap);

  return {
    date: value.date || null,
    checkedAt: value.checkedAt || null,
    floorId: filters?.floorId || value.floorId || null,
    summary: value.summary || null,
    data: applyClientFilter(rows, filters),
  };
};

export const isReadinessRealtimeAvailable = () => shouldEnableRealtime();

export const subscribeEmergencyReadiness = async (dateStr, onUpdate, filters = {}) => {
  if (!dateStr) throw new Error('dateStr is required');
  if (!shouldEnableRealtime()) throw new Error('Realtime is disabled');

  const db = await ensureFirebase();
  const readinessRef = ref(db, `emergencyReadiness/${dateStr}`);

  const unsubscribe = onValue(readinessRef, (snapshot) => {
    onUpdate(normalizeSnapshot(snapshot.val(), filters));
  });

  return unsubscribe;
};

