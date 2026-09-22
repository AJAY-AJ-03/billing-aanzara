// src/components/common/ConfirmationDialog.tsx
import React from 'react';
import Modal from './Modal';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel}>
      <p style={{ color: 'var(--admin-text-muted)', fontSize: '13.5px', marginBottom: '22px', lineHeight: 1.5 }}>
        {message}
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button type="button" className="admin-btn admin-btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className="admin-btn admin-btn-danger" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;