import { useEffect, useState } from 'react';
import api from '../api.js';
import { servicesApi, countersApi, ticketsApi, displayApi } from '../api.js';
import { onEvent } from '../socket.js';
import Toast from '../components/Toast.jsx';

export default function Staff({ user }) {
  const [services, setServices] = useState([]);
  const [counters, setCounters] = useState([]);
  const [waiting, setWaiting] = useState([]);
  const [active, setActive] = useState(null);
  const [serviceFilter, setServiceFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [transferService, setTransferService] = useState('');
  const [transferCounter, setTransferCounter] = useState('');
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [s, c, w, d] = await Promise.all([
        servicesApi.list(),
        countersApi.list(),
        ticketsApi.listWaiting(serviceFilter || undefined),
        displayApi.state(),
      ]);
      setServices(s.data);
      setCounters(c.data);
      setWaiting(w.data);
      const serving = (d.data.serving || []).find((t) => t.counter?.id === user.counterId);
      if (serving) setActive(serving);
    } catch (e) { setMsg('Load failed'); }
  };

  useEffect(() => { load(); }, [serviceFilter]);

  useEffect(() => {
    const refresh = () => load();
    const off1 = onEvent('ticket:created', refresh);
    const off2 = onEvent('ticket:updated', refresh);
    const off3 = onEvent('ticket:called', refresh);
    const off4 = onEvent('queue:changed', refresh);
    const off5 = onEvent('counters:changed', refresh);
    return () => { off1(); off2(); off3(); off4(); off5(); };
  }, [serviceFilter]);

  const callNext = async () => {
    if (!user.counterId) { setMsg('No counter assigned'); return; }
    try {
      const r = await ticketsApi.callNext(user.counterId);
      if (r.data.ticket) { setActive(r.data.ticket); setMsg('Called ' + r.data.ticket.number); }
      else setMsg('No waiting tickets');
      load();
    } catch (e) { setMsg(e.response?.data?.error || 'Failed'); }
  };

  const doAction = async (fn, id) => {
    try {
      await fn(id);
      setActive(null);
      setMsg('Done');
      load();
    } catch (e) { setMsg(e.response?.data?.error || 'Failed'); }
  };

  const transfer = async (id) => {
    try {
      await ticketsApi.transfer(id, {
        serviceId: transferService || undefined,
        counterId: transferCounter ? parseInt(transferCounter) : undefined,
      });
      setActive(null);
      setMsg('Transferred');
      load();
    } catch (e) { setMsg(e.response?.data?.error || 'Failed'); }
  };

  const toggleOnline = async (online) => {
    if (!user.counterId) return;
    try { await countersApi.online(user.counterId, online); load(); }
    catch (e) { setMsg('Failed'); }
  };

  return (
    <div className="page staff">
      <div className="hero" style={{textAlign:'left'}}>
        <h1>Staff Dashboard</h1>
        <p>Manage the queue in real time.</p>
      </div>
      <div className="row gap">
        <div className="card">
          <h2>Your Counter</h2>
          <p>Logged in as <b>{user.username}</b> (counter #{user.counterId || 'none'})</p>
          <div className="actions">
            <button onClick={callNext}>Call Next Ticket</button>
            <button className="secondary" onClick={() => toggleOnline(true)}>Go Online</button>
            <button className="secondary" onClick={() => toggleOnline(false)}>Go Offline</button>
          </div>
          {active && (
            <div className="active-box">
              <div className="ticket-number small">{active.number}</div>
              <div className="status-pill" data-status={active.status}>{active.status.toUpperCase()}</div>
              <p>{active.service?.name} {active.counter?.name && `— ${active.counter.name}`}</p>
              <div className="actions wrap">
                <button onClick={() => ticketsApi.recall(active.id).then(() => { setMsg('Recalled'); load(); })}>Recall</button>
                <button className="success" onClick={() => doAction(ticketsApi.complete, active.id)}>Complete</button>
                <button className="danger" onClick={() => doAction(ticketsApi.skip, active.id)}>Skip / No-Show</button>
              </div>
              <div className="transfer-box">
                <h4>Transfer</h4>
                <select value={transferService} onChange={(e) => setTransferService(e.target.value)}>
                  <option value="">Keep service</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <select value={transferCounter} onChange={(e) => setTransferCounter(e.target.value)}>
                  <option value="">No counter</option>
                  {counters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button onClick={() => transfer(active.id)}>Transfer</button>
              </div>
            </div>
          )}
          <Toast message={msg} type={msg.toLowerCase().includes('fail') ? 'error' : 'success'} onClose={() => setMsg('')} />
        </div>

        <div className="card wide">
          <h2>Waiting Queue</h2>
          <div className="filter">
            <select value={serviceFilter} onChange={(e) => setServiceFilter(e.target.value)}>
              <option value="">All services</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <table className="queue-table">
            <thead>
              <tr><th>Ticket</th><th>Service</th><th>Waiting</th><th>Status</th></tr>
            </thead>
            <tbody>
              {waiting.map((t) => (
                <tr key={t.id} className={selected === t.id ? 'selected' : ''} onClick={() => setSelected(t.id)}>
                  <td>{t.number}</td>
                  <td>{t.service?.name}</td>
                  <td>{t.peopleAhead}</td>
                  <td>{t.status}</td>
                </tr>
              ))}
              {waiting.length === 0 && <tr><td colSpan="4" className="muted">No waiting tickets</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}