import React from 'react';
import { AlertTriangle, AlertCircle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const iconBg = {
    danger: 'bg-rose-50 border-rose-200 text-rose-600',
    warning: 'bg-amber-50 border-amber-200 text-amber-600',
    primary: 'bg-primary-50 border-primary-200 text-primary-700',
  };

  const buttonVariant = variant === 'danger' ? 'danger' : 'primary';

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} title={title} size="sm">
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border flex-shrink-0 mt-0.5 ${iconBg[variant]}`}
        >
          {variant === 'danger' ? (
            <AlertCircle className="w-5 h-5" />
          ) : (
            <AlertTriangle className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1">
          <p className="text-xs text-primary-800/70 leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-primary-950/6 flex items-center justify-end gap-2.5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={isLoading}
          onClick={onClose}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={buttonVariant}
          size="sm"
          isLoading={isLoading}
          onClick={onConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};
