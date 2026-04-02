'use client';

import { useState, useEffect } from 'react';
import { laboratoriosService } from '@/app/services/laboratoriosService';
import { ExamenLabCompleto } from '@/app/types/laboratorios';
import Loader from '../../Loader/Loader';
import LabUploadModal from './LabUploadModal';
import LabFormModal from './LabFormModal';
import LabResultsTable from './LabResultsTable';
import LabAnalysisView from './LabAnalysisView';
import styles from './LabResultsSection.module.css';

interface LabResultsSectionProps {
  numeroVisita: number | null;
  patientName?: string;
  patientLocation?: string;
  documentoPaciente?: string;
  fechaIngreso?: string;
  horaIngreso?: string;
}

export default function LabResultsSection({
  numeroVisita,
  patientName,
  patientLocation,
  documentoPaciente,
  fechaIngreso,
  horaIngreso,
}: LabResultsSectionProps) {
  const [examenes, setExamenes] = useState<ExamenLabCompleto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedExamen, setSelectedExamen] = useState<ExamenLabCompleto | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'lista' | 'analisis'>('lista');

  useEffect(() => {
    if (numeroVisita) {
      loadExamenes();
    }
  }, [numeroVisita]);

  const loadExamenes = async () => {
    if (!numeroVisita) return;

    try {
      setLoading(true);
      setError(null);
      const data = await laboratoriosService.getExamenesByVisita(numeroVisita);
      setExamenes(data);
    } catch (err) {
      console.error('Error al cargar exámenes:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar exámenes');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setShowUploadModal(false);
    loadExamenes();
  };

  const handleViewExamen = (examen: ExamenLabCompleto) => {
    setSelectedExamen(examen);
    setShowDetailModal(true);
  };

  const handleEditExamen = (examen: ExamenLabCompleto) => {
    setSelectedExamen(examen);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedExamen(null);
    loadExamenes();
  };

  const handleDeleteExamen = async (idExamen: number) => {
    if (!confirm('¿Está seguro de eliminar este examen?')) return;

    try {
      setLoading(true);
      await laboratoriosService.deleteExamen(idExamen);
      await loadExamenes();
    } catch (err) {
      console.error('Error al eliminar examen:', err);
      alert('Error al eliminar el examen');
    } finally {
      setLoading(false);
    }
  };

  if (!numeroVisita) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <p>No hay visita seleccionada</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Resultados de Laboratorio</h2>
          <div className={styles.patientInfo}>
            <span className={styles.patientName}>{patientName || 'PACIENTE'}</span>
            {documentoPaciente && (
              <>
                <span className={styles.separator}>•</span>
                <span>DNI: {documentoPaciente}</span>
              </>
            )}
            {patientLocation && (
              <>
                <span className={styles.separator}>•</span>
                <span>{patientLocation}</span>
              </>
            )}
          </div>
        </div>
        <button
          className={styles.uploadButton}
          onClick={() => setShowUploadModal(true)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Cargar Laboratorio
        </button>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'lista' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('lista')}
        >
          📋 Lista de Exámenes
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'analisis' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('analisis')}
          disabled={examenes.length === 0}
        >
          📊 Análisis y Gráficos
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div style={{ position: 'relative', minHeight: '300px' }}>
          <Loader />
        </div>
      ) : examenes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🧪</div>
          <h3>No hay estudios de laboratorio</h3>
          <p>Cargue un nuevo estudio haciendo clic en el botón "Cargar Laboratorio"</p>
        </div>
      ) : activeTab === 'analisis' ? (
        <LabAnalysisView examenes={examenes} />
      ) : (
        <div className={styles.examenesGrid}>
          {examenes.map((examen) => (
            <div key={examen.IdExamen} className={styles.examenCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>
                  <span className={styles.tipoIcon}>
                    {laboratoriosService.getTipoEstudioIcon(examen.TipoEstudio)}
                  </span>
                  <span>{laboratoriosService.getTipoEstudioNombre(examen.TipoEstudio)}</span>
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleViewExamen(examen)}
                    title="Ver detalle"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleEditExamen(examen)}
                    title="Editar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className={`${styles.actionButton} ${styles.deleteButton}`}
                    onClick={() => handleDeleteExamen(examen.IdExamen!)}
                    title="Eliminar"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardInfo}>
                  <div className={styles.infoRow}>
                    <span className={styles.infoLabel}>Fecha:</span>
                    <span>{laboratoriosService.formatDate(examen.FechaExamen)}</span>
                  </div>
                  {examen.SectorDescripcion && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Sector:</span>
                      <span>{examen.SectorDescripcion}</span>
                    </div>
                  )}
                  {examen.Laboratorio && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Laboratorio:</span>
                      <span>{examen.Laboratorio}</span>
                    </div>
                  )}
                  {examen.Protocolo && (
                    <div className={styles.infoRow}>
                      <span className={styles.infoLabel}>Protocolo:</span>
                      <span>{examen.Protocolo}</span>
                    </div>
                  )}
                </div>

                <div className={styles.cardStats}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>{examen.totalParametros || 0}</span>
                    <span className={styles.statLabel}>Parámetros</span>
                  </div>
                  {examen.parametrosFueraDeRango && examen.parametrosFueraDeRango > 0 && (
                    <div className={styles.stat}>
                      <span className={styles.statValue} style={{ color: '#f59e0b' }}>
                        {examen.parametrosFueraDeRango}
                      </span>
                      <span className={styles.statLabel}>Fuera de rango</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de carga */}
      {showUploadModal && numeroVisita && (
        <LabUploadModal
          numeroVisita={numeroVisita}
          onClose={() => setShowUploadModal(false)}
          onSuccess={handleUploadSuccess}
        />
      )}

      {/* Modal de detalle */}
      {showDetailModal && selectedExamen && (
        <div className={styles.modalOverlay} onClick={() => setShowDetailModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                {laboratoriosService.getTipoEstudioIcon(selectedExamen.TipoEstudio)}{' '}
                {laboratoriosService.getTipoEstudioNombre(selectedExamen.TipoEstudio)}
              </h3>
              <button
                className={styles.closeButton}
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody}>
              <LabResultsTable examen={selectedExamen} />
            </div>
          </div>
        </div>
      )}

      {/* Modal de edición */}
      {showEditModal && selectedExamen && numeroVisita && (
        <LabFormModal
          numeroVisita={numeroVisita}
          examenExistente={selectedExamen}
          onClose={() => {
            setShowEditModal(false);
            setSelectedExamen(null);
          }}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}
