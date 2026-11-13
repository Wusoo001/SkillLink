import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  CalendarCheck,
  Flag,
  Star,
  Wallet,
  LogOut,
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Users", icon: Users },
  { to: "/posts", label: "Posts", icon: FileText },
  { to: "/bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/reports", label: "Reports", icon: Flag },
  { to: "/appeals", label: "Appeals", icon: MessageSquare },
  { to: "/reviews", label: "Reviews", icon: Star },
  { to: "/transactions", label: "Transactions", icon: Wallet },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="w-64 bg-white border-r border-border flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center text-white font-extrabold">
              S
            </div>
            <div>
              <p className="font-extrabold text-ink leading-tight">Street</p>
              <p className="text-xs text-inkMuted">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-inkSoft hover:bg-primaryLight hover:text-primary"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <p className="px-3 py-2 text-xs text-inkMuted truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-danger hover:bg-red-50 transition"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}