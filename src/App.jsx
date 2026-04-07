import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import AdvancedAuthScreen from './components/AdvancedAuthScreen';
import LandingPage from './components/LandingPage';

// Lazy load
const Feed = lazy(() => import('./components/Feed'));
const Chat = lazy(() => import('./components/Chat'));
const AdminHQ = lazy(() => import('./components/AdminHQ'));
const VideoCall = lazy(() => import('./components/VideoCall'));
const ProfilePage = lazy(() => import('./components/ProfilePage'));

// Loading Screen
const LoadingScreen = () => (
  <div className="min-h-screen bg-orbitSpace flex items-center justify-center">
    <div className="text-center">
      <div className="spinner mb-4 mx-auto"></div>
      <h2 className="text-2xl font-bold text-gradient animate-glow">ORBIT</h2>
      <p className="text-gray-400 text-sm mt-2">جاري التحميل...</p>
    </div>
  </div>
);

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/home" replace />;
  return children;
};

// Public Route (redirect to /home if logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/home" replace />;
  return children;
};

function AppRoutes() {
  const { loading } = useAuth();
  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Landing - صفحة الهبوط للزوار */}
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />

      {/* Login */}
      <Route path="/login" element={<PublicRoute><AdvancedAuthScreen /></PublicRoute>} />

      {/* Home Feed */}
      <Route path="/home" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingScreen />}><Feed /></Suspense>
        </ProtectedRoute>
      } />

      {/* Chat - with optional userId */}
      <Route path="/chat/:userId?" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingScreen />}><Chat /></Suspense>
        </ProtectedRoute>
      } />

      {/* Profile */}
      <Route path="/profile/:userId?" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingScreen />}><ProfilePage /></Suspense>
        </ProtectedRoute>
      } />

      {/* Video Call */}
      <Route path="/call/:callId" element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingScreen />}><VideoCall /></Suspense>
        </ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute adminOnly>
          <Suspense fallback={<LoadingScreen />}><AdminHQ /></Suspense>
        </ProtectedRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}
