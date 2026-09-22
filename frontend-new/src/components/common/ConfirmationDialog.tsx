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
  onCancel
}) => {
  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel}>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
