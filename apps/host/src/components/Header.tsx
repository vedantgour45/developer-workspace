import { NavLink, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  HelpCircle,
  Plus,
} from "lucide-react";
import BrandMark from "./BrandMark";
import HelpModal from "./HelpModal";
import ConfirmModal from "./ConfirmModal";
import { useAuth } from "../auth/AuthContext";
import { toast } from "../shared/toast";

const tabs = [
  { to: "/board", label: "Tasks" },
  { to: "/docs", label: "Notes" },
  { to: "/analytics", label: "Analytics" },
  { to: "/changelog", label: "Changelog" },
] as const;

export default function Header() {
  const { user, enforced, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const meta = (user?.user_metadata ?? {}) as {
    full_name?: string;
    name?: string;
    avatar_url?: string;
  };
  const displayName =
    meta.full_name ||
    meta.name ||
    (user?.email ? user.email.split("@")[0] : "You");
  const avatarUrl = meta.avatar_url;
  const initials = (displayName || "YO").slice(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-canvas border-b border-hairline flex items-center px-6 sticky top-0 z-30">
      {/* Title — also acts as Dashboard link */}
      <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
        <BrandMark
          size={18}
          className="text-stone-500 transition-colors"
        />
        <span className="font-['Space_Grotesk'] text-[17px] tracking-tight">
          <span className="font-light text-stone-400">Developer </span>
          <span className="font-medium text-ink">Workspace</span>
        </span>
      </Link>

      {/* Tabs */}
      <nav className="ml-8 flex items-center gap-1" aria-label="Primary">
        {tabs.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `h-9 px-3.5 rounded-pill text-[13px] font-medium transition-colors inline-flex items-center ${
                isActive
                  ? "bg-ink text-on-primary"
                  : "text-body hover:bg-surface-card hover:text-ink"
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/board"
          className="hidden sm:inline-flex items-center gap-1.5 h-9 px-4 rounded-pill bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-active transition-colors"
        >
          <Plus size={14} strokeWidth={2} />
          New task
        </Link>

        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="hidden w-9 h-9 rounded-md text-muted hover:text-ink hover:bg-surface-card items-center justify-center transition-colors"
          title="Help & shortcuts (?)"
          aria-label="Help & shortcuts"
        >
          <HelpCircle size={16} strokeWidth={1.7} />
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="h-9 pl-1 pr-2.5 rounded-pill bg-canvas border border-hairline hover:border-ink/30 flex items-center gap-2 transition-colors"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <span className="w-7 h-7 rounded-full bg-coral text-on-primary text-[11px] font-medium flex items-center justify-center flex-shrink-0">
                {initials}
              </span>
            )}
            <span className="hidden sm:inline text-[13px] text-ink font-medium max-w-[120px] truncate">
              {displayName}
            </span>
            <ChevronDown
              size={14}
              strokeWidth={1.7}
              className="text-muted flex-shrink-0"
            />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-1.5 min-w-[220px] rounded-md bg-canvas border border-hairline overflow-hidden z-40"
              style={{ boxShadow: "0 12px 32px rgba(20,20,19,0.16)" }}
            >
              <div className="px-3 py-2.5 border-b border-hairline-soft">
                <p className="text-[13px] text-ink font-medium truncate">
                  {displayName}
                </p>
                {user?.email && (
                  <p className="text-[11px] text-muted truncate">
                    {user.email}
                  </p>
                )}
                {!enforced && (
                  <p className="text-[11px] text-muted-soft mt-1">Demo mode</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setHelpOpen(true);
                }}
                className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] text-body hover:bg-surface-card transition-colors"
              >
                <SettingsIcon
                  size={15}
                  strokeWidth={1.6}
                  className="text-muted"
                />
                <span className="flex-1">Settings & shortcuts</span>
              </button>
              {enforced ? (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmSignOut(true);
                  }}
                  className="w-full flex items-center gap-2.5 text-left px-3 py-2 text-[13px] text-body hover:bg-error/8 hover:text-error transition-colors border-t border-hairline-soft"
                >
                  <LogOut size={15} strokeWidth={1.6} />
                  <span className="flex-1">Sign out</span>
                </button>
              ) : (
                <p className="px-3 py-2 text-[11px] text-muted-soft border-t border-hairline-soft">
                  Add Supabase keys in{" "}
                  <span className="font-mono">.env.local</span> to enable
                  sign-in.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
      {confirmSignOut && (
        <ConfirmModal
          title="Sign out?"
          message="You'll need to sign in again to come back to your workspace."
          confirmLabel="Sign out"
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={async () => {
            setConfirmSignOut(false);
            try {
              await signOut();
              toast.success("Logged out successfully");
            } catch (err) {
              console.error(err);
              toast.error("Sign out failed", {
                description: err instanceof Error ? err.message : undefined,
              });
            }
          }}
        />
      )}
    </header>
  );
}
