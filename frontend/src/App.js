import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ProfileProvider } from './contexts/ProfileContext';
import { Toaster } from './components/ui/sonner';
import useIsMobile from './hooks/useIsMobile';
import OfflineBanner from './components/OfflineBanner';
import { syncReminders } from './lib/notifications';
import { remindersCache } from './lib/offlineStorage';
import api from './lib/api';

// Desktop pages
import HomePage from './pages/HomePage';
import ScannerPage from './pages/ScannerPage';
import DashboardPage from './pages/DashboardPage';
import PlantDetailPage from './pages/PlantDetailPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ProfilePage from './pages/ProfilePage';
import RemindersPage from './pages/RemindersPage';

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

  React.useEffect(() => {
    // Re-arm scheduled notifications on every app boot (web timers don't survive reload).
    (async () => {
      try {
        const { data } = await api.get('/api/reminders');
        remindersCache.setAll(data);
        syncReminders(data);
      } catch {
        syncReminders(remindersCache.getAll());
      }
    })();
  }, []);

  return (
    <Routes>
      <Route path="/" element={isMobile ? <MobileHomePage /> : <HomePage />} />
      <Route path="/scanner" element={isMobile ? <MobileScannerPage /> : <ScannerPage />} />
      <Route path="/dashboard" element={isMobile ? <MobileDashboardPage /> : <DashboardPage />} />
      <Route path="/plant/:plantId" element={isMobile ? <MobilePlantDetailPage /> : <PlantDetailPage />} />
      <Route path="/recommendations" element={isMobile ? <MobileRecommendationsPage /> : <RecommendationsPage />} />
      <Route path="/profile" element={isMobile ? <MobileProfilePage /> : <ProfilePage />} />
      <Route path="/reminders" element={isMobile ? <MobileRemindersPage /> : <RemindersPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <ProfileProvider>
      <Router>
        <div className="App">
          <Toaster position="top-center" />
          <OfflineBanner />
          <AppRoutes />
        </div>
      </Router>
    </ProfileProvider>
  );
}

export default App;
