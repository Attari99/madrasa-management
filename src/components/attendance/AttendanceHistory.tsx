import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, Search, User, Users } from "lucide-react";
import { db } from "../../utils/storage";
import type { StudentAttendance, UstadAttendance, Student, Ustad, Class } from "../../utils/storage";

const dressLabels: Record<string, string> = {
  white_suit_imama: "White Suit + Imama",
  white_suit: "White Suit Only",
  imama: "Imama Only",
  incomplete: "Incomplete",
};

export default function AttendanceHistory() {
  const [searchDate, setSearchDate] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [ustadSearch, setUstadSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"students" | "ustads">("students");

  const students = db.getAll<Student>("students");
  const ustads = db.getAll<Ustad>("ustads");
  const classes = db.getAll<Class>("classes");
  const studentAttendance = db.getAll<StudentAttendance>("student_attendance");
  const ustadAttendance = db.getAll<UstadAttendance>("ustad_attendance");

  console.log("Total Student Attendance Records:", studentAttendance.length);
  console.log("Student Attendance by Date:", studentAttendance.map(a => a.date));

  const studentAttendanceByDate = useMemo(() => {
    const grouped: Record<string, (StudentAttendance & { student: Student | null })[]> = {};
    let filtered = studentAttendance;
    if (searchDate) {
      filtered = filtered.filter(a => a.date === searchDate);
    }
    
    filtered.forEach(att => {
      if (!grouped[att.date]) grouped[att.date] = [];
      const student = students.find(s => s.id === att.studentId);
      grouped[att.date].push({ ...att, student: student || null });
    });
    
    const sorted: Record<string, any[]> = {};
    Object.keys(grouped).sort().reverse().forEach(key => { sorted[key] = grouped[key]; });
    return sorted;
  }, [studentAttendance, students, searchDate]);

  const ustadAttendanceByDate = useMemo(() => {
    const grouped: Record<string, (UstadAttendance & { ustad: Ustad | null; className: string })[]> = {};
    let filtered = ustadAttendance;
    if (searchDate) {
      filtered = filtered.filter(a => a.date === searchDate);
    }
    
    filtered.forEach(att => {
      if (!grouped[att.date]) grouped[att.date] = [];
      const ustad = ustads.find(u => u.id === att.ustadId);
      const classObj = classes.find(c => c.id === ustad?.assignedClass);
      grouped[att.date].push({ ...att, ustad: ustad || null, className: classObj?.className || "Not Assigned" });
    });
    
    const sorted: Record<string, any[]> = {};
    Object.keys(grouped).sort().reverse().forEach(key => { sorted[key] = grouped[key]; });
    return sorted;
  }, [ustadAttendance, ustads, classes, searchDate]);

  const getStatusColor = (status: string) => {
    switch(status) {
      case "present": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "absent": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "leave": return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance History</h1>
          <p className="text-sm text-muted-foreground mt-1">View complete attendance records of students and ustads</p>
          <p className="text-xs text-muted-foreground mt-1">Total Student Records: {studentAttendance.length} | Total Ustad Records: {ustadAttendance.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="date" value={searchDate} onChange={(e) => setSearchDate(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary" />
          </div>
        </div>
        {!searchDate && activeTab === "students" && (
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Search student..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg bg-background" /></div>
        )}
        {!searchDate && activeTab === "ustads" && (
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><input type="text" value={ustadSearch} onChange={e => setUstadSearch(e.target.value)} placeholder="Search ustad..." className="w-full pl-9 pr-3 py-2 border border-input rounded-lg bg-background" /></div>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setActiveTab("students")} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${activeTab === "students" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}><Users className="w-4 h-4" /> Students Attendance ({Object.keys(studentAttendanceByDate).length} dates)</button>
        <button onClick={() => setActiveTab("ustads")} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium ${activeTab === "ustads" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"}`}><User className="w-4 h-4" /> Ustads Attendance ({Object.keys(ustadAttendanceByDate).length} dates)</button>
      </div>

      {activeTab === "students" && (
        <div className="mt-4 space-y-6">
          {Object.keys(studentAttendanceByDate).length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl"><Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No attendance records found</p><p className="text-xs text-muted-foreground mt-1">Click "Save Student Attendance" on Attendance page to save records</p></div>
          ) : (
            Object.entries(studentAttendanceByDate).map(([date, records]) => {
              let filteredRecords = records;
              if (studentSearch) filteredRecords = filteredRecords.filter(r => r.student?.studentName?.toLowerCase().includes(studentSearch.toLowerCase()));
              if (filteredRecords.length === 0) return null;
              const present = filteredRecords.filter(r => r.status === "present").length;
              const absent = filteredRecords.filter(r => r.status === "absent").length;
              const leave = filteredRecords.filter(r => r.status === "leave").length;
              return (
                <div key={date} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <h3 className="font-semibold">{new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</h3>
                      <div className="flex gap-3 text-sm"><span className="text-green-600">Present: {present}</span><span className="text-red-600">Absent: {absent}</span><span className="text-amber-600">Leave: {leave}</span></div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/10"><th className="text-left px-4 py-2">#</th><th className="text-left px-4 py-2">Student</th><th className="text-left px-4 py-2">Father</th><th className="text-left px-4 py-2">Class</th><th className="text-left px-4 py-2">Status</th></tr></thead>
                      <tbody>{filteredRecords.map((record, idx) => {
                        const student = record.student;
                        const classObj = classes.find(c => c.id === student?.currentClass);
                        return (<tr key={record.id} className="border-b"><td className="px-4 py-2">{idx+1}</td><td className="px-4 py-2 font-medium">{student?.studentName || "Unknown"}</td><td className="px-4 py-2 text-muted-foreground">{student?.fatherName || "—"}</td><td className="px-4 py-2">{classObj?.className || "—"}</td><td className="px-4 py-2"><span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(record.status)}`}>{record.status}</span></td></tr>);
                      })}</tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "ustads" && (
        <div className="mt-4 space-y-6">
          {Object.keys(ustadAttendanceByDate).length === 0 ? (
            <div className="text-center py-16 bg-muted/20 rounded-xl"><Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" /><p className="text-muted-foreground">No attendance records found</p></div>
          ) : (
            Object.entries(ustadAttendanceByDate).map(([date, records]) => {
              let filteredRecords = records;
              if (ustadSearch) filteredRecords = filteredRecords.filter(r => r.ustad?.fullName?.toLowerCase().includes(ustadSearch.toLowerCase()));
              if (filteredRecords.length === 0) return null;
              return (
                <div key={date} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b bg-muted/20"><h3 className="font-semibold">{new Date(date).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</h3></div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className="border-b bg-muted/10"><th className="text-left px-4 py-2">#</th><th className="text-left px-4 py-2">Ustad</th><th className="text-left px-4 py-2">Class</th><th className="text-left px-4 py-2">Status</th><th className="text-left px-4 py-2">Dress</th><th className="text-left px-4 py-2">Arrival</th><th className="text-left px-4 py-2">Exit</th></tr></thead>
                      <tbody>{filteredRecords.map((record, idx) => (<tr key={record.id} className="border-b"><td className="px-4 py-2">{idx+1}</td><td className="px-4 py-2 font-medium">{record.ustad?.fullName || "Unknown"}</td><td className="px-4 py-2">{record.className}</td><td className="px-4 py-2"><span className={`px-2 py-1 rounded-full text-xs capitalize ${getStatusColor(record.status)}`}>{record.status}</span></td><td className="px-4 py-2 text-muted-foreground">{dressLabels[record.dressStatus] || "—"}</td><td className="px-4 py-2"><Clock className="w-3 h-3 inline mr-1" />{record.arrivalTime || "—"}</td><td className="px-4 py-2">{record.exitTime || "—"}</td></tr>))}</tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}