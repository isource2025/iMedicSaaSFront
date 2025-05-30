'use client';

import { useState } from 'react';
import { OpcGrd } from '../../../types/opcGrd.types';
import { useOpcGrdManager } from '../../../hooks/useOpcGrdManager';
import styles from '../../admission/tables/tables.module.css';
import { FaCog, FaEdit, FaTrash, FaPlus, FaSave, FaUndo } from 'react-icons/fa';

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
  
  // Estados para la creación de nuevas opciones
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createDescripcion, setCreateDescripcion] = useState<string>('');
  
  // Estados para edición y eliminación
  const [editingOpcion, setEditingOpcion] = useState<string | null>(null);
  const [deletingOpcion, setDeletingOpcion] = useState<string | null>(null);
  const [nuevaDescripcion, setNuevaDescripcion] = useState<string>('');

  // Filtrar solo el grupo de FACTURACION
  const facturacionGrupo = opcionesAgrupadas.find(grupo => 
    grupo.rubro.trim().toUpperCase() === 'FACTURACION'
  );

  // Obtener las opciones de facturación
  const facturacionOpciones = facturacionGrupo?.opciones || [];

  // Funciones para mostrar/ocultar el formulario de creación
  const handleShowCreateForm = () => {
    setShowCreateForm(true);
    setCreateDescripcion('');
  };

  const handleHideCreateForm = () => {
    setShowCreateForm(false);
    setCreateDescripcion('');
  };

  // Funciones para edición
  const handleStartEdit = (opcion: OpcGrd) => {
    setEditingOpcion(opcion.descripcion);
    setNuevaDescripcion(opcion.descripcion);
  };

  const handleCancelEdit = () => {
    setEditingOpcion(null);
    setNuevaDescripcion('');
  };

  const handleSaveEdit = async (opcion: OpcGrd) => {
    if (!nuevaDescripcion.trim()) return;
    
    try {
      const result = await updateOpcGrd(
        'FACTURACION',
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

  // Funciones para eliminación
  const handleStartDelete = (opcion: OpcGrd) => {
    setDeletingOpcion(opcion.descripcion);
  };

  const handleCancelDelete = () => {
    setDeletingOpcion(null);
  };

  const handleConfirmDelete = async (opcion: OpcGrd) => {
    try {
      const result = await deleteOpcGrd('FACTURACION', opcion.descripcion);
      
      if (result) {
        setDeletingOpcion(null);
      } else {
        alert('Error al eliminar la opción');
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  // Función para crear nueva opción
  const handleCreate = async () => {
    if (!createDescripcion.trim()) return;
    
    try {
      const result = await createOpcGrd({
        rubro: 'FACTURACION',
        descripcion: createDescripcion,
        icono: 'default.png',
        orden: facturacionOpciones.length + 1
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
          <FaCog className={styles.titleIcon} /> Tablas de Facturación
        </h1>
        <p className={styles.description}>
          Configuración de opciones para el módulo de facturación
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
          {facturacionOpciones.length > 0 ? (
            <div className={styles.opcionesGridResponsive}>
              {facturacionOpciones.map((opcion, index) => (
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
            <div className={styles.noResults}>No hay opciones disponibles para facturación</div>
          )}
        </div>
      )}
    </div>
  );
}
