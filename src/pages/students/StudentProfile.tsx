import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Phone, MapPin, Calendar, User, School, BookOpen, CheckCircle, XCircle, Save } from "lucide-react";
import { db, logActivity } from "../../utils/storage";
import type { Student, Class, Ustad, StudentAttendance, MonthlyProgress } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

interface Props { id: string }

export default function StudentProfile({ id }: Props) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [isEditingClass, setIsEditingClass] = useState(false);
  const [selectedClass, setSelectedClass] = useState("");
  
  const student = db.getById<Student>("students", id);
  const classes = db.getAll<Class>("classes");
  const ustads = db.getAll<Ustad>("ustads");
  const attendance = db.getAll<StudentAttendance>("student_attendance").filter(a => a.studentId === id);
  const progress = db.getAll<MonthlyProgress>("monthly_progress").filter(p => p.studentId === id).slice(-1)[0];

  const className = classes.find(c => c.id === student?.currentClass)?.className || "—";
  const teacherName = ustads.find(u => u.id === student?.assignedTeacher)?.fullName || "—";

  const summary = useMemo(() => {
    const present = attendance.filter(a => a.status === "present").length;
    const absent = attendance.filter(a => a.status === "absent").length;
    const leave = attendance.filter(a => a.status === "leave").length;
    const total = attendance.length;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, absent, leave, total, rate };
  }, [attendance]);

  const handleClassChange = () => {
    if (!selectedClass || !student) return;
    db.update<Student>("students", id, { currentClass: selectedClass });
    logActivity(`Changed student ${student.studentName}'s class to ${classes.find(c=>c.id===selectedClass)?.className}`, "student", id, user?.id || "");
    setIsEditingClass(false);
    window.location.reload();
  };

  if (!student) return <div className="text-center py-16">Student not found.</div>;

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><button onClick={()=>setLocation("/students")} className="p-2 hover:bg-accent rounded-lg"><ArrowLeft className="w-5 h-5" /></button><h1 className="text-2xl font-bold text-foreground">Student Profile</h1></div>
        <Link href={`/students/${id}/edit`}><button className="px-4 py-2 border border-input rounded-lg text-sm flex items-center gap-2 hover:bg-accent"><Pencil className="w-4 h-4" /> Edit Student</button></Link>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6">
          <div className="flex items-start gap-5"><div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center"><User className="w-10 h-10 text-primary" /></div>
          <div className="flex-1"><div className="flex items-start justify-between flex-wrap gap-3"><div><h2 className="text-2xl font-bold text-foreground">{student.studentName}</h2><p className="text-muted-foreground">S/O {student.fatherName}</p></div><span className={`px-3 py-1 rounded-full text-sm font-medium ${student.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>{student.status === "active" ? <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> : <XCircle className="w-3.5 h-3.5 inline mr-1" />}{student.status}</span></div></div></div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4"><h3 className="text-sm font-semibold text-muted-foreground uppercase">Personal Information</h3>
          <div className="flex gap-3"><Phone className="w-4 h-4 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Guardian Phone</p><p className="font-medium">{student.guardianNumber}</p></div></div>
          <div className="flex gap-3"><Calendar className="w-4 h-4 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Age / Admission</p><p className="font-medium">{student.age} years / {new Date(student.admissionDate).toLocaleDateString()}</p></div></div>
          <div className="flex gap-3"><MapPin className="w-4 h-4 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{student.address}</p></div></div></div>

          <div className="space-y-4"><h3 className="text-sm font-semibold text-muted-foreground uppercase">Academic Information</h3>
          <div className="flex gap-3"><School className="w-4 h-4 text-muted-foreground"/><div className="flex-1"><p className="text-xs text-muted-foreground">Current Class</p>{isEditingClass ? (<div className="flex gap-2 mt-1"><select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm"><option value="">Select Class</option>{classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}</select><button onClick={handleClassChange} className="p-1.5 bg-primary text-primary-foreground rounded"><Save className="w-4 h-4" /></button><button onClick={() => setIsEditingClass(false)} className="p-1.5 border rounded">Cancel</button></div>) : (<div className="flex items-center gap-2"><p className="font-medium">{className}</p><button onClick={() => { setSelectedClass(student.currentClass || ""); setIsEditingClass(true); }} className="text-xs text-primary hover:underline">Change Class</button></div>)}</div></div>
          <div className="flex gap-3"><BookOpen className="w-4 h-4 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Current Sipara</p><p className="font-medium">{progress?.currentSipara || "Not recorded"}</p></div></div>
          <div className="flex gap-3"><User className="w-4 h-4 text-muted-foreground"/><div><p className="text-xs text-muted-foreground">Assigned Teacher</p><p className="font-medium">{teacherName}</p></div></div></div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl"><p className="text-2xl font-bold text-green-600">{summary.present}</p><p className="text-xs">Present</p></div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl"><p className="text-2xl font-bold text-red-600">{summary.absent}</p><p className="text-xs">Absent</p></div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl"><p className="text-2xl font-bold text-amber-600">{summary.leave}</p><p className="text-xs">Leave</p></div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><p className="text-2xl font-bold text-blue-600">{summary.total}</p><p className="text-xs">Total Days</p></div>
          <div className="text-center p-3 bg-primary/10 rounded-xl"><p className="text-2xl font-bold text-primary">{summary.rate}%</p><p className="text-xs">Rate</p></div>
        </div>
      </motion.div>
    </div>
  );
}