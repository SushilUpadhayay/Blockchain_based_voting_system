import React, { useRef, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * ConfirmDialog — reusable modal for confirmation actions.
 *
 * Props:
 *   isOpen      — whether the dialog is visible
 *   onClose     — callback when cancelled
 *   onConfirm   — callback when confirmed
 *   title       — dialog heading
 *   message     — body text
 *   confirmText — label for the confirm button (default: 'Confirm')
 *   cancelText  — label for the cancel button (default: 'Cancel')
 *   danger      — if true, styles the confirm button in red
 *   input       — optional config: { label, placeholder, value, onChange }
 *                 When provided, renders a text input (for rejection reason, etc.)
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  danger = false,
  input,
}) => {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Trap focus on open
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    // If there's an input requirement, validate it isn't empty
    if (input && !input.value?.trim()) return;
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {danger && (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
              )}
              <h3
                id="confirm-dialog-title"
                className="text-lg font-bold"
                style={{ color: 'var(--text-color)' }}
              >
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-black/10 transition-colors"
              style={{ color: 'var(--text-color)' }}
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Message */}
          {message && (
            <p className="text-sm mb-5 opacity-80 leading-relaxed" style={{ color: 'var(--text-color)' }}>
              {message}
            </p>
          )}

          {/* Optional text input (e.g. rejection reason) */}
          {input && (
            <div className="mb-5">
              <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-color)' }}>
                {input.label}
              </label>
              <textarea
                rows={3}
                value={input.value}
                onChange={(e) => input.onChange(e.target.value)}
                placeholder={input.placeholder}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all resize-none focus:ring-2 focus:ring-blue-400"
                style={{
                  backgroundColor: 'var(--bg-color)',
                  color: 'var(--text-color)',
                  borderColor: 'var(--border-color)',
                }}
                autoFocus
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-gray-50"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-color)' }}
            >
              {cancelText}
            </button>
            <button
              ref={confirmBtnRef}
              onClick={handleConfirm}
              disabled={input && !input.value?.trim()}
              className={`px-4 py-2 rounded-lg text-sm font-bold text-white transition-all disabled:opacity-40 ${
                danger
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
