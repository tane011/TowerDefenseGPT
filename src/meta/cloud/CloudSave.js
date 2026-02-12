import { FIREBASE_CONFIG } from "./firebaseConfig.js";
import {
  initializeApp,
  getApps,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "./firebaseImports.js";

const CLOUD_SCHEMA_VERSION = 1;
const AUTO_SAVE_DEBOUNCE_MS = 2000;
const SAVE_DOC_ID = "state";

export class CloudSave {
  constructor({ getSnapshot, applySnapshot, onStatusChange } = {}) {
    this._getSnapshot = getSnapshot;
    this._applySnapshot = applySnapshot;
    this._onStatusChange = onStatusChange;
    this._enabled = false;
    this._busy = false;
    this._user = null;
    this._lastSyncAt = null;
    this._lastError = "";
    this._lastErrorCode = "";
    this._autosaveEnabled = false;
    this._pendingSave = null;
    this._saveTimer = null;
  }

  init() {
    if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey || !FIREBASE_CONFIG.projectId) {
      this._enabled = false;
      this._emitStatus("Cloud saves unavailable. Missing Firebase config.");
      return false;
    }

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    this._auth = getAuth(app);
    this._db = getFirestore(app);
    this._enabled = true;

    onAuthStateChanged(this._auth, (user) => {
      this._user = user || null;
      this._autosaveEnabled = Boolean(this._user);
      this._emitStatus();
    });

    this._emitStatus("Cloud saves ready.");
    return true;
  }

  setStatusHandler(handler) {
    this._onStatusChange = typeof handler === "function" ? handler : null;
    if (this._onStatusChange) this._onStatusChange(this.getStatus());
  }

  get enabled() {
    return this._enabled;
  }

  get user() {
    return this._user;
  }

  getStatus() {
    return {
      enabled: this._enabled,
      signedIn: Boolean(this._user),
      userEmail: this._user?.email || "",
      userName: this._user?.displayName || "",
      lastSyncAt: this._lastSyncAt,
      busy: this._busy,
      message: this._lastError,
      errorCode: this._lastErrorCode,
    };
  }

  async signInWithEmail(email, password) {
    if (!this._enabled || !this._auth) return;
    this._setBusy(true);
    try {
      await signInWithEmailAndPassword(this._auth, email, password);
      this._lastError = "";
      this._lastErrorCode = "";
    } catch (err) {
      this._lastError = this._formatError(err);
    } finally {
      this._setBusy(false);
      this._emitStatus();
    }
  }

  async createAccount(email, password) {
    if (!this._enabled || !this._auth) return;
    this._setBusy(true);
    try {
      await createUserWithEmailAndPassword(this._auth, email, password);
      this._lastError = "";
      this._lastErrorCode = "";
    } catch (err) {
      this._lastError = this._formatError(err);
    } finally {
      this._setBusy(false);
      this._emitStatus();
    }
  }

  async signOut() {
    if (!this._enabled || !this._auth) return;
    this._setBusy(true);
    try {
      await signOut(this._auth);
      this._lastError = "";
      this._lastErrorCode = "";
    } catch (err) {
      this._lastError = this._formatError(err);
    } finally {
      this._setBusy(false);
      this._emitStatus();
    }
  }

  scheduleSave(reason = "") {
    if (!this._autosaveEnabled || !this._enabled) return;
    this._pendingSave = reason || "autosave";
    if (this._saveTimer) return;
    this._saveTimer = window.setTimeout(() => {
      this._saveTimer = null;
      this.uploadNow().catch(() => {});
    }, AUTO_SAVE_DEBOUNCE_MS);
  }

  async uploadNow() {
    if (!this._enabled || !this._user || !this._db) {
      this._lastError = "Sign in to enable cloud saves.";
      this._emitStatus();
      return false;
    }
    if (this._busy) return false;
    if (typeof this._getSnapshot !== "function") return false;

    this._setBusy(true);
    try {
      const snapshot = this._getSnapshot();
      const payload = {
        version: CLOUD_SCHEMA_VERSION,
        snapshot,
        updatedAt: serverTimestamp(),
        client: {
          userAgent: navigator.userAgent || "unknown",
          build: window.__tdBuildHash || "",
        },
      };
      const ref = doc(this._db, "users", this._user.uid, "saves", SAVE_DOC_ID);
      await setDoc(ref, payload, { merge: true });
      this._lastSyncAt = Date.now();
      this._lastError = "";
      this._lastErrorCode = "";
      return true;
    } catch (err) {
      this._lastError = this._formatError(err);
      return false;
    } finally {
      this._pendingSave = null;
      this._setBusy(false);
      this._emitStatus();
    }
  }

  async downloadNow() {
    if (!this._enabled || !this._user || !this._db) {
      this._lastError = "Sign in to load cloud saves.";
      this._emitStatus();
      return false;
    }
    if (this._busy) return false;
    if (typeof this._applySnapshot !== "function") return false;

    this._setBusy(true);
    try {
      const ref = doc(this._db, "users", this._user.uid, "saves", SAVE_DOC_ID);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        this._lastError = "No cloud save found yet.";
        return false;
      }
      const data = snap.data();
      const snapshot = data?.snapshot;
      if (!snapshot || typeof snapshot !== "object") {
        this._lastError = "Cloud save is empty.";
        return false;
      }
      const applied = await this._applySnapshot(snapshot);
      if (applied) {
        this._lastSyncAt = Date.now();
        this._lastError = "";
        this._lastErrorCode = "";
      }
      return Boolean(applied);
    } catch (err) {
      this._lastError = this._formatError(err);
      return false;
    } finally {
      this._setBusy(false);
      this._emitStatus();
    }
  }

  _setBusy(value) {
    this._busy = Boolean(value);
  }

  _emitStatus(message = "") {
    if (message) this._lastError = message;
    if (typeof this._onStatusChange === "function") {
      this._onStatusChange(this.getStatus());
    }
  }

  _formatError(err) {
    if (!err) {
      this._lastErrorCode = "";
      return "Cloud save error.";
    }
    if (typeof err === "string") {
      this._lastErrorCode = "";
      return err;
    }
    this._lastErrorCode = err.code || "";
    const code = String(err.code || "");
    switch (code) {
      case "auth/operation-not-allowed":
        return "Email/Password auth is disabled in Firebase. Enable it in Authentication → Sign-in method.";
      case "auth/invalid-email":
        return "Invalid username. Use 3–20 letters, numbers, dot, dash, or underscore.";
      case "auth/user-not-found":
        return "Account not found. Create an account first.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/weak-password":
        return "Password is too weak. Use at least 6 characters.";
      case "auth/email-already-in-use":
        return "Username already exists. Sign in instead.";
      case "auth/network-request-failed":
        return "Network error. Check your connection and try again.";
      default:
        return err.message || "Cloud save error.";
    }
  }
}
