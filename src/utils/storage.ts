export const storage = {
  get: <T>(key: string): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch { return null; }
  },
  set: <T>(key: string, value: T): void => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  },
  remove: (key: string): void => {
    try { localStorage.removeItem(key); } catch {}
  },
};

export const generateId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

export const db = {
  getAll: <T>(collection: string): T[] => storage.get<T[]>(collection) ?? [],
  getById: <T extends { id: string }>(collection: string, id: string): T | null => {
    const items = storage.get<T[]>(collection) ?? [];
    return items.find((i) => i.id === id) ?? null;
  },
  create: <T extends { id: string }>(collection: string, item: Omit<T, "id">): T => {
    const items = storage.get<T[]>(collection) ?? [];
    const newItem = { ...item, id: generateId() } as T;
    items.push(newItem);
    storage.set(collection, items);
    return newItem;
  },
  update: <T extends { id: string }>(collection: string, id: string, updates: Partial<T>): T | null => {
    const items = storage.get<T[]>(collection) ?? [];
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    items[idx] = { ...items[idx], ...updates };
    storage.set(collection, items);
    return items[idx];
  },
  delete: (collection: string, id: string): void => {
    const items = storage.get<{ id: string }[]>(collection) ?? [];
    storage.set(collection, items.filter((i) => i.id !== id));
  },
};

export const logActivity = (action: string, entity: string, entityId: string, userId: string) => {
  const logs = storage.get<ActivityLog[]>("activity_logs") ?? [];
  const entry: ActivityLog = { id: generateId(), action, entity, entityId, userId, timestamp: new Date().toISOString() };
  logs.unshift(entry);
  storage.set("activity_logs", logs.slice(0, 500));
};

// Types
export interface ActivityLog { id: string; action: string; entity: string; entityId: string; userId: string; timestamp: string; }
export interface User { id: string; username: string; email: string; password: string; role: "admin" | "ustad"; name: string; photo?: string; ustadId?: string; }
export interface Ustad { id: string; fullName: string; fatherName: string; phone: string; cnic: string; address: string; photo?: string; qualification: string; joiningDate: string; assignedClass: string; experience: string; status: "active" | "inactive"; email: string; }
export interface Student { id: string; studentName: string; fatherName: string; guardianNumber: string; address: string; photo?: string; age: number; admissionDate: string; currentClass: string; assignedTeacher: string; status: "active" | "inactive"; }
export interface Class { id: string; className: string; assignedTeacher: string; transferHistory: { teacherId: string; date: string }[]; }
export interface StudentAttendance { id: string; studentId: string; date: string; status: "present" | "absent" | "leave"; }
export interface UstadAttendance { id: string; ustadId: string; date: string; status: "present" | "absent" | "leave"; dressStatus: "white_suit_imama" | "white_suit" | "imama" | "incomplete"; arrivalTime: string; exitTime: string; }
export interface MonthlyProgress { id: string; studentId: string; month: number; year: number; currentSipara: string; monthlyLesson: string; revisionStatus: string; memorizationProgress: string; performance: "excellent" | "good" | "weak" | "needs_attention"; behaviour: "good" | "normal" | "naughty"; }
export interface Notification { id: string; message: string; recipient: string; sentAt: string; sentBy: string; }
export interface UstadTarget { id: string; ustadId: string; month: number; year: number; targetSiparas: number; completedSiparas: number; status: "pending" | "completed" | "partial"; }
// Add this interface after UstadTarget
export interface TargetReport {
  id: string;
  ustadId: string;
  month: number;
  year: number;
  targetSiparas: number;
  completedSiparas: number;
  reportText: string;
  status: "pending" | "submitted" | "reviewed";
  submittedAt: string;
  reviewedAt?: string;
  adminComments?: string;
}