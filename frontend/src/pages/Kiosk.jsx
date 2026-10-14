import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { servicesApi, ticketsApi } from '../api.js';
import { onEvent } from '../socket.js';
import Toast from '../components/Toast.jsx';

export default function Kiosk() {
  const [services, setServices] = useState([]);
  const [selected, setSelected] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  const printTicket = () => {
    setTimeout(() => window.print(), 100);
  };

  useEffect(() => {
    servicesApi.list().then((r) => setServices(r.data));
  }, []);

  const generate = async (svc) => {
    setMsg('Issuing ticket...');
    try {
      const r = await ticketsApi.create({ serviceId: svc.id });
      setTicket(r.data);
      setSelected(svc);
      setMsg('');
      setTimeout(() => window.print(), 300);
    } catch (e) {
      setMsg(e.response?.data?.error || 'Failed');
    }
  };

  // live update of ticket
  useEffect(() => {
    if (!ticket) return;
    const refresh = async () => {
      try {
        const r = await ticketsApi.get(ticket.id);
        setTicket(r.data);
      } catch {}
    };
    const off1 = onEvent('ticket:updated', (t) => { if (t.id === ticket.id) setTicket(t); });
    const off2 = onEvent('ticket:called', (t) => { if (t.id === ticket.id) setTicket(t); });
    const off3 = onEvent('queue:changed', refresh);
    const interval = setInterval(refresh, 5000);
    return () => { off1(); off2(); off3(); clearInterval(interval); };
  }, [ticket?.id]);

  return (
    <div className="page kiosk">
      <div className="hero">
        <h1>QUEUE MANAGEMENT SYSTEM</h1>
        <p className="lead">Select a service to receive your ticket. Fast, easy, touch-friendly.</p>
      </div>

      {!ticket && (
        <div className="service-grid">
          {services.filter(s => s.isActive).map((s) => (
            <button key={s.id} className="service-card" style={{ borderColor: s.color }} onClick={() => generate(s)}>
              <span className="dot" style={{ background: s.color }} />
              <span className="service-name">{s.name}</span>
              <span className="muted small">Prefix {s.prefix}</span>
            </button>
          ))}
        </div>
      )}

      <Toast message={msg} type={msg.toLowerCase().includes('fail') ? 'error' : 'info'} onClose={() => setMsg('')} />

      {ticket && (
        <div className="ticket-card touch">
          <div className="ticket-number">{ticket.number}</div>
          <div className="status-pill" data-status={ticket.status}>{ticket.status.toUpperCase()}</div>
          <div className="stats">
            <div><span className="stat-label">Service</span><span>{ticket.service?.name}</span></div>
            <div><span className="stat-label">People ahead</span><span>{ticket.peopleAhead}</span></div>
            <div><span className="stat-label">Est. wait</span><span>{ticket.estWaitMin} min</span></div>
            {ticket.counter && <div><span className="stat-label">Counter</span><span>{ticket.counter.name}</span></div>}
          </div>
          <p className="muted small">Please take your printed slip. This page updates automatically.</p>
          <div className="actions">
            <button onClick={printTicket}>Print Slip</button>
            <button className="secondary" onClick={() => navigate(`/ticket/${ticket.id}`)}>Open Live Status</button>
            <button className="secondary" onClick={() => { setTicket(null); setSelected(null); }}>New Ticket</button>
          </div>

          {/* Printable slip (hidden on screen) */}
          <div className="print-slip">
            <h2>Queue Ticket</h2>
            <div className="slip-number">{ticket.number}</div>
            <p><b>Service:</b> {ticket.service?.name}</p>
            <p><b>Date:</b> {new Date().toLocaleString()}</p>
            <p><b>People ahead:</b> {ticket.peopleAhead}</p>
            <p><b>Est. wait:</b> {ticket.estWaitMin} min</p>
            <p className="slip-footer">Please wait for your number to be called.</p>
          </div>
        </div>
      )}
    </div>
  );
}