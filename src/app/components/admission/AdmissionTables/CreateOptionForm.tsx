import React from 'react';
import { IoSave, IoClose } from 'react-icons/io5';
import styles from './styles.module.css';
import { CreateOptionFormProps } from './types';

const CreateOptionForm: React.FC<CreateOptionFormProps> = ({
  createDescripcion,
  setCreateDescripcion,
  handleCreateOption,
  handleCancelCreate
}) => {
  return (
    <div className={styles.createForm}>
      <h2>Nueva opción para Admisión</h2>
      <div className={styles.inputGroup}>
        <label htmlFor="createDescripcion" className={styles.inputLabel}>
          Descripción:
        </label>
        <input
          id="createDescripcion"
          type="text"
          value={createDescripcion}
          onChange={(e) => setCreateDescripcion(e.target.value)}
          className={styles.inputField}
          placeholder="Nombre de la opción..."
          autoFocus
        />
      </div>
      <div className={styles.buttonContainer}>
        <button
          className={`${styles.actionButton} ${styles.secondaryButton}`}
          onClick={handleCancelCreate}
          title="Cancelar"
        >
          <IoClose size={16} /> Cancelar
        </button>
        <button
          className={`${styles.actionButton} ${styles.saveButton}`}
          onClick={handleCreateOption}
          title="Guardar"
          disabled={!createDescripcion.trim()}
        >
          <IoSave size={16} /> Guardar
        </button>
      </div>
    </div>
  );
};

export default CreateOptionForm;
