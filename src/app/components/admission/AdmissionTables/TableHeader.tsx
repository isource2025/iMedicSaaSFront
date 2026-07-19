import React from 'react';
import { IoAdd } from 'react-icons/io5';
import styles from '../../opcGrd/OpcGrdTables.module.css';
import { TableHeaderProps } from './types';

const TableHeader: React.FC<TableHeaderProps> = ({
  showCreateForm,
  setShowCreateForm,
}) => {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Tablas de Admisión</h1>
        <p className={styles.description}>Catálogo de tablas maestras del módulo de admisión</p>
      </div>
      {!showCreateForm && (
        <button
          type="button"
          className={styles.addButton}
          onClick={() => setShowCreateForm(true)}
          title="Agregar nueva opción"
        >
          <IoAdd size={16} /> Agregar opción
        </button>
      )}
    </div>
  );
};

export default TableHeader;
