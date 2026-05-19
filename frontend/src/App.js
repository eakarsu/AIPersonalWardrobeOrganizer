import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import WardrobePage from './pages/WardrobePage';
import OutfitsPage from './pages/OutfitsPage';
import WearLogPage from './pages/WearLogPage';
import PackingListPage from './pages/PackingListPage';
import AIPage from './pages/AIPage';
import AIInsightsPage from './pages/AIInsightsPage';
import WardrobeAIAdvancedPage from './pages/WardrobeAIAdvancedPage';
import CustomViewsPage from './pages/CustomViewsPage';
import './App.css';

// // === Batch 06 Gaps & Frontend Mounts ===
import CFOutfitOrchestrationAgentPage from './pages/CFOutfitOrchestrationAgentPage';
import CFComputerVisionClosetAuditPage from './pages/CFComputerVisionClosetAuditPage';
import CFShoppingSynergyPage from './pages/CFShoppingSynergyPage';
import CFSeasonalRotationAutomationPage from './pages/CFSeasonalRotationAutomationPage';
import CFTravelCapsuleBuilderPage from './pages/CFTravelCapsuleBuilderPage';
import GapWearPage from './pages/GapWearPage';
import GapPackingPage from './pages/GapPackingPage';
import GapNoSizeFitTrackingForNewPurchaseRecommendatiPage from './pages/GapNoSizeFitTrackingForNewPurchaseRecommendatiPage';
import GapNoShoppingIntegrationPage from './pages/GapNoShoppingIntegrationPage';
import GapNoSocialSharingOutfitInspirationPage from './pages/GapNoSocialSharingOutfitInspirationPage';
import GapLimitedTravelFeaturesOnlyPackingListsPage from './pages/GapLimitedTravelFeaturesOnlyPackingListsPage';
import GapLimitedNotificationsLayer1MentionPage from './pages/GapLimitedNotificationsLayer1MentionPage';
import GapNoWebhooksPage from './pages/GapNoWebhooksPage';
import GapNoMobileAppPage from './pages/GapNoMobileAppPage';
import GapOnly8FrontendPagesPage from './pages/GapOnly8FrontendPagesPage';
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) {}
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 24 }}>Loading...</div>;

  if (!user) {
    return (
      <Router>
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/login" />} />
        
          {/* // === Batch 06 Gaps & Frontend Mounts === */}
          <Route path="/cf-outfit-orchestration-agent" element={<CFOutfitOrchestrationAgentPage />} />
          <Route path="/cf-computer-vision-closet-audit" element={<CFComputerVisionClosetAuditPage />} />
          <Route path="/cf-shopping-synergy" element={<CFShoppingSynergyPage />} />
          <Route path="/cf-seasonal-rotation-automation" element={<CFSeasonalRotationAutomationPage />} />
          <Route path="/cf-travel-capsule-builder" element={<CFTravelCapsuleBuilderPage />} />
          <Route path="/gap-wear" element={<GapWearPage />} />
          <Route path="/gap-packing" element={<GapPackingPage />} />
          <Route path="/gap-no-size-fit-tracking-for-new-purchase-recommendati" element={<GapNoSizeFitTrackingForNewPurchaseRecommendatiPage />} />
          <Route path="/gap-no-shopping-integration" element={<GapNoShoppingIntegrationPage />} />
          <Route path="/gap-no-social-sharing-outfit-inspiration" element={<GapNoSocialSharingOutfitInspirationPage />} />
          <Route path="/gap-limited-travel-features-only-packing-lists" element={<GapLimitedTravelFeaturesOnlyPackingListsPage />} />
          <Route path="/gap-limited-notifications-layer-1-mention" element={<GapLimitedNotificationsLayer1MentionPage />} />
          <Route path="/gap-no-webhooks" element={<GapNoWebhooksPage />} />
          <Route path="/gap-no-mobile-app" element={<GapNoMobileAppPage />} />
          <Route path="/gap-only-8-frontend-pages" element={<GapOnly8FrontendPagesPage />} />
        </Routes>
      </Router>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/wardrobe" element={<WardrobePage />} />
          <Route path="/outfits" element={<OutfitsPage />} />
          <Route path="/wear-log" element={<WearLogPage />} />
          <Route path="/packing-lists" element={<PackingListPage />} />
          <Route path="/ai" element={<AIPage />} />
          <Route path="/ai-insights" element={<AIInsightsPage />} />
          <Route path="/ai-advanced" element={<WardrobeAIAdvancedPage />} />
          <Route path="/custom-views" element={<CustomViewsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
