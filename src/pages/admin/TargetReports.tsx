import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Target, CheckCircle, XCircle, Clock, Eye, Send, MessageSquare } from "lucide-react";
import { db, generateId, logActivity } from "../../utils/storage";
import type { Ustad, Class, TargetReport, MonthlyProgress, Student } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const currentMonth = new Date().getMonth() + 1;
const currentYear = new Date().getFullYear();

export default function TargetReports() {
  const { user } = useAuth();
  const [selectedUstad, setSelectedUstad] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState<TargetReport | null>(null);
  const [adminComment, setAdminComment] = useState("");

  const ustads = db.getAll<Ustad>("ustads").filter(u => u.status === "active");
  const classes = db.getAll<Class>("classes");
  const students = db.getAll<Student>("students");
  const allProgress = db.getAll<MonthlyProgress>("monthly_progress");
  const allReports = db.getAll<TargetReport>("target_reports");

  // Calculate actual progress for each ustad
  const ustadProgress = useMemo(() => {
    return ustads.map(ustad => {
      const classStudents = students.filter(s => s.currentClass === ustad.assignedClass && s.status === "active");
      let totalProgress = 0;
      for (const student of classStudents) {
        const prevMonthProgress = allProgress.find(p => p.studentId === student.id && p.month === (currentMonth === 1 ? 12 : currentMonth - 1) && p.year === (currentMonth === 1 ? currentYear - 1 : currentYear));
        const currentMonthProg = allProgress.find(p => p.studentId === student.id && p.month === currentMonth && p.year === currentYear);
        const prevSipara = prevMonthProgress ? parseInt(prevMonthProgress.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
        const currentSipara = currentMonthProg ? parseInt(currentMonthProg.currentSipara?.match(/\d+/)?.[0] || "0") : 0;
        totalProgress += Math.max(0, currentSipara - prevSipara);
      }
      
      const report = allReports.find(r => r.ustadId === ustad.id && r.month === currentMonth && r.year === currentYear);
      return { ustad, totalProgress, report, studentCount: classStudents.length };
    });
  }, [ustads, students, allProgress, allReports]);

  const filteredProgress = ustadProgress.filter(p => {
    if (selectedUstad !== "all" && p.ustad.id !== selectedUstad) return false;
    if (selectedStatus !== "all" && p.report?.status !== selectedStatus) return false;
    return true;
  });

  const handleReviewReport = (report: TargetReport) => {
    setSelectedReport(report);
    setAdminComment(report.adminComments || "");
    setShowReportModal(true);
  };

  const handleSubmitReview = () => {
    if (!selectedReport) return;
    
    db.update<TargetReport>("target_reports", selectedReport.id, {
      status: "reviewed",
      reviewedAt: new Date().toISOString(),
      adminComments: adminComment
    });
    
    logActivity(`Reviewed target report for ${selectedReport.month}/${selectedReport.year}`, "target", selectedReport.id, user?.id || "");
    alert("Report reviewed successfully!");
    setShowReportModal(false);
    setSelectedReport(null);
    setAdminComment("");
    window.location.reload();
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "submitted": return <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"><Clock className="w-3 h-3 inline mr-1" />Pending Review</span>;
      case "reviewed": return <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 inline mr-1" />Reviewed</span>;
      default: return <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"><XCircle className="w-3 h-3 inline mr-1" />No Report</span>;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Target Reports</h1>
          <p className="text-sm text-muted-foreground">View and review ustad monthly target reports</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select value={selectedUstad} onChange={e => setSelectedUstad(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background">
          <option value="all">All Ustads</option>
          {ustads.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
        </select>
        <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="px-3 py-2 border border-input rounded-lg bg-background">
          <option value="all">All Status</option>
          <option value="submitted">Pending Review</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      {/* Reports Table */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3">Ustad</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Students</th>
                <th className="text-left px-4 py-3">Target</th>
                <th className="text-left px-4 py-3">Completed</th>
                <th className="text-left px-4 py-3">Progress</th>
                <th className="text-left px-4 py-3">Report</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredProgress.map((item, i) => {
                const progressPercent = item.report ? Math.round((item.report.completedSiparas / item.report.targetSiparas) * 100) : 0;
                return (
                  <tr key={item.ustad.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{item.ustad.fullName}</td>
                    <td className="px-4 py-3">{classes.find(c => c.id === item.ustad.assignedClass)?.className || "—"}</td>
                    <td className="px-4 py-3">{item.studentCount}</td>
                    <td className="px-4 py-3">{item.report?.targetSiparas || "—"} sipara{item.report?.targetSiparas !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3">{item.report?.completedSiparas || item.totalProgress || "0"} sipara{item.report?.completedSiparas !== 1 ? "s" : ""}</td>
                    <td className="px-4 py-3"><div className="w-20 bg-gray-200 rounded-full h-2"><div className="h-2 rounded-full bg-primary" style={{ width: `${Math.min(100, progressPercent)}%` }} /></div></td>
                    <td className="px-4 py-3 max-w-xs truncate">{item.report?.reportText || "—"}</td>
                    <td className="px-4 py-3">{getStatusBadge(item.report?.status || "none")}</td>
                    <td className="px-4 py-3">
                      {item.report?.status === "submitted" && (
                        <button onClick={() => handleReviewReport(item.report!)} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20">
                          <Eye className="w-3 h-3 inline mr-1" /> Review
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Review Target Report</h2>
            <div className="space-y-4">
              <div className="p-3 bg-muted/20 rounded-lg">
                <p className="text-sm font-medium">Ustad Report</p>
                <p className="text-sm mt-1">{selectedReport.reportText}</p>
                <p className="text-xs text-muted-foreground mt-2">Submitted: {new Date(selectedReport.submittedAt).toLocaleString()}</p>
              </div>
              <div>
                <label className="text-sm font-medium">Admin Comments</label>
                <textarea value={adminComment} onChange={e => setAdminComment(e.target.value)} rows={3} className="w-full px-3 py-2 border border-input rounded-lg mt-1" placeholder="Add your feedback here..." />
              </div>
              <div className="flex gap-3">
                <button onClick={handleSubmitReview} className="flex-1 bg-primary text-primary-foreground py-2 rounded">Submit Review</button>
                <button onClick={() => setShowReportModal(false)} className="flex-1 border border-input py-2 rounded">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}