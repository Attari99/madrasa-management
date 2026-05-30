import { useMemo, useState } from "react";
import { Download, BarChart3, Users, GraduationCap, School } from "lucide-react";
import { db, storage } from "@/utils/storage";
import type { Student, Ustad, StudentAttendance, UstadAttendance, MonthlyProgress, Class, ActivityLog } from "@/utils/storage";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function Reports() {
  const now = new Date();
  const [filterMonth, setFilterMonth] = useState<string>(String(now.getMonth()));
  const [activeTab, setActiveTab] = useState<"students" | "ustads" | "classes" | "history">("students");

  const students = db.getAll<Student>("students");
  const ustads = db.getAll<Ustad>("ustads");
  const classes = db.getAll<Class>("classes");
  const allStudentAtt = db.getAll<StudentAttendance>("student_attendance");
  const allUstadAtt = db.getAll<UstadAttendance>("ustad_attendance");
  const monthlyProgress = db.getAll<MonthlyProgress>("monthly_progress");
  const activityLogs = storage.get<ActivityLog[]>("activity_logs") ?? [];

  const studentAttendance = filterMonth === "all" ? allStudentAtt : allStudentAtt.filter(a => new Date(a.date).getMonth() === Number(filterMonth));
  const monthLabel = filterMonth === "all" ? "All Months" : MONTHS[Number(filterMonth)];

  const studentReport = students.map(s => {
    const att = studentAttendance.filter(a => a.studentId === s.id);
    const present = att.filter(a => a.status === "present").length;
    const total = att.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    const progress = monthlyProgress.filter(p => p.studentId === s.id).slice(-1)[0];
    return { ...s, present, absent: att.filter(a => a.status === "absent").length, total, rate, progress };
  });

  const downloadCSV = () => {
    const headers = ["Student Name", "Father Name", "Class", "Present", "Absent", "Attendance %", "Sipara", "Performance"];
    const rows = studentReport.map(s => [
      s.studentName, s.fatherName, classes.find(c => c.id === s.currentClass)?.className || "—",
      s.present, s.absent, `${s.rate}%`, s.progress?.currentSipara || "—", s.progress?.performance || "—"
    ]);
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-report-${monthLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-muted-foreground">Download reports</p>
        </div>
        <div className="flex gap-2">
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 border rounded">
            <option value="all">All Months</option>
            {MONTHS.map((m, idx) => <option key={m} value={String(idx)}>{m} {now.getFullYear()}</option>)}
          </select>
          <button onClick={downloadCSV} className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2">
            <Download className="w-4 h-4" /> Download CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab("students")} className={`px-4 py-2 ${activeTab === "students" ? "text-primary border-b-2 border-primary" : ""}`}>
          <GraduationCap className="w-3.5 h-3.5 inline mr-1" /> Students
        </button>
        <button onClick={() => setActiveTab("ustads")} className={`px-4 py-2 ${activeTab === "ustads" ? "text-primary border-b-2 border-primary" : ""}`}>
          <Users className="w-3.5 h-3.5 inline mr-1" /> Ustads
        </button>
        <button onClick={() => setActiveTab("classes")} className={`px-4 py-2 ${activeTab === "classes" ? "text-primary border-b-2 border-primary" : ""}`}>
          <School className="w-3.5 h-3.5 inline mr-1" /> Classes
        </button>
        <button onClick={() => setActiveTab("history")} className={`px-4 py-2 ${activeTab === "history" ? "text-primary border-b-2 border-primary" : ""}`}>
          <BarChart3 className="w-3.5 h-3.5 inline mr-1" /> History
        </button>
      </div>

      {activeTab === "students" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Student</th>
                  <th className="px-4 py-2 text-left">Class</th>
                  <th className="px-4 py-2 text-left">Present</th>
                  <th className="px-4 py-2 text-left">Absent</th>
                  <th className="px-4 py-2 text-left">Att%</th>
                  <th className="px-4 py-2 text-left">Sipara</th>
                  <th className="px-4 py-2 text-left">Performance</th>
                </tr>
              </thead>
              <tbody>
                {studentReport.map((s, i) => (
                  <tr key={s.id} className="border-b">
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{s.studentName}</td>
                    <td className="px-4 py-2">{classes.find(c => c.id === s.currentClass)?.className || "—"}</td>
                    <td className="px-4 py-2 text-green-600">{s.present}</td>
                    <td className="px-4 py-2 text-red-600">{s.absent}</td>
                    <td className="px-4 py-2 font-semibold">{s.rate}%</td>
                    <td className="px-4 py-2">{s.progress?.currentSipara || "—"}</td>
                    <td className="px-4 py-2 capitalize">{s.progress?.performance || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "ustads" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Ustad</th>
                  <th className="px-4 py-2 text-left">Class</th>
                  <th className="px-4 py-2 text-left">Phone</th>
                  <th className="px-4 py-2 text-left">Status</th>
                 </tr>
              </thead>
              <tbody>
                {ustads.map((u, i) => (
                  <tr key={u.id} className="border-b">
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{u.fullName}</td>
                    <td className="px-4 py-2">{classes.find(c => c.id === u.assignedClass)?.className || "—"}</td>
                    <td className="px-4 py-2">{u.phone}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-1 rounded-full text-xs ${u.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100"}`}>{u.status}</span></td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "classes" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classes.map((cls, i) => {
            const studentCount = students.filter(s => s.currentClass === cls.id).length;
            return (
              <div key={cls.id} className="bg-card rounded-xl border border-border p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <School className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground">{cls.className}</h3>
                    <p className="text-xs text-muted-foreground">Teacher: {ustads.find(u => u.id === cls.assignedTeacher)?.fullName || "Unassigned"}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Students</span>
                  <span className="text-lg font-bold text-primary">{studentCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="px-4 py-2 text-left">#</th>
                  <th className="px-4 py-2 text-left">Action</th>
                  <th className="px-4 py-2 text-left">Entity</th>
                  <th className="px-4 py-2 text-left">Date & Time</th>
                 </tr>
              </thead>
              <tbody>
                {activityLogs.slice(0, 50).map((log, i) => (
                  <tr key={log.id} className="border-b">
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2">{log.action}</td>
                    <td className="px-4 py-2 capitalize">{log.entity}</td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}