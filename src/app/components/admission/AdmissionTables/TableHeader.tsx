import React from 'react';
import { IoAdd } from 'react-icons/io5';
import styles from './styles.module.css';
import { TableHeaderProps } from './types';

const TableHeader: React.FC<TableHeaderProps> = ({
  showCreateForm,
  setShowCreateForm,
  createDescripcion,
  setCreateDescripcion,
  handleCreateOption
}) => {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Tablas de Admisión</h1>
      {!showCreateForm && (
        <button
          className={`${styles.actionButton} ${styles.primaryButton}`}
          onClick={() => setShowCreateForm(true)}
          title="Agregar nueva opción"
        >
          <IoAdd size={18} /> Agregar opción
        </button>
      )}
    </div>
  );
};

export default TableHeader;
