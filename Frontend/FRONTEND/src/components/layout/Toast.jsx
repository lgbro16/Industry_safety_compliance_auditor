import React from 'react';
import { useApp } from '../../context/AppContext';

export default function Toast() {
  const { toastMessage } = useApp();

  if (!toastMessage) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-primary-container text-on-primary px-4 py-3 rounded-lg shadow-2xl border border-secondary/40 flex items-center gap-3">
        <span className="material-symbols-outlined text-secondary-container text-xl">
          info
        </span>
        <span className="font-body-md text-sm font-medium">{toastMessage}</span>
      </div>
    </div>
  );
}
