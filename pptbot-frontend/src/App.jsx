import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage.jsx";
import TabsApp from "./pages/TabsApp.jsx";
import ChunksView from "./pages/ChunksView.jsx";
import FileViewer from "./pages/FileViewer.jsx";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import LogoutPage from "./context/LogoutPage.jsx";
import ExtractionOverlay from "./components/ExtractionOverlay";
import RagasEvaluation from "./components/RagasEvaluation";
import RagasConfig from "./components/RagasConfig";
import GroupsFileViewer from "./components/GroupsFileViewer";
 
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
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LogoutPage />} />
          <Route path="/" element={<ProtectedRoute><TabsApp /></ProtectedRoute>}/>
          <Route path="/chunks/:sessionId"element={<ProtectedRoute><ChunksView /></ProtectedRoute>}/>
          <Route path="/groups/:groupId/file/:fileId/:filename"element={<ProtectedRoute><GroupsFileViewer /></ProtectedRoute>}/>
          <Route path="/ragas" element={<RagasEvaluation />} />
          <Route path="/ragas/config" element={<RagasConfig />} />
          <Route path="/files/:fileId" element={<ProtectedRoute><FileViewer /></ProtectedRoute>}/>
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}