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

  const convertirFecha = (fecha: string | null | undefined): string => {
    if (!fecha) return new Date().toISOString().split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha;
    const match = fecha.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const [, dia, mes, anio] = match;
      return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }
    return new Date().toISOString().split('T')[0];
  };

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

  const [parametros, setParametros] = useState<ExamenLabDetalle[]>(
    isEdit
      ? examenExistente.detalles.map((d, index) => ({
          NombreParametro: d.NombreParametro,
          Resultado: d.Resultado,
          UnidadMedida: d.UnidadMedida || '',
          ValorReferencia: d.ValorReferencia || '',
          FueraDeRango: d.FueraDeRango || false,
          Orden: d.Orden || index + 1,
        }))
      : ocrResult?.parametros.map((p, index) => ({
          NombreParametro: p.nombreParametro,
          Resultado: p.resultado,
          UnidadMedida: p.unidadMedida || '',
          ValorReferencia: p.valorReferencia || '',
          Metodo: p.metodo || '',
          MarcaReactivo: p.marcaReactivo || '',
          FueraDeRango: false,
          Orden: index + 1,
        })) || []
  );

  useEffect(() => {
    const cargarSectores = async () => {
      try {
        const sectoresData = await sectoresService.getSectores();
        setSectores(sectoresData);
        const sectorStorage = localStorage.getItem('sectorSeleccionado');
        if (sectorStorage) {
          try {
            const sector = JSON.parse(sectorStorage);
            setSectorSeleccionado(sector.idSector || '');
          } catch (e) {
            console.error('Error al parsear sectorSeleccionado:', e);
          }
        }
      } catch (err) {
        console.error('Error al cargar sectores:', err);
      } finally {
        setLoadingSectores(false);
      }
    };
    cargarSectores();
  }, []);

  const handleParametroChange = (index: number, field: keyof ExamenLabDetalle, value: string) => {
    setParametros((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: value } : p))
    );
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
        Orden: parametros.length + 1,
      },
    ]);
  };

  const handleSave = async () => {
    if (parametros.length === 0) {
      setError('Debe agregar al menos un parámetro');
      return;
    }
    const invalid = parametros.some((p) => !p.NombreParametro?.trim() || !p.Resultado?.trim());
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
        IdSector: sectorSeleccionado,
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

  const titulo = isEdit
    ? 'Editar Examen'
    : laboratoriosService.getTipoEstudioNombre(ocrResult?.tipoEstudio || 'GENERAL');
  const icono = isEdit ? '✏️' : laboratoriosService.getTipoEstudioIcon(ocrResult?.tipoEstudio || 'GENERAL');

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            {icono} {titulo}
            {ocrResult?.cabecera.paciente && (
              <span className={styles.pacienteSub}>
                {ocrResult.cabecera.paciente}
                {ocrResult.cabecera.protocolo ? ` · Prot. ${ocrResult.cabecera.protocolo}` : ''}
              </span>
            )}
          </h2>
          <button className={styles.closeButton} onClick={onClose} disabled={saving} type="button" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.cabeceraBar}>
            <label className={styles.cabeceraField}>
              <span>Fecha *</span>
              <input
                type="date"
                value={fechaExamen}
                onChange={(e) => setFechaExamen(e.target.value)}
                className={styles.cabeceraInput}
                disabled={saving}
                required
              />
            </label>
            <label className={styles.cabeceraField}>
              <span>Hora</span>
              <input
                type="time"
                value={horaExamen}
                onChange={(e) => setHoraExamen(e.target.value)}
                className={styles.cabeceraInput}
                disabled={saving}
              />
            </label>
            <label className={styles.cabeceraField}>
              <span>Laboratorio</span>
              <input
                type="text"
                value={laboratorio}
                onChange={(e) => setLaboratorio(e.target.value)}
                className={styles.cabeceraInput}
                disabled={saving}
                placeholder="Laboratorio"
              />
            </label>
            <label className={styles.cabeceraField}>
              <span>Protocolo</span>
              <input
                type="text"
                value={protocolo}
                onChange={(e) => setProtocolo(e.target.value)}
                className={styles.cabeceraInput}
                disabled={saving}
                placeholder="Nº protocolo"
              />
            </label>
            <label className={styles.cabeceraField}>
              <span>Sector *</span>
              <select
                value={sectorSeleccionado}
                onChange={(e) => setSectorSeleccionado(e.target.value)}
                className={styles.cabeceraInput}
                disabled={saving || loadingSectores}
                required
              >
                <option value="">Seleccionar</option>
                {sectores.map((sector) => (
                  <option key={sector.IdSector} value={sector.IdSector}>
                    {sector.Descripcion}
                  </option>
                ))}
              </select>
            </label>
            <label className={`${styles.cabeceraField} ${styles.cabeceraFieldWide}`}>
              <span>Observaciones</span>
              <input
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className={styles.cabeceraInput}
                disabled={saving}
                placeholder="Opcional"
              />
            </label>
          </div>

          <div className={styles.parametrosSection}>
            <div className={styles.parametrosToolbar}>
              <h3 className={styles.parametrosTitle}>Resultados ({parametros.length})</h3>
              <button
                type="button"
                className={styles.addButton}
                onClick={handleAddParametro}
                disabled={saving}
              >
                + Fila
              </button>
            </div>

            <div className={styles.tableScroll}>
              <table className={styles.paramTable}>
                <thead>
                  <tr>
                    <th className={styles.colNum}>#</th>
                    <th className={styles.colParam}>Parámetro</th>
                    <th className={styles.colResult}>Resultado</th>
                    <th className={styles.colUnit}>Unidad</th>
                    <th className={styles.colRef}>Referencia</th>
                    <th className={styles.colAction} aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {parametros.length === 0 ? (
                    <tr>
                      <td colSpan={6} className={styles.emptyRow}>
                        Sin parámetros. Usá &quot;+ Fila&quot; para agregar uno.
                      </td>
                    </tr>
                  ) : (
                    parametros.map((param, index) => (
                      <tr key={index}>
                        <td className={styles.colNum}>{index + 1}</td>
                        <td>
                          <input
                            type="text"
                            value={param.NombreParametro}
                            onChange={(e) => handleParametroChange(index, 'NombreParametro', e.target.value)}
                            className={styles.cellInput}
                            disabled={saving}
                            placeholder="Nombre"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={param.Resultado}
                            onChange={(e) => handleParametroChange(index, 'Resultado', e.target.value)}
                            className={`${styles.cellInput} ${styles.cellInputResult}`}
                            disabled={saving}
                            placeholder="Valor"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={param.UnidadMedida || ''}
                            onChange={(e) => handleParametroChange(index, 'UnidadMedida', e.target.value)}
                            className={styles.cellInput}
                            disabled={saving}
                            placeholder="g/dl"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={param.ValorReferencia || ''}
                            onChange={(e) => handleParametroChange(index, 'ValorReferencia', e.target.value)}
                            className={styles.cellInput}
                            disabled={saving}
                            placeholder="13-17"
                          />
                        </td>
                        <td className={styles.colAction}>
                          <button
                            type="button"
                            className={styles.removeButton}
                            onClick={() => handleRemoveParametro(index)}
                            disabled={saving}
                            title="Eliminar fila"
                            aria-label={`Eliminar parámetro ${index + 1}`}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
          <button type="button" className={styles.cancelButton} onClick={onClose} disabled={saving}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSave}
            disabled={saving || parametros.length === 0}
          >
            {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
