import { useState, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Phone, MapPin, Calendar, User, Briefcase, GraduationCap, School, CheckCircle, XCircle, Mail, Key, Eye, EyeOff, Copy } from "lucide-react";
import { db, logActivity } from "../../utils/storage";
import type { Ustad, Class, UstadAttendance } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

export default function UstadProfile() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { user: currentUser } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ustad, setUstad] = useState<Ustad | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (id) {
      const found = db.getById<Ustad>("ustads", id);
      setUstad(found || null);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [id]);
  
  const classes = db.getAll<Class>("classes");
  const attendance = ustad ? db.getAll<UstadAttendance>("ustad_attendance").filter(a => a.ustadId === ustad.id) : [];
  
  const users = db.getAll<{ id: string; email: string; password: string; ustadId?: string }>("users");
  const userRecord = ustad ? users.find(u => u.ustadId === ustad.id) : null;
  
  const currentClass = ustad ? classes.find(c => c.id === ustad.assignedClass) : null;
  const presentCount = attendance.filter(a => a.status === "present").length;
  const absentCount = attendance.filter(a => a.status === "absent").length;
  const leaveCount = attendance.filter(a => a.status === "leave").length;
  const attendanceRate = attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : 0;

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
        <p className="text-muted-foreground text-lg">Ustad not found.</p>
        <button onClick={() => setLocation("/ustads")} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Back to Ustads
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setLocation("/ustads")} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-foreground">Ustad Profile</h1>
        </div>
        <Link href={`/ustads/${id}/edit`}>
          <button className="px-4 py-2 border border-input rounded-lg text-sm flex items-center gap-2 hover:bg-accent transition-colors">
            <Pencil className="w-4 h-4" /> Edit Ustad
          </button>
        </Link>
      </div>

      {/* Main Profile Card */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-xl border border-border overflow-hidden">
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
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${ustad.status === "active" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                    {ustad.status === "active" ? <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> : <XCircle className="w-3.5 h-3.5 inline mr-1" />}
                    {ustad.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</h3>
            <div className="flex items-start gap-3"><Phone className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Phone Number</p><p className="text-foreground font-medium">{ustad.phone}</p></div></div>
            <div className="flex items-start gap-3"><GraduationCap className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Qualification</p><p className="text-foreground font-medium">{ustad.qualification}</p></div></div>
            <div className="flex items-start gap-3"><Briefcase className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Experience</p><p className="text-foreground font-medium">{ustad.experience || "—"}</p></div></div>
            <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-muted-foreground mt-0.5" /><div><p className="text-xs text-muted-foreground">Joining Date</p><p className="text-foreground font-medium">{new Date(ustad.joiningDate).toLocaleDateString()}</p></div></div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Account Information</h3>
            <div className="flex items-start gap-3">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Email Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-medium">{ustad.email || userRecord?.email || "Not set"}</p>
                  {(ustad.email || userRecord?.email) && (
                    <button onClick={() => copyToClipboard(ustad.email || userRecord?.email || "")} className="p-1 hover:bg-accent rounded transition-colors" title="Copy email">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Key className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Password</p>
                <div className="flex items-center gap-2">
                  <p className="text-foreground font-mono">
                    {showPassword ? userRecord?.password || "••••••" : "••••••••"}
                  </p>
                  <button onClick={() => setShowPassword(!showPassword)} className="p-1 hover:bg-accent rounded transition-colors" title={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                  {userRecord?.password && (
                    <button onClick={() => copyToClipboard(userRecord.password)} className="p-1 hover:bg-accent rounded transition-colors" title="Copy password">
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">* Ustad can change password from dashboard</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <School className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Assigned Class</p>
                <p className="text-foreground font-medium">{currentClass?.className || "Not Assigned"}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-foreground">{ustad.address}</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Copy Success Toast */}
      {copied && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          Copied to clipboard!
        </div>
      )}

      {/* Attendance Summary */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-xl border border-border p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4">Attendance Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-xl"><p className="text-2xl font-bold text-green-600">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></div>
          <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-xl"><p className="text-2xl font-bold text-red-600">{absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></div>
          <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl"><p className="text-2xl font-bold text-amber-600">{leaveCount}</p><p className="text-xs text-muted-foreground">Leave</p></div>
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><p className="text-2xl font-bold text-blue-600">{attendance.length}</p><p className="text-xs text-muted-foreground">Total Days</p></div>
          <div className="text-center p-3 bg-primary/10 rounded-xl"><p className="text-2xl font-bold text-primary">{attendanceRate}%</p><p className="text-xs text-muted-foreground">Attendance Rate</p></div>
        </div>
      </motion.div>
    </div>
  );
}