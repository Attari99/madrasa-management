import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Save, TrendingUp } from "lucide-react";
import { db, generateId, logActivity, storage } from "@/utils/storage";
import type { Student, MonthlyProgress, Ustad } from "@/utils/storage";
import { useAuth } from "@/contexts/AuthContext";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function UstadProgress() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const ustad = useMemo(() => {
    if (!user?.ustadId) return null;
    return db.getById<Ustad>("ustads", user.ustadId);
  }, [user]);

  const myStudents = useMemo(() => {
    if (!ustad?.assignedClass) return [];
    return db.getAll<Student>("students").filter(s => s.currentClass === ustad.assignedClass && s.status === "active");
  }, [ustad]);

  const existingProgress = useMemo(() => {
    const all = db.getAll<MonthlyProgress>("monthly_progress");
    const map: Record<string, MonthlyProgress> = {};
    all.filter(p => p.month === month && p.year === year).forEach(p => { map[p.studentId] = p; });
    return map;
  }, [month, year]);

  const [entries, setEntries] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    myStudents.forEach(s => {
      const ex = existingProgress[s.id];
      map[s.id] = ex ? {
        currentSipara: ex.currentSipara,
        monthlyLesson: ex.monthlyLesson,
        revisionStatus: ex.revisionStatus,
        memorizationProgress: ex.memorizationProgress,
        performance: ex.performance,
        behaviour: ex.behaviour
      } : {
        currentSipara: "",
        monthlyLesson: "",
        revisionStatus: "In Progress",
        memorizationProgress: "",
        performance: "good",
        behaviour: "good"
      };
    });
    return map;
  });

  const handleSave = () => {
    const all = storage.get<MonthlyProgress[]>("monthly_progress") ?? [];
    const myIds = new Set(myStudents.map(s => s.id));
    const filtered = all.filter(p => !(p.month === month && p.year === year && myIds.has(p.studentId)));
    const newEntries: MonthlyProgress[] = myStudents.map(s => ({
      id: existingProgress[s.id]?.id ?? generateId(),
      studentId: s.id,
      month,
      year,
      ...entries[s.id]
    }));
    storage.set("monthly_progress", [...filtered, ...newEntries]);
    logActivity(`Ustad saved progress for ${MONTHS[month - 1]} ${year}`, "progress", "batch", user?.id || "");
    alert("Progress saved!");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Student Progress</h1>
          <p className="text-sm text-muted-foreground">Track monthly Quran progress for your students</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 border rounded">
            {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border rounded">
            {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {myStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <TrendingUp className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No students in your class</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-3 py-3 min-w-32">Student</th>
                  <th className="text-left px-3 py-3 min-w-28">Sipara</th>
                  <th className="text-left px-3 py-3 min-w-28">Lesson</th>
                  <th className="text-left px-3 py-3 min-w-28">Revision</th>
                  <th className="text-left px-3 py-3 min-w-28">Memorization</th>
                  <th className="text-left px-3 py-3 min-w-36">Performance</th>
                  <th className="text-left px-3 py-3 min-w-32">Behaviour</th>
                </tr>
              </thead>
              <tbody>
                {myStudents.map((s, i) => {
                  const e = entries[s.id] ?? {};
                  return (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-accent/30">
                      <td className="px-3 py-2.5 font-medium text-foreground">{s.studentName}</td>
                      <td className="px-3 py-2.5"><input value={e.currentSipara || ""} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], currentSipara: ev.target.value } }))} placeholder="Para..." className="w-28 px-2 py-1 text-xs border rounded" /></td>
                      <td className="px-3 py-2.5"><input value={e.monthlyLesson || ""} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], monthlyLesson: ev.target.value } }))} placeholder="Lesson" className="w-28 px-2 py-1 text-xs border rounded" /></td>
                      <td className="px-3 py-2.5"><select value={e.revisionStatus || "In Progress"} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], revisionStatus: ev.target.value } }))} className="px-2 py-1 text-xs border rounded"><option>Completed</option><option>In Progress</option><option>Not Started</option></select></td>
                      <td className="px-3 py-2.5"><input value={e.memorizationProgress || ""} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], memorizationProgress: ev.target.value } }))} placeholder="Ayaat" className="w-28 px-2 py-1 text-xs border rounded" /></td>
                      <td className="px-3 py-2.5"><select value={e.performance || "good"} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], performance: ev.target.value } }))} className="px-2 py-1 text-xs border rounded"><option value="excellent">Excellent</option><option value="good">Good</option><option value="weak">Weak</option><option value="needs_attention">Needs Attention</option></select></td>
                      <td className="px-3 py-2.5"><select value={e.behaviour || "good"} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], behaviour: ev.target.value } }))} className="px-2 py-1 text-xs border rounded"><option value="good">Good</option><option value="normal">Normal</option><option value="naughty">Naughty</option></select></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}