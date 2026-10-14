import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { authApi } from './api.js';
import Kiosk from './pages/Kiosk.jsx';
import TicketStatus from './pages/TicketStatus.jsx';
import PublicDisplay from './pages/PublicDisplay.jsx';
import Staff from './pages/Staff.jsx';
import Admin from './pages/Admin.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('qms_token');
    if (!token) { setReady(true); return; }
    authApi.me().then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem('qms_token');
    }).finally(() => setReady(true));
  }, []);

  const login = (token, u) => {
    localStorage.setItem('qms_token', token);
    setUser(u);
  };
  const logout = () => {
    localStorage.removeItem('qms_token');
    setUser(null);
  };

  if (!ready) return <div className="center">Loading...</div>;

  return (
    <div className="app-shell">
      <nav className="topnav">
        <Link to="/" className="brand">QMS</Link>
        <div className="nav-links">
          <Link to="/kiosk">Get Ticket</Link>
          <Link to="/display">Display</Link>
          <Link to="/staff">Staff</Link>
          <Link to="/admin">Admin</Link>
          {user ? (
            <button className="link-btn" onClick={logout}>{user.username} (logout)</button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/kiosk" replace />} />
          <Route path="/kiosk" element={<Kiosk />} />
          <Route path="/ticket/:id" element={<TicketStatus />} />
          <Route path="/display" element={<PublicDisplay />} />
          <Route path="/login" element={<Login onLogin={login} />} />
          <Route path="/staff" element={user ? <Staff user={user} /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user && user.role === 'admin' ? <Admin user={user} /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  );
}