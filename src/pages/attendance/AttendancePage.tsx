import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CheckSquare, Clock, Shirt } from "lucide-react";
import { db, generateId, logActivity, storage } from "../../utils/storage";
import type { Student, Ustad, StudentAttendance, UstadAttendance, Class } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const today = new Date().toISOString().split("T")[0];
type DressStatus = "white_suit_imama" | "white_suit" | "imama" | "incomplete";

const dressLabel: Record<DressStatus, string> = {
  white_suit_imama: "White Suit + Imama",
  white_suit: "Only White Suit",
  imama: "Only Imama",
  incomplete: "Incomplete",
};

export default function AttendancePage() {
  const { user } = useAuth();
  const [date, setDate] = useState(today);
  const [activeTab, setActiveTab] = useState<"students" | "ustads">("students");
  const [saveMessage, setSaveMessage] = useState<{ type: string; text: string } | null>(null);

  const students = db.getAll<Student>("students").filter(s => s.status === "active");
  const ustads = db.getAll<Ustad>("ustads").filter(u => u.status === "active");
  const classes = db.getAll<Class>("classes");

  const [studentAtt, setStudentAtt] = useState<Record<string, "present" | "absent" | "leave">>(() => {
    const existing = db.getAll<StudentAttendance>("student_attendance").filter(a => a.date === date);
    const map: Record<string, any> = {};
    students.forEach(s => { map[s.id] = "present"; });
    existing.forEach(a => { map[a.studentId] = a.status; });
    return map;
  });

  const [ustadAtt, setUstadAtt] = useState<Record<string, { status: string; dressStatus: DressStatus; arrivalTime: string; exitTime: string }>>(() => {
    const existing = db.getAll<UstadAttendance>("ustad_attendance").filter(a => a.date === date);
    const map: Record<string, any> = {};
    ustads.forEach(u => { map[u.id] = { status: "present", dressStatus: "white_suit_imama", arrivalTime: "07:30", exitTime: "13:30" }; });
    existing.forEach(a => { map[a.ustadId] = { status: a.status, dressStatus: a.dressStatus, arrivalTime: a.arrivalTime, exitTime: a.exitTime }; });
    return map;
  });

  const saveStudentAttendance = () => {
    const all = storage.get<StudentAttendance[]>("student_attendance") ?? [];
    const filtered = all.filter(a => a.date !== date);
    const newEntries: StudentAttendance[] = students.map(s => ({
      id: generateId(),
      studentId: s.id,
      date: date,
      status: studentAtt[s.id] ?? "present"
    }));
    storage.set("student_attendance", [...filtered, ...newEntries]);
    logActivity(`Saved student attendance for ${date}`, "attendance", date, user?.id || "");
    setSaveMessage({ type: "success", text: `${newEntries.length} student attendance records saved for ${date}!` });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const saveUstadAttendance = () => {
    const all = storage.get<UstadAttendance[]>("ustad_attendance") ?? [];
    const filtered = all.filter(a => a.date !== date);
    const newEntries: UstadAttendance[] = ustads.map(u => {
      const existing = ustadAtt[u.id];
      return {
        id: generateId(),
        ustadId: u.id,
        date,
        status: (existing?.status as "present" | "absent" | "leave") ?? "present",
        dressStatus: existing?.dressStatus ?? "white_suit_imama",
        arrivalTime: existing?.arrivalTime ?? "07:30",
        exitTime: existing?.exitTime ?? "13:30",
      };
    });
    storage.set("ustad_attendance", [...filtered, ...newEntries]);
    logActivity(`Saved ustad attendance for ${date}`, "attendance", date, user?.id || "");
    setSaveMessage({ type: "success", text: `${newEntries.length} ustad attendance records saved for ${date}!` });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const markAllPresent = () => {
    const map: Record<string, any> = {};
    students.forEach(s => { map[s.id] = "present"; });
    setStudentAtt(map);
  };

  const studentStats = useMemo(() => {
    const vals = Object.values(studentAtt);
    return { present: vals.filter(v => v === "present").length, absent: vals.filter(v => v === "absent").length, leave: vals.filter(v => v === "leave").length };
  }, [studentAtt]);

  const attBtnClass = (active: boolean, type: string) => {
    if (!active) return "bg-transparent border-border text-muted-foreground hover:bg-accent";
    return type === "present" ? "bg-green-100 border-green-400 text-green-700" : type === "absent" ? "bg-red-100 border-red-400 text-red-700" : "bg-amber-100 border-amber-400 text-amber-700";
  };

  return (
    <div className="space-y-5">
      {saveMessage && (
        <div className={`p-3 rounded-lg ${saveMessage.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {saveMessage.text}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground">Mark daily attendance</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">Date:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setActiveTab("students")} className={`px-4 py-2 text-sm font-medium ${activeTab === "students" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          Students ({students.length})
        </button>
        <button onClick={() => setActiveTab("ustads")} className={`px-4 py-2 text-sm font-medium ${activeTab === "ustads" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          Ustads ({ustads.length})
        </button>
      </div>

      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-4 text-sm">
              <span className="text-green-600">Present: {studentStats.present}</span>
              <span className="text-red-600">Absent: {studentStats.absent}</span>
              <span className="text-amber-600">Leave: {studentStats.leave}</span>
            </div>
            <button onClick={markAllPresent} className="px-3 py-1.5 border border-input rounded-lg text-sm hover:bg-accent">
              <CheckSquare className="w-3.5 h-3.5 inline mr-1" />Mark All Present
            </button>
            <button onClick={saveStudentAttendance} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
              <CalendarCheck className="w-3.5 h-3.5 inline mr-1" />Save Student Attendance
            </button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Student</th>
                    <th className="text-left px-4 py-3">Class</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => (
                    <tr key={s.id} className="border-b border-border/50">
                      <td className="px-4 py-3">{i+1}</td>
                      <td className="px-4 py-3 font-medium">{s.studentName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{classes.find(c=>c.id===s.currentClass)?.className || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {(["present","absent","leave"] as const).map(status => (
                            <button 
                              key={status} 
                              onClick={() => setStudentAtt(prev => ({ ...prev, [s.id]: status }))} 
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${attBtnClass(studentAtt[s.id] === status, status)}`}
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "ustads" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={saveUstadAttendance} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm">
              <CalendarCheck className="w-3.5 h-3.5 inline mr-1" />Save Ustad Attendance
            </button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3">#</th>
                    <th className="text-left px-4 py-3">Ustad</th>
                    <th className="text-left px-4 py-3">Class</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Dress</th>
                    <th className="text-left px-4 py-3">Arrival</th>
                    <th className="text-left px-4 py-3">Exit</th>
                  </tr>
                </thead>
                <tbody>
                  {ustads.map((u, i) => {
                    const entry = ustadAtt[u.id] ?? { status: "present", dressStatus: "white_suit_imama", arrivalTime: "07:30", exitTime: "13:30" };
                    return (
                      <tr key={u.id} className="border-b border-border/50">
                        <td className="px-4 py-3">{i+1}</td>
                        <td className="px-4 py-3 font-medium">{u.fullName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{classes.find(c=>c.id===u.assignedClass)?.className || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {(["present","absent","leave"] as const).map(status => (
                              <button 
                                key={status} 
                                onClick={() => setUstadAtt(prev => ({ ...prev, [u.id]: { ...entry, status } }))} 
                                className={`px-2 py-0.5 rounded-md text-xs font-medium border ${attBtnClass(entry.status === status, status)}`}
                              >
                                {status === "present" ? "P" : status === "absent" ? "A" : "L"}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select 
                            value={entry.dressStatus} 
                            onChange={e => setUstadAtt(prev => ({ ...prev, [u.id]: { ...entry, dressStatus: e.target.value as DressStatus } }))} 
                            className="px-2 py-1 text-xs border border-input rounded"
                          >
                            <option value="white_suit_imama">Full</option>
                            <option value="white_suit">Suit</option>
                            <option value="imama">Imama</option>
                            <option value="incomplete">Inc</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="time" 
                            value={entry.arrivalTime} 
                            onChange={e => setUstadAtt(prev => ({ ...prev, [u.id]: { ...entry, arrivalTime: e.target.value } }))} 
                            className="px-2 py-1 text-xs border border-input rounded w-24" 
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input 
                            type="time" 
                            value={entry.exitTime} 
                            onChange={e => setUstadAtt(prev => ({ ...prev, [u.id]: { ...entry, exitTime: e.target.value } }))} 
                            className="px-2 py-1 text-xs border border-input rounded w-24" 
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}