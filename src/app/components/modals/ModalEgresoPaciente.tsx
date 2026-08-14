'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import ModalBasePaciente from './ModalBasePaciente';
import ModalBusquedaDiagnosticos from './ModalBusquedaDiagnosticos';
import styles from './ModalEgresoPaciente.module.css';
import Loader from '../Loader/Loader';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import { getDisposicionesEgreso } from '../../services/disposicionEgresoService';
import diagnosticosService from '../../services/diagnosticosService';
import { DiagnosticoCie10 } from '../../types/diagnosticos';
import { DisposicionEgreso } from '../../types/disposicionEgreso.types';
import { useAppContext } from '../../contexts/AppContext';
import type { PatientHeaderSnapshot } from '../../utils/bedHeader';
import { fechaLocalISO, horaLocalHHMM, codigoCamaDesdeId } from '../../utils/dateUtils';

interface ModalEgresoPacienteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  numeroVisita: number;
  bedId: string;
  bedSector?: string;
  header?: PatientHeaderSnapshot | null;
}

// La interfaz DisposicionEgreso ahora se importa desde types

const ModalEgresoPaciente: React.FC<ModalEgresoPacienteProps> = ({
  isOpen,
  onClose,
  onSuccess,
  numeroVisita,
  bedId,
  bedSector,
  header,
}) => {
  const router = useRouter();
  const { sectorSeleccionado } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Datos del formulario
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [disposicionEgreso, setDisposicionEgreso] = useState('');
  const [disposiciones, setDisposiciones] = useState<DisposicionEgreso[]>([]);
  
  // Estados para la búsqueda de diagnósticos
  const [busquedaDiagnostico, setBusquedaDiagnostico] = useState('');
  const [diagnosticosEncontrados, setDiagnosticosEncontrados] = useState<DiagnosticoCie10[]>([]);
  const [diagnosticoSeleccionado, setDiagnosticoSeleccionado] = useState<DiagnosticoCie10 | null>(null);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [buscandoDiagnostico, setBuscandoDiagnostico] = useState(false);
  const [errorDiagnostico, setErrorDiagnostico] = useState<string | null>(null);
  const [modalBusquedaAbierto, setModalBusquedaAbierto] = useState(false);
  
  // Referencias para manejo del DOM
  const resultadosRef = useRef<HTMLDivElement>(null);
  const busquedaInputRef = useRef<HTMLInputElement>(null);
  const diagnosticoContainerRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const [dropdownReady, setDropdownReady] = useState(false);

  // Validación de formulario
  const [formErrors, setFormErrors] = useState<{
    fechaEgreso?: string;
    horaEgreso?: string;
    disposicionEgreso?: string;
    
  }>({});

  // Inicializar fecha y hora cuando se abre el modal o cuando se monta el componente
  useEffect(() => {
    const setCurrentDateTime = () => {
      const now = new Date();
      setFechaEgreso(fechaLocalISO(now));
      setHoraEgreso(horaLocalHHMM(now));
    };

    // Establecer fecha y hora actual al abrir el modal
    if (isOpen) {
      setCurrentDateTime();
    }
  }, [isOpen]);

  // Cargar disposiciones de egreso cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    const fetchDisposiciones = async () => {
      try {
        const data = await getDisposicionesEgreso();
        setDisposiciones(data);
        if (!data.length) {
          setError('No se pudieron cargar las disposiciones de egreso (imDisposicionEgreso)');
        }
      } catch (err) {
        console.error('Error cargando disposiciones:', err);
        setError('No se pudieron cargar las disposiciones de egreso');
      }
    };

    fetchDisposiciones();
  }, [isOpen]);

  const updateDropdownPosition = useCallback(() => {
    const anchor = diagnosticoContainerRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const gap = 6;
    const maxH = 280;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const height = Math.max(120, Math.min(maxH, available));

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      maxHeight: height,
      zIndex: 10050,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + gap, top: 'auto' }
        : { top: rect.bottom + gap, bottom: 'auto' }),
    });
    setDropdownReady(true);
  }, []);

  useLayoutEffect(() => {
    if (!mostrarResultados || diagnosticoSeleccionado) {
      setDropdownReady(false);
      return;
    }
    updateDropdownPosition();
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    };
  }, [
    mostrarResultados,
    diagnosticoSeleccionado,
    diagnosticosEncontrados,
    busquedaDiagnostico,
    updateDropdownPosition,
  ]);

  // Cerrar el dropdown de resultados cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideResults = resultadosRef.current?.contains(target);
      const insideAnchor = diagnosticoContainerRef.current?.contains(target);
      if (!insideResults && !insideAnchor) {
        setMostrarResultados(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Buscar diagnósticos al escribir (debounce 300ms)
  useEffect(() => {
    if (diagnosticoSeleccionado) return;

    const termino = busquedaDiagnostico.trim();
    if (termino.length < 1) {
      setDiagnosticosEncontrados([]);
      setMostrarResultados(false);
      setBuscandoDiagnostico(false);
      return;
    }

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      setBuscandoDiagnostico(true);
      setErrorDiagnostico(null);
      setMostrarResultados(true);

      try {
        const resultados = await diagnosticosService.buscarDiagnosticosCie10(termino);
        if (cancelled) return;

        const resultadosValidos = resultados
          .map((diag) => {
            if (!diag.CodigoOMS && (diag as any).codigoCie10) {
              return { ...diag, CodigoOMS: (diag as any).codigoCie10 };
            }
            return diag;
          })
          .filter((diag) => diag.CodigoOMS || diag.idDiagnostico);

        setDiagnosticosEncontrados(resultadosValidos);
      } catch (err) {
        if (cancelled) return;
        console.error('Error al buscar diagnósticos:', err);
        setErrorDiagnostico('Error al buscar diagnósticos');
        setDiagnosticosEncontrados([]);
      } finally {
        if (!cancelled) setBuscandoDiagnostico(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [busquedaDiagnostico, diagnosticoSeleccionado]);

  // Funciones para manejo de diagnósticos
  const abrirModalBusqueda = () => {
    setModalBusquedaAbierto(true);
  };

  const cerrarModalBusqueda = () => {
    setModalBusquedaAbierto(false);
  };

  const seleccionarDiagnostico = (diagnostico: DiagnosticoCie10) => {
    if (!diagnostico.CodigoOMS) {
      console.error("Error: El diagnóstico seleccionado no tiene código OMS", diagnostico);
      setErrorDiagnostico("El diagnóstico seleccionado no tiene un código válido");
      return;
    }
    
    setDiagnosticoSeleccionado(diagnostico);
    setBusquedaDiagnostico('');
    setMostrarResultados(false);
    setModalBusquedaAbierto(false);
    setErrorDiagnostico(null);
  };

  const eliminarDiagnosticoSeleccionado = () => {
    setDiagnosticoSeleccionado(null);
    setBusquedaDiagnostico('');
    setDiagnosticosEncontrados([]);
    setMostrarResultados(false);
  };

  const handleBusquedaChange = (value: string) => {
    if (diagnosticoSeleccionado) {
      setDiagnosticoSeleccionado(null);
    }
    setBusquedaDiagnostico(value);
  };

  const handleBusquedaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (diagnosticosEncontrados.length === 1) {
        seleccionarDiagnostico(diagnosticosEncontrados[0]);
      } else {
        abrirModalBusqueda();
      }
    }
    if (e.key === 'Escape') {
      setMostrarResultados(false);
    }
  };

  // Validación del formulario
  const validarFormulario = () => {
    const errors: { [key: string]: string } = {};
    
    if (!fechaEgreso) errors.fechaEgreso = 'La fecha de egreso es obligatoria';
    if (!horaEgreso) errors.horaEgreso = 'La hora de egreso es obligatoria';
    if (!disposicionEgreso) errors.disposicionEgreso = 'La disposición de egreso es obligatoria';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Actualiza el último movimiento de una visita con los datos de egreso
   * @returns {Promise<void>}
   */
  const handleSubmit = async () => {
    if (!validarFormulario()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Primero obtenemos el último movimiento de la visita
      const ultimoMovimiento = await visitaMovimientoService.getUltimoMovimiento(numeroVisita);
      
      if (!ultimoMovimiento) {
        throw new Error('No se encontró el último movimiento de la visita');
      }
      
      // Construimos el objeto con los datos de egreso
      const datosEgreso = {
        fechaEgreso: fechaEgreso,
        horaEgreso: horaEgreso,
        disposicionEgreso: parseInt(disposicionEgreso) || null,
        diagnostico: diagnosticoSeleccionado?.CodigoOMS || null,
        bedId: codigoCamaDesdeId(bedId, bedSector, bedId)
      };
      console.log('Datos de egreso:', datosEgreso);
      await visitaMovimientoService.actualizarUltimoMovimiento(numeroVisita, datosEgreso);

      setSuccess(true);
      onSuccess?.();
      
      const sectorId = sectorSeleccionado?.idSector || '';
      
      setTimeout(() => {
        onClose();
        if (sectorId) {
          router.push(`/dashboard/beds?sector=${sectorId}`);
        } else {
          router.refresh();
        }
      }, 800);
    } catch (err: any) {
      console.error('Error al procesar el egreso:', err);
      const status = err?.response?.status;
      const apiMsg =
        err?.response?.data?.mensaje ||
        err?.response?.data?.message ||
        err?.message;
      if (status === 403) {
        setError(
          apiMsg ||
            'No tiene permiso para registrar egreso (se requiere INTERNACION.MOVIMIENTOS.GESTIONAR)',
        );
      } else {
        setError(apiMsg || 'Error al procesar el egreso');
      }
    } finally {
      setLoading(false);
    }
  };

  // Componente para los botones del footer
  const FooterButtons = () => (
    <div className={styles.footerButtonsContainer}>
      <button
        type="button"
        className={styles.submitButton}
        onClick={handleSubmit}
        disabled={loading || success}
      >
        {loading ? 'Procesando...' : 'Confirmar Egreso'}
      </button>
    </div>
  );

  return (
    <>
      <ModalBasePaciente
        isOpen={isOpen}
        onClose={onClose}
        titulo="Egreso de Paciente"
        numeroVisita={numeroVisita.toString()}
        header={header}
        footerButtons={<FooterButtons />}
      >
        <div className={styles.egresoForm}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          {loading && !success && (
            <div style={{ position: 'relative', minHeight: '150px' }}>
              <Loader />
            </div>
          )}
          
          {success && (
            <div className={styles.successMessage}>
              Egreso procesado correctamente
            </div>
          )}
          
          {!success && (
            <>
            <div className={styles.formSection}>
              <h3 className={styles.formTitle}>Datos del Egreso</h3>
              
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="fechaEgreso" className={styles.label}>Fecha de Egreso</label>
                  <input
                    id="fechaEgreso"
                    type="date"
                    value={fechaEgreso}
                    onChange={(e) => setFechaEgreso(e.target.value)}
                    className={`${styles.input} ${formErrors.fechaEgreso ? styles.inputError : ''}`}
                    disabled={loading || success}
                  />
                  {formErrors.fechaEgreso && (
                    <span className={styles.fieldError}>{formErrors.fechaEgreso}</span>
                  )}
                </div>
                
                <div className={styles.formGroup}>
                  <label htmlFor="horaEgreso" className={styles.label}>Hora de Egreso</label>
                  <input
                    id="horaEgreso"
                    type="time"
                    value={horaEgreso}
                    onChange={(e) => setHoraEgreso(e.target.value)}
                    className={`${styles.input} ${formErrors.horaEgreso ? styles.inputError : ''}`}
                    disabled={loading || success}
                  />
                  {formErrors.horaEgreso && (
                    <span className={styles.fieldError}>{formErrors.horaEgreso}</span>
                  )}
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="disposicionEgreso" className={styles.label}>Disposición del Egreso</label>
                <select
                  id="disposicionEgreso"
                  value={disposicionEgreso}
                  onChange={(e) => setDisposicionEgreso(e.target.value)}
                  className={`${styles.select} ${formErrors.disposicionEgreso ? styles.inputError : ''}`}
                  disabled={loading || success}
                >
                  <option value="">Seleccione una disposición</option>
                  {disposiciones.map((disp) => (
                    <option key={disp.Valor} value={String(disp.Valor)}>
                      {disp.Descripcion}
                    </option>
                  ))}
                </select>
                {formErrors.disposicionEgreso && (
                  <span className={styles.fieldError}>{formErrors.disposicionEgreso}</span>
                )}
              </div>
            </div>
            
            <div className={styles.formSection}>
              
              <div className={styles.formGroup}>
                <label htmlFor="diagnosticoEgreso" className={styles.label}>Diagnóstico CIE-10 (opcional)</label>
                <div className={styles.diagnosticoContainer} ref={diagnosticoContainerRef}>
                  {diagnosticoSeleccionado ? (
                    <div className={styles.selectedDiagnostico}>
                      <span className={styles.diagnosticoCode}>{diagnosticoSeleccionado.CodigoOMS}</span>
                      <span className={styles.diagnosticoDesc}>{diagnosticoSeleccionado.descripcion}</span>
                      <button
                        type="button"
                        onClick={eliminarDiagnosticoSeleccionado}
                        className={styles.eliminarDiagnosticoBtn}
                        aria-label="Eliminar diagnóstico"
                        disabled={loading || success}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <>
                  <div className={styles.diagnosticoInputContainer}>
                    <input
                      id="diagnosticoEgreso"
                      type="text"
                      value={busquedaDiagnostico}
                      onChange={(e) => handleBusquedaChange(e.target.value)}
                      onKeyDown={handleBusquedaKeyDown}
                      onFocus={() => {
                        if (!diagnosticoSeleccionado && busquedaDiagnostico.trim().length >= 1) {
                          setMostrarResultados(true);
                        }
                      }}
                      disabled={loading || success}
                      placeholder="Buscar por código o descripción"
                      className={styles.input}
                      ref={busquedaInputRef}
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      onClick={abrirModalBusqueda}
                      disabled={loading || success}
                      className={styles.buscarDiagnosticoBtn}
                      aria-label="Búsqueda avanzada de diagnósticos"
                      title="Búsqueda avanzada de diagnósticos"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                      </svg>
                    </button>
                  </div>
                  
                  {errorDiagnostico && (
                    <span className={styles.fieldError}>{errorDiagnostico}</span>
                  )}

                  {mostrarResultados && dropdownReady && typeof document !== 'undefined' &&
                    createPortal(
                      <div
                        className={styles.resultadosDiagnosticosPortal}
                        ref={resultadosRef}
                        style={dropdownStyle}
                        role="listbox"
                      >
                        {buscandoDiagnostico ? (
                          <div className={styles.loadingResults}>Buscando...</div>
                        ) : diagnosticosEncontrados.length > 0 ? (
                          diagnosticosEncontrados.map((diag) => (
                            <div
                              key={diag.idDiagnostico || diag.CodigoOMS}
                              className={styles.resultadoDiagnostico}
                              role="option"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                seleccionarDiagnostico(diag);
                              }}
                            >
                              <span className={styles.diagnosticoCode}>{diag.CodigoOMS}</span> - {diag.descripcion}
                            </div>
                          ))
                        ) : (
                          <div className={styles.loadingResults}>
                            Sin resultados para &quot;{busquedaDiagnostico.trim()}&quot;
                          </div>
                        )}
                      </div>,
                      document.body,
                    )}
                  
                    <span className={styles.fieldInfo}>
                      Escriba para buscar automáticamente por código o descripción CIE-10
                    </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            </>
          )}
        </div>
      </ModalBasePaciente>
      
      {modalBusquedaAbierto && (
        <ModalBusquedaDiagnosticos
          isOpen={modalBusquedaAbierto}
          onClose={cerrarModalBusqueda}
          onSelectDiagnostico={(diagnostico) => {
            // Verificar que el diagnóstico tenga un código válido antes de seleccionarlo
            if (!diagnostico.CodigoOMS) {
              console.error("Error: El diagnóstico del modal no tiene código OMS", diagnostico);
              setErrorDiagnostico("El diagnóstico seleccionado no tiene un código válido");
              return;
            }
            seleccionarDiagnostico(diagnostico);
          }}
        />
      )}
    </>
  );
};

export default ModalEgresoPaciente;
