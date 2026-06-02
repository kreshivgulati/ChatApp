import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Chat from './pages/Chat';
import LoadingScreen from './components/LoadingScreen';
import { useState } from 'react';

const ProtectedRoute = ({ children, workspaceReady, setWorkspaceReady }) => {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/" />;

  if (!workspaceReady) {
    return <LoadingScreen onComplete={() => setWorkspaceReady(true)} />;
  }

  return children;
};

const AppRoutes = ({ workspaceReady, setWorkspaceReady }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/chat" /> : <Login />} />
      <Route path="/chat" element={<ProtectedRoute workspaceReady={workspaceReady} setWorkspaceReady={setWorkspaceReady}><Chat /></ProtectedRoute>} />
      <Route path="/chat/:userId" element={<ProtectedRoute workspaceReady={workspaceReady} setWorkspaceReady={setWorkspaceReady}><Chat /></ProtectedRoute>} />
      <Route path="/chat/group/:groupId" element={<ProtectedRoute workspaceReady={workspaceReady} setWorkspaceReady={setWorkspaceReady}><Chat /></ProtectedRoute>} />
    </Routes>
  );
};

export default function App() {
  const [workspaceReady, setWorkspaceReady] = useState(false);

  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes workspaceReady={workspaceReady} setWorkspaceReady={setWorkspaceReady} />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}