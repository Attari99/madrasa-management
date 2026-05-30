import { useMemo, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { CalendarCheck, GraduationCap, TrendingUp, Users, Key, Save, X, Eye, EyeOff, History, Bell, FileText, Calendar, Target, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { db, logActivity, storage } from "../../utils/storage";
import type { Student, Class, Ustad, UstadAttendance, User, StudentAttendance, MonthlyProgress, Notification, UstadTarget } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const todayStr = new Date().toISOString().split("T")[0];
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export default function UstadDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "students-attendance" | "progress" | "notifications" | "target">("overview");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const ustad = useMemo(() => {
    if (!user?.ustadId) return null;
    return db.getById<Ustad>("ustads", user.ustadId);
  }, [user]);

  const myClass = useMemo(() => {
    if (!ustad?.assignedClass) return null;
    return db.getById<Class>("classes", ustad.assignedClass);
  }, [ustad]);

  const myStudents = useMemo(() => {
    if (!ustad?.assignedClass) return [];
    return db.getAll<Student>("students").filter(s => s.currentClass === ustad.assignedClass && s.status === "active");
  }, [ustad]);

  const todayStudentAtt = useMemo(() => {
    const ids = new Set(myStudents.map(s => s.id));
    const att = db.getAll<StudentAttendance>("student_attendance").filter(a => a.date === todayStr && ids.has(a.studentId));
    return { present: att.filter(a => a.status === "present").length, absent: att.filter(a => a.status === "absent").length, total: myStudents.length };
  }, [myStudents]);

  const myTarget = useMemo(() => {
    const targets = db.getAll<UstadTarget>("ustad_targets");
    return targets.find(t => t.ustadId === user?.ustadId && t.month === currentMonth && t.year === currentYear);
  }, [user?.ustadId]);

  const currentProgress = useMemo(() => {
    const progressRecords = db.getAll<MonthlyProgress>("monthly_progress");
    const studentIds = myStudents.map(s => s.id);
    let totalSiparas = 0;
    for (const student of myStudents) {
      const prevMonthProgress = progressRecords.find(p => 
        p.studentId === student.id && p.month === (currentMonth === 1 ? 12 : currentMonth - 1) && p.year === (currentMonth === 1 ? currentYear - 1 : currentYear)
      );
      const currentMonthProg = progressRecords.find(p => 
        p.studentId === student.id && p.month === currentMonth && p.year === currentYear
      );
      const prevSipara = prevMonthProgress ? parseInt(prevMonthProgress.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
      const currentSipara = currentMonthProg ? parseInt(currentMonthProg.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
      totalSiparas += Math.max(0, currentSipara - prevSipara);
    }
    return totalSiparas;
  }, [myStudents]);

  const targetProgressPercent = myTarget ? Math.min(100, Math.round((currentProgress / myTarget.targetSiparas) * 100)) : 0;
  const targetStatus = myTarget ? (targetProgressPercent >= 100 ? "completed" : targetProgressPercent >= 50 ? "in-progress" : "behind") : "no-target";

  const myAttendanceHistory = useMemo(() => {
    if (!user?.ustadId) return [];
    const att = db.getAll<UstadAttendance>("ustad_attendance").filter(a => a.ustadId === user.ustadId);
    return att.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 20);
  }, [user?.ustadId]);

  const studentsAttendanceHistory = useMemo(() => {
    const studentIds = myStudents.map(s => s.id);
    if (studentIds.length === 0) return [];
    const allAttendance = db.getAll<StudentAttendance>("student_attendance");
    const filtered = allAttendance.filter(a => studentIds.includes(a.studentId));
    const grouped: Record<string, StudentAttendance[]> = {};
    filtered.forEach(att => {
      if (!grouped[att.date]) grouped[att.date] = [];
      grouped[att.date].push(att);
    });
    const sortedDates = Object.keys(grouped).sort().reverse();
    const result: { date: string; records: StudentAttendance[]; stats: { present: number; absent: number; leave: number } }[] = [];
    for (const date of sortedDates) {
      const records = grouped[date];
      const present = records.filter(r => r.status === "present").length;
      const absent = records.filter(r => r.status === "absent").length;
      const leave = records.filter(r => r.status === "leave").length;
      result.push({ date, records, stats: { present, absent, leave } });
    }
    return result;
  }, [myStudents]);

  const selectedStudentAttendance = useMemo(() => {
    if (!selectedStudentId) return [];
    const allAttendance = db.getAll<StudentAttendance>("student_attendance");
    return allAttendance.filter(a => a.studentId === selectedStudentId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [selectedStudentId]);

  const progressHistory = useMemo(() => {
    const studentIds = myStudents.map(s => s.id);
    const allProgress = db.getAll<MonthlyProgress>("monthly_progress");
    const filtered = allProgress.filter(p => studentIds.includes(p.studentId));
    const grouped: Record<string, MonthlyProgress[]> = {};
    filtered.forEach(p => {
      const key = `${p.month}/${p.year}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return grouped;
  }, [myStudents]);

  const myNotifications = useMemo(() => {
    const allNotifications = storage.get<Notification[]>("notifications") ?? [];
    return allNotifications
      .filter(n => n.recipient === "all" || n.recipient === user?.ustadId || n.recipient === ustad?.assignedClass)
      .sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime())
      .slice(0, 20);
  }, [user?.ustadId, ustad?.assignedClass]);

  const handleChangePassword = () => {
    setPasswordError("");
    setPasswordSuccess("");
    
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please fill all fields");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    
    const users = db.getAll<User>("users");
    const currentUser = users.find(u => u.id === user?.id);
    
    if (!currentUser || currentUser.password !== oldPassword) {
      setPasswordError("Old password is incorrect");
      return;
    }
    
    setIsLoading(true);
    db.update<User>("users", currentUser.id, { password: newPassword });
    const storedUser = storage.get<User>("currentUser");
    if (storedUser && storedUser.id === currentUser.id) {
      storage.set("currentUser", { ...storedUser, password: newPassword });
    }
    logActivity(`Ustad changed password`, "user", currentUser.id, user?.id || "");
    setPasswordSuccess("Password changed successfully! Please login again.");
    setTimeout(() => { setShowPasswordModal(false); logout(); }, 2000);
    setIsLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "present": return "bg-green-100 text-green-700";
      case "absent": return "bg-red-100 text-red-700";
      case "leave": return "bg-amber-100 text-amber-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const statCards = [
    { label: "My Students", value: myStudents.length, icon: GraduationCap, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Present Today", value: todayStudentAtt.present, icon: CalendarCheck, color: "text-green-600", bg: "bg-green-50" },
    { label: "Absent Today", value: todayStudentAtt.absent, icon: Users, color: "text-red-600", bg: "bg-red-50" },
    { label: "Target Progress", value: `${targetProgressPercent}%`, icon: Target, color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">السلام علیکم، {user?.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Class: <span className="font-medium">{myClass?.className ?? "Not assigned"}</span>
            {" • "}
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
          </p>
        </div>
        <button onClick={() => setShowPasswordModal(true)} className="flex items-center gap-2 px-4 py-2 border border-input rounded-lg hover:bg-accent">
          <Key className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Change Password</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={s.label} className="bg-card rounded-2xl p-5 border border-border">
            <div className="flex items-start justify-between">
              <div><p className="text-xs text-muted-foreground mb-1">{s.label}</p><p className="text-3xl font-bold">{s.value}</p></div>
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            </div>
          </div>
        ))}
      </div>

      {myTarget && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2"><Target className="w-5 h-5 text-primary" /><span className="font-semibold">Monthly Target: {myTarget.targetSiparas} Sipara{myTarget.targetSiparas !== 1 ? "s" : ""}</span></div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${targetStatus === "completed" ? "bg-green-100 text-green-700" : targetStatus === "in-progress" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
              {targetStatus === "completed" ? "✓ Completed" : targetStatus === "in-progress" ? "In Progress" : "Behind Target"}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3"><div className={`h-3 rounded-full transition-all duration-500 ${targetProgressPercent >= 100 ? "bg-green-500" : targetProgressPercent >= 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${targetProgressPercent}%` }} /></div>
          <div className="flex justify-between mt-2 text-sm"><span>Completed: {currentProgress} sipara{currentProgress !== 1 ? "s" : ""}</span><span>Target: {myTarget.targetSiparas} sipara{myTarget.targetSiparas !== 1 ? "s" : ""}</span><span className="font-semibold">{targetProgressPercent}% Complete</span></div>
        </div>
      )}

      <div className="flex gap-2 border-b border-border flex-wrap">
        <button onClick={() => setActiveTab("overview")} className={`px-4 py-2 text-sm font-medium ${activeTab === "overview" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}>Overview</button>
        <button onClick={() => setActiveTab("target")} className={`px-4 py-2 text-sm font-medium ${activeTab === "target" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}><Target className="w-3.5 h-3.5 inline mr-1" /> My Target</button>
        <button onClick={() => setActiveTab("attendance")} className={`px-4 py-2 text-sm font-medium ${activeTab === "attendance" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}><History className="w-3.5 h-3.5 inline mr-1" /> My Attendance</button>
        <button onClick={() => setActiveTab("students-attendance")} className={`px-4 py-2 text-sm font-medium ${activeTab === "students-attendance" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}><Users className="w-3.5 h-3.5 inline mr-1" /> Students Attendance</button>
        <button onClick={() => setActiveTab("progress")} className={`px-4 py-2 text-sm font-medium ${activeTab === "progress" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}><TrendingUp className="w-3.5 h-3.5 inline mr-1" /> Progress</button>
        <button onClick={() => setActiveTab("notifications")} className={`px-4 py-2 text-sm font-medium ${activeTab === "notifications" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}><Bell className="w-3.5 h-3.5 inline mr-1" /> Notifications ({myNotifications.length})</button>
      </div>

      {activeTab === "target" && (
        <div className="bg-card rounded-xl border border-border p-6 space-y-5">
          <h2 className="text-xl font-bold flex items-center gap-2"><Target className="w-6 h-6 text-primary" /> My Monthly Target</h2>
          {myTarget ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-primary/5 rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">Target Siparas</p><p className="text-3xl font-bold text-primary">{myTarget.targetSiparas}</p></div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">Completed Siparas</p><p className="text-3xl font-bold text-green-600">{currentProgress}</p></div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center"><p className="text-sm text-muted-foreground">Remaining Siparas</p><p className="text-3xl font-bold text-blue-600">{Math.max(0, myTarget.targetSiparas - currentProgress)}</p></div>
              </div>
              <div className="space-y-2"><div className="flex justify-between text-sm"><span>Overall Progress</span><span className="font-semibold">{targetProgressPercent}%</span></div><div className="w-full bg-gray-200 rounded-full h-4"><div className={`h-4 rounded-full transition-all ${targetProgressPercent >= 100 ? "bg-green-500" : targetProgressPercent >= 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${targetProgressPercent}%` }} /></div></div>
              <div className={`p-4 rounded-xl ${targetStatus === "completed" ? "bg-green-50 border border-green-200" : targetStatus === "in-progress" ? "bg-blue-50 border border-blue-200" : "bg-amber-50 border border-amber-200"}`}>
                <div className="flex items-center gap-2">{targetStatus === "completed" ? <CheckCircle className="w-5 h-5 text-green-600" /> : targetStatus === "in-progress" ? <TrendingUp className="w-5 h-5 text-blue-600" /> : <AlertCircle className="w-5 h-5 text-amber-600" />}
                  <span className="font-medium">{targetStatus === "completed" ? "Congratulations! You have achieved your monthly target!" : targetStatus === "in-progress" ? "Good progress! Keep working to achieve your target." : "You are behind your target. Try to cover more siparas this month."}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12"><Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No target set for this month yet.</p><p className="text-sm text-muted-foreground mt-2">Admin will set your monthly target.</p></div>
          )}
          <div className="border-t pt-4 mt-2"><h3 className="font-semibold mb-3">📖 Sipara Completion Details</h3><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left py-2">Student</th><th className="text-left py-2">Last Month Sipara</th><th className="text-left py-2">Current Sipara</th><th className="text-left py-2">Progress</th></tr></thead><tbody>{myStudents.map(student => { const progressRecords = db.getAll<MonthlyProgress>("monthly_progress"); const prevMonth = progressRecords.find(p => p.studentId === student.id && p.month === (currentMonth === 1 ? 12 : currentMonth - 1) && p.year === (currentMonth === 1 ? currentYear - 1 : currentYear)); const currentMonthProg = progressRecords.find(p => p.studentId === student.id && p.month === currentMonth && p.year === currentYear); const prevSipara = prevMonth ? parseInt(prevMonth.currentSipara?.match(/\d+/)?.[0] || "0") : 0; const currentSipara = currentMonthProg ? parseInt(currentMonthProg.currentSipara?.match(/\d+/)?.[0] || "0") : 0; const progress = currentSipara - prevSipara; return (<tr key={student.id} className="border-b"><td className="py-2 font-medium">{student.studentName}</td><td className="py-2">{prevSipara > 0 ? `Para ${prevSipara}` : "Not started"}</td><td className="py-2">{currentSipara > 0 ? `Para ${currentSipara}` : "Not recorded"}</td><td className="py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${progress > 0 ? "bg-green-100 text-green-700" : progress === 0 ? "bg-gray-100 text-gray-700" : "bg-red-100 text-red-700"}`}>{progress > 0 ? `+${progress}` : progress}</span></td></tr>); })}</tbody></table></div></div>
        </div>
      )}

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-border p-5"><h3 className="font-semibold mb-3">Quick Actions</h3><div className="space-y-2"><Link href="/ustad-attendance"><button className="w-full text-left px-4 py-2 bg-accent hover:bg-primary/10 rounded-lg"><CalendarCheck className="w-4 h-4 inline mr-2 text-primary" /> Mark Attendance</button></Link><Link href="/ustad-progress"><button className="w-full text-left px-4 py-2 bg-accent hover:bg-primary/10 rounded-lg"><TrendingUp className="w-4 h-4 inline mr-2 text-primary" /> Update Progress</button></Link></div></div>
            <div className="bg-card rounded-xl border border-border p-5"><h3 className="font-semibold mb-3">Today's Summary</h3><div className="flex justify-around text-center"><div><p className="text-2xl font-bold text-green-600">{todayStudentAtt.present}</p><p className="text-xs">Present</p></div><div><p className="text-2xl font-bold text-red-600">{todayStudentAtt.absent}</p><p className="text-xs">Absent</p></div><div><p className="text-2xl font-bold text-primary">{myStudents.length}</p><p className="text-xs">Total</p></div></div></div>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden"><div className="px-5 py-3 border-b"><h3 className="font-semibold">My Students</h3></div>{myStudents.length === 0 ? (<div className="py-12 text-center text-sm">No students in your class</div>) : (<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/20"><th className="text-left px-4 py-2.5">#</th><th className="text-left px-4 py-2.5">Name</th><th className="text-left px-4 py-2.5">Father</th><th className="text-left px-4 py-2.5">Today's Status</th><th className="text-left px-4 py-2.5">Action</th></tr></thead><tbody>{myStudents.map((s, i) => { const todayAtt = db.getAll<StudentAttendance>("student_attendance").find(a => a.studentId === s.id && a.date === todayStr); return (<tr key={s.id} className="border-b"><td className="px-4 py-2.5">{i+1}</td><td className="px-4 py-2.5 font-medium">{s.studentName}</td><td className="px-4 py-2.5 text-muted-foreground">{s.fatherName}</td><td className="px-4 py-2.5">{todayAtt ? (<span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(todayAtt.status)}`}>{todayAtt.status}</span>) : <span className="text-xs text-muted-foreground">Not marked</span>}</td><td className="px-4 py-2.5"><button onClick={() => { setSelectedStudentId(s.id); setActiveTab("students-attendance"); }} className="text-xs text-primary hover:underline">View History</button></td></tr>); })}</tbody></table></div>)}</div>
        </>
      )}

      {activeTab === "attendance" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden"><div className="px-5 py-3 border-b bg-muted/20"><h3 className="font-semibold">My Attendance History</h3></div>{myAttendanceHistory.length === 0 ? (<div className="py-12 text-center text-muted-foreground">No attendance records found</div>) : (<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b bg-muted/10"><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Dress</th><th className="text-left px-4 py-3">Arrival</th><th className="text-left px-4 py-3">Exit</th></tr></thead><tbody>{myAttendanceHistory.map((att) => { const dressLabels: Record<string, string> = { white_suit_imama: "White Suit + Imama", white_suit: "White Suit Only", imama: "Imama Only", incomplete: "Incomplete" }; return (<tr key={att.id} className="border-b"><td className="px-4 py-3 font-medium">{new Date(att.date).toLocaleDateString("en-GB")}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(att.status)}`}>{att.status}</span></td><td className="px-4 py-3">{dressLabels[att.dressStatus] || att.dressStatus}</td><td className="px-4 py-3">{att.arrivalTime || "—"}</td><td className="px-4 py-3">{att.exitTime || "—"}</td></tr>); })}</tbody></table></div>)}</div>
      )}

      {activeTab === "students-attendance" && (
        <div className="space-y-5"><div className="bg-card rounded-xl border border-border p-4"><label className="text-sm font-medium mb-2 block">Select Student</label><select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="w-full md:w-64 px-3 py-2 border border-input rounded-lg bg-background"><option value="">-- Select Student --</option>{myStudents.map(s => <option key={s.id} value={s.id}>{s.studentName}</option>)}</select></div>
        {selectedStudentId ? (<div className="bg-card rounded-xl border border-border overflow-hidden"><div className="px-5 py-3 border-b bg-muted/20"><h3 className="font-semibold">{myStudents.find(s => s.id === selectedStudentId)?.studentName}'s Attendance</h3></div>{selectedStudentAttendance.length === 0 ? (<div className="py-12 text-center text-muted-foreground">No records found</div>) : (<div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left px-4 py-3">Date</th><th className="text-left px-4 py-3">Status</th></tr></thead><tbody>{selectedStudentAttendance.map(att => (<tr key={att.id} className="border-b"><td className="px-4 py-3 font-medium">{new Date(att.date).toLocaleDateString("en-GB")}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(att.status)}`}>{att.status}</span></td></tr>))}</tbody></table></div>)}</div>) : (<div className="bg-card rounded-xl border border-border overflow-hidden"><div className="px-5 py-3 border-b bg-muted/20"><h3 className="font-semibold">All Students Attendance</h3></div>{studentsAttendanceHistory.length === 0 ? (<div className="py-12 text-center text-muted-foreground">No records found</div>) : (studentsAttendanceHistory.map(({ date, records, stats }) => (<div key={date} className="border-b border-border last:border-b-0"><div className="px-5 py-3 bg-muted/10"><div className="flex justify-between items-center"><span className="font-semibold">{new Date(date).toLocaleDateString("en-GB")}</span><div className="flex gap-3 text-sm"><span className="text-green-600">P: {stats.present}</span><span className="text-red-600">A: {stats.absent}</span><span className="text-amber-600">L: {stats.leave}</span></div></div></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left px-4 py-2">Student</th><th className="text-left px-4 py-2">Status</th></tr></thead><tbody>{records.map(record => { const student = myStudents.find(s => s.id === record.studentId); return (<tr key={record.id} className="border-b"><td className="px-4 py-2 font-medium">{student?.studentName || "Unknown"}</td><td className="px-4 py-2"><span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(record.status)}`}>{record.status}</span></td></tr>); })}</tbody></table></div></div>)))}</div>)}</div>
      )}

      {activeTab === "progress" && (
        <div className="space-y-5">{Object.keys(progressHistory).length === 0 ? (<div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">No progress records found</div>) : (Object.entries(progressHistory).sort().reverse().map(([key, records]) => { const [month, year] = key.split("/"); const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; return (<div key={key} className="bg-card rounded-xl border border-border overflow-hidden"><div className="px-5 py-3 border-b bg-muted/20"><h3 className="font-semibold">{monthNames[parseInt(month)-1]} {year}</h3></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b"><th className="text-left px-4 py-2">Student</th><th className="text-left px-4 py-2">Sipara</th><th className="text-left px-4 py-2">Lesson</th><th className="text-left px-4 py-2">Performance</th><th className="text-left px-4 py-2">Behaviour</th></tr></thead><tbody>{records.map(record => { const student = myStudents.find(s => s.id === record.studentId); return (<tr key={record.id} className="border-b"><td className="px-4 py-2 font-medium">{student?.studentName || "Unknown"}</td><td className="px-4 py-2">{record.currentSipara || "—"}</td><td className="px-4 py-2">{record.monthlyLesson || "—"}</td><td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${record.performance === "excellent" ? "bg-green-100 text-green-700" : record.performance === "good" ? "bg-blue-100 text-blue-700" : record.performance === "weak" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{record.performance}</span></td><td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs capitalize ${record.behaviour === "good" ? "bg-green-100 text-green-700" : record.behaviour === "normal" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>{record.behaviour}</span></td></tr>); })}</tbody></table></div></div>); }))}</div>
      )}

      {activeTab === "notifications" && (
        <div className="bg-card rounded-xl border border-border overflow-hidden"><div className="px-5 py-3 border-b bg-muted/20"><h3 className="font-semibold">Notifications</h3></div>{myNotifications.length === 0 ? (<div className="py-12 text-center text-muted-foreground">No notifications found</div>) : (<div className="divide-y divide-border">{myNotifications.map(notif => (<div key={notif.id} className="px-5 py-4 hover:bg-accent/30"><p className="text-sm text-foreground">{notif.message}</p><p className="text-xs text-muted-foreground mt-1">{new Date(notif.sentAt).toLocaleString()}</p></div>))}</div>)}</div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-bold">Change Password</h2><button onClick={() => setShowPasswordModal(false)} className="p-1 hover:bg-accent rounded"><X className="w-5 h-5" /></button></div>
            {passwordError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{passwordError}</div>}
            {passwordSuccess && <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm">{passwordSuccess}</div>}
            <div className="space-y-4">
              <div><label className="text-sm font-medium">Old Password</label><div className="relative mt-1"><input type={showOldPassword ? "text" : "password"} value={oldPassword} onChange={e => setOldPassword(e.target.value)} className="w-full px-3 py-2 border rounded pr-10" /><button type="button" onClick={() => setShowOldPassword(!showOldPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
              <div><label className="text-sm font-medium">New Password</label><div className="relative mt-1"><input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-3 py-2 border rounded pr-10" /><button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div><p className="text-xs text-muted-foreground mt-1">Minimum 6 characters</p></div>
              <div><label className="text-sm font-medium">Confirm Password</label><div className="relative mt-1"><input type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full px-3 py-2 border rounded pr-10" /><button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">{showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
            </div>
            <div className="flex gap-3 mt-6"><button onClick={handleChangePassword} disabled={isLoading} className="flex-1 bg-primary text-primary-foreground py-2 rounded font-medium disabled:opacity-50">{isLoading ? "Changing..." : "Change Password"}</button><button onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border rounded">Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}