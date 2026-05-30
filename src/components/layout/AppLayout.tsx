import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import {
  LayoutDashboard, Users, GraduationCap, CalendarCheck, School,
  TrendingUp, FileText, Bell, Settings, LogOut, Menu, X,
  Moon, Sun, History, UserCircle, Target
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/students", label: "Students", icon: GraduationCap },
  { href: "/ustads", label: "Ustads", icon: Users },
  { href: "/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/attendance-history", label: "History", icon: History },
  { href: "/classes", label: "Classes", icon: School },
  { href: "/monthly-progress", label: "Progress", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin-profile", label: "My Profile", icon: UserCircle },
  // Add in navItems
{ href: "/target-reports", label: "Target Reports", icon: Target },
];

const ustadNavItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  // Add in ustadNavItems
{ href: "/ustad-target-report", label: "Target Report", icon: FileText },
  { href: "/ustad-attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/ustad-progress", label: "Progress", icon: TrendingUp },
  { href: "/ustad-profile", label: "My Profile", icon: UserCircle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = user?.role === "admin" ? navItems : ustadNavItems;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-primary text-primary-foreground"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-card border-r border-border transform transition-transform duration-200 z-40 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <div className="p-5 border-b border-border">
          <h1 className="text-lg font-bold text-foreground">Madarsa Tul Madina</h1>
          <p className="text-xs text-muted-foreground mt-1">Fatima Masjid</p>
        </div>
        
        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                <div className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors cursor-pointer ${isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}>
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              {user?.photo ? (
                <img src={user.photo} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <UserCircle className="w-5 h-5 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.role === "admin" ? "Administrator" : "Ustad"}</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-accent transition-colors mb-2"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="text-sm font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}