import React, { useEffect, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';

export const confirmDialog = (options) => {
  return new Promise((resolve) => {
    const config = typeof options === 'string'
      ? { title: 'Confirm Action', message: options }
      : { title: 'Confirm Action', message: '', ...options };

    const { title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger' } = config;
    const colorMap = {
      danger: { bg: 'bg-red-600', hover: 'hover:bg-red-700', iconBg: 'bg-red-100', iconColor: 'text-red-600' },
      warning: { bg: 'bg-amber-600', hover: 'hover:bg-amber-700', iconBg: 'bg-amber-100', iconColor: 'text-amber-600' },
      success: { bg: 'bg-emerald-600', hover: 'hover:bg-emerald-700', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600' },
      primary: { bg: 'bg-[#242576]', hover: 'hover:bg-[#1d1f63]', iconBg: 'bg-blue-100', iconColor: 'text-blue-600' },
    };
    const colors = colorMap[variant] || colorMap.danger;
    const modalContainer = document.createElement('div');
    modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center';
    modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    modalContainer.setAttribute('role', 'presentation');

    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-2xl shadow-xl p-6 max-w-md mx-4 transform transition-all';
    modalContent.setAttribute('role', 'alertdialog');
    modalContent.setAttribute('aria-modal', 'true');
    modalContent.setAttribute('aria-labelledby', 'confirm-dialog-title');
    modalContent.setAttribute('aria-describedby', 'confirm-dialog-desc');

    // Build DOM safely — no innerHTML, no XSS risk
    const row = document.createElement('div');
    row.className = 'flex items-start gap-4';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'shrink-0';
    const iconCircle = document.createElement('div');
    iconCircle.className = `w-12 h-12 rounded-full ${colors.iconBg} flex items-center justify-center`;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `w-6 h-6 ${colors.iconColor}`);
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('viewBox', '0 0 24 24');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z');
    svg.appendChild(path);
    iconCircle.appendChild(svg);
    iconWrap.appendChild(iconCircle);
    row.appendChild(iconWrap);

    const textCol = document.createElement('div');
    textCol.className = 'flex-1';
    const heading = document.createElement('h3');
    heading.id = 'confirm-dialog-title';
    heading.className = 'text-lg font-semibold text-slate-900 mb-2';
    heading.textContent = title;
    const desc = document.createElement('p');
    desc.id = 'confirm-dialog-desc';
    desc.className = 'text-slate-600';
    desc.textContent = message;
    textCol.appendChild(heading);
    textCol.appendChild(desc);
    row.appendChild(textCol);

    const actions = document.createElement('div');
    actions.className = 'flex justify-end gap-3 mt-6';
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition';
    cancelBtn.textContent = cancelLabel;
    cancelBtn.addEventListener('click', () => { resolve(false); cleanup(); });
    const confirmBtn = document.createElement('button');
    confirmBtn.className = `h-10 px-4 text-sm font-medium text-white ${colors.bg} rounded-lg ${colors.hover} transition`;
    confirmBtn.textContent = confirmLabel;
    confirmBtn.addEventListener('click', () => { resolve(true); cleanup(); });
    actions.appendChild(cancelBtn);
    actions.appendChild(confirmBtn);

    modalContent.appendChild(row);
    modalContent.appendChild(actions);
    modalContainer.appendChild(modalContent);
    document.body.appendChild(modalContainer);

    // Focus the cancel button for keyboard users
    requestAnimationFrame(() => cancelBtn.focus());

    const cleanup = () => {
      if (modalContainer.parentNode) modalContainer.parentNode.removeChild(modalContainer);
      document.removeEventListener('keydown', handleEscape);
    };

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        resolve(false);
        cleanup();
      }
    };
    document.addEventListener('keydown', handleEscape);

    modalContainer.addEventListener('click', (e) => {
      if (e.target === modalContainer) {
        resolve(false);
        cleanup();
      }
    });
  });
};

// React component alternative
export const ConfirmDialog = ({ message, onConfirm, onCancel, open }) => {
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => {
        const firstBtn = dialogRef.current?.querySelector('button');
        if (firstBtn) firstBtn.focus();
      });
    }
    return () => {
      document.body.style.overflow = '';
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        className="bg-white rounded-2xl shadow-xl p-6 max-w-md mx-4"
      >
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 id="confirm-title" className="text-lg font-semibold text-slate-900 mb-2">Confirm Action</h3>
            <p id="confirm-desc" className="text-slate-600">{message}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="h-10 px-4 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="h-10 px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
