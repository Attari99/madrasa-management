import { useState } from "react";
import { Plus, School, Pencil, Trash2, Save, X } from "lucide-react";
import { db, logActivity } from "@/utils/storage";
import type { Class, Ustad, Student } from "@/utils/storage";
import { useAuth } from "@/contexts/AuthContext";

export default function ClassList() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ className: "", assignedTeacher: "" });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const classes = db.getAll<Class>("classes");
  const ustads = db.getAll<Ustad>("ustads").filter(u => u.status === "active");
  const students = db.getAll<Student>("students");

  const handleSave = () => {
    if (!form.className.trim()) return alert("Class name required");
    if (editId) { 
      db.update<Class>("classes", editId, form); 
      logActivity("Updated class", "class", editId, user?.id || ""); 
    } else { 
      db.create<Class>("classes", { ...form, transferHistory: [] }); 
      logActivity("Added new class", "class", "", user?.id || ""); 
    }
    setShowForm(false); 
    setEditId(null); 
    setForm({ className: "", assignedTeacher: "" });
  };

  const handleDelete = () => { 
    if(deleteId){ 
      db.delete("classes", deleteId); 
      setDeleteId(null); 
    } 
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Classes</h1>
          <p className="text-sm text-muted-foreground">{classes.length} classes total</p>
        </div>
        <button 
          onClick={() => { setShowForm(true); setEditId(null); setForm({ className: "", assignedTeacher: "" }); }} 
          className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-semibold mb-4">{editId ? "Edit Class" : "New Class"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label>Class Name *</label>
              <input 
                value={form.className} 
                onChange={e => setForm(f => ({ ...f, className: e.target.value }))} 
                placeholder="e.g., Hifz Awwal" 
                className="w-full px-3 py-2 border rounded mt-1" 
              />
            </div>
            <div>
              <label>Assigned Teacher</label>
              <select 
                value={form.assignedTeacher} 
                onChange={e => setForm(f => ({ ...f, assignedTeacher: e.target.value }))} 
                className="w-full px-3 py-2 border rounded mt-1"
              >
                <option value="">None</option>
                {ustads.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm flex items-center gap-1">
              <Save className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 border rounded text-sm">
              <X className="w-3.5 h-3.5 inline mr-1" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.length === 0 ? (
          <div className="col-span-3 text-center py-16">
            <School className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p>No classes yet</p>
          </div>
        ) : (
          classes.map(cls => (
            <div key={cls.id} className="bg-card rounded-xl border border-border p-5">
              <div className="flex justify-between items-start mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <School className="w-5 h-5 text-primary" />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditId(cls.id); setForm({ className: cls.className, assignedTeacher: cls.assignedTeacher }); setShowForm(true); }} 
                    className="p-1 hover:bg-accent rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setDeleteId(cls.id)} className="p-1 hover:bg-destructive/10 rounded text-destructive">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-bold">{cls.className}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Teacher: {ustads.find(u => u.id === cls.assignedTeacher)?.fullName || "Unassigned"}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {students.filter(s => s.currentClass === cls.id).length} students
              </p>
            </div>
          ))
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-card rounded-xl p-6">
            <h2 className="text-lg font-bold">Delete Class</h2>
            <p className="text-muted-foreground my-4">Are you sure?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 border rounded">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}