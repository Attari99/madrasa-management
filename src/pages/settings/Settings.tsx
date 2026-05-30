import { useState } from "react";
import { Save, Moon, Sun, Settings as SettingsIcon, Trash2, AlertTriangle, RefreshCw, User, Users, School, CalendarCheck, FileText, Bell, Database } from "lucide-react";
import { storage, db } from "../../utils/storage";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuth } from "../../contexts/AuthContext";

export default function Settings() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const existing = storage.get<{ name: string; logo: string | null }>("madrasa_settings") ?? { 
    name: "Madarsa Tul Madina Fatima Masjid", 
    logo: null 
  };
  const [name, setName] = useState(existing.name);
  const [logo, setLogo] = useState<string | null>(existing.logo);

  // Get data statistics
  const stats = {
    ustads: db.getAll("ustads").length,
    students: db.getAll("students").length,
    classes: db.getAll("classes").length,
    attendance: db.getAll("student_attendance").length + db.getAll("ustad_attendance").length,
    progress: db.getAll("monthly_progress").length,
    notifications: db.getAll("notifications").length,
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = () => {
    if (!name.trim()) {
      setMessage({ type: "error", text: "Madrasa name cannot be empty!" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    storage.set("madrasa_settings", { name: name.trim(), logo });
    setMessage({ type: "success", text: "Settings saved successfully!" });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleClearAllData = () => {
    setIsLoading(true);
    try {
      const keysToKeep = ["users", "seeded", "madrasa_settings", "currentUser"];
      const allKeys = localStorage.length;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      setMessage({ type: "success", text: `Cleared ${keysToRemove.length} records! Page will reload.` });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({ type: "error", text: "Error clearing data!" });
      setIsLoading(false);
    }
  };

  const handleResetToDefault = () => {
    setIsLoading(true);
    try {
      const keysToKeep = ["madrasa_settings", "currentUser"];
      const allKeys = localStorage.length;
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Re-seed default data
      const { seedIfNeeded } = require("../../utils/seedData");
      seedIfNeeded();
      
      setMessage({ type: "success", text: "Reset to default data! Page will reload." });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setMessage({ type: "error", text: "Error resetting data!" });
      setIsLoading(false);
    }
  };

  const handleExportData = () => {
    const allData: Record<string, any> = {};
    const collections = ["ustads", "students", "classes", "student_attendance", "ustad_attendance", "monthly_progress", "notifications", "activity_logs"];
    
    collections.forEach(collection => {
      allData[collection] = db.getAll(collection);
    });
    
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `madrasa-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage({ type: "success", text: "Data exported successfully!" });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your madrasa configuration and data</p>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-xl ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{stats.ustads}</p>
          <p className="text-xs text-muted-foreground">Ustads</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <User className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{stats.students}</p>
          <p className="text-xs text-muted-foreground">Students</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <School className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{stats.classes}</p>
          <p className="text-xs text-muted-foreground">Classes</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <CalendarCheck className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{stats.attendance}</p>
          <p className="text-xs text-muted-foreground">Attendance</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <FileText className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{stats.progress}</p>
          <p className="text-xs text-muted-foreground">Progress</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-3 text-center">
          <Bell className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-xl font-bold">{stats.notifications}</p>
          <p className="text-xs text-muted-foreground">Notifications</p>
        </div>
      </div>

      {/* Madrasa Information */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Madrasa Information</h3>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Madrasa Name</label>
          <input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Logo</label>
          <div className="flex items-center gap-4 flex-wrap">
            {logo && (
              <img src={logo} alt="Madrasa Logo" className="w-16 h-16 rounded-xl object-cover border border-border" />
            )}
            <div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
              <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-accent transition-colors">
                Upload Logo
              </label>
              {logo && (
                <button onClick={() => setLogo(null)} className="ml-2 text-xs text-destructive hover:underline">
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={handleSaveSettings} className="bg-primary text-primary-foreground px-6 py-2 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-2">
          <Save className="w-4 h-4" /> Save Changes
        </button>
      </div>

      {/* Appearance */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <div>
              <p className="font-medium text-foreground">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark theme</p>
            </div>
          </div>
          <button 
            onClick={toggleTheme} 
            className="relative w-12 h-6 rounded-full bg-muted transition-colors"
          >
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${theme === "dark" ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Data Management</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export Data */}
          <button onClick={handleExportData} className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Database className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Export Data</p>
              <p className="text-xs text-muted-foreground">Download all data as JSON backup</p>
            </div>
          </button>

          {/* Reset to Default */}
          <button onClick={() => setShowResetConfirm(true)} className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-200 dark:bg-amber-800/50 flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Reset to Default</p>
              <p className="text-xs text-muted-foreground">Reset all data to default sample data</p>
            </div>
          </button>

          {/* Clear All Data */}
          <button onClick={() => setShowClearConfirm(true)} className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors md:col-span-2">
            <div className="w-10 h-10 rounded-lg bg-red-200 dark:bg-red-800/50 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-left">
              <p className="font-medium text-red-600 dark:text-red-400">Clear All Data</p>
              <p className="text-xs text-muted-foreground">Delete ALL students, ustads, attendance, progress records (cannot undo)</p>
            </div>
          </button>
        </div>

        <div className="p-4 bg-muted/30 rounded-xl text-xs text-muted-foreground space-y-1">
          <p>ℹ️ All data is stored locally in your browser's localStorage.</p>
          <p>ℹ️ Export your data regularly to keep a backup.</p>
          <p>ℹ️ Clearing browser data will remove all madrasa records.</p>
        </div>
      </div>

      {/* Clear Data Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-destructive mb-4">
              <AlertTriangle className="w-6 h-6" />
              <h2 className="text-xl font-bold">Clear All Data?</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              This will permanently delete ALL data including:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground mb-4 space-y-1">
              <li>All Ustads ({stats.ustads} records)</li>
              <li>All Students ({stats.students} records)</li>
              <li>All Classes ({stats.classes} records)</li>
              <li>All Attendance Records ({stats.attendance} records)</li>
              <li>All Progress Records ({stats.progress} records)</li>
              <li>All Notifications ({stats.notifications} records)</li>
            </ul>
            <p className="text-destructive text-sm font-medium mb-4">This action cannot be undone!</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowClearConfirm(false)} className="px-4 py-2 border border-input rounded-lg">Cancel</button>
              <button onClick={handleClearAllData} disabled={isLoading} className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg flex items-center gap-2">
                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isLoading ? "Clearing..." : "Yes, Clear All"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 text-amber-600 mb-4">
              <RefreshCw className="w-6 h-6" />
              <h2 className="text-xl font-bold">Reset to Default Data?</h2>
            </div>
            <p className="text-muted-foreground mb-4">
              This will replace all your current data with default sample data.
            </p>
            <p className="text-amber-600 text-sm font-medium mb-4">All your custom data will be lost!</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowResetConfirm(false)} className="px-4 py-2 border border-input rounded-lg">Cancel</button>
              <button onClick={handleResetToDefault} disabled={isLoading} className="px-4 py-2 bg-amber-600 text-white rounded-lg flex items-center gap-2">
                {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {isLoading ? "Resetting..." : "Yes, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}