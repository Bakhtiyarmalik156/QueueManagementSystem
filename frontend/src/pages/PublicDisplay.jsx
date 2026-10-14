import { useEffect, useRef, useState } from 'react';
import { displayApi } from '../api.js';
import { onEvent } from '../socket.js';

export default function PublicDisplay() {
  const [serving, setServing] = useState([]);
  const [recent, setRecent] = useState([]);
  const lastCalledRef = useRef(null);
  const audioCtxRef = useRef(null);

  const load = async () => {
    try {
      const r = await displayApi.state();
      setServing(r.data.serving || []);
      setRecent(r.data.recent || []);
    } catch {}
  };

  const beep = () => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.2;
      osc.start();
      setTimeout(() => osc.stop(), 300);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const refresh = () => load();
    const off1 = onEvent('ticket:called', (t) => {
      if (lastCalledRef.current !== t.id) {
        lastCalledRef.current = t.id;
        beep();
      }
      refresh();
    });
    const off2 = onEvent('ticket:updated', refresh);
    const off3 = onEvent('queue:changed', refresh);
    const interval = setInterval(refresh, 4000);
    return () => { off1(); off2(); off3(); clearInterval(interval); };
  }, []);

  return (
    <div className="display">
      <header>
        <h1>NOW SERVING</h1>
      </header>
      <div className="serving-grid">
        {serving.length === 0 && <div className="empty">No one currently being served</div>}
        {serving.map((t) => (
          <div key={t.id} className="serving-card">
            <div className="counter-label">{t.counter?.name || 'Counter'}</div>
            <div className="ticket-big">{t.number}</div>
            <div className="service-name">{t.service?.name}</div>
          </div>
        ))}
      </div>
      <div className="recent-section">
        <h2>Recently Called</h2>
        <div className="recent-list">
          {recent.map((t) => (
            <div key={t.id} className="recent-item">
              <span>{t.number}</span>
              <span className="muted">{t.counter?.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}