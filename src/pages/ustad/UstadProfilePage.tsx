import { useState, useEffect } from "react";
import { useLocation } from "wouter"
import { motion } from "framer-motion";
import { ArrowLeft, Phone, MapPin, Calendar, User, Briefcase, GraduationCap, School, CheckCircle, XCircle, Mail, Key, Eye, EyeOff, Copy, Target, Users } from "lucide-react";
import { db } from "../../utils/storage";
import type { Ustad, Class, UstadAttendance, UstadTarget, MonthlyProgress, Student } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function UstadProfilePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ustad, setUstad] = useState<Ustad | null>(null);
  const [userRecord, setUserRecord] = useState<{ id: string; email: string; password: string; ustadId?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user?.ustadId) {
      const found = db.getById<Ustad>("ustads", user.ustadId);
      setUstad(found || null);
      
      // Get user record separately
      const users = db.getAll<{ id: string; email: string; password: string; ustadId?: string }>("users");
      const record = users.find(u => u.ustadId === user.ustadId);
      setUserRecord(record || null);
    }
    setLoading(false);
  }, [user?.ustadId]);
  
  const classes = db.getAll<Class>("classes");
  const attendance = ustad ? db.getAll<UstadAttendance>("ustad_attendance").filter(a => a.ustadId === ustad.id) : [];
  const myStudents = ustad ? db.getAll<Student>("students").filter(s => s.currentClass === ustad.assignedClass && s.status === "active") : [];
  
  const currentClass = ustad ? classes.find(c => c.id === ustad.assignedClass) : null;
  const presentCount = attendance.filter(a => a.status === "present").length;
  const absentCount = attendance.filter(a => a.status === "absent").length;
  const leaveCount = attendance.filter(a => a.status === "leave").length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

  // Target Progress
  const myTarget = db.getAll<UstadTarget>("ustad_targets").find(t => t.ustadId === user?.ustadId && t.month === currentMonth && t.year === currentYear);
  const allProgress = db.getAll<MonthlyProgress>("monthly_progress");
  let totalProgress = 0;
  for (const student of myStudents) {
    const prevMonthProgress = allProgress.find(p => p.studentId === student.id && p.month === (currentMonth === 1 ? 12 : currentMonth - 1) && p.year === (currentMonth === 1 ? currentYear - 1 : currentYear));
    const currentMonthProg = allProgress.find(p => p.studentId === student.id && p.month === currentMonth && p.year === currentYear);
    const prevSipara = prevMonthProgress ? parseInt(prevMonthProgress.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
    const currentSipara = currentMonthProg ? parseInt(currentMonthProg.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
    totalProgress += Math.max(0, currentSipara - prevSipara);
  }
  const targetGoal = myTarget?.targetSiparas || 0;
  const progressPercent = targetGoal > 0 ? Math.round((totalProgress / targetGoal) * 100) : 0;
  const targetStatus = myTarget ? (progressPercent >= 100 ? "completed" : progressPercent >= 50 ? "in-progress" : "behind") : "no-target";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!ustad) {
    return (
      <div className="text-center py-16">
        <User className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground text-lg">Profile not found.</p>
        <button onClick={() => setLocation("/ustad-dashboard")} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/ustad-dashboard")} className="p-2 hover:bg-accent rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
      </div>

      {/* Target Progress Card */}
      {myTarget && (
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/20">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              <span className="font-semibold">Monthly Target: {targetGoal} Sipara{targetGoal !== 1 ? "s" : ""}</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              targetStatus === "completed" ? "bg-green-100 text-green-700" : 
              targetStatus === "in-progress" ? "bg-blue-100 text-blue-700" : 
              "bg-amber-100 text-amber-700"
            }`}>
              {targetStatus === "completed" ? "✓ Completed" : targetStatus === "in-progress" ? "In Progress" : "Behind Target"}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div className={`h-3 rounded-full ${progressPercent >= 100 ? "bg-green-500" : progressPercent >= 50 ? "bg-blue-500" : "bg-amber-500"}`} style={{ width: `${progressPercent}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-sm">
            <span>Completed: {totalProgress} sipara{totalProgress !== 1 ? "s" : ""}</span>
            <span>Target: {targetGoal} sipara{targetGoal !== 1 ? "s" : ""}</span>
            <span className="font-semibold">{progressPercent}% Complete</span>
          </div>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 to-transparent p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <User className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{ustad.fullName}</h2>
                  <p className="text-muted-foreground">S/O {ustad.fatherName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${ustad.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                  {ustad.status === "active" ? <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> : <XCircle className="w-3.5 h-3.5 inline mr-1" />}
                  {ustad.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Personal Information</h3>
            <div className="flex gap-3"><Phone className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Phone</p><p className="font-medium">{ustad.phone}</p></div></div>
            <div className="flex gap-3"><GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Qualification</p><p className="font-medium">{ustad.qualification}</p></div></div>
            <div className="flex gap-3"><Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Experience</p><p className="font-medium">{ustad.experience || "—"}</p></div></div>
            <div className="flex gap-3"><Calendar className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Joining Date</p><p className="font-medium">{new Date(ustad.joiningDate).toLocaleDateString()}</p></div></div>
            <div className="flex gap-3"><School className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Assigned Class</p><p className="font-medium">{currentClass?.className || "Not Assigned"}</p></div></div>
            <div className="flex gap-3"><Users className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Total Students</p><p className="font-medium">{myStudents.length}</p></div></div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase">Account Information</h3>
            <div className="flex gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{ustad.email || userRecord?.email || "Not set"}</p>
                  {(ustad.email || userRecord?.email) && (
                    <button onClick={() => copyToClipboard(ustad.email || userRecord?.email || "")} className="p-1 hover:bg-accent rounded">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Key className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Password</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono">{showPassword ? userRecord?.password || "••••••" : "••••••••"}</p>
                  <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-accent rounded">
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  {userRecord?.password && (
                    <button onClick={() => copyToClipboard(userRecord.password)} className="p-1 hover:bg-accent rounded">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">* You can change password from dashboard</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div><p className="text-xs text-muted-foreground">Address</p><p className="font-medium">{ustad.address}</p></div>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Summary */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold mb-4">📊 My Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl"><p className="text-2xl font-bold text-green-600">{presentCount}</p><p className="text-xs">Present</p></div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl"><p className="text-2xl font-bold text-red-600">{absentCount}</p><p className="text-xs">Absent</p></div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl"><p className="text-2xl font-bold text-amber-600">{leaveCount}</p><p className="text-xs">Leave</p></div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><p className="text-2xl font-bold text-blue-600">{attendance.length}</p><p className="text-xs">Total Days</p></div>
          <div className="text-center p-3 bg-primary/10 rounded-xl"><p className="text-2xl font-bold text-primary">{attendanceRate}%</p><p className="text-xs">Rate</p></div>
        </div>
      </div>

      {/* Copy Toast */}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg">
          Copied!
        </div>
      )}
    </div>
  );
}