// App.jsx — نقطة الدخول الرئيسية للتطبيق

import { useEffect, useState } from "react";
import { AuthProvider, useAuth }  from "./hooks/useAuth";
import AuthScreen   from "./components/Auth";
import FeedPage     from "./components/Feed";
import ChatPage     from "./components/Chat";
import WatchPage    from "./components/Watch";
import ProfilePage  from "./components/Profile";
import AdminHQ      from "./components/Admin";
import BottomNav    from "./components/Shared/BottomNav";
import { GlobalCSS, T, Spinner } from "./components/Shared";

// ─── Protected App Shell ──────────────────────────────────────
function AppShell() {
  const { user, logout } = useAuth();
  const [page, setPage]  = useState("feed");
  const [userData, setUserData] = useState(null);

  useEffect(() => {
    if (user) {
      // دمج بيانات Firebase مع الـ state المحلي
      if (!userData) setUserData(user);
      if (user.isAdmin && page === "feed") setPage("admin");
    }
  }, [user]);

  // جاري تحميل حالة المستخدم
  if (user === undefined) {
    return (
      <>
        <style>{GlobalCSS}</style>
        <div style={{
          minHeight: "100vh", background: T.bg,
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 16,
        }}>
          <div style={{ fontSize: 52, filter: `drop-shadow(0 0 20px ${T.cyan})` }}>🌐</div>
          <Spinner size={40} />
          <p style={{ color: T.textMuted, fontFamily: T.font }}>جاري تحميل Orbit...</p>
        </div>
      </>
    );
  }

  // غير مسجل → شاشة تسجيل الدخول
  if (!user) {
    return (
      <>
        <style>{GlobalCSS}</style>
        <AuthScreen />
      </>
    );
  }

  const currentUser = userData || user || {};

  // صفحة الأدمن السرية (بدون Bottom Nav عادي)
  if (page === "admin") {
    return (
      <>
        <style>{GlobalCSS}</style>
        <AdminHQ user={currentUser} onLogout={logout} />
        {currentUser.isAdmin && (
          <BottomNav active="admin" onNavigate={setPage} isAdmin />
        )}
      </>
    );
  }

  return (
    <>
      <style>{GlobalCSS}</style>

      {/* Background Glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `
          radial-gradient(ellipse at top left, rgba(0,245,255,0.04) 0%, transparent 50%),
          radial-gradient(ellipse at bottom right, rgba(123,47,255,0.04) 0%, transparent 50%)
        `,
      }} />

      {/* Main Content */}
      <div style={{
        minHeight: "100vh", background: T.bg,
        fontFamily: T.font, color: T.textPrimary,
        paddingBottom: 70, position: "relative", zIndex: 1,
      }}>
        {page === "feed"    && <FeedPage   user={currentUser} onNavigate={setPage} />}
        {page === "chat"    && <ChatPage   user={currentUser} />}
        {page === "watch"   && <WatchPage  user={currentUser} />}
        {page === "profile" && (
          <ProfilePage
            user={currentUser}
            onUpdate={(u) => setUserData(u)}
            onLogout={logout}
          />
        )}
      </div>

      <BottomNav active={page} onNavigate={setPage} isAdmin={currentUser.isAdmin} />
    </>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
