import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';
import HomePage from './pages/HomePage';
import ScannerPage from './pages/ScannerPage';
import DashboardPage from './pages/DashboardPage';
import PlantDetailPage from './pages/PlantDetailPage';
import RecommendationsPage from './pages/RecommendationsPage';
import ProfilePage from './pages/ProfilePage';
import RemindersPage from './pages/RemindersPage';
import { Toaster } from './components/ui/sonner';

function App() {
  return (
    <Router>
      <div className="App">
        <Toaster position="top-center" />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/plant/:plantId" element={<PlantDetailPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/reminders" element={<RemindersPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;