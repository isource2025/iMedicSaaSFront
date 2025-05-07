import React from 'react';

/**
 * Props para el componente ModalBase
 */
export interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Props para el componente FormModal
 */
export interface FormModalProps extends ModalBaseProps {
  onSubmit: (data: any) => void;
  submitLabel?: string;
  cancelLabel?: string;
}

/**
 * Props para el componente ConfirmationModal
 */
export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isProcessing?: boolean;
  type?: 'info' | 'warning' | 'danger';
}
