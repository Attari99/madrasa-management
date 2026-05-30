import { useState, useMemo } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Plus, Search, Eye, Pencil, Trash2, GraduationCap, UserCheck, UserX } from "lucide-react";
import { db, logActivity } from "../../utils/storage";
import type { Class, Student } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const PAGE_SIZE = 12;

export default function StudentList() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const students = db.getAll<Student>("students");
  const classes = db.getAll<Class>("classes");
  const getClassName = (id: string) => classes.find((c) => c.id === id)?.className || "—";

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchSearch = search === "" || s.studentName.toLowerCase().includes(search.toLowerCase()) || s.fatherName.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === "all" || s.currentClass === classFilter;
      const matchStatus = statusFilter === "all" || s.status === statusFilter;
      return matchSearch && matchClass && matchStatus;
    });
  }, [students, search, classFilter, statusFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  const handleDelete = () => {
    if (!deleteId) return;
    db.delete("students", deleteId);
    logActivity("Deleted student", "student", deleteId, user?.id || "");
    setDeleteId(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Students</h1>
          <p className="text-sm text-muted-foreground">{students.filter(s => s.status === "active").length} active students</p>
        </div>
        <Link href="/students/new">
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90 transition-all">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search by name..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg bg-background" /></div>
        <select value={classFilter} onChange={(e) => { setClassFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-input rounded-lg bg-background"><option value="all">All Classes</option>{classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-input rounded-lg bg-background"><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginated.length === 0 ? (
          <div className="col-span-4 text-center py-16"><GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No students found</p></div>
        ) : (
          paginated.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="bg-card rounded-xl border border-border p-4 hover:shadow-lg transition-all">
              <div className="flex justify-between items-start">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><GraduationCap className="w-5 h-5 text-primary" /></div>
                <div className="flex gap-1">
                  <Link href={`/students/${s.id}`}><button className="p-1.5 hover:bg-accent rounded-lg"><Eye className="w-3.5 h-3.5" /></button></Link>
                  <Link href={`/students/${s.id}/edit`}><button className="p-1.5 hover:bg-accent rounded-lg"><Pencil className="w-3.5 h-3.5" /></button></Link>
                  <button onClick={() => setDeleteId(s.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="mt-3"><h3 className="font-bold text-foreground">{s.studentName}</h3><p className="text-sm text-muted-foreground">S/O {s.fatherName}</p></div>
              <div className="mt-3 space-y-1 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Class:</span><span className="font-medium">{getClassName(s.currentClass)}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Phone:</span><span className="font-medium">{s.guardianNumber}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span className={`px-2 py-0.5 rounded-full text-xs ${s.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{s.status}</span></div></div>
            </motion.div>
          ))
        )}
      </div>

      {totalPages > 1 && <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</p><div className="flex gap-2"><button onClick={() => setPage(p=>p-1)} disabled={page===1} className="px-3 py-1 border border-input rounded disabled:opacity-50">Previous</button><button onClick={() => setPage(p=>p+1)} disabled={page===totalPages} className="px-3 py-1 border border-input rounded">Next</button></div></div>}

      {deleteId && (<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><div className="bg-card rounded-xl p-6 max-w-md w-full mx-4"><h2 className="text-lg font-bold">Delete Student</h2><p className="text-muted-foreground my-4">Are you sure? This action cannot be undone.</p><div className="flex gap-3 justify-end"><button onClick={()=>setDeleteId(null)} className="px-4 py-2 border border-input rounded">Cancel</button><button onClick={handleDelete} className="px-4 py-2 bg-destructive text-destructive-foreground rounded">Delete</button></div></div></div>)}
    </div>
  );
}