import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ticketsApi } from '../api.js';
import { onEvent } from '../socket.js';

export default function TicketStatus() {
  const { id } = useParams();
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const r = await ticketsApi.get(id);
      setTicket(r.data);
    } catch (e) {
      setError('Ticket not found');
    }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!ticket) return;
    const off1 = onEvent('ticket:updated', (t) => { if (t.id === id) setTicket(t); });
    const off2 = onEvent('ticket:called', (t) => { if (t.id === id) setTicket(t); });
    const off3 = onEvent('queue:changed', load);
    const interval = setInterval(load, 5000);
    return () => { off1(); off2(); off3(); clearInterval(interval); };
  }, [id]);

  if (error) return <div className="page center"><p>{error}</p></div>;
  if (!ticket) return <div className="page center">Loading...</div>;

  return (
    <div className="page center">
      <div className="ticket-card large">
        <div className="ticket-number">{ticket.number}</div>
        <div className="status-pill" data-status={ticket.status}>{ticket.status.toUpperCase()}</div>
        <div className="stats">
          <div><span className="stat-label">Service</span><span>{ticket.service?.name}</span></div>
          <div><span className="stat-label">People ahead</span><span>{ticket.peopleAhead}</span></div>
          <div><span className="stat-label">Est. wait</span><span>{ticket.estWaitMin} min</span></div>
          {ticket.counter && <div><span className="stat-label">Counter</span><span>{ticket.counter.name}</span></div>}
        </div>
        {ticket.status === 'called' && <div className="alert">Please proceed to {ticket.counter?.name}</div>}
      </div>
    </div>
  );
}