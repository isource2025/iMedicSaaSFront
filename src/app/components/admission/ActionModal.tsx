'use client';

import { useState, useEffect } from 'react';
import { IoClose, IoSave, IoReturnUpBack, IoTrash } from 'react-icons/io5';
import styles from './ActionModal.module.css';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  action: 'add' | 'edit' | 'delete';
  fields: {
    key: string;
    label: string;
    editable?: boolean;
  }[];
  initialValues?: Record<string, string>;
  onSubmit: (values: Record<string, string>) => Promise<void>;
  recordKey?: string; // Clave del registro para edición o eliminación
}

const ActionModal = ({
  isOpen,
  onClose,
  title,
  action,
  fields,
  initialValues = {},
  onSubmit,
  recordKey
}: ActionModalProps) => {
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Inicializar valores del formulario
  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  // Cerrar modal y reiniciar estado
  const handleClose = () => {
    if (isSubmitting) return;
    setFormValues({});
    onClose();
  };

  // Manejar cambios en los campos del formulario
  const handleInputChange = (key: string, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Enviar el formulario
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      await onSubmit(formValues);
      handleClose();
    } catch (error) {
      console.error(`Error al ${action === 'add' ? 'agregar' : action === 'edit' ? 'editar' : 'eliminar'} registro:`, error);
      alert(`Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        {/* Encabezado del modal */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {action === 'add' ? 'Agregar' : action === 'edit' ? 'Editar' : 'Eliminar'} {title}
          </h2>
          <button 
            className={styles.closeButton}
            onClick={handleClose}
            aria-label="Cerrar"
          >
            <IoClose />
          </button>
        </div>

        {/* Contenido del modal */}
        <div className={styles.modalBody}>
          {action === 'delete' ? (
            <div className={styles.deleteConfirmation}>
              <p className={styles.deleteConfirmText}>¿Está seguro que desea eliminar este registro?</p>
              <p className={styles.deleteWarningText}>Esta acción no se puede deshacer.</p>
            </div>
          ) : (
            <div className={styles.formContainer}>
              {fields.map((field) => (
                <div key={field.key} className={styles.formGroup}>
                  <label className={styles.formLabel}>{field.label}:</label>
                  <input
                    type="text"
                    value={formValues[field.key] || ''}
                    onChange={(e) => handleInputChange(field.key, e.target.value)}
                    disabled={action === 'edit' && !field.editable}
                    className={styles.formInput}
                    placeholder={`Ingrese ${field.label.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className={styles.modalFooter}>
          <button 
            className={`${styles.formButton} ${styles.cancelButton}`}
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <IoReturnUpBack /> Cancelar
          </button>
          <button 
            className={`${styles.formButton} ${action === 'delete' ? styles.deleteButton : styles.saveButton}`}
            onClick={handleSubmit}
            disabled={isSubmitting || (action !== 'delete' && Object.keys(formValues).some(key => !formValues[key]))}
          >
            {action === 'delete' ? (
              <>
                <IoTrash /> Eliminar
              </>
            ) : (
              <>
                <IoSave /> Guardar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionModal;
