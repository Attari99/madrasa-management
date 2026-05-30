import { useEffect, useState } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { seedIfNeeded } from "./utils/seedData";
import { pullAll, pushAll } from "./lib/supabaseSync";
import AppLayout from "./components/layout/AppLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UstadList from "./pages/ustads/UstadList";
import UstadForm from "./pages/ustads/UstadForm";
import UstadProfile from "./pages/ustads/UstadProfile";
import StudentList from "./pages/students/StudentList";
import StudentForm from "./pages/students/StudentForm";
import StudentProfile from "./pages/students/StudentProfile";
import AttendancePage from "./pages/attendance/AttendancePage";
import ClassList from "./pages/classes/ClassList";
import MonthlyProgress from "./pages/monthly-progress/MonthlyProgress";
import Reports from "../reports/Reports";
import Notifications from "./pages/notifications/Notifications";
import Settings from "./pages/settings/Settings";
import UstadDashboard from "./pages/ustad/UstadDashboard";
import UstadAttendancePage from "./pages/ustad/UstadAttendance";
import UstadProgress from "./pages/ustad/UstadProgress";
import AttendanceHistory from "./components/attendance/AttendanceHistory";
import AdminProfile from "./pages/admin/AdminProfile";
import UstadProfilePage from "./pages/ustad/UstadProfilePage";
import NotFound from "./pages/not-found";
import TargetReports from "./pages/admin/TargetReports";
import UstadTargetReport from "./pages/ustad/UstadTargetReport";
function AdminRoutes() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/ustads" component={UstadList} />
      <Route path="/ustads/new" component={() => <UstadForm />} />
      <Route path="/ustads/:id/edit">{(params) => params && <UstadForm id={params.id} />}</Route>
      <Route path="/ustads/:id" component={UstadProfile} />
      <Route path="/students" component={StudentList} />
      <Route path="/students/new" component={() => <StudentForm />} />
      <Route path="/students/:id/edit">{(params) => params && <StudentForm id={params.id} />}</Route>
      <Route path="/students/:id" component={StudentProfile} />
      <Route path="/target-reports" component={TargetReports} />
      <Route path="/attendance" component={AttendancePage} />
      <Route path="/attendance-history" component={AttendanceHistory} />
      <Route path="/classes" component={ClassList} />
      <Route path="/monthly-progress" component={MonthlyProgress} />
      <Route path="/reports" component={Reports} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin-profile" component={AdminProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function UstadRoutes() {
  return (
    <Switch>
      <Route path="/" component={UstadDashboard} />
      <Route path="/ustad-dashboard" component={UstadDashboard} />
      <Route path="/ustad-attendance" component={UstadAttendancePage} />
      <Route path="/ustad-progress" component={UstadProgress} />
      <Route path="/ustad-target-report" component={UstadTargetReport} />
      <Route path="/ustad-profile" component={UstadProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppRouter() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <AppLayout>
      {user?.role === "admin" ? <AdminRoutes /> : <UstadRoutes />}
    </AppLayout>
  );
}

function SyncLoader({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("Connecting to Supabase...");

  useEffect(() => {
    async function init() {
      try {
        setStatus("Loading data from cloud...");
        const pulled = await pullAll();
        if (pulled) {
          setStatus("Data synced ✓");
        } else {
          setStatus("Using local data...");
        }
        seedIfNeeded();
        if (!pulled) {
          setStatus("Saving to cloud...");
          await pushAll();
        }
      } catch {
        setStatus("Offline — using local data");
        seedIfNeeded();
      } finally {
        setReady(true);
      }
    }
    init();
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div className="text-center">
          <p className="font-semibold text-foreground text-lg">Madarsa Tul Madina</p>
          <p className="text-sm text-muted-foreground mt-1 animate-pulse">{status}</p>
        </div>
        <div className="w-40 h-1 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: "60%" }} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SyncLoader>
          <WouterRouter base="/">
            <AppRouter />
          </WouterRouter>
        </SyncLoader>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;