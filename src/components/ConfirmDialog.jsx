import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export const confirmDialog = (message, onConfirm, onCancel = () => {}) => {
  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.className = 'fixed inset-0 z-50 flex items-center justify-center';
  modalContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
  
  // Create modal content
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 transform transition-all';
  
  modalContent.innerHTML = `
    <div class="flex items-start gap-4">
      <div class="shrink-0">
        <div class="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
          <svg class="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        </div>
      </div>
      <div class="flex-1">
        <h3 class="text-lg font-semibold text-gray-900 mb-2">Confirm Action</h3>
        <p class="text-gray-600">${message}</p>
      </div>
      <button class="text-gray-400 hover:text-gray-600" onclick="this.closest('.fixed').remove()">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
    <div class="flex justify-end gap-3 mt-6">
      <button class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors" onclick="this.closest('.fixed').remove(); window.confirmDialogCancel()">
        Cancel
      </button>
      <button class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors" onclick="this.closest('.fixed').remove(); window.confirmDialogConfirm()">
        Delete
      </button>
    </div>
  `;
  
  modalContainer.appendChild(modalContent);
  document.body.appendChild(modalContainer);
  
  // Handle callbacks
  window.confirmDialogConfirm = () => {
    onConfirm();
    cleanup();
  };
  
  window.confirmDialogCancel = () => {
    onCancel();
    cleanup();
  };
  
  const cleanup = () => {
    delete window.confirmDialogConfirm;
    delete window.confirmDialogCancel;
    if (modalContainer.parentNode) {
      modalContainer.parentNode.removeChild(modalContainer);
    }
  };
  
  // Close on escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      onCancel();
      cleanup();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  document.addEventListener('keydown', handleEscape);
  
  // Close on backdrop click
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      onCancel();
      cleanup();
      document.removeEventListener('keydown', handleEscape);
    }
  });
};

// React component alternative
export const ConfirmDialog = ({ message, onConfirm, onCancel, open }) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md mx-4 transform transition-all">
        <div className="flex items-start gap-4">
          <div className="shrink-0">
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Action</h3>
            <p className="text-gray-600">{message}</p>
          </div>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
