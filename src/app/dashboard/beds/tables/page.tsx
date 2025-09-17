'use client';

import { useState, useEffect } from 'react';
import { OpcGrd } from '@/app/types/opcGrd.types';
import { useOpcGrdManager } from '@/app/hooks/useOpcGrdManager';
import styles from '../../admission/tables/tables.module.css';
import { FaCog, FaEdit, FaTrash, FaPlus, FaSave, FaUndo } from 'react-icons/fa';

export default function BedsTablesPage() {
  // Utilizamos el custom hook para gestionar las opciones de grilla
  const {
    opcionesAgrupadas,
    loading,
    error,
    createOpcGrd,
    updateOpcGrd,
    deleteOpcGrd
  } = useOpcGrdManager();
  
  // Estado para las opciones de INTERNACION
  const [internacionOpciones, setInternacionOpciones] = useState<OpcGrd[]>([]);
  
  // Estados para edición y creación
  const [editingOpcion, setEditingOpcion] = useState<string | null>(null);
  const [deletingOpcion, setDeletingOpcion] = useState<string | null>(null);
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createDescripcion, setCreateDescripcion] = useState<string>('');
  
  // Obtener las opciones de INTERNACION cuando cambie opcionesAgrupadas
  useEffect(() => {
    const grupo = opcionesAgrupadas.find(g => g.rubro.trim() === 'INTERNACION');
    if (grupo) {
      setInternacionOpciones(grupo.opciones);
    }
  }, [opcionesAgrupadas]);
  
  // Función para manejar errores de carga de imágenes
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = '/images/ConfigGral.ico';
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
        'INTERNACION',
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
      const result = await deleteOpcGrd('INTERNACION', opcion.descripcion);
      
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
        rubro: 'INTERNACION',
        descripcion: createDescripcion,
        icono: 'default.png',
        orden: internacionOpciones.length + 1
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
          <FaCog className={styles.titleIcon} /> Tablas de Internación
        </h1>
        <p className={styles.description}>
          Configuración de opciones para el módulo de internación
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
          {internacionOpciones.length > 0 ? (
            <div className={styles.opcionesGridResponsive}>
              {internacionOpciones.map((opcion, index) => (
                <div key={index} className={`${styles.opcionItem} ${styles.opcionItemPadded}`}>
                  
                  {/* Modo de visualización */}
                  {editingOpcion !== opcion.descripcion && deletingOpcion !== opcion.descripcion && (
                    <div className={styles.opcionContentWithButtons}>
                      <div className={styles.opcionContent}>
                        <div className={styles.opcionIconContainer}>
                          <img 
                            src={`/images/${opcion.icono}`} 
                            alt="Icono" 
                            className={styles.opcionIcon} 
                            onError={handleImageError}
                          />
                        </div>
                        <div className={`${styles.opcionLabel} ${styles.opcionLabelHighlighted}`}>
                          {opcion.descripcion}
                        </div>
                      </div>
                      
                      {/* Botones de acción */}
                      {!editingOpcion && !deletingOpcion && (
                        <div className={styles.actionButtonsContainerBottom}>
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
                    </div>
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
                          Cancelar
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
            <div className={styles.noResults}>No hay opciones configuradas para Internación</div>
          )}
        </div>
      )}
    </div>
  );
}

