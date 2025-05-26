'use client';

import { useState } from 'react';
import { OpcGrd, OpcGrdGroup } from '../../../types/opcGrd.types';
import { useOpcGrdManager } from '../../../hooks/useOpcGrdManager';
import styles from '../../admission/tables/tables.module.css';
import { FaTimes, FaCog, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

export default function BillingTablesPage() {
  // Utilizamos el custom hook para gestionar las opciones de grilla
  const {
    opcionesAgrupadas,
    loading,
    error,
    createOpcGrd,
    updateOpcGrd,
    deleteOpcGrd
  } = useOpcGrdManager();
  
  // Estado para el modal de opciones de un rubro
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedRubro, setSelectedRubro] = useState<string>('');
  const [currentOpciones, setCurrentOpciones] = useState<OpcGrd[]>([]);
  
  // Estados para edición y creación
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [currentOpcion, setCurrentOpcion] = useState<OpcGrd | null>(null);
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>('');

  // Filtrar solo el grupo de FACTURACION
  const facturacionGrupo = opcionesAgrupadas.find(grupo => 
    grupo.rubro.trim().toUpperCase() === 'FACTURACION'
  );

  // Función para abrir el modal de un rubro
  const handleOpenRubroModal = (grupo: OpcGrdGroup) => {
    setSelectedRubro(grupo.rubro);
    setCurrentOpciones(grupo.opciones);
    setShowModal(true);
  };

  // Función para cerrar el modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedRubro('');
    setCurrentOpciones([]);
  };
  
  // Función para manejar errores de carga de imágenes
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>, iconoName: string) => {
    // Establecer una imagen predeterminada cuando la carga falla
    e.currentTarget.src = '/images/icons/default-icon.png';
  };
  
  // Funciones para edición
  const handleOpenEditModal = (opcion: OpcGrd) => {
    setCurrentOpcion(opcion);
    setNuevaDescripcion(opcion.descripcion);
    setIsEditing(true);
    setShowEditModal(true);
  };
  
  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setCurrentOpcion(null);
    setNuevaDescripcion('');
  };
  
  const handleSaveEdit = async () => {
    if (!currentOpcion || !nuevaDescripcion.trim()) return;
    
    try {
      const result = await updateOpcGrd(
        selectedRubro,
        currentOpcion.descripcion,
        nuevaDescripcion
      );
      
      if (result) {
        // Actualizar la lista de opciones en el estado local
        const updatedOpciones = currentOpciones.map(opcion => 
          opcion.descripcion === currentOpcion.descripcion 
            ? { ...opcion, descripcion: nuevaDescripcion }
            : opcion
        );
        setCurrentOpciones(updatedOpciones);
        handleCloseEditModal();
      } else {
        alert('Error al actualizar la opción');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };
  
  // Funciones para eliminación
  const handleOpenDeleteModal = (opcion: OpcGrd) => {
    setCurrentOpcion(opcion);
    setShowDeleteModal(true);
  };
  
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setCurrentOpcion(null);
  };
  
  const handleConfirmDelete = async () => {
    if (!currentOpcion) return;
    
    try {
      const result = await deleteOpcGrd(selectedRubro, currentOpcion.descripcion);
      
      if (result) {
        // Actualizar la lista de opciones en el estado local
        const updatedOpciones = currentOpciones.filter(
          opcion => opcion.descripcion !== currentOpcion.descripcion
        );
        setCurrentOpciones(updatedOpciones);
        handleCloseDeleteModal();
      } else {
        alert('Error al eliminar la opción');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };
  
  // Funciones para creación
  const handleOpenCreateModal = () => {
    setNuevaDescripcion('');
    setShowCreateModal(true);
  };
  
  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    setNuevaDescripcion('');
  };
  
  const handleCreate = async () => {
    if (!nuevaDescripcion.trim()) return;
    
    try {
      const result = await createOpcGrd({
        rubro: selectedRubro,
        descripcion: nuevaDescripcion,
        // Valores por defecto para icono y orden
        icono: 'default.png',
        orden: currentOpciones.length + 1
      });
      
      if (result) {
        // Actualizar la lista de opciones en el estado local
        setCurrentOpciones([...currentOpciones, result]);
        handleCloseCreateModal();
      } else {
        alert('Error al crear la opción');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
        <FaCog style={{ fontSize: '1.5rem', marginRight: '0.75rem', color: '#0083A9' }} />
        <h1 className={styles.title}>Opciones de Configuración</h1>
      </div>
      <p className={styles.description}>
        Módulo de configuración para parámetros de facturación. Seleccione para ver las opciones disponibles.
      </p>

      {/* Solo la tarjeta de FACTURACION */}
      {loading ? (
        <div className={styles.loading}>Cargando datos...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : !facturacionGrupo ? (
        <div className={styles.noResults}>No se encontraron opciones de configuración para Facturación</div>
      ) : (
        <div className={styles.card} onClick={() => handleOpenRubroModal(facturacionGrupo)} style={{ maxWidth: '300px', margin: '0 auto' }}>
          <div className={styles.cardHeader}>
            Facturación
          </div>
          <div className={styles.cardBody}>
            <div className={styles.cardCount}>{facturacionGrupo.opciones.length}</div>
            <div className={styles.cardLabel}>opciones disponibles</div>
          </div>
        </div>
      )}

      {/* Modal para mostrar opciones de un rubro */}
      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '90%', width: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {selectedRubro}
              </h2>
              <button 
                className={styles.modalCloseButton}
                onClick={handleCloseModal}
              >
                <FaTimes />
              </button>
            </div>
            
            {/* Botón para agregar nueva opción */}
            <div className={styles.buttonContainer} style={{ justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button 
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleOpenCreateModal}
              >
                <FaPlus /> Nueva Opción
              </button>
            </div>
            
            {currentOpciones.length === 0 ? (
              <div className={styles.noResults}>No hay opciones disponibles para este rubro</div>
            ) : (
              <div>
                <div className={styles.tableContainer} style={{ overflowX: 'auto' }}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Descripción</th>
                        <th>Orden</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOpciones.map((opcion, index) => (
                        <tr key={index}>
                          <td>{opcion.descripcion}</td>
                          <td>{opcion.orden}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button 
                                className={`${styles.actionButton} ${styles.editButton}`}
                                onClick={() => handleOpenEditModal(opcion)}
                                title="Editar"
                              >
                                <FaEdit size={14} />
                              </button>
                              <button 
                                className={`${styles.actionButton} ${styles.deleteButton}`}
                                onClick={() => handleOpenDeleteModal(opcion)}
                                title="Eliminar"
                              >
                                <FaTrash size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            
            <div className={styles.modalFooter}>
              <button 
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleCloseModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para editar opción */}
      {showEditModal && currentOpcion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '500px', width: '90%' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Editar Opción</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={handleCloseEditModal}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descripción:</label>
              <input
                type="text"
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
                className={styles.formInput}
                placeholder="Ingrese la nueva descripción"
              />
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleCloseEditModal}
              >
                Cancelar
              </button>
              <button 
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleSaveEdit}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para confirmar eliminación */}
      {showDeleteModal && currentOpcion && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '400px' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Confirmar Eliminación</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={handleCloseDeleteModal}
              >
                <FaTimes />
              </button>
            </div>
            
            <p>¿Está seguro que desea eliminar la opción "{currentOpcion.descripcion}"?</p>
            <p>Esta acción no se puede deshacer.</p>
            
            <div className={styles.modalFooter}>
              <button 
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleCloseDeleteModal}
              >
                Cancelar
              </button>
              <button 
                className={`${styles.button} ${styles.dangerButton}`}
                onClick={handleConfirmDelete}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal para crear nueva opción */}
      {showCreateModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '500px', width: '90%' }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Nueva Opción</h2>
              <button 
                className={styles.modalCloseButton}
                onClick={handleCloseCreateModal}
              >
                <FaTimes />
              </button>
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Descripción:</label>
              <input
                type="text"
                value={nuevaDescripcion}
                onChange={(e) => setNuevaDescripcion(e.target.value)}
                className={styles.formInput}
                placeholder="Ingrese la descripción"
              />
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={`${styles.button} ${styles.secondaryButton}`}
                onClick={handleCloseCreateModal}
              >
                Cancelar
              </button>
              <button 
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleCreate}
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
