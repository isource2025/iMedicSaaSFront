'use client';

import { useState, useEffect } from 'react';
import { laboratoriosService } from '@/app/services/laboratoriosService';
import { sectoresService, Sector } from '@/app/services/sectoresService';
import { OCRResult, ExamenLabDetalle, ExamenLabCompleto } from '@/app/types/laboratorios';
import Loader from '../../Loader/Loader';
import styles from './LabFormModal.module.css';

interface LabFormModalProps {
  numeroVisita: number;
  ocrResult?: OCRResult;
  examenExistente?: ExamenLabCompleto;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LabFormModal({ numeroVisita, ocrResult, examenExistente, onClose, onSuccess }: LabFormModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sectores, setSectores] = useState<Sector[]>([]);
  const [loadingSectores, setLoadingSectores] = useState(true);
  
  const isEdit = !!examenExistente;
  
  // Convertir fecha del OCR de DD/MM/YYYY a YYYY-MM-DD
  const convertirFecha = (fecha: string | null | undefined): string => {
    if (!fecha) return new Date().toISOString().split('T')[0];
    
    // Si ya está en formato YYYY-MM-DD, retornar
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    
    // Convertir DD/MM/YYYY o DD-MM-YYYY a YYYY-MM-DD
    const match = fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const [, dia, mes, anio] = match;
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    
    return new Date().toISOString().split('T')[0];
  };

  // Estado del formulario
  const [fechaExamen, setFechaExamen] = useState(
    isEdit 
      ? examenExistente.FechaExamen?.split('T')[0] || new Date().toISOString().split('T')[0]
      : convertirFecha(ocrResult?.cabecera.fecha || null)
  );
  const [horaExamen, setHoraExamen] = useState(
    isEdit ? (examenExistente.HoraExamen || '00:00') : '00:00'
  );
  const [laboratorio, setLaboratorio] = useState(
    isEdit ? (examenExistente.Laboratorio || '') : (ocrResult?.cabecera.laboratorio || '')
  );
  const [protocolo, setProtocolo] = useState(
    isEdit ? (examenExistente.Protocolo || '') : (ocrResult?.cabecera.protocolo || '')
  );
  const [observaciones, setObservaciones] = useState(
    isEdit ? (examenExistente.Observaciones || '') : ''
  );
  const [sectorSeleccionado, setSectorSeleccionado] = useState<string>(
    isEdit ? (examenExistente.IdSector || '') : ''
  );
  
  // Parámetros editables
  const [parametros, setParametros] = useState<ExamenLabDetalle[]>(
    isEdit
      ? examenExistente.detalles.map((d, index) => ({
          NombreParametro: d.NombreParametro,
          Resultado: d.Resultado,
          UnidadMedida: d.UnidadMedida || '',
          ValorReferencia: d.ValorReferencia || '',
          FueraDeRango: d.FueraDeRango || false,
          Orden: d.Orden || index + 1
        }))
      : ocrResult?.parametros.map((p, index) => ({
          NombreParametro: p.nombreParametro,
          Resultado: p.resultado,
          UnidadMedida: p.unidadMedida || '',
          ValorReferencia: p.valorReferencia || '',
          Metodo: p.metodo || '',
          MarcaReactivo: p.marcaReactivo || '',
          FueraDeRango: false,
          Orden: index + 1
        })) || []
  );

  // Cargar sectores y sector desde localStorage
  useEffect(() => {
    const cargarSectores = async () => {
      try {
        const sectoresData = await sectoresService.getSectores();
        setSectores(sectoresData);
        
        // Cargar sector desde localStorage
        const sectorStorage = localStorage.getItem('sectorSeleccionado');
        if (sectorStorage) {
          try {
            const sector = JSON.parse(sectorStorage);
            setSectorSeleccionado(sector.idSector || '');
          } catch (e) {
            console.error('Error al parsear sectorSeleccionado:', e);
          }
        }
      } catch (error) {
        console.error('Error al cargar sectores:', error);
      } finally {
        setLoadingSectores(false);
      }
    };
    
    cargarSectores();
  }, []);

  const handleParametroChange = (index: number, field: keyof ExamenLabDetalle, value: string) => {
    const newParametros = [...parametros];
    (newParametros[index] as any)[field] = value;
    setParametros(newParametros);
  };

  const handleRemoveParametro = (index: number) => {
    setParametros(parametros.filter((_, i) => i !== index));
  };

  const handleAddParametro = () => {
    setParametros([
      ...parametros,
      {
        NombreParametro: '',
        Resultado: '',
        UnidadMedida: '',
        ValorReferencia: '',
        FueraDeRango: false,
        Orden: parametros.length + 1
      }
    ]);
  };

  const handleSave = async () => {
    // Validar que haya al menos un parámetro
    if (parametros.length === 0) {
      setError('Debe agregar al menos un parámetro');
      return;
    }

    // Validar que todos los parámetros tengan nombre y resultado
    const invalid = parametros.some(p => !p.NombreParametro || !p.Resultado);
    if (invalid) {
      setError('Todos los parámetros deben tener nombre y resultado');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const cabecera = {
        NumeroVisita: numeroVisita,
        FechaExamen: fechaExamen,
        HoraExamen: horaExamen,
        TipoEstudio: isEdit ? examenExistente.TipoEstudio : (ocrResult?.tipoEstudio || 'GENERAL'),
        Laboratorio: laboratorio,
        Protocolo: protocolo,
        Observaciones: observaciones,
        IdSector: sectorSeleccionado
      };

      if (isEdit) {
        await laboratoriosService.updateExamen(examenExistente.IdExamen!, cabecera, parametros);
      } else {
        await laboratoriosService.saveExamen(cabecera, parametros);
      }
      
      onSuccess();
    } catch (err) {
      console.error('Error al guardar examen:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar el examen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            {isEdit ? '✏️' : laboratoriosService.getTipoEstudioIcon(ocrResult?.tipoEstudio || 'GENERAL')}{' '}
            {isEdit ? 'Editar Examen' : laboratoriosService.getTipoEstudioNombre(ocrResult?.tipoEstudio || 'GENERAL')}
          </h2>
          <button className={styles.closeButton} onClick={onClose} disabled={saving}>
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Información general */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Información General</h3>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Fecha del Examen *</label>
                <input
                  type="date"
                  value={fechaExamen}
                  onChange={(e) => setFechaExamen(e.target.value)}
                  className={styles.input}
                  disabled={saving}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label>Hora</label>
                <input
                  type="time"
                  value={horaExamen}
                  onChange={(e) => setHoraExamen(e.target.value)}
                  className={styles.input}
                  disabled={saving}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Laboratorio</label>
                <input
                  type="text"
                  value={laboratorio}
                  onChange={(e) => setLaboratorio(e.target.value)}
                  className={styles.input}
                  disabled={saving}
                  placeholder="Nombre del laboratorio"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Protocolo</label>
                <input
                  type="text"
                  value={protocolo}
                  onChange={(e) => setProtocolo(e.target.value)}
                  className={styles.input}
                  disabled={saving}
                  placeholder="Número de protocolo"
                />
              </div>
              <div className={styles.formGroup}>
                <label>Sector *</label>
                <select
                  value={sectorSeleccionado}
                  onChange={(e) => setSectorSeleccionado(e.target.value)}
                  className={styles.input}
                  disabled={saving || loadingSectores}
                  required
                >
                  <option value="">Seleccione un sector</option>
                  {sectores.map((sector) => (
                    <option key={sector.IdSector} value={sector.IdSector}>
                      {sector.Descripcion}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label>Observaciones</label>
              <textarea
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className={styles.textarea}
                disabled={saving}
                rows={2}
                placeholder="Observaciones adicionales"
              />
            </div>
          </div>

          {/* Parámetros */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>Parámetros ({parametros.length})</h3>
              <button
                className={styles.addButton}
                onClick={handleAddParametro}
                disabled={saving}
              >
                + Agregar Parámetro
              </button>
            </div>

            <div className={styles.parametrosContainer}>
              {parametros.map((param, index) => (
                <div key={index} className={styles.parametroCard}>
                  <div className={styles.parametroHeader}>
                    <span className={styles.parametroNumber}>#{index + 1}</span>
                    <button
                      className={styles.removeButton}
                      onClick={() => handleRemoveParametro(index)}
                      disabled={saving}
                      title="Eliminar parámetro"
                    >
                      ✕
                    </button>
                  </div>
                  <div className={styles.parametroGrid}>
                    <div className={styles.formGroup}>
                      <label>Parámetro *</label>
                      <input
                        type="text"
                        value={param.NombreParametro}
                        onChange={(e) => handleParametroChange(index, 'NombreParametro', e.target.value)}
                        className={styles.input}
                        disabled={saving}
                        placeholder="Ej: Hemoglobina"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Resultado *</label>
                      <input
                        type="text"
                        value={param.Resultado}
                        onChange={(e) => handleParametroChange(index, 'Resultado', e.target.value)}
                        className={styles.input}
                        disabled={saving}
                        placeholder="Ej: 14.5"
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Unidad</label>
                      <input
                        type="text"
                        value={param.UnidadMedida || ''}
                        onChange={(e) => handleParametroChange(index, 'UnidadMedida', e.target.value)}
                        className={styles.input}
                        disabled={saving}
                        placeholder="Ej: g/dl"
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label>Valor de Referencia</label>
                      <input
                        type="text"
                        value={param.ValorReferencia || ''}
                        onChange={(e) => handleParametroChange(index, 'ValorReferencia', e.target.value)}
                        className={styles.input}
                        disabled={saving}
                        placeholder="Ej: 13-17 g/dl"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {saving && (
            <div className={styles.savingContainer}>
              <Loader />
              <p>Guardando examen...</p>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
            disabled={saving}
          >
            Cancelar
          </button>
          <button
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving || parametros.length === 0}
          >
            {saving ? 'Guardando...' : (isEdit ? 'Actualizar Examen' : 'Guardar Examen')}
          </button>
        </div>
      </div>
    </div>
  );
}
