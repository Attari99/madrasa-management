import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Search, Eye, Pencil, Trash2, Users, UserCheck, UserX } from "lucide-react";
import { db, logActivity } from "../../utils/storage";
import type { Ustad, Class } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

export default function UstadList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const ustads = db.getAll<Ustad>("ustads");
  const classes = db.getAll<Class>("classes");

  const filtered = useMemo(() => {
    return ustads.filter((u) => {
      const matchSearch = search === "" || u.fullName.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || u.assignedClass === classFilter;
      const matchStatus = statusFilter === "all" || u.status === statusFilter;
      return matchSearch && matchClass && matchStatus;
    });
  }, [ustads, search, classFilter, statusFilter]);

  const handleDelete = () => {
    if (!deleteId) return;
    db.delete("ustads", deleteId);
    logActivity("Deleted ustad", "ustad", deleteId, user?.id || "");
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ustads</h1>
          <p className="text-sm text-muted-foreground">{ustads.filter(u=>u.status==="active").length} active ustads</p>
        </div>
        <Link href="/ustads/new">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" /> Add Ustad
          </button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search by name..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg bg-background" />
        </div>
        <select value={classFilter} onChange={e=>setClassFilter(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background">
          <option value="all">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
        </select>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Ustads Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-3 text-center py-16">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No ustads found</p>
          </div>
        ) : (
          filtered.map((u, i) => (
            <motion.div key={u.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card rounded-xl border border-border p-5 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex gap-1">
                  <Link href={`/ustads/${u.id}`}>
                    <button className="p-1.5 hover:bg-accent rounded-lg transition-colors"><Eye className="w-4 h-4" /></button>
                  </Link>
                  <Link href={`/ustads/${u.id}/edit`}>
                    <button className="p-1.5 hover:bg-accent rounded-lg transition-colors"><Pencil className="w-4 h-4" /></button>
                  </Link>
                  <button onClick={() => setDeleteId(u.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div>
                <h3 className="font-bold text-lg text-foreground">{u.fullName}</h3>
                <p className="text-sm text-muted-foreground">S/O {u.fatherName}</p>
              </div>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Class:</span>
                  <span className="font-medium">{classes.find(c=>c.id===u.assignedClass)?.className || "Not Assigned"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{u.phone}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{u.status}</span>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold">Delete Ustad</h2>
            <p className="text-muted-foreground my-4">Are you sure you want to delete this ustad? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setDeleteId(null)} className="px-4 py-2 border border-input rounded">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}