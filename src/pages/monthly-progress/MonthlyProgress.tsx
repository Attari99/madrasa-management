import { useState, useMemo } from "react";
import { Save, History, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { db, generateId, logActivity, storage } from "../../utils/storage";
import type { Student, MonthlyProgress as MP, Class } from "../../utils/storage";
import { useAuth } from "../../contexts/AuthContext";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// Helper function to convert sipara name to number for comparison
const getSiparaNumber = (sipara: string): number => {
  const match = sipara.match(/\d+/);
  return match ? parseInt(match[0]) : 0;
};

// Performance score mapping
const getPerformanceScore = (performance: string): number => {
  switch(performance) {
    case 'excellent': return 100;
    case 'good': return 75;
    case 'weak': return 50;
    case 'needs_attention': return 25;
    default: return 50;
  }
};

// Behaviour score mapping
const getBehaviourScore = (behaviour: string): number => {
  switch(behaviour) {
    case 'good': return 100;
    case 'normal': return 75;
    case 'naughty': return 50;
    default: return 75;
  }
};

export default function MonthlyProgress() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [classFilter, setClassFilter] = useState("all");
  const [showHistory, setShowHistory] = useState(false);
  const [showComparison, setShowComparison] = useState(true);

  const students = db.getAll<Student>("students").filter(s => s.status === "active");
  const classes = db.getAll<Class>("classes");
  const filteredStudents = classFilter === "all" ? students : students.filter(s => s.currentClass === classFilter);
  
  // Get all progress records
  const allProgress = db.getAll<MP>("monthly_progress");
  
  // Current month progress
  const existingProgress = useMemo(() => {
    const map: Record<string, MP> = {};
    allProgress.filter(p => p.month === month && p.year === year).forEach(p => { map[p.studentId] = p; });
    return map;
  }, [month, year, allProgress]);

  // Previous month progress (for comparison)
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  
  const previousProgress = useMemo(() => {
    const map: Record<string, MP> = {};
    allProgress.filter(p => p.month === previousMonth && p.year === previousYear).forEach(p => { map[p.studentId] = p; });
    return map;
  }, [previousMonth, previousYear, allProgress]);

  // History grouped by month/year
  const progressHistory = useMemo(() => {
    const grouped: Record<string, MP[]> = {};
    allProgress.forEach(p => {
      const key = `${p.month}-${p.year}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(p);
    });
    return grouped;
  }, [allProgress]);

  const [entries, setEntries] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    filteredStudents.forEach(s => {
      const ex = existingProgress[s.id];
      map[s.id] = ex ? {
        currentSipara: ex.currentSipara,
        monthlyLesson: ex.monthlyLesson,
        revisionStatus: ex.revisionStatus,
        memorizationProgress: ex.memorizationProgress,
        performance: ex.performance,
        behaviour: ex.behaviour
      } : {
        currentSipara: "",
        monthlyLesson: "",
        revisionStatus: "In Progress",
        memorizationProgress: "",
        performance: "good",
        behaviour: "good"
      };
    });
    return map;
  });

  const handleSave = () => {
    const filtered = allProgress.filter(p => !(p.month === month && p.year === year));
    const newEntries: MP[] = filteredStudents.map(s => ({
      id: existingProgress[s.id]?.id ?? generateId(),
      studentId: s.id,
      month,
      year,
      ...entries[s.id]
    }));
    storage.set("monthly_progress", [...filtered, ...newEntries]);
    logActivity(`Saved monthly progress for ${MONTHS[month - 1]} ${year}`, "progress", "batch", user?.id || "");
    alert(`Monthly progress for ${MONTHS[month - 1]} ${year} saved successfully!`);
    window.location.reload();
  };

  // Calculate progress percentage for a student
  const calculateProgressPercentage = (current: MP | undefined, previous: MP | undefined): number => {
    if (!current && !previous) return 0;
    if (!current && previous) return -100;
    if (current && !previous) return 100;
    
    const currentSipara = getSiparaNumber(current!.currentSipara || "0");
    const previousSipara = getSiparaNumber(previous!.currentSipara || "0");
    const currentPerf = getPerformanceScore(current!.performance);
    const previousPerf = getPerformanceScore(previous!.performance);
    
    // Calculate weighted score (70% sipara progress, 30% performance)
    const siparaDiff = currentSipara - previousSipara;
    const perfDiff = currentPerf - previousPerf;
    
    const totalScore = (siparaDiff * 10) + (perfDiff * 0.3);
    return Math.min(100, Math.max(-100, Math.round(totalScore)));
  };

  // Get trend icon
  const getTrendIcon = (percentage: number) => {
    if (percentage > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (percentage < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (percentage: number) => {
    if (percentage > 0) return "text-green-600 bg-green-50 dark:bg-green-900/20";
    if (percentage < 0) return "text-red-600 bg-red-50 dark:bg-red-900/20";
    return "text-gray-600 bg-gray-50 dark:bg-gray-800";
  };

  const getMonthYearKey = (month: number, year: number) => `${MONTHS[month - 1]} ${year}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Monthly Progress</h1>
          <p className="text-sm text-muted-foreground">Track Quran progress with month-to-month comparison</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowComparison(!showComparison)} className={`px-4 py-2 rounded flex items-center gap-2 ${showComparison ? "bg-primary text-primary-foreground" : "border border-input hover:bg-accent"}`}>
            <TrendingUp className="w-4 h-4" /> {showComparison ? "Hide Comparison" : "Show Comparison"}
          </button>
          <button onClick={() => setShowHistory(!showHistory)} className={`px-4 py-2 rounded flex items-center gap-2 ${showHistory ? "bg-primary text-primary-foreground" : "border border-input hover:bg-accent"}`}>
            <History className="w-4 h-4" /> {showHistory ? "Add New" : "View History"}
          </button>
        </div>
      </div>

      {!showHistory ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="px-3 py-2 border rounded">
              {MONTHS.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))} className="px-3 py-2 border rounded">
              {Array.from({ length: 5 }, (_, i) => now.getFullYear() - 2 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="px-3 py-2 border rounded">
              <option value="all">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.className}</option>)}
            </select>
            <button onClick={handleSave} className="bg-primary text-primary-foreground px-4 py-2 rounded flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Progress
            </button>
          </div>

          {/* Comparison Summary */}
          {showComparison && previousMonth && (
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-4 border border-primary/20">
              <h3 className="text-sm font-semibold mb-3">📊 Progress Comparison: {getMonthYearKey(previousMonth, previousYear)} → {getMonthYearKey(month, year)}</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-primary">
                    {filteredStudents.filter(s => {
                      const current = existingProgress[s.id];
                      const previous = previousProgress[s.id];
                      return current && previous && getSiparaNumber(current.currentSipara) > getSiparaNumber(previous.currentSipara);
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Students Improved</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-amber-600">
                    {filteredStudents.filter(s => {
                      const current = existingProgress[s.id];
                      const previous = previousProgress[s.id];
                      return current && previous && getSiparaNumber(current.currentSipara) === getSiparaNumber(previous.currentSipara);
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">No Change</p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {filteredStudents.filter(s => {
                      const current = existingProgress[s.id];
                      const previous = previousProgress[s.id];
                      return current && previous && getSiparaNumber(current.currentSipara) < getSiparaNumber(previous.currentSipara);
                    }).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Students Declined</p>
                </div>
              </div>
            </div>
          )}

          {/* Main Table with Comparison */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-3 py-3">Student</th>
                    <th className="text-left px-3 py-3">Current Sipara</th>
                    {showComparison && <th className="text-left px-3 py-3">Previous Sipara</th>}
                    <th className="text-left px-3 py-3">Monthly Lesson</th>
                    <th className="text-left px-3 py-3">Revision</th>
                    <th className="text-left px-3 py-3">Memorization</th>
                    <th className="text-left px-3 py-3">Performance</th>
                    {showComparison && <th className="text-left px-3 py-3">Progress</th>}
                    <th className="text-left px-3 py-3">Behaviour</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(s => {
                    const e = entries[s.id] ?? {};
                    const currentSipara = e.currentSipara || "";
                    const previous = previousProgress[s.id];
                    const previousSipara = previous?.currentSipara || "";
                    const progressPercent = calculateProgressPercentage(existingProgress[s.id], previous);
                    
                    return (
                      <tr key={s.id} className="border-b border-border/50 hover:bg-accent/30">
                        <td className="px-3 py-2.5 font-medium text-foreground">{s.studentName}</td>
                        <td className="px-3 py-2.5">
                          <input value={currentSipara} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], currentSipara: ev.target.value } }))} placeholder="e.g., Para 5" className="w-32 px-2 py-1 text-xs border rounded" />
                        </td>
                        {showComparison && (
                          <td className="px-3 py-2.5">
                            <span className="text-sm">
                              {previousSipara || <span className="text-muted-foreground italic">No data</span>}
                            </span>
                          </td>
                        )}
                        <td className="px-3 py-2.5"><input value={e.monthlyLesson || ""} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], monthlyLesson: ev.target.value } }))} placeholder="Lesson" className="w-28 px-2 py-1 text-xs border rounded" /></td>
                        <td className="px-3 py-2.5">
                          <select value={e.revisionStatus || "In Progress"} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], revisionStatus: ev.target.value } }))} className="px-2 py-1 text-xs border rounded">
                            <option>Completed</option><option>In Progress</option><option>Not Started</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5"><input value={e.memorizationProgress || ""} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], memorizationProgress: ev.target.value } }))} placeholder="Ayaat" className="w-28 px-2 py-1 text-xs border rounded" /></td>
                        <td className="px-3 py-2.5">
                          <select value={e.performance || "good"} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], performance: ev.target.value } }))} className="px-2 py-1 text-xs border rounded">
                            <option value="excellent">Excellent</option><option value="good">Good</option><option value="weak">Weak</option><option value="needs_attention">Needs Attention</option>
                          </select>
                        </td>
                        {showComparison && (
                          <td className="px-3 py-2.5">
                            {existingProgress[s.id] && previous ? (
                              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getTrendColor(progressPercent)}`}>
                                {getTrendIcon(progressPercent)}
                                <span>{progressPercent > 0 ? `+${progressPercent}%` : `${progressPercent}%`}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">N/A</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-2.5">
                          <select value={e.behaviour || "good"} onChange={ev => setEntries(p => ({ ...p, [s.id]: { ...p[s.id], behaviour: ev.target.value } }))} className="px-2 py-1 text-xs border rounded">
                            <option value="good">Good</option><option value="normal">Normal</option><option value="naughty">Naughty</option>
                          </select>
                        </td>
                       </tr>
                    );
                  })}
                </tbody>
               </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-6">
          <h2 className="text-xl font-bold">📚 Progress History</h2>
          {Object.keys(progressHistory).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No progress records found</div>
          ) : (
            Object.entries(progressHistory).sort().reverse().map(([key, records]) => {
              const [monthNum, yearNum] = key.split("-");
              const monthName = MONTHS[parseInt(monthNum) - 1];
              return (
                <div key={key} className="bg-card rounded-xl border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-muted/20">
                    <h3 className="text-lg font-semibold">{monthName} {yearNum}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/10">
                          <th className="text-left px-4 py-2">Student</th>
                          <th className="text-left px-4 py-2">Sipara</th>
                          <th className="text-left px-4 py-2">Lesson</th>
                          <th className="text-left px-4 py-2">Performance</th>
                          <th className="text-left px-4 py-2">Behaviour</th>
                         </tr>
                      </thead>
                      <tbody>
                        {records.map(record => {
                          const student = students.find(s => s.id === record.studentId);
                          return (
                            <tr key={record.id} className="border-b border-border/50">
                              <td className="px-4 py-2 font-medium">{student?.studentName || "Unknown"}</td>
                              <td className="px-4 py-2">{record.currentSipara || "—"}</td>
                              <td className="px-4 py-2">{record.monthlyLesson || "—"}</td>
                              <td className="px-4 py-2 capitalize"><span className={`px-2 py-0.5 rounded-full text-xs ${record.performance === 'excellent' ? 'bg-green-100 text-green-700' : record.performance === 'good' ? 'bg-blue-100 text-blue-700' : record.performance === 'weak' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{record.performance}</span></td>
                              <td className="px-4 py-2 capitalize"><span className={`px-2 py-0.5 rounded-full text-xs ${record.behaviour === 'good' ? 'bg-green-100 text-green-700' : record.behaviour === 'normal' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>{record.behaviour}</span></td>
                             </tr>
                          );
                        })}
                      </tbody>
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