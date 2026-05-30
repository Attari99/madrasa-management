import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Users, GraduationCap, CalendarCheck, School, TrendingUp, BarChart3, Target, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { db } from "../utils/storage";
import type { Student, Ustad, StudentAttendance, Class, UstadTarget, MonthlyProgress } from "../utils/storage";

const today = new Date().toISOString().split("T")[0];
const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export default function Dashboard() {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [selectedUstad, setSelectedUstad] = useState<Ustad | null>(null);
  const [targetSiparas, setTargetSiparas] = useState<number>(1);

  const students = db.getAll<Student>("students");
  const ustads = db.getAll<Ustad>("ustads");
  const classes = db.getAll<Class>("classes");
  const allStudentAtt = db.getAll<StudentAttendance>("student_attendance");
  const allProgress = db.getAll<MonthlyProgress>("monthly_progress");
  const allTargets = db.getAll<UstadTarget>("ustad_targets");

  const todayAttendance = allStudentAtt.filter(a => a.date === today);
  
  // Class-wise attendance
  const classAttendance = useMemo(() => {
    const result: { class: Class; total: number; present: number; absent: number; leave: number; percentage: number }[] = [];
    for (const cls of classes) {
      const classStudents = students.filter(s => s.currentClass === cls.id && s.status === "active");
      const classAttendanceRecords = todayAttendance.filter(a => classStudents.some(s => s.id === a.studentId));
      const present = classAttendanceRecords.filter(a => a.status === "present").length;
      const absent = classAttendanceRecords.filter(a => a.status === "absent").length;
      const leave = classAttendanceRecords.filter(a => a.status === "leave").length;
      const total = classStudents.length;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
      result.push({ class: cls, total, present, absent, leave, percentage });
    }
    return result;
  }, [classes, students, todayAttendance]);

  // Overall stats
  const overallStats = useMemo(() => {
    const activeStudents = students.filter(s => s.status === "active");
    const activeUstads = ustads.filter(u => u.status === "active");
    const totalStudents = activeStudents.length;
    const totalPresent = todayAttendance.filter(a => a.status === "present").length;
    const overallPercentage = totalStudents > 0 ? Math.round((totalPresent / totalStudents) * 100) : 0;
    return { 
      totalStudents, 
      activeUstadsCount: activeUstads.length,
      totalClasses: classes.length, 
      totalPresent, 
      overallPercentage 
    };
  }, [students, ustads, classes, todayAttendance]);

  // Ustad Targets Progress
  const ustadTargetsProgress = useMemo(() => {
    return ustads.filter(u => u.status === "active").map(u => {
      const currentTarget = allTargets.find(t => t.ustadId === u.id && t.month === currentMonth && t.year === currentYear);
      const classStudents = students.filter(s => s.currentClass === u.assignedClass && s.status === "active");
      let totalSiparaProgress = 0;
      for (const student of classStudents) {
        const prevMonthProgress = allProgress.find(p => 
          p.studentId === student.id && p.month === (currentMonth === 1 ? 12 : currentMonth - 1) && p.year === (currentMonth === 1 ? currentYear - 1 : currentYear)
        );
        const currentMonthProg = allProgress.find(p => 
          p.studentId === student.id && p.month === currentMonth && p.year === currentYear
        );
        const prevSipara = prevMonthProgress ? parseInt(prevMonthProgress.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
        const currentSipara = currentMonthProg ? parseInt(currentMonthProg.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
        totalSiparaProgress += Math.max(0, currentSipara - prevSipara);
      }
      const targetGoal = currentTarget?.targetSiparas || 0;
      const progressPercent = targetGoal > 0 ? Math.round((totalSiparaProgress / targetGoal) * 100) : 0;
      return { 
        ustad: u, 
        target: currentTarget, 
        targetGoal, 
        targetCompleted: totalSiparaProgress, 
        progressPercent, 
        studentCount: classStudents.length 
      };
    });
  }, [ustads, students, allTargets, allProgress]);

  const handleSetTarget = () => {
    if (!selectedUstad) return;
    const existingTarget = allTargets.find(t => t.ustadId === selectedUstad.id && t.month === currentMonth && t.year === currentYear);
    if (existingTarget) {
      db.update<UstadTarget>("ustad_targets", existingTarget.id, { targetSiparas: targetSiparas });
    } else {
      db.create<UstadTarget>("ustad_targets", { 
        ustadId: selectedUstad.id, 
        month: currentMonth, 
        year: currentYear, 
        targetSiparas: targetSiparas, 
        completedSiparas: 0, 
        status: "pending" 
      });
    }
    setShowTargetModal(false);
    setSelectedUstad(null);
    setTargetSiparas(1);
    alert(`Target set for ${selectedUstad.fullName}: ${targetSiparas} siparas this month`);
    window.location.reload();
  };

  const filteredClassAttendance = selectedClass === "all" ? classAttendance : classAttendance.filter(c => c.class.id === selectedClass);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Students */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Students</p>
              <p className="text-3xl font-bold">{overallStats.totalStudents}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
        
        {/* Active Ustads */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Active Ustads</p>
              <p className="text-3xl font-bold">{overallStats.activeUstadsCount}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
        
        {/* Total Classes */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Classes</p>
              <p className="text-3xl font-bold">{overallStats.totalClasses}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <School className="w-5 h-5 text-purple-600" />
            </div>
          </div>
        </div>
        
        {/* Present Today */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Present Today</p>
              <p className="text-3xl font-bold text-green-600">{overallStats.totalPresent}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>
        
        {/* Attendance Rate */}
        <div className="bg-card rounded-2xl p-5 border border-border">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Attendance Rate</p>
              <p className="text-3xl font-bold text-primary">{overallStats.overallPercentage}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>
      </div>

      {/* Class-wise Attendance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/20 flex justify-between items-center flex-wrap gap-2">
          <h2 className="font-semibold">📊 Class-wise Attendance - {new Date().toLocaleDateString("en-GB")}</h2>
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="px-3 py-1 border rounded text-sm">
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/10">
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Teacher</th>
                <th className="text-left px-4 py-3">Total</th>
                <th className="text-left px-4 py-3">Present</th>
                <th className="text-left px-4 py-3">Absent</th>
                <th className="text-left px-4 py-3">Leave</th>
                <th className="text-left px-4 py-3">Percentage</th>
                <th className="text-left px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredClassAttendance.map((c) => {
                const teacher = ustads.find(u => u.id === c.class.assignedTeacher);
                let statusColor = "bg-green-100 text-green-700";
                let statusText = "Good";
                if (c.percentage < 50) { 
                  statusColor = "bg-red-100 text-red-700"; 
                  statusText = "Needs Attention"; 
                } else if (c.percentage < 75) { 
                  statusColor = "bg-amber-100 text-amber-700"; 
                  statusText = "Average"; 
                }
                return (
                  <tr key={c.class.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.class.className}</td>
                    <td className="px-4 py-3">{teacher?.fullName || "Not Assigned"}</td>
                    <td className="px-4 py-3">{c.total}</td>
                    <td className="px-4 py-3 text-green-600">{c.present}</td>
                    <td className="px-4 py-3 text-red-600">{c.absent}</td>
                    <td className="px-4 py-3 text-amber-600">{c.leave}</td>
                    <td className="px-4 py-3 font-semibold">{c.percentage}%</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>{statusText}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Ustad Targets Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/20">
          <h2 className="font-semibold">🎯 Ustad Monthly Targets - {new Date().toLocaleString("default", { month: "long" })} {currentYear}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/10">
                <th className="text-left px-4 py-3">Ustad</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Students</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Completed</th>
                <th className="text-left px-4 py-3">Progress</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {ustadTargetsProgress.map((item) => {
                let statusColor = "bg-gray-100 text-gray-700";
                let statusText = "No Target";
                if (item.target) {
                  if (item.progressPercent >= 100) { 
                    statusColor = "bg-green-100 text-green-700"; 
                    statusText = "Completed"; 
                  } else if (item.progressPercent >= 50) { 
                    statusColor = "bg-blue-100 text-blue-700"; 
                    statusText = "In Progress"; 
                  } else { 
                    statusColor = "bg-amber-100 text-amber-700"; 
                    statusText = "Behind"; 
                  }
                }
                return (
                  <tr key={item.ustad.id} className="border-b hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{item.ustad.fullName}</td>
                    <td className="px-4 py-3">{classes.find(c => c.id === item.ustad.assignedClass)?.className || "Not Assigned"}</td>
                    <td className="px-4 py-3">{item.studentCount}</td>
                    <td className="px-4 py-3 font-semibold">{item.targetGoal > 0 ? `${item.targetGoal} sipara${item.targetGoal !== 1 ? "s" : ""}` : "—"}</td>
                    <td className="px-4 py-3">{item.targetCompleted > 0 ? `${item.targetCompleted} sipara${item.targetCompleted !== 1 ? "s" : ""}` : "0"}</td>
                    <td className="px-4 py-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div className={`h-2 rounded-full ${item.progressPercent >= 100 ? "bg-green-500" : item.progressPercent >= 50 ? "bg-blue-500" : "bg-amber-500"}`} 
                          style={{ width: `${Math.min(100, item.progressPercent)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${statusColor}`}>{statusText}</span></td>
                    <td className="px-4 py-3">
                      <button onClick={() => { 
                        setSelectedUstad(item.ustad); 
                        setTargetSiparas(item.targetGoal || 1); 
                        setShowTargetModal(true); 
                      }} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20">
                        Set Target
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
      
      {/* Ustad Performance Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b bg-muted/20">
          <h2 className="font-semibold">⭐ Ustad Performance Summary</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {ustadTargetsProgress.map((item) => {
            let icon = <AlertCircle className="w-5 h-5 text-amber-500" />;
            if (item.progressPercent >= 100) {
              icon = <CheckCircle className="w-5 h-5 text-green-500" />;
            } else if (item.progressPercent >= 50) {
              icon = <TrendingUp className="w-5 h-5 text-blue-500" />;
            } else if (item.target) {
              icon = <XCircle className="w-5 h-5 text-red-500" />;
            }
            return (
              <div key={item.ustad.id} className="bg-muted/20 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{item.ustad.fullName}</h3>
                    <p className="text-xs text-muted-foreground">
                      {classes.find(c => c.id === item.ustad.assignedClass)?.className || "No Class"}
                    </p>
                  </div>
                  {icon}
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Target:</span>
                    <span className="font-medium">{item.targetGoal > 0 ? `${item.targetGoal} sipara${item.targetGoal !== 1 ? "s" : ""}` : "Not set"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span className="font-medium">{item.targetCompleted} sipara{item.targetCompleted !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Progress:</span>
                    <span className={`font-bold ${item.progressPercent >= 100 ? "text-green-600" : item.progressPercent >= 50 ? "text-blue-600" : "text-amber-600"}`}>
                      {item.progressPercent}%
                    </span>
                  </div>
                </div>
                <Link href={`/ustads/${item.ustad.id}`}>
                  <button className="w-full mt-3 text-center text-xs bg-primary/10 text-primary py-1.5 rounded hover:bg-primary/20">
                    View Profile
                  </button>
                </Link>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Target Modal */}
      {showTargetModal && selectedUstad && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-2">Set Monthly Target</h2>
            <p className="text-muted-foreground mb-4">Ustad: <span className="font-semibold">{selectedUstad.fullName}</span></p>
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Target Siparas for this month</label>
              <input type="number" min="1" max="30" value={targetSiparas} onChange={e => setTargetSiparas(parseInt(e.target.value))} className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSetTarget} className="flex-1 bg-primary text-primary-foreground py-2 rounded">Save Target</button>
              <button onClick={() => setShowTargetModal(false)} className="flex-1 border border-input py-2 rounded">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}