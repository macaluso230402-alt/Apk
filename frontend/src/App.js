import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Toaster } from './components/ui/sonner';
import useIsMobile from './hooks/useIsMobile';

// Desktop pages
import HomePage from './pages/HomePage';
import ScannerPage from './pages/ScannerPage';
import DashboardPage from './pages/DashboardPage';
import PlantDetailPage from './pages/PlantDetailPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ProfilePage from './pages/ProfilePage';
import RemindersPage from './pages/RemindersPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Mobile pages
import MobileHomePage from './mobile/MobileHomePage';
import MobileScannerPage from './mobile/MobileScannerPage';
import MobileDashboardPage from './mobile/MobileDashboardPage';
import MobilePlantDetailPage from './mobile/MobilePlantDetailPage';
import MobileRecommendationsPage from './mobile/MobileRecommendationsPage';
import MobileProfilePage from './mobile/MobileProfilePage';
import MobileRemindersPage from './mobile/MobileRemindersPage';

function AppRoutes() {
  const isMobile = useIsMobile();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/" element={<ProtectedRoute>{isMobile ? <MobileHomePage /> : <HomePage />}</ProtectedRoute>} />
      <Route path="/scanner" element={<ProtectedRoute>{isMobile ? <MobileScannerPage /> : <ScannerPage />}</ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute>{isMobile ? <MobileDashboardPage /> : <DashboardPage />}</ProtectedRoute>} />
      <Route path="/plant/:plantId" element={<ProtectedRoute>{isMobile ? <MobilePlantDetailPage /> : <PlantDetailPage />}</ProtectedRoute>} />
      <Route path="/recommendations" element={<ProtectedRoute>{isMobile ? <MobileRecommendationsPage /> : <RecommendationsPage />}</ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute>{isMobile ? <MobileProfilePage /> : <ProfilePage />}</ProtectedRoute>} />
      <Route path="/reminders" element={<ProtectedRoute>{isMobile ? <MobileRemindersPage /> : <RemindersPage />}</ProtectedRoute>} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster position="top-center" />
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
