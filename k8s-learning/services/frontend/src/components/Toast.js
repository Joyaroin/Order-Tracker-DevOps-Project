import { useEffect } from 'react';

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors =
    type === 'success'
      ? 'bg-green-50 border-green-400 text-green-800'
      : 'bg-red-50 border-red-400 text-red-800';

  return (
    <div className={`fixed top-4 right-4 z-50 animate-fade-in border-l-4 px-4 py-3 rounded shadow-lg ${colors}`}>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-medium">{message}</p>
        <button onClick={onClose} className="text-lg leading-none opacity-60 hover:opacity-100">
          &times;
        </button>
      </div>
    </div>
  );
}
