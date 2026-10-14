import { useEffect, useState } from 'react';
import { servicesApi, countersApi, adminApi, authApi } from '../api.js';
import Toast from '../components/Toast.jsx';
import Confirm from '../components/Confirm.jsx';

export default function Admin({ user }) {
  const [stats, setStats] = useState(null);
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState('overview');
  const [msg, setMsg] = useState('');
  const [confirm, setConfirm] = useState({ open: false, type: '', id: null });

  // service form
  const [svcName, setSvcName] = useState('');
  const [svcPrefix, setSvcPrefix] = useState('');
  const [svcColor, setSvcColor] = useState('#3b82f6');

  // counter form
  const [ctrName, setCtrName] = useState('');
  const [ctrService, setCtrService] = useState('');

  // user form
  const [usrName, setUsrName] = useState('');
  const [usrPass, setUsrPass] = useState('');
  const [usrRole, setUsrRole] = useState('staff');
  const [usrCounter, setUsrCounter] = useState('');

  const load = async () => {
    try {
      const [st, s, c, u] = await Promise.all([
        adminApi.stats(),
        servicesApi.list(),
        countersApi.list(),
        adminApi.users(),
      ]);
      setStats(st.data);
      setServices(s.data);
      setCounters(c.data);
      setUsers(u.data);
    } catch (e) { setMsg('Load failed'); }
  };

  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);

  const addService = async () => {
    try {
      await servicesApi.create({ name: svcName, prefix: svcPrefix, color: svcColor });
      setSvcName(''); setSvcPrefix('');
      setMsg('Service added'); load();
    } catch (e) { setMsg(e.response?.data?.error || 'Failed'); }
  };

  const delService = (id) => setConfirm({ open: true, type: 'service', id });

  const addCounter = async () => {
    try {
      await countersApi.create({ name: ctrName, serviceId: ctrService || null });
      setCtrName(''); setMsg('Counter added'); load();
    } catch (e) { setMsg('Failed'); }
  };

  const delCounter = (id) => setConfirm({ open: true, type: 'counter', id });

  const runDelete = async () => {
    const { type, id } = confirm;
    setConfirm({ open: false, type: '', id: null });
    try {
      if (type === 'service') await servicesApi.remove(id);
      if (type === 'counter') await countersApi.remove(id);
      setMsg('Deleted');
      load();
    } catch (e) { setMsg('Failed'); }
  };

  const addUser = async () => {
    try {
      await authApi.register({ username: usrName, password: usrPass, role: usrRole, counterId: usrCounter ? parseInt(usrCounter) : null });
      setUsrName(''); setUsrPass('');
      setMsg('User added'); load();
    } catch (e) { setMsg(e.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="page admin">
      <div className="hero" style={{textAlign:'left'}}>
        <h1>Admin Dashboard</h1>
        <p>Insights, services, counters and staff.</p>
      </div>
      <div className="tabs">
        {['overview','services','counters','users'].map((t) => (
          <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      <Toast message={msg} type={msg.toLowerCase().includes('fail') ? 'error' : 'success'} onClose={() => setMsg('')} />
      <Confirm open={confirm.open} title="Delete item?" message="This action cannot be undone." onCancel={() => setConfirm({ open: false, type: '', id: null })} onConfirm={runDelete} danger confirmLabel="Delete" />

      {tab === 'overview' && stats && (
        <div className="metrics">
          <div className="metric"><span>Total tickets today</span><strong>{stats.totalToday}</strong></div>
          <div className="metric"><span>Completed today</span><strong>{stats.completedToday}</strong></div>
          <div className="metric"><span>Waiting now</span><strong>{stats.waitingCount}</strong></div>
          <div className="metric"><span>Avg wait (min)</span><strong>{stats.avgWaitMin}</strong></div>
          <div className="metric"><span>Avg service (min)</span><strong>{stats.avgServiceMin}</strong></div>
          <div className="metric"><span>Active counters</span><strong>{stats.activeCounters}</strong></div>
        </div>
      )}

      {tab === 'services' && (
        <div className="card">
          <h2>Services</h2>
          <div className="form-row">
            <input placeholder="Name" value={svcName} onChange={(e) => setSvcName(e.target.value)} />
            <input placeholder="Prefix" maxLength={3} value={svcPrefix} onChange={(e) => setSvcPrefix(e.target.value)} />
            <input type="color" value={svcColor} onChange={(e) => setSvcColor(e.target.value)} />
            <button onClick={addService}>Add</button>
          </div>
          <table className="queue-table">
            <thead><tr><th>Name</th><th>Prefix</th><th>Color</th><th>Active</th><th></th></tr></thead>
            <tbody>
              {services.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td><td>{s.prefix}</td>
                  <td><span className="dot" style={{ background: s.color, display:'inline-block' }} /></td>
                  <td>{s.isActive ? 'Yes' : 'No'}</td>
                  <td><button className="danger small" onClick={() => delService(s.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'counters' && (
        <div className="card">
          <h2>Counters</h2>
          <div className="form-row">
            <input placeholder="Name" value={ctrName} onChange={(e) => setCtrName(e.target.value)} />
            <select value={ctrService} onChange={(e) => setCtrService(e.target.value)}>
              <option value="">Any service</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={addCounter}>Add</button>
          </div>
          <table className="queue-table">
            <thead><tr><th>Name</th><th>Service</th><th>Online</th><th></th></tr></thead>
            <tbody>
              {counters.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.service?.name || 'Any'}</td>
                  <td>{c.isOnline ? 'Online' : 'Offline'}</td>
                  <td><button className="danger small" onClick={() => delCounter(c.id)}>Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <h2>Staff Users</h2>
          <div className="form-row">
            <input placeholder="Username" value={usrName} onChange={(e) => setUsrName(e.target.value)} />
            <input placeholder="Password" type="password" value={usrPass} onChange={(e) => setUsrPass(e.target.value)} />
            <select value={usrRole} onChange={(e) => setUsrRole(e.target.value)}>
              <option value="staff">staff</option>
              <option value="admin">admin</option>
            </select>
            <select value={usrCounter} onChange={(e) => setUsrCounter(e.target.value)}>
              <option value="">No counter</option>
              {counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button onClick={addUser}>Add</button>
          </div>
          <table className="queue-table">
            <thead><tr><th>Username</th><th>Role</th><th>Counter</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.username}</td><td>{u.role}</td><td>{u.counterId || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}