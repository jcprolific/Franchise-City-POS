import { Routes, Route } from 'react-router-dom';
import AdminSidebar from './components/AdminSidebar';
import GlobalDashboard from './pages/GlobalDashboard';
import BranchManagement from './pages/BranchManagement';
import './App.css';

function App() {
  const handleLogout = () => {
    // Basic logout logic out for now.
    window.alert('Logout clicked');
  };

  return (
    <div className="app-layout">
      {/* Sidebar connects to React Router Links automatically */}
      <AdminSidebar userName="Admin" onLogout={handleLogout} />
      
      <main className="app-main">
        <Routes>
          <Route path="/" element={<GlobalDashboard />} />
          <Route path="/branches" element={<BranchManagement />} />
          {/* Temporary fallbacks for remaining routes */}
          <Route path="/catalog" element={<div className="page-container"><h1>Menu Catalog</h1><p>Centralized product engine coming soon.</p></div>} />
          <Route path="/staff" element={<div className="page-container"><h1>Staff Directory</h1><p>Global cashier index coming soon.</p></div>} />
          <Route path="/settings" element={<div className="page-container"><h1>Settings</h1><p>HQ config coming soon.</p></div>} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
