import { useEffect } from 'react';

export default function Confirm({ open, title, message, onCancel, onConfirm, confirmLabel = 'Confirm', danger = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <p className="muted">{message}</p>
        <div className="actions">
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button className={danger ? 'danger' : ''} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}