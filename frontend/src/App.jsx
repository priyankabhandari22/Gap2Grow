import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { DashboardProvider } from './context/DashboardContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ResumeAnalyzer from './pages/ResumeAnalyzer';
import SkillGapForecast from './pages/SkillGapForecast';
import MarketIntelligence from './pages/MarketIntelligence';
import LearningRoadmap from './pages/LearningRoadmap';
import AiCareerReport from './pages/AiCareerReport';
import Settings from './pages/Settings';

function App() {
  return (
    <AuthProvider>
      <DashboardProvider>
        <Router>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />

            {/* Protected/App Routes with Sidebar */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <MainLayout>
                  <Profile />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/skills" element={
              <ProtectedRoute>
                <MainLayout>
                  <ResumeAnalyzer />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/resume-analyzer" element={
              <ProtectedRoute>
                <MainLayout>
                  <ResumeAnalyzer />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/skill-gap" element={
              <ProtectedRoute>
                <MainLayout>
                  <SkillGapForecast />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/market-intelligence" element={
              <ProtectedRoute>
                <MainLayout>
                  <MarketIntelligence />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/roadmap" element={
              <ProtectedRoute>
                <MainLayout>
                  <LearningRoadmap />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/career-report" element={
              <ProtectedRoute>
                <MainLayout>
                  <AiCareerReport />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/progress" element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <MainLayout>
                  <Settings />
                </MainLayout>
              </ProtectedRoute>
            } />

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </DashboardProvider>
    </AuthProvider>
  );
}

export default App;
