'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ModalBasePaciente from './ModalBasePaciente';
import ModalBusquedaDiagnosticos from './ModalBusquedaDiagnosticos';
import styles from './ModalEgresoPaciente.module.css';
import visitaService from '../../services/visitaService';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import { getDisposicionesEgreso } from '../../services/disposicionEgresoService';
import diagnosticosService from '../../services/diagnosticosService';
import { DiagnosticoCie10 } from '../../types/diagnosticos';
import { DisposicionEgreso } from '../../types/disposicionEgreso.types';
import { useAppContext } from '../../contexts/AppContext';

interface ModalEgresoPacienteProps {
  isOpen: boolean;
  onClose: () => void;
  numeroVisita: number;
  bedId: string;
}

// La interfaz DisposicionEgreso ahora se importa desde types

const ModalEgresoPaciente: React.FC<ModalEgresoPacienteProps> = ({
  isOpen,
  onClose,
  numeroVisita,
  bedId,
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
      const formattedDate = now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      setFechaEgreso(formattedDate);
      setHoraEgreso(now.toTimeString().substring(0, 5)); // Formato HH:MM
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
        setDisposiciones(data as DisposicionEgreso[]);
      } catch (err) {
        console.error('Error cargando disposiciones:', err);
        setError('No se pudieron cargar las disposiciones de egreso');
      }
    };

    fetchDisposiciones();
  }, [isOpen]);

  // Cerrar el dropdown de resultados cuando se hace clic fuera de él
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (resultadosRef.current && !resultadosRef.current.contains(event.target as Node) && 
          busquedaInputRef.current && !busquedaInputRef.current.contains(event.target as Node)) {
        setMostrarResultados(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Buscar diagnósticos al escribir
  useEffect(() => {
    const buscarDiagnosticosAutomatico = async () => {
      if (busquedaDiagnostico.length >= 1) {
        setBuscandoDiagnostico(true);
        setErrorDiagnostico(null);
        
        try {
          const resultados: DiagnosticoCie10[] = await diagnosticosService.buscarDiagnosticosCie10(busquedaDiagnostico);
          
          // Verificar que cada diagnóstico tenga el código OMS
          const resultadosValidos = resultados.map(diag => {
            // Si no tiene CodigoOMS pero tiene otro campo que podría contenerlo
            if (!diag.CodigoOMS && (diag as any).codigoCie10) {
              return {
                ...diag,
                CodigoOMS: (diag as any).codigoCie10
              };
            }
            return diag;
          }).filter(diag => diag.CodigoOMS || diag.idDiagnostico);
          
          console.log('Diagnósticos encontrados:', resultadosValidos);
          setDiagnosticosEncontrados(resultadosValidos);
          setMostrarResultados(resultadosValidos.length > 0);
          
        } catch (err) {
          console.error('Error al buscar diagnósticos:', err);
          setErrorDiagnostico('Error al buscar diagnósticos');
        } finally {
          setBuscandoDiagnostico(false);
        }
      } else {
        setDiagnosticosEncontrados([]);
        setMostrarResultados(false);
      }
    };
    
    const timeoutId = setTimeout(buscarDiagnosticosAutomatico, 300);
    return () => clearTimeout(timeoutId);
  }, [busquedaDiagnostico]);

  // Funciones para manejo de diagnósticos
  const abrirModalBusqueda = () => {
    setModalBusquedaAbierto(true);
  };

  const cerrarModalBusqueda = () => {
    setModalBusquedaAbierto(false);
  };

  const seleccionarDiagnostico = (diagnostico: DiagnosticoCie10) => {
    // Verificar que el diagnóstico tenga todos los datos necesarios
    if (!diagnostico.CodigoOMS) {
      console.error("Error: El diagnóstico seleccionado no tiene código OMS", diagnostico);
      setErrorDiagnostico("El diagnóstico seleccionado no tiene un código válido");
      return;
    }
    
    setDiagnosticoSeleccionado(diagnostico);
    console.log("Diagnostico seleccionado", diagnostico);
    
    // Mostrar código y descripción en el campo de búsqueda
    setBusquedaDiagnostico(`${diagnostico.CodigoOMS} - ${diagnostico.descripcion}`);
    setMostrarResultados(false);
    setModalBusquedaAbierto(false); // Cerrar el modal de búsqueda si está abierto
  };

  const eliminarDiagnosticoSeleccionado = () => {
    setDiagnosticoSeleccionado(null);
    setBusquedaDiagnostico('');
  };

  const handleBusquedaKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      abrirModalBusqueda();
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
        bedId: bedId
      };
      console.log('Datos de egreso:', datosEgreso);
      // Actualizamos el movimiento con los datos de egreso
      await visitaMovimientoService.actualizarUltimoMovimiento(numeroVisita, datosEgreso);
      
      // Actualizamos el estado de la visita para liberar la cama
      await visitaService.registrarEgreso({
        numeroVisita,
        fechaAdmision: '', // Estos campos son requeridos por la interfaz pero no se usan para el egreso
        horaAdmision: '',  // Estos campos son requeridos por la interfaz pero no se usan para el egreso
        fechaEgreso: fechaEgreso,
        horaEgreso: horaEgreso,
        disposicionEgreso: disposicionEgreso,
        diagnostico: diagnosticoSeleccionado?.CodigoOMS || null,
        bedId: bedId
      });
      
      // Mostrar mensaje de éxito
      setSuccess(true);
      
      // Guardar el sector actual para redirigir después
      const sectorId = sectorSeleccionado?.idSector || '';
      
      // Cerrar el modal después de 2 segundos
      setTimeout(() => {
        onClose();
        // Redirigir a la pantalla de camas con el mismo sector
        if (sectorId) {
          router.push(`/dashboard/beds?sector=${sectorId}`);
        } else {
          // Si no hay sector seleccionado, simplemente recargar la página
          window.location.reload();
        }
      }, 2000);
    } catch (err: any) {
      console.error('Error al procesar el egreso:', err);
      setError(err.message || 'Error al procesar el egreso');
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
        footerButtons={<FooterButtons />}
      >
        <div className={styles.egresoForm}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          {loading && !success && (
            <div className={styles.loadingMessage}>
              Procesando egreso...
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
                  {disposiciones.map((disp, index) => (
                    <option key={index} value={disp.Valor?.toString() || ''}>
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
                <label htmlFor="diagnosticoEgreso" className={styles.label}>Diagnóstico CIE-10</label>
                <div className={styles.diagnosticoContainer}>
                  <div className={styles.diagnosticoInputContainer}>
                    <input
                      id="diagnosticoEgreso"
                      type="text"
                      value={busquedaDiagnostico}
                      onChange={(e) => setBusquedaDiagnostico(e.target.value)}
                      onKeyDown={handleBusquedaKeyDown}
                      disabled={loading || success || !!diagnosticoSeleccionado}
                      placeholder="Buscar por código o descripción"
                      className={styles.input}
                      ref={busquedaInputRef}
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
                  
                  {errorDiagnostico && !diagnosticoSeleccionado && (
                    <span className={styles.fieldError}>{errorDiagnostico}</span>
                  )}
                  
                  {mostrarResultados && diagnosticosEncontrados.length > 0 && !diagnosticoSeleccionado && (
                    <div className={styles.resultadosDiagnosticosUp} ref={resultadosRef}>
                      {buscandoDiagnostico ? (
                        <div className={styles.loadingResults}>Buscando...</div>
                      ) : (
                        diagnosticosEncontrados.map((diag) => (
                          <div 
                            key={diag.idDiagnostico} 
                            className={styles.resultadoDiagnostico}
                            onClick={() => seleccionarDiagnostico(diag)}
                          >
                            <span className={styles.diagnosticoCode}>{diag.CodigoOMS}</span> - {diag.descripcion}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  
                  {diagnosticoSeleccionado && (
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
                  )}
                  
                  {!diagnosticoSeleccionado && (
                    <span className={styles.fieldInfo}>
                      Busque por código o descripción del diagnóstico CIE-10
                    </span>
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
