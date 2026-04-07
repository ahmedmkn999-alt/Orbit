import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import AdvancedAuthScreen from './components/AdvancedAuthScreen';

// Lazy load components for better performance
const Feed = lazy(() => import('./components/Feed'));
const Chat = lazy(() => import('./components/Chat'));
const AdminHQ = lazy(() => import('./components/AdminHQ'));
const VideoCall = lazy(() => import('./components/VideoCall'));

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-orbitSpace flex items-center justify-center">
    <div className="text-center">
      <div className="spinner mb-4"></div>
      <h2 className="text-2xl font-bold text-gradient animate-glow">ORBIT</h2>
      <p className="text-gray-400 text-sm mt-2">جاري التحميل...</p>
    </div>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  
  return children;
};

// Main App Routes
function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          isAuthenticated ? <Navigate to="/" replace /> : <AdvancedAuthScreen />
        } 
      />
      
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen />}>
              <Feed />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/chat/:userId?" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen />}>
              <Chat />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/call/:callId" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingScreen />}>
              <VideoCall />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/admin" 
        element={
          <ProtectedRoute adminOnly>
            <Suspense fallback={<LoadingScreen />}>
              <AdminHQ />
            </Suspense>
          </ProtectedRoute>
        } 
      />

      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// Main App with Providers
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
