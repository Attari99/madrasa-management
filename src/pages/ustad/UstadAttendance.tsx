import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { CalendarCheck, CheckSquare, User, Users, Clock, Shirt } from "lucide-react";
import { db, generateId, logActivity, storage } from "../../utils/storage";
import type { Student, StudentAttendance, Ustad, UstadAttendance as UAttType } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const todayStr = new Date().toISOString().split("T")[0];
type DressStatus = "white_suit_imama" | "white_suit" | "imama" | "incomplete";

const dressLabels: Record<DressStatus, string> = {
  white_suit_imama: "White Suit + Imama",
  white_suit: "White Suit Only",
  imama: "Imama Only",
  incomplete: "Incomplete",
};

export default function UstadAttendancePage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayStr);
  const [activeTab, setActiveTab] = useState<"self" | "students">("self");

  const ustad = useMemo(() => {
    if (!user?.ustadId) return null;
    return db.getById<Ustad>("ustads", user.ustadId);
  }, [user]);

  const myStudents = useMemo(() => {
    if (!ustad?.assignedClass) return [];
    return db.getAll<Student>("students").filter(s => s.currentClass === ustad.assignedClass && s.status === "active");
  }, [ustad]);

  const getMyAtt = (d: string) => db.getAll<UAttType>("ustad_attendance").find(a => a.ustadId === user?.ustadId && a.date === d);

  const [selfAtt, setSelfAtt] = useState<{ 
    status: "present" | "absent" | "leave"; 
    dressStatus: DressStatus; 
    arrivalTime: string; 
    exitTime: string 
  }>(() => {
    const ex = getMyAtt(todayStr);
    return ex ? { 
      status: ex.status, 
      dressStatus: ex.dressStatus, 
      arrivalTime: ex.arrivalTime, 
      exitTime: ex.exitTime 
    } : { 
      status: "present", 
      dressStatus: "white_suit_imama", 
      arrivalTime: "07:30", 
      exitTime: "13:30" 
    };
  });

  const [studentAtt, setStudentAtt] = useState<Record<string, "present" | "absent" | "leave">>(() => {
    const existing = db.getAll<StudentAttendance>("student_attendance").filter(a => a.date === todayStr);
    const map: Record<string, any> = {};
    myStudents.forEach(s => { map[s.id] = "present"; });
    existing.forEach(a => { if (map[a.studentId] !== undefined) map[a.studentId] = a.status; });
    return map;
  });

  const saveSelfAttendance = () => {
    if (!user?.ustadId) return;
    const all = storage.get<UAttType[]>("ustad_attendance") ?? [];
    const filtered = all.filter(a => !(a.ustadId === user.ustadId && a.date === date));
    const entry: UAttType = { 
      id: generateId(), 
      ustadId: user.ustadId, 
      date, 
      status: selfAtt.status,
      dressStatus: selfAtt.dressStatus,
      arrivalTime: selfAtt.arrivalTime,
      exitTime: selfAtt.exitTime
    };
    storage.set("ustad_attendance", [...filtered, entry]);
    logActivity(`Ustad marked own attendance: ${selfAtt.status}, Dress: ${dressLabels[selfAtt.dressStatus]}, Time: ${selfAtt.arrivalTime} - ${selfAtt.exitTime}`, "attendance", date, user.id ?? "");
    alert("Your attendance saved with dress and time!");
  };

  const saveStudentAttendance = () => {
    const all = storage.get<StudentAttendance[]>("student_attendance") ?? [];
    const myIds = new Set(myStudents.map(s => s.id));
    const filtered = all.filter(a => !(a.date === date && myIds.has(a.studentId)));
    const newEntries: StudentAttendance[] = myStudents.map(s => ({ 
      id: generateId(), 
      studentId: s.id, 
      date, 
      status: studentAtt[s.id] ?? "present" 
    }));
    storage.set("student_attendance", [...filtered, ...newEntries]);
    logActivity(`Ustad saved class attendance for ${date}`, "attendance", date, user?.id ?? "");
    alert("Class attendance saved!");
  };

  const markAllPresent = () => {
    const map: Record<string, any> = {};
    myStudents.forEach(s => { map[s.id] = "present"; });
    setStudentAtt(map);
  };

  const studentStats = useMemo(() => {
    const vals = Object.values(studentAtt);
    return { present: vals.filter(v => v === "present").length, absent: vals.filter(v => v === "absent").length, leave: vals.filter(v => v === "leave").length };
  }, [studentAtt]);

  const statusColor = { 
    present: "bg-green-100 border-green-400 text-green-700 dark:bg-green-900/30 dark:text-green-400", 
    absent: "bg-red-100 border-red-400 text-red-700 dark:bg-red-900/30 dark:text-red-400", 
    leave: "bg-amber-100 border-amber-400 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" 
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-foreground">Ustad Attendance</h1><p className="text-sm text-muted-foreground">Mark your attendance with dress and time</p></div>
        <div className="flex items-center gap-2"><label className="text-sm font-medium">Date:</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background" /></div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setActiveTab("self")} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${activeTab === "self" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          <User className="w-4 h-4" /> My Attendance (Dress + Time)
        </button>
        <button onClick={() => setActiveTab("students")} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${activeTab === "students" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>
          <Users className="w-4 h-4" /> Class Attendance
        </button>
      </div>

      {/* My Attendance Tab - With Dress and Time */}
      {activeTab === "self" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h3 className="text-lg font-semibold text-foreground">My Attendance Details</h3>
          
          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Attendance Status</label>
            <div className="flex gap-3 flex-wrap">
              {(["present", "absent", "leave"] as const).map(s => (
                <button key={s} onClick={() => setSelfAtt(prev => ({ ...prev, status: s }))} 
                  className={`px-5 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${selfAtt.status === s ? statusColor[s] : "border-border text-muted-foreground hover:bg-accent"}`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Dress Status - White Suit + Imama */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Shirt className="w-4 h-4 text-primary" /> Dress Status
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(Object.entries(dressLabels) as [DressStatus, string][]).map(([key, label]) => (
                <button key={key} onClick={() => setSelfAtt(prev => ({ ...prev, dressStatus: key }))}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border-2 transition-all text-center ${selfAtt.dressStatus === key ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-accent"}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual Time */}
          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Arrival Time</label>
              <input type="time" value={selfAtt.arrivalTime} onChange={e => setSelfAtt(prev => ({ ...prev, arrivalTime: e.target.value }))} 
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Exit Time</label>
              <input type="time" value={selfAtt.exitTime} onChange={e => setSelfAtt(prev => ({ ...prev, exitTime: e.target.value }))} 
                className="w-full px-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Summary Card */}
          <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
            <p className="text-sm font-medium text-foreground">Today's Summary:</p>
            <div className="flex flex-wrap gap-4 mt-2">
              <span className="text-sm">Status: <span className={`font-semibold ${selfAtt.status === "present" ? "text-green-600" : selfAtt.status === "absent" ? "text-red-600" : "text-amber-600"}`}>{selfAtt.status}</span></span>
              <span className="text-sm">Dress: <span className="font-semibold text-primary">{dressLabels[selfAtt.dressStatus]}</span></span>
              <span className="text-sm">Time: <span className="font-semibold">{selfAtt.arrivalTime} - {selfAtt.exitTime}</span></span>
            </div>
          </div>

          <button onClick={saveSelfAttendance} className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all flex items-center justify-center gap-2">
            <CalendarCheck className="w-5 h-5" /> Save My Attendance (Dress + Time)
          </button>
        </motion.div>
      )}

      {/* Class Attendance Tab */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex gap-4 text-sm"><span className="text-green-600">Present: {studentStats.present}</span><span className="text-red-600">Absent: {studentStats.absent}</span><span className="text-amber-600">Leave: {studentStats.leave}</span></div>
            <button onClick={markAllPresent} className="px-3 py-1.5 border border-input rounded-lg text-sm hover:bg-accent"><CheckSquare className="w-3.5 h-3.5 inline mr-1" />Mark All Present</button>
            <button onClick={saveStudentAttendance} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm"><CalendarCheck className="w-3.5 h-3.5 inline mr-1" />Save Class Attendance</button>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/30"><th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Student</th><th className="text-left px-4 py-3">Status</th></tr></thead>
                <tbody>{myStudents.map((s, i) => (<tr key={s.id} className="border-b border-border/50"><td className="px-4 py-3">{i+1}</td><td className="px-4 py-3 font-medium">{s.studentName}</td><td className="px-4 py-3"><div className="flex gap-2">{(["present","absent","leave"] as const).map(status => (<button key={status} onClick={() => setStudentAtt(prev => ({ ...prev, [s.id]: status }))} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${studentAtt[s.id] === status ? statusColor[status] : "bg-transparent border-border text-muted-foreground hover:bg-accent"}`}>{status}</button>))}</div></td></tr>))}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}