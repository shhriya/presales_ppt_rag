import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import TabsApp from "./pages/TabsApp.jsx";
import ChunksView from "./pages/ChunksView.jsx";
import FileViewer from "./pages/FileViewer.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import LogoutPage from "./context/LogoutPage.jsx";
import ExtractionOverlay from "./components/ExtractionOverlay";
// ProtectedRoute wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ExtractionOverlay />
      <Router>
        <Routes>
          {/* Login page */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LogoutPage />} />

          {/* Protected TabsApp */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <TabsApp />
              </ProtectedRoute>
            }
          />

          {/* Protected ChunksView */}
          <Route
            path="/chunks/:sessionId"
            element={
              <ProtectedRoute>
                <ChunksView />
              </ProtectedRoute>
            }
          />

          {/* Protected File Viewer */}
          <Route
            path="/files/:fileId"
            element={
              <ProtectedRoute>
                <FileViewer />
              </ProtectedRoute>
            }
          />

          {/* Redirect unknown paths to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}