import { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => onClose && onClose(), duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span className="toast-icon">{type === 'success' ? '✓' : type === 'error' ? '!' : 'i'}</span>
      <span className="toast-msg">{message}</span>
      <button className="toast-close" onClick={() => onClose && onClose()}>×</button>
    </div>
  );
}