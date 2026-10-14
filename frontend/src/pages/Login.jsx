import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api.js';
import Toast from '../components/Toast.jsx';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    try {
      const r = await authApi.login({ username, password });
      onLogin(r.data.token, r.data.user);
      const target = r.data.user.role === 'admin' ? '/admin' : '/staff';
      navigate(target, { replace: true });
    } catch (e) {
      setMsg(e.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="page center">
      <form className="login-card" onSubmit={submit}>
        <h1>Sign In</h1>
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">Sign In</button>
        {msg && <Toast message={msg} type="error" onClose={() => setMsg('')} duration={4000} />}
        <p className="muted small">Demo: admin / admin123, staff / staff123</p>
      </form>
    </div>
  );
}