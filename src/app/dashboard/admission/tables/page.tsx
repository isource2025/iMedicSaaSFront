'use client';

import { useState, useEffect } from 'react';
import { OpcGrd, OpcGrdGroup } from '../../../types/opcGrd.types';
import { useOpcGrdManager } from '../../../hooks/useOpcGrdManager';
import styles from './tables.module.css';
import { FaTimes, FaCog, FaEdit, FaTrash, FaPlus, FaSave, FaUndo } from 'react-icons/fa';

export default function AdmissionTablesPage() {
  // Utilizamos el custom hook para gestionar las opciones de grilla
  const {
    opcionesAgrupadas,
    loading,
    error,
    createOpcGrd,
    updateOpcGrd,
    deleteOpcGrd
  } = useOpcGrdManager();
  
  // Estado para las opciones de ADMISION
  const [admisionOpciones, setAdmisionOpciones] = useState<OpcGrd[]>([]);
  
  // Estados para edición y creación
  const [editingOpcion, setEditingOpcion] = useState<string | null>(null);
  const [deletingOpcion, setDeletingOpcion] = useState<string | null>(null);
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createDescripcion, setCreateDescripcion] = useState<string>('');
  
  // Obtener las opciones de ADMISION cuando cambie opcionesAgrupadas
  useEffect(() => {
    const grupo = opcionesAgrupadas.find(g => g.rubro.trim() === 'ADMISION');
    if (grupo) {
      setAdmisionOpciones(grupo.opciones);
    }
  }, [opcionesAgrupadas]);
  
  // Función para manejar errores de carga de imágenes
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/images/icons/default-icon.png';
  };
  
  // Iniciar edición de una opción
  const handleStartEdit = (opcion: OpcGrd) => {
    setEditingOpcion(opcion.descripcion);
    setNuevaDescripcion(opcion.descripcion);
  };
  
  // Cancelar edición
  const handleCancelEdit = () => {
    setEditingOpcion(null);
    setNuevaDescripcion('');
  };
  
  // Guardar cambios de edición
  const handleSaveEdit = async (opcion: OpcGrd) => {
    if (!nuevaDescripcion.trim()) return;
    
    try {
      const result = await updateOpcGrd(
        'ADMISION',
        opcion.descripcion,
        nuevaDescripcion
      );
      
      if (result) {
        setEditingOpcion(null);
        setNuevaDescripcion('');
      } else {
        alert('Error al actualizar la opción');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };
  
  // Iniciar proceso de eliminación
  const handleStartDelete = (opcion: OpcGrd) => {
    setDeletingOpcion(opcion.descripcion);
  };
  
  // Cancelar eliminación
  const handleCancelDelete = () => {
    setDeletingOpcion(null);
  };
  
  // Confirmar eliminación
  const handleConfirmDelete = async (opcion: OpcGrd) => {
    try {
      const result = await deleteOpcGrd('ADMISION', opcion.descripcion);
      
      if (result) {
        setDeletingOpcion(null);
      } else {
        alert('Error al eliminar la opción');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };
  
  // Mostrar formulario de creación
  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setCreateDescripcion('');
  };
  
  // Ocultar formulario de creación
  const handleHideCreateForm = () => {
    setShowCreateForm(false);
    setCreateDescripcion('');
  };
  
  // Crear nueva opción
  const handleCreate = async () => {
    if (!createDescripcion.trim()) return;
    
    try {
      const result = await createOpcGrd({
        rubro: 'ADMISION',
        descripcion: createDescripcion,
        icono: 'default.png',
        orden: admisionOpciones.length + 1
      });
      
      if (result) {
        setShowCreateForm(false);
        setCreateDescripcion('');
      } else {
        alert('Error al crear la opción');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerContainer}>
        <h1 className={styles.title}>
          <FaCog className={styles.titleIcon} /> Tablas de Admisión
        </h1>
        <p className={styles.description}>
          Configuración de opciones para el módulo de admisión
        </p>
      </div>
      
      {/* Botón para agregar nueva opción */}
      <div className={styles.buttonContainerEnd}>
        <button 
          className={`${styles.button} ${styles.primaryButton}`}
          onClick={handleShowCreateForm}
        >
          <FaPlus /> Nueva Opción
        </button>
      </div>
      
      {/* Formulario de creación */}
      {showCreateForm && (
        <div className={styles.formContainerWithMargin}>
          <h3>Nueva Opción</h3>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Descripción:</label>
            <input
              type="text"
              value={createDescripcion}
              onChange={(e) => setCreateDescripcion(e.target.value)}
              className={styles.formInput}
              placeholder="Ingrese la descripción"
            />
          </div>
          <div className={styles.buttonContainer}>
            <button 
              className={`${styles.button} ${styles.secondaryButton}`}
              onClick={handleHideCreateForm}
            >
              Cancelar
            </button>
            <button 
              className={`${styles.button} ${styles.primaryButton}`}
              onClick={handleCreate}
              disabled={!createDescripcion.trim()}
            >
              Crear
            </button>
          </div>
        </div>
      )}
      
      {loading ? (
        <div className={styles.loading}>Cargando opciones...</div>
      ) : error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <div>
          {admisionOpciones.length > 0 ? (
            <div className={styles.opcionesGridResponsive}>
              {admisionOpciones.map((opcion, index) => (
                <div key={index} className={`${styles.opcionItem} ${styles.opcionItemPadded}`}>
                  {/* Botones de acción */}
                  {!editingOpcion && !deletingOpcion && (
                    <div className={styles.actionButtonsContainer}>
                      <button 
                        className={`${styles.actionButton} ${styles.editButton}`}
                        onClick={() => handleStartEdit(opcion)}
                        title="Editar"
                      >
                        <FaEdit size={14} />
                      </button>
                      <button 
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        onClick={() => handleStartDelete(opcion)}
                        title="Eliminar"
                      >
                        <FaTrash size={14} />
                      </button>
                    </div>
                  )}
                  
                  {/* Modo de visualización */}
                  {editingOpcion !== opcion.descripcion && deletingOpcion !== opcion.descripcion && (
                    <>
                      <div className={`${styles.opcionLabel} ${styles.opcionLabelHighlighted}`}>
                        {opcion.descripcion}
                      </div>
                      <div className={styles.opcionDetail}>
                        <span className={styles.opcionDetailText}>Orden:</span> {opcion.orden}
                      </div>
                    </>
                  )}
                  
                  {/* Modo de edición */}
                  {editingOpcion === opcion.descripcion && (
                    <div>
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
                      <div className={styles.buttonContainer}>
                        <button 
                          className={`${styles.actionButton} ${styles.secondaryButton}`}
                          onClick={handleCancelEdit}
                          title="Cancelar"
                        >
                          <FaUndo size={14} /> Cancelar
                        </button>
                        <button 
                          className={`${styles.actionButton} ${styles.saveButton}`}
                          onClick={() => handleSaveEdit(opcion)}
                          title="Guardar"
                          disabled={!nuevaDescripcion.trim()}
                        >
                          <FaSave size={16} /> Guardar
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Confirmación de eliminación */}
                  {deletingOpcion === opcion.descripcion && (
                    <div>
                      <p className={styles.deleteConfirmText}>¿Eliminar esta opción?</p>
                      <p>Esta acción no se puede deshacer.</p>
                      <div className={styles.buttonContainer}>
                        <button 
                          className={`${styles.button} ${styles.secondaryButton}`}
                          onClick={handleCancelDelete}
                        >
                          Cancelar
                        </button>
                        <button 
                          className={`${styles.button} ${styles.dangerButton}`}
                          onClick={() => handleConfirmDelete(opcion)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.noResults}>No hay opciones configuradas para Admisión</div>
          )}
        </div>
      )}
    </div>
  );
}
