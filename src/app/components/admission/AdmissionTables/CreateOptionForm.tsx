import React from 'react';
import { IoSave, IoClose } from 'react-icons/io5';
import styles from '../../opcGrd/OpcGrdTables.module.css';
import { CreateOptionFormProps } from './types';

const CreateOptionForm: React.FC<CreateOptionFormProps> = ({
  createDescripcion,
  setCreateDescripcion,
  handleCreateOption,
  handleCancelCreate
}) => {
  return (
    <div className={styles.panel}>
      <h2 className={styles.panelTitle}>Nueva opción para Admisión</h2>
      <div className={styles.formGroup}>
        <label htmlFor="createDescripcion" className={styles.formLabel}>
          Descripción
        </label>
        <input
          id="createDescripcion"
          type="text"
          value={createDescripcion}
          onChange={(e) => setCreateDescripcion(e.target.value)}
          className={styles.formInput}
          placeholder="Nombre de la opción..."
          autoFocus
        />
      </div>
      <div className={styles.formActions}>
        <button
          type="button"
          className={styles.btnGhost}
          onClick={handleCancelCreate}
          title="Cancelar"
        >
          <IoClose size={16} /> Cancelar
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
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
