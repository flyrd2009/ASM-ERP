import { useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import ThemeSettingsModal from "./ThemeSettingsModal";
import { photoSrc } from "../utils/photo";

// Grouped nav, matching the reference ERP's sidebar sections. Sparse today
// (few modules exist yet) but the group structure is where future modules
// (Fees, Attendance, Homework, etc.) slot in as they're built.
const NAV_GROUPS_BY_ROLE = {
  admin: [
    { label: "Overview", items: [{ to: "/dashboard", label: "Dashboard" }] },
    { label: "Administration", items: [
      { to: "/admin/users", label: "User Management" },
      { to: "/admin/security-settings", label: "Security Settings" },
    ]},
    { label: "Academics", items: [
      { to: "/students", label: "Students" },
      { to: "/attendance/mark", label: "Attendance" },
    ]},
  ],
  faculty: [
    { label: "Overview", items: [{ to: "/dashboard", label: "Dashboard" }] },
    { label: "Academics", items: [
      { to: "/students", label: "Students" },
      { to: "/attendance/mark", label: "Attendance" },
    ]},
  ],
  student: [
    { label: "Overview", items: [{ to: "/dashboard", label: "Dashboard" }] },
    { label: "My Records", items: [
      { to: "/my-profile", label: "My Profile" },
      { to: "/my-attendance", label: "Attendance" },
    ]},
  ],
  parent: [{ label: "Overview", items: [{ to: "/dashboard", label: "Dashboard" }] }],
  accounts: [{ label: "Overview", items: [{ to: "/dashboard", label: "Dashboard" }] }],
};

function initials(name) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export default function AppLayout() {
  const { user, logout, logoutAllDevices } = useAuth();
  const navigate = useNavigate();
  const navGroups = NAV_GROUPS_BY_ROLE[user?.role] || [{ label: "Overview", items: [{ to: "/dashboard", label: "Dashboard" }] }];

  const [menuOpen, setMenuOpen] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top header bar */}
      <header
        className="h-14 flex items-center justify-between px-4 shrink-0 z-20"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        <div className="flex items-center gap-2">
          <div className="bg-white rounded-md p-1">
            <img src="/logo.png" alt="ASM Polytechnic, Mathura" className="h-7 w-auto" />
          </div>
          <div className="text-white leading-tight hidden sm:block">
            <p className="text-sm font-semibold">ASM Polytechnic, Mathura</p>
            <p className="text-xs text-white/70">ERP Portal</p>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center text-sm font-semibold hover:bg-white/30 overflow-hidden"
          >
            {user?.photoUrl ? (
              <img src={photoSrc(user.photoUrl)} alt={user.fullName} className="w-full h-full object-cover" />
            ) : (
              initials(user?.fullName)
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-100 py-2 text-sm z-30">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="font-medium text-slate-800 truncate">{user?.fullName}</p>
                <p className="text-xs text-slate-400 capitalize">{user?.role} · {user?.loginId}</p>
              </div>

              {user?.role === "student" && (
                <button
                  onClick={() => { setMenuOpen(false); navigate("/my-profile"); }}
                  className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50"
                >
                  View Profile
                </button>
              )}
              <button
                onClick={() => { setMenuOpen(false); setShowThemeModal(true); }}
                className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50"
              >
                Settings & Preferences
              </button>
              <button
                onClick={() => { setMenuOpen(false); navigate("/change-password"); }}
                className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50"
              >
                Change Password
              </button>

              <div className="border-t border-slate-100 mt-1 pt-1">
                <button onClick={logout} className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50">
                  Log out
                </button>
                <button onClick={logoutAllDevices} className="w-full text-left px-4 py-2 text-slate-600 hover:bg-slate-50">
                  Log out all devices
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0">
          <nav className="flex-1 py-3">
            {navGroups.map((group) => (
              <div key={group.label} className="mb-3">
                <p className="px-4 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
                  {group.label}
                </p>
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `block px-4 py-2 text-sm ${isActive ? "font-medium" : "text-slate-600 hover:bg-slate-50"}`
                    }
                    style={({ isActive }) =>
                      isActive
                        ? { backgroundColor: "#f8fafc", color: "var(--brand-primary)", borderRight: "3px solid var(--brand-primary)" }
                        : undefined
                    }
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {showThemeModal && <ThemeSettingsModal onClose={() => setShowThemeModal(false)} />}
    </div>
  );
}
