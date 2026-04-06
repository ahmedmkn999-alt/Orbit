import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import AuthScreen from './components/AuthScreen';
import Feed from './components/Feed';
import Chat from './components/Chat';
import AdminHQ from './components/AdminHQ';

export default function App() {
  const [user, setUser] = useState(null);

  // حماية المسارات: لو مش مسجل يرجعه لشاشة الدخول
  const ProtectedRoute = ({ children }) => {
    return user ? children : <Navigate to="/login" />;
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={
          user ? <Navigate to="/" /> : <AuthScreen onLogin={setUser} />
        } />
        
        <Route path="/" element={
          <ProtectedRoute>
            <Feed user={user} onLogout={() => setUser(null)} />
          </ProtectedRoute>
        } />

        <Route path="/chat" element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          user?.phone === "01128381838" ? <AdminHQ /> : <Navigate to="/" />
        } />
      </Routes>
    </Router>
  );
}
