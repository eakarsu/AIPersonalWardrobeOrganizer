import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

function Layout({ user, onLogout, children }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>👗 AI Wardrobe</h1>
          <p>Smart Closet Organizer</p>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section">Main</div>
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
            🏠 Dashboard
          </NavLink>
          <NavLink to="/wardrobe" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            👔 My Wardrobe
          </NavLink>
          <NavLink to="/outfits" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            ✨ Outfits
          </NavLink>
          <NavLink to="/wear-log" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            📅 Wear Log
          </NavLink>
          <NavLink to="/packing-lists" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            🧳 Packing Lists
          </NavLink>

          <div className="sidebar-section">AI Tools</div>
          <NavLink to="/ai" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            🤖 AI Stylist
          </NavLink>
          <NavLink to="/ai-insights" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            📊 AI Insights
          </NavLink>
          <NavLink to="/ai-advanced" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            🔮 AI Insights+
          </NavLink>

          <div className="sidebar-section">Custom</div>
          <NavLink to="/custom-views" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            📈 Wardrobe Views
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-info">
            <strong>{user?.name || 'User'}</strong>
            {user?.email}
          </div>
          <button className="btn btn-secondary btn-sm btn-full" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}

export default Layout;
