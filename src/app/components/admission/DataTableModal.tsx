'use client';

import { useState, useEffect } from 'react';
import { IoSearch, IoClose, IoAdd, IoPencil, IoTrash } from 'react-icons/io5';
import styles from './DataTableModal.module.css';
import ActionModal from './ActionModal';

interface DataTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: any[];
  columns: {
    key: string;
    label: string;
    editable?: boolean;
  }[];
  onAddItem?: (values: Record<string, string>) => Promise<void>;
  onUpdateItem?: (key: string, values: Record<string, string>) => Promise<void>;
  onDeleteItem?: (key: string) => Promise<void>;
  keyField?: string;
}

const ITEMS_PER_PAGE = 10;

const DataTableModal = ({ 
  isOpen, 
  onClose, 
  title, 
  data, 
  columns, 
  onAddItem, 
  onUpdateItem, 
  onDeleteItem,
  keyField = 'id' 
}: DataTableModalProps) => {

  // Estado para el término de búsqueda, datos filtrados, paginación, etc.
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceData, setSourceData] = useState<any[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [displayedData, setDisplayedData] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionType, setActionType] = useState<'add' | 'edit' | 'delete'>('add');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  const handleInternalClose = () => {
    setSearchTerm(''); // Limpiar el término de búsqueda
    setCurrentPage(1); // Resetear a la primera página
    onClose();         // Llamar a la función onClose original
  };

  // ... (estados y useEffects existentes) ...
  
  
  useEffect(() => {
    if (data) {
      setSourceData(data);
      setCurrentPage(1); 
    }
  }, [data]);

  useEffect(() => {
    let processedData = sourceData;
    if (searchTerm.trim() !== '') {
      processedData = sourceData.filter(item => {
        return columns.some(column => {
          const value = item[column.key];
          return value && value.toString().toLowerCase().includes(searchTerm.toLowerCase());
        });
      });
      setCurrentPage(1); 
    }
    setFilteredData(processedData);
  }, [sourceData, searchTerm, columns]);

  useEffect(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    setDisplayedData(filteredData.slice(startIndex, endIndex));
  }, [filteredData, currentPage]);

  // Handler functions
  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleShowAddForm = () => {
    const initialValues: Record<string, string> = {};
    columns.forEach(column => {
      if (column.editable !== false) { // Permitir campos no editables no aparecer en el form de add
        initialValues[column.key] = '';
      }
    });
    setFormValues(initialValues);
    setActionType('add');
    setSelectedItem(null);
    setShowActionModal(true);
  };

  const handleStartEdit = (item: any) => {
    const editValues: Record<string, string> = {};
    columns.forEach(column => {
      if (column.editable !== false) {
         editValues[column.key] = item[column.key] !== undefined && item[column.key] !== null ? item[column.key].toString() : '';
      }
    });
    setFormValues(editValues);
    setSelectedItem(item);
    setActionType('edit');
    setShowActionModal(true);
  };

  const handleCloseActionModal = () => {
    setShowActionModal(false);
    setSelectedItem(null);
    setFormValues({}); 
  };

  const handleStartDelete = (item: any) => {
    setSelectedItem(item);
    setActionType('delete');
    // Pre-llenar formValues con algo no editable para mostrar en el modal de confirmación si es necesario
    const displayValues: Record<string, string> = {};
    columns.slice(0, 2).forEach(col => { // Mostrar primeros 2 campos como referencia
        displayValues[col.label] = item[col.key];
    });
    setFormValues(displayValues); 
    setShowActionModal(true);
  };

  const handleDeleteItem = async (values: Record<string, string>) => {
    if (!onDeleteItem || !selectedItem) return Promise.resolve(); 
    try {
      await onDeleteItem(selectedItem[keyField]);
      setShowActionModal(false);
      setSelectedItem(null);
      // Actualizar datos después de eliminar
      // setSourceData(prev => prev.filter(d => d[keyField] !== selectedItem[keyField]));
    } catch (error) {
      console.error('Error al eliminar item:', error);
      return Promise.reject(error); 
    }
  };

  const handleAddItem = async (values: Record<string, string>) => {
    if (!onAddItem) return Promise.resolve();
    try {
      await onAddItem(values);
      setShowActionModal(false);
      // Aquí se podría refrescar la data o asumir que el componente padre lo hace
    } catch (error) {
      console.error('Error al añadir item:', error);
      return Promise.reject(error);
    }
  };

  const handleUpdateItem = async (values: Record<string, string>) => {
    if (!onUpdateItem || !selectedItem) return Promise.resolve();
    try {
      await onUpdateItem(selectedItem[keyField], values);
      setShowActionModal(false);
      // Aquí se podría refrescar la data o asumir que el componente padre lo hace
    } catch (error) {
      console.error('Error al actualizar item:', error);
      return Promise.reject(error);
    }
  };

  if (!isOpen) return null;

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const footerColSpan = columns.length + ((onUpdateItem || onDeleteItem) ? 1 : 0);

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{title}</h2>
          <button onClick={handleInternalClose} className={styles.closeButton}> 
            <IoClose />
          </button>
        </div>
        
        <div className={styles.actionBarContainer}>
          <div className={styles.searchContainer}>
            <div className={styles.searchInputWrapper}>
              <IoSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
          </div>
          
          {onAddItem && (
            <button 
              className={styles.addButton}
              onClick={handleShowAddForm}
            >
              <IoAdd /> Nuevo
            </button>
          )}
        </div>
        
        <div className={styles.tableContainer}>
          {filteredData.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column.key}>{column.label}</th>
                    ))}
                    {(onUpdateItem || onDeleteItem) && <th className={styles.actionColumn}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayedData.map((item, index) => (
                    <tr key={`${item[keyField]}-${index}`}> 
                      {columns.map((column) => (
                        <td key={`${item[keyField]}-${index}-${column.key}`}>{item[column.key]}</td>
                      ))}
                      {(onUpdateItem || onDeleteItem) && (
                        <td className={styles.actionCell}>
                          {onUpdateItem && (
                            <button 
                              className={styles.editButton}
                              onClick={() => handleStartEdit(item)}
                              title="Editar"
                            >
                              <IoPencil />
                            </button>
                          )}
                          {onDeleteItem && (
                            <button 
                              className={styles.deleteButton}
                              onClick={() => handleStartDelete(item)}
                              title="Eliminar"
                            >
                              <IoTrash />
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                {totalPages > 1 && (
                  <tfoot>
                    <tr>
                      <td colSpan={footerColSpan} className={styles.paginationCellContainer}>
                        <div className={styles.paginationControlsInTable}>
                          <button 
                            onClick={handlePrevPage} 
                            disabled={currentPage === 1}
                            className={styles.paginationButton}
                          >
                            Anterior
                          </button>
                          <span className={styles.paginationInfo}>
                            Página {currentPage} de {totalPages} (Total: {filteredData.length})
                          </span>
                          <button 
                            onClick={handleNextPage} 
                            disabled={currentPage === totalPages}
                            className={styles.paginationButton}
                          >
                            Siguiente
                          </button>
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
          ) : (
            <div className={styles.noResults}>
              No se encontraron resultados{searchTerm ? ` para "${searchTerm}"` : ''}.
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={handleInternalClose} className={`${styles.formButton} ${styles.cancelButton}`}>
            Cerrar
          </button>
        </div>
      </div> 

      <ActionModal
        isOpen={showActionModal}
        onClose={handleCloseActionModal}
        title={title}
        action={actionType}
        fields={columns}
        initialValues={formValues}
        onSubmit={actionType === 'add' 
          ? handleAddItem 
          : actionType === 'edit' 
          ? handleUpdateItem 
          : handleDeleteItem}
        recordKey={selectedItem ? selectedItem[keyField] : undefined}
      />
    </div>
  );
};

export default DataTableModal;
