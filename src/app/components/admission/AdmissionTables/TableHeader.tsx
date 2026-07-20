import React from 'react';
import { Plus } from 'lucide-react';
import styles from '../../opcGrd/OpcGrdTables.module.css';
import { TableHeaderProps } from './types';

const TableHeader: React.FC<TableHeaderProps> = ({
  showCreateForm,
  setShowCreateForm,
}) => {
  return (
    <header className={styles.header}>
      <div className={styles.titleBlock}>
        <span className={styles.eyebrow}>Admisión</span>
        <h1 className={styles.title}>Tablas maestras</h1>
        <p className={styles.description}>
          Catálogos y parámetros usados en el alta y admisión de pacientes
        </p>
      </div>
      {!showCreateForm && (
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setShowCreateForm(true)}
          title="Agregar opción"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva opción
        </button>
      )}
    </header>
  );
};

export default TableHeader;
