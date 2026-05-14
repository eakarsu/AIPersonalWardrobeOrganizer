import React, { useEffect } from 'react';

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 3500);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast ${toast.type || ''}`} onClick={onClose}>
      {toast.type === 'success' && '✅ '}
      {toast.type === 'error' && '❌ '}
      {toast.type === 'info' && 'ℹ️ '}
      {toast.msg}
    </div>
  );
}

export default Toast;
