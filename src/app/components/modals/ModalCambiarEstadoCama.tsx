'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './ModalAsignarCama.module.css';
import { bedsService } from '../../services/bedsService';
import type { BedState } from '../../types/beds';
import { detalleDeError, mensajeDeError } from '../../utils/apiError';

const ESTADO_OCUPADA = 'O';

interface ModalCambiarEstadoCamaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  bedId: string;
  bedSector: string;
  numeroCama: string;
  estadoActual: string;
  estadoActualDescripcion?: string;
  estados: BedState[];
}

const ModalCambiarEstadoCama: React.FC<ModalCambiarEstadoCamaProps> = ({
  isOpen,
  onClose,
  onSuccess,
  bedId,
  bedSector,
  numeroCama,
  estadoActual,
  estadoActualDescripcion,
  estados,
}) => {
  const [valorEstado, setValorEstado] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const actual = String(estadoActual || '').trim().toUpperCase();
  const opciones = useMemo(
    () =>
      estados.filter((e) => {
        const v = String(e.valor || '').trim().toUpperCase();
        return v && v !== ESTADO_OCUPADA && v !== actual;
      }),
    [estados, actual],
  );

  useEffect(() => {
    if (!isOpen) return;
    setValorEstado('');
    setError(null);
    setSuccess(false);
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!valorEstado) {
      setError('Seleccione el nuevo estado');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await bedsService.updateBedStatus(bedId, valorEstado);
      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error al cambiar el estado de la cama:', detalleDeError(err));
      setError(mensajeDeError(err, 'Error al cambiar el estado de la cama'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={`${styles.title} modal-title`}>Cambiar estado de cama</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>

        <div className={styles.bedBanner}>
          <span className={styles.bedSector}>{bedSector}</span>
          <span className={styles.bedNumber}>{numeroCama || bedId}</span>
          <span className={styles.bedHint}>
            Estado actual: {estadoActualDescripcion || estadoActual || 'Sin estado'}
          </span>
        </div>

        <div className={styles.body}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          {success && <div className={styles.successMessage}>Estado actualizado correctamente</div>}

          {!success && (
            <div className={styles.formGroup}>
              <label className={styles.label} htmlFor="nuevoEstadoCama">
                Nuevo estado
              </label>
              <select
                id="nuevoEstadoCama"
                className={styles.select}
                value={valorEstado}
                onChange={(e) => setValorEstado(e.target.value)}
                disabled={loading}
              >
                <option value="">Seleccione un estado</option>
                {opciones.map((e) => (
                  <option key={e.valor} value={String(e.valor).trim()}>
                    {e.descripcion}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
            Cerrar
          </button>
          <button
            type="button"
            className={styles.submitBtn}
            onClick={() => void handleSubmit()}
            disabled={loading || success || !valorEstado}
          >
            {loading ? 'Guardando...' : 'Cambiar estado'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalCambiarEstadoCama;
