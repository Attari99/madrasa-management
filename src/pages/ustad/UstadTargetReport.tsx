import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Target, Save, FileText, CheckCircle, Clock, AlertCircle, History } from "lucide-react";
import { db, generateId, logActivity } from "../../utils/storage";
import type { Ustad, UstadTarget, TargetReport, MonthlyProgress, Student } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();
const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function UstadTargetReport() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [reportText, setReportText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: string; text: string } | null>(null);
  
  const [ustad, setUstad] = useState<Ustad | null>(null);
  const [myTarget, setMyTarget] = useState<UstadTarget | null>(null);
  const [myReport, setMyReport] = useState<TargetReport | null>(null);
  const [reportHistory, setReportHistory] = useState<TargetReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (user?.ustadId) {
      const found = db.getById<Ustad>("ustads", user.ustadId);
      setUstad(found || null);
      
      const target = db.getAll<UstadTarget>("ustad_targets").find(t => t.ustadId === user.ustadId && t.month === currentMonth && t.year === currentYear);
      setMyTarget(target || null);
      
      const report = db.getAll<TargetReport>("target_reports").find(r => r.ustadId === user.ustadId && r.month === currentMonth && r.year === currentYear);
      setMyReport(report || null);
      
      const history = db.getAll<TargetReport>("target_reports").filter(r => r.ustadId === user.ustadId).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setReportHistory(history);
      
      if (report) {
        setReportText(report.reportText);
      }
    }
    setLoading(false);
  }, [user?.ustadId]);

  const students = ustad ? db.getAll<Student>("students").filter(s => s.currentClass === ustad.assignedClass && s.status === "active") : [];
  const allProgress = db.getAll<MonthlyProgress>("monthly_progress");
  
  // Calculate actual progress
  let totalProgress = 0;
  for (const student of students) {
    const prevMonthProgress = allProgress.find(p => p.studentId === student.id && p.month === (currentMonth === 1 ? 12 : currentMonth - 1) && p.year === (currentMonth === 1 ? currentYear - 1 : currentYear));
    const currentMonthProg = allProgress.find(p => p.studentId === student.id && p.month === currentMonth && p.year === currentYear);
    const prevSipara = prevMonthProgress ? parseInt(prevMonthProgress.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
    const currentSipara = currentMonthProg ? parseInt(currentMonthProg.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
    totalProgress += Math.max(0, currentSipara - prevSipara);
  }

  const handleSubmitReport = () => {
    if (!reportText.trim()) {
      setMessage({ type: "error", text: "Please write your report before submitting!" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    setIsSubmitting(true);
    
    if (myReport) {
      // Update existing report
      db.update<TargetReport>("target_reports", myReport.id, {
        reportText: reportText,
        completedSiparas: totalProgress,
        status: "submitted",
        submittedAt: new Date().toISOString()
      });
    } else {
      // Create new report
      db.create<TargetReport>("target_reports", {
        ustadId: user?.ustadId || "",
        month: currentMonth,
        year: currentYear,
        targetSiparas: myTarget?.targetSiparas || 0,
        completedSiparas: totalProgress,
        reportText: reportText,
        status: "submitted",
        submittedAt: new Date().toISOString()
      });
    }
    
    logActivity(`Submitted monthly target report for ${monthNames[currentMonth - 1]} ${currentYear}`, "target", user?.ustadId || "", user?.id || "");
    setMessage({ type: "success", text: "Report submitted successfully! Admin will review it." });
    
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    
    setIsSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center"><div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div><p>Loading...</p></div>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => setLocation("/ustad-dashboard")} className="p-2 hover:bg-accent rounded"><Target className="w-5 h-5" /></button>
        <h1 className="text-2xl font-bold text-foreground">Monthly Target Report</h1>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Target Info Card */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-5 border border-primary/20">
        <h3 className="font-semibold mb-3">📊 {monthNames[currentMonth - 1]} {currentYear} Target</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-white/50 rounded-lg"><p className="text-2xl font-bold text-primary">{myTarget?.targetSiparas || 0}</p><p className="text-xs">Target Siparas</p></div>
          <div className="text-center p-3 bg-white/50 rounded-lg"><p className="text-2xl font-bold text-green-600">{totalProgress}</p><p className="text-xs">Completed Siparas</p></div>
          <div className="text-center p-3 bg-white/50 rounded-lg"><p className="text-2xl font-bold text-blue-600">{Math.max(0, (myTarget?.targetSiparas || 0) - totalProgress)}</p><p className="text-xs">Remaining</p></div>
          <div className="text-center p-3 bg-white/50 rounded-lg"><p className="text-2xl font-bold text-amber-600">{students.length}</p><p className="text-xs">Total Students</p></div>
        </div>
        <div className="mt-3"><div className="w-full bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, (totalProgress / (myTarget?.targetSiparas || 1)) * 100)}%` }} /></div><p className="text-xs text-center mt-1">{Math.round((totalProgress / (myTarget?.targetSiparas || 1)) * 100)}% Complete</p></div>
      </div>

      {/* Report Form */}
      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /><h3 className="font-semibold">Your Monthly Report</h3></div>
        
        <div>
          <label className="text-sm font-medium mb-1 block">Report Details *</label>
          <textarea 
            value={reportText} 
            onChange={e => setReportText(e.target.value)} 
            rows={6} 
            className="w-full px-3 py-2 border border-input rounded-lg" 
            placeholder={`Write your detailed report for ${monthNames[currentMonth - 1]} ${currentYear}...

Example:
- Total siparas completed: ${totalProgress}
- Student-wise progress summary
- Challenges faced during the month
- Achievements and improvements
- Next month's plan`}
          />
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleSubmitReport} disabled={isSubmitting || myReport?.status === "reviewed"} className="flex-1 bg-primary text-primary-foreground py-2 rounded font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {myReport?.status === "submitted" ? "Resubmit Report" : myReport?.status === "reviewed" ? "Already Reviewed" : "Submit Report"}
          </button>
        </div>
        
        {myReport?.status === "submitted" && (
          <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Your report has been submitted and is pending admin review.</div>
        )}
        
        {myReport?.status === "reviewed" && myReport.adminComments && (
          <div className="p-3 bg-green-50 text-green-700 rounded-lg">
            <p className="font-medium text-sm">Admin Feedback:</p>
            <p className="text-sm mt-1">{myReport.adminComments}</p>
          </div>
        )}
      </div>

      {/* Report History */}
      {reportHistory.length > 0 && (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-3 border-b bg-muted/20"><h3 className="font-semibold flex items-center gap-2"><History className="w-4 h-4" /> Previous Reports History</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-left px-4 py-2">Month</th><th className="text-left px-4 py-2">Target</th><th className="text-left px-4 py-2">Completed</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Submitted On</th></tr></thead>
              <tbody>
                {reportHistory.map(report => (
                  <tr key={report.id} className="border-b">
                    <td className="px-4 py-2 font-medium">{monthNames[report.month - 1]} {report.year}</td>
                    <td className="px-4 py-2">{report.targetSiparas} sipara{report.targetSiparas !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-2">{report.completedSiparas} sipara{report.completedSiparas !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs ${report.status === "reviewed" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>{report.status === "reviewed" ? "Reviewed" : "Pending"}</span></td>
                    <td className="px-4 py-2 text-muted-foreground">{new Date(report.submittedAt).toLocaleDateString()}</td>
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