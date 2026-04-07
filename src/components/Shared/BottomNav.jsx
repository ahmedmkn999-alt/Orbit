// components/Shared/BottomNav.jsx — شريط التنقل السفلي

import { T } from "./index";

const TABS = [
  { id: "feed",    icon: "🏠", label: "الرئيسية" },
  { id: "chat",    icon: "💬", label: "الدردشة" },
  { id: "watch",   icon: "📺", label: "Watch" },
  { id: "profile", icon: "👤", label: "حسابي" },
];

const ADMIN_TAB = { id: "admin", icon: "🛸", label: "Admin" };

export default function BottomNav({ active, onNavigate, isAdmin }) {
  const tabs = isAdmin ? [...TABS, ADMIN_TAB] : TABS;

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0,
      background: "rgba(10,25,47,0.95)",
      borderTop: `1px solid ${T.border}`,
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      display: "flex", justifyContent: "space-around",
      padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
      zIndex: 500,
    }}>
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            style={{
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: 2,
              background: "none", border: "none",
              color: isActive ? T.cyan : T.textMuted,
              cursor: "pointer", padding: "4px 16px",
              fontFamily: T.font, transition: "all 0.2s",
              position: "relative",
            }}
          >
            <span style={{
              fontSize: 24,
              filter: isActive ? `drop-shadow(0 0 8px ${T.cyan})` : "none",
              transform: isActive ? "translateY(-3px)" : "none",
              transition: "all 0.25s cubic-bezier(.34,1.56,.64,1)",
            }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: 10, fontWeight: isActive ? 700 : 400,
              transition: "all 0.2s",
            }}>
              {tab.label}
            </span>
            {isActive && (
              <div style={{
                position: "absolute", bottom: -8,
                width: 4, height: 4, borderRadius: "50%",
                background: T.cyan, boxShadow: T.cyanGlow,
              }} />
            )}
          </button>
        );
      })}
    </nav>
  );
}
