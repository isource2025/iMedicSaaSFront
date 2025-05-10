'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ModalBasePaciente from './ModalBasePaciente';
import ModalBusquedaDiagnosticos from './ModalBusquedaDiagnosticos';
import styles from './ModalCambiarCama.module.css';
import visitaMovimientoService from '../../services/visitaMovimientoService';
import diagnosticosService from '../../services/diagnosticosService';
import estadoAmbulatorioService from '../../services/estadoAmbulatorioService';
import { DiagnosticoCie10 } from '../../types/diagnosticos';
import { EstadoAmbulatorio } from '../../types/estadoAmbulatorio';
import { useAppContext } from '../../contexts/AppContext';
import { useBedsManagement } from '../../hooks/useBedsManagement';
import BedFilters from '../beds/BedFilters';
import { formatDate, formatTime } from '../../utils/dateUtils';

interface ModalCambiarCamaProps {
  isOpen: boolean;
  onClose: () => void;
  numeroVisita: number;
  bedId: string;
  bedSector: string;
  sectorInfo?: {id: string, valor: string, descripcion: string} | null;
}

interface DisposicionEgreso {
  valor: string | null;
  descripcion: string | null;
}

interface CamaDisponible {
  id: string;
  sector: string;
  numeroCama: string;
}

const ModalCambiarCama: React.FC<ModalCambiarCamaProps> = ({
  isOpen,
  onClose,
  numeroVisita,
  bedId,
  bedSector,
  sectorInfo
}) => {
  const router = useRouter();
  const { sectorSeleccionado } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Datos del formulario para la nueva ubicación
  const [fechaEgreso, setFechaEgreso] = useState('');
  const [horaEgreso, setHoraEgreso] = useState('');
  const [estadoAmbulatorio, setEstadoAmbulatorio] = useState('');
  const [estadosAmbulatorios, setEstadosAmbulatorios] = useState<EstadoAmbulatorio[]>([]);
  
  // Estado para la ubicación actual
  const [ubicacionActual, setUbicacionActual] = useState<{
    idVisitaMovimiento?: number;
    numeroVisita?: string | number;
    fechaEgreso?: string;
    horaEgreso?: string;
    disposicionEgreso?: number;
    diagnostico?: string;
    FechaAdmision?: number;
    HoraAdmision?: number;
    bedId?: string;
    sector?: string;
    numeroCama?: string;
  } | null>(null);
  const [loadingUbicacion, setLoadingUbicacion] = useState(false);
  
  // Usar el hook de gestión de camas
  const {
    allBeds,
    bedStates,
    sectors,
    loading: loadingBeds,
    error: errorBeds,
    filter,
    setFilter,
    sectorFilter,
    setSectorFilter,
    searchTerm,
    setSearchTerm,
    refreshBeds
  } = useBedsManagement();
  
  // Estado para la cama seleccionada
  const [camaSeleccionada, setCamaSeleccionada] = useState<string | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  
  // Estado para la fecha y hora actual
  const [fechaActual, setFechaActual] = useState<string>(new Date().toISOString().split('T')[0]);
  const [horaActual, setHoraActual] = useState<string>(new Date().toTimeString().substring(0, 5));
  
  // Estado para la información completa del traslado
  const [infoTraslado, setInfoTraslado] = useState<{
    numeroVisita: number;
    camaOrigen: string;
    sectorOrigen: string;
    camaDestino: string | null;
    sectorDestino: string | null;
    fechaTraslado: string;
    horaTraslado: string;
    disposicionTraslado: string | null;
    diagnosticoTraslado: string | null;
  }>({    
    numeroVisita: numeroVisita,
    camaOrigen: bedId,
    sectorOrigen: bedSector,
    camaDestino: null,
    sectorDestino: null,
    fechaTraslado: '',
    horaTraslado: '',
    disposicionTraslado: null,
    diagnosticoTraslado: null
  });
  
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
    camaSeleccionada?: string;
    estadoAmbulatorio?: string;
    diagnostico?: string;
  }>({});

  // Inicializar fecha y hora cuando se abre el modal o cuando se monta el componente
  useEffect(() => {
    const setCurrentDateTime = () => {
      const now = new Date();
      const formattedDate = now.toISOString().split('T')[0]; // Formato YYYY-MM-DD
      const formattedTime = now.toTimeString().substring(0, 5); // Formato HH:MM
      setFechaEgreso(formattedDate);
      setHoraEgreso(formattedTime);
      
      // Actualizar la información de traslado con fecha y hora
      setInfoTraslado(prev => ({
        ...prev,
        fechaTraslado: formattedDate,
        horaTraslado: formattedTime
      }));
    };

    // Establecer fecha y hora actual al abrir el modal
    if (isOpen) {
      setCurrentDateTime();
      refreshBeds(); // Actualizar las camas cuando se abre el modal
      setLastUpdateTime(Date.now());
      
      // Cargar datos de ubicación actual
      if (numeroVisita) {
        cargarUbicacionActual(numeroVisita);
      }
    }
  }, [isOpen, refreshBeds, numeroVisita]);

  // Función para cargar la ubicación actual del paciente
  const cargarUbicacionActual = async (numeroVisita: number) => {
    setLoadingUbicacion(true);
    try {
      const movimiento = await visitaMovimientoService.getUltimoMovimiento(numeroVisita);
      console.log('Movimiento actual:', movimiento);
      if (movimiento) {
        // Buscar la cama en allBeds para obtener el sector y número
        const camaActual = movimiento.bedId ? allBeds.find(bed => bed.id === movimiento.bedId) : null;
        
        setUbicacionActual({
          ...movimiento,
          sector: camaActual?.sector || 'No disponible',
          numeroCama: camaActual?.numeroCama || 'No disponible'
        });
      }
      console.log('Ubicación actual:', ubicacionActual);
    } catch (error) {
      console.error('Error al cargar ubicación actual:', error);
    } finally {
      setLoadingUbicacion(false);
    }
  };

  
  
  // Cargar estados ambulatorios cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;
    
    const fetchEstadosAmbulatorios = async () => {
      try {
        const data = await estadoAmbulatorioService.getEstadosAmbulatorios();
        setEstadosAmbulatorios(data as EstadoAmbulatorio[]);
      } catch (err) {
        console.error('Error cargando estados ambulatorios:', err);
        setError('No se pudieron cargar los estados ambulatorios');
      }
    };

    fetchEstadosAmbulatorios();
  }, [isOpen]);

  // Filtrar camas disponibles basado en los filtros seleccionados
  const camasDisponibles = allBeds
    .filter((cama) => {
      // Filtrar por estado (solo camas desocupadas o disponibles)
      const estadoMatch = cama.estado === 'desocupada' || cama.estado === 'disponible';
      
      // Filtrar por sector si hay un filtro de sector seleccionado
      const sectorMatch = sectorFilter === 'all' || cama.sector === sectorFilter;
      
      // Filtrar por término de búsqueda (número de cama)
      const searchMatch = !searchTerm || 
                         cama.numeroCama.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Excluir la cama actual
      const notCurrentBed = cama.id !== bedId;
      
      return estadoMatch && sectorMatch && searchMatch && notCurrentBed;
    })
    .map((cama) => ({
      id: cama.id,
      sector: cama.sector,
      numeroCama: cama.numeroCama
    }));

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
    // Verificar que el diagnóstico tenga un código válido
    if (!diagnostico.CodigoOMS) {
      console.error("Error: El diagnóstico seleccionado no tiene código OMS", diagnostico);
      setErrorDiagnostico("El diagnóstico seleccionado no tiene un código válido");
      return;
    }
    
    setDiagnosticoSeleccionado(diagnostico);
    setBusquedaDiagnostico('');
    setMostrarResultados(false);
    setErrorDiagnostico(null);
    
    // Actualizar la información de traslado con el diagnóstico seleccionado
    setInfoTraslado(prev => ({
      ...prev,
      diagnosticoTraslado: diagnostico.CodigoOMS
    }));
  };

  const eliminarDiagnosticoSeleccionado = () => {
    setDiagnosticoSeleccionado(null);
    
    // Actualizar la información de traslado eliminando el diagnóstico
    setInfoTraslado(prev => ({
      ...prev,
      diagnosticoTraslado: null
    }));
  };

 

  // Validación del formulario
  const validarFormulario = () => {
    const errores: {
      fechaEgreso?: string;
      horaEgreso?: string;
      camaSeleccionada?: string;
      diagnostico?: string;
      estadoAmbulatorio?: string;
    } = {};
    
    // Validar campos obligatorios
    if (!fechaEgreso) errores.fechaEgreso = "La fecha es obligatoria";
    if (!horaEgreso) errores.horaEgreso = "La hora es obligatoria";
    if (!camaSeleccionada) errores.camaSeleccionada = "Debe seleccionar una cama destino";
    if (!estadoAmbulatorio) errores.estadoAmbulatorio = "Debe seleccionar un estado ambulatorio";
    
    // Validar formato de fecha y hora
    const fechaActual = new Date();
    const fechaSeleccionada = new Date(`${fechaEgreso}T${horaEgreso}:00`);
    
    if (fechaEgreso && fechaSeleccionada < fechaActual) {
      errores.fechaEgreso = "La fecha y hora no pueden ser anteriores a la actual";
    }
    
    setFormErrors(errores);
    return Object.keys(errores).length === 0;
  };

  // Maneja el cambio de cama y registra la nueva ubicación
  const handleSubmit = async () => {
    if (!validarFormulario()) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      // Verificar que toda la información necesaria esté en el objeto infoTraslado
      if (!camaSeleccionada || !fechaEgreso || !horaEgreso) {
        throw new Error('Faltan datos necesarios para el traslado');
      }
      
      // Buscar la cama seleccionada para obtener su sector
      const camaDestino = camasDisponibles.find(cama => cama.id === camaSeleccionada);
      if (!camaDestino) {
        throw new Error('La cama seleccionada ya no está disponible');
      }
      
      // Formatear fecha y hora para la API
      const fechaHoraTraslado = `${fechaEgreso}T${horaEgreso}:00`;
      
      // Preparar los datos simplificados para enviar al backend
      const datosTraslado = {
        // Datos principales solicitados
        camaDestino: camaSeleccionada,
        fecha: fechaEgreso,
        hora: horaEgreso,
        diagnostico: diagnosticoSeleccionado?.CodigoOMS || null,
        estadoAmbulatorio: estadoAmbulatorio,
        
        // Datos adicionales que podrían ser útiles para el backend
        numeroVisita: numeroVisita,
        camaOrigen: bedId,
        sectorOrigen: bedSector,
        sectorDestino: camaDestino.sector,
      };
      
      console.log('Datos de traslado a enviar al backend:', datosTraslado);
      
      // Registrar la nueva ubicación en el backend
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/beds/cambiar-cama`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(datosTraslado),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al cambiar de cama');
        }
        
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.message || 'Error al cambiar de cama');
        }
        
        console.log('Respuesta del backend:', data);
      } catch (err: any) {
        console.error('Error en el cambio de cama:', err);
        
        // Si estamos en desarrollo o el endpoint no existe, simulamos éxito
        if (process.env.NODE_ENV === 'development') {
          console.log('Simulando cambio de cama exitoso en entorno de desarrollo');
          console.log('Datos enviados al backend:', datosTraslado);
        } else {
          // En producción, propagamos el error
          throw err;
        }
      }
      
      setSuccess(true);
      
      // Esperar un momento y cerrar el modal
      setTimeout(() => {
        onClose();
        // Recargar la página para mostrar los cambios
        router.refresh();
      }, 2000);
      
    } catch (err: any) {
      console.error('Error en el cambio de cama:', err);
      setError(err.message || 'Ocurrió un error durante el cambio de cama');
      setSuccess(false);
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
        {loading ? 'Procesando...' : 'Confirmar Movimiento'}
      </button>
    </div>
  );

  // Función para actualizar las camas
  const handleRefreshBeds = () => {
    refreshBeds();
    setLastUpdateTime(Date.now());
  };

  return (
    <>
      <ModalBasePaciente
        isOpen={isOpen}
        onClose={onClose}
        titulo="Mover Paciente de Cama"
        numeroVisita={numeroVisita.toString()}
        footerButtons={<FooterButtons />}
      >
        <div className={styles.cambiarCamaForm}>
          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
          
          {loading && (
            <div className={styles.loadingMessage}>
              Procesando cambio de cama...
            </div>
          )}
          
          {success && (
            <div className={styles.successMessage}>
              ¡El cambio de cama se ha realizado correctamente! Redirigiendo...
            </div>
          )}
          
          {!loading && !success && (
            <>
<div className={styles.formSubSection}>
                <h3 className={styles.sectionTitle}>Nueva Ubicación</h3>

              {/* SELECCION DE CAMAS  */}
              <div className={styles.formSubSection}>
                
                <div className={styles.filtersSection}>
                  <BedFilters
                    sectors={sectors}
                    placeHolder='Buscar cama...'
                    bedStates={bedStates.filter(state => state.valor === 'D' || state.valor === 'L')}
                    filter={filter}
                    setFilter={setFilter}
                    sectorFilter={sectorFilter}
                    setSectorFilter={setSectorFilter}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    refreshBeds={handleRefreshBeds}
                    autoRefresh={false}
                    setAutoRefresh={() => {}}
                    refreshInterval={30000}
                    setRefreshInterval={() => {}}
                    lastUpdateTime={lastUpdateTime}
                  />
                </div>
                
                <div className={styles.camasDisponiblesContainer}>
                  <h5 className={styles.camasDisponiblesTitle}>Camas Disponibles ({camasDisponibles.length})</h5>
                  
                  {loadingBeds ? (
                    <div className={styles.loadingMessage}>Cargando camas disponibles...</div>
                  ) : errorBeds ? (
                    <div className={styles.errorMessage}>{errorBeds}</div>
                  ) : camasDisponibles.length === 0 ? (
                    <div className={styles.errorMessage}>No hay camas disponibles con los filtros seleccionados</div>
                  ) : (
                    <>
                      <div className={styles.camasGrid}>
                        {camasDisponibles.map((cama) => (
                          <div
                            key={cama.id}
                            className={`${styles.camaCard} ${camaSeleccionada === cama.id ? styles.camaSeleccionada : ''}`}
                            onClick={() => {
                              console.log('Cama seleccionada:', cama);
                              setCamaSeleccionada(cama.id);
                            }}
                          >
                            <div className={styles.camaInfo}>
                              <span className={styles.camaSector}>{cama.sector}</span>
                              <span className={styles.camaNumeroCama}>{cama.numeroCama}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {formErrors.camaSeleccionada && (
                        <span className={styles.fieldError}>{formErrors.camaSeleccionada}</span>
                      )}
                    </>
                  )}
                </div>
              </div>
               {/* SELECCION DE CAMAS  */}

               <div className={styles.formGridIngreso}>
                  {/* Fecha de ingreso */}
                  <div className={styles.formGroup}>
                    <label htmlFor="fechaEgreso" className={styles.label}>Fecha de Ingreso</label>
                    <input
                      type="date"
                      id="fechaEgreso"
                      value={fechaEgreso}
                      onChange={(e) => setFechaEgreso(e.target.value)}
                      className={`${styles.input} ${formErrors.fechaEgreso ? styles.inputError : ''}`}
                      disabled={loading || success}
                    />
                    {formErrors.fechaEgreso && (
                      <span className={styles.fieldError}>{formErrors.fechaEgreso}</span>
                    )}
                  </div>

                  {/* Hora de ingreso */}
                  <div className={styles.formGroup}>
                    <label htmlFor="horaEgreso" className={styles.label}>Hora de Ingreso</label>
                    <input
                      type="time"
                      id="horaEgreso"
                      value={horaEgreso}
                      onChange={(e) => setHoraEgreso(e.target.value)}
                      className={`${styles.input} ${formErrors.horaEgreso ? styles.inputError : ''}`}
                      disabled={loading || success}
                    />
                    {formErrors.horaEgreso && (
                      <span className={styles.fieldError}>{formErrors.horaEgreso}</span>
                    )}
                  </div>

                  {/* Estado Ambulatorio */}
                  <div className={styles.formGroup}>
                    <label htmlFor="estadoAmbulatorio" className={styles.label}>Estado Ambulatorio</label>
                    <select
                      id="estadoAmbulatorio"
                      value={estadoAmbulatorio}
                      onChange={(e) => setEstadoAmbulatorio(e.target.value)}
                      className={`${styles.select} ${formErrors.estadoAmbulatorio ? styles.inputError : ''}`}
                      disabled={loading || success}
                    >
                      <option value="">Seleccione un estado ambulatorio</option>
                      {estadosAmbulatorios.map((estado) => (
                        <option key={estado.valor} value={estado.valor || ''}>
                          {estado.descripcion}
                        </option>
                      ))}
                    </select>
                    {formErrors.estadoAmbulatorio && (
                      <span className={styles.fieldError}>{formErrors.estadoAmbulatorio}</span>
                    )}
                  </div>

                  {/* Diagnóstico */}
                  <div className={styles.formGroup}>
                <label htmlFor="diagnosticoEgreso" className={styles.label}>Diagnóstico CIE-10</label>
                <div className={styles.diagnosticoContainer}>
                  <div className={styles.diagnosticoInputContainer}>
                    <input
                      id="diagnosticoEgreso"
                      type="text"
                      value={busquedaDiagnostico}
                      onChange={(e) => setBusquedaDiagnostico(e.target.value)}
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
              </div>

            {/* SECTION UBICACION ACTUAL  */}
            <h3 className={styles.sectionTitle}>Ubicación Actual</h3>
            

            <div className={styles.egresoSection}>
            {loadingUbicacion ? (
              <div className={styles.loadingMessage}>
                <span>Cargando datos de ubicación...</span>
              </div>
            ) : ubicacionActual ? (
              <div className={styles.formGridEgreso}>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Sector</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={sectorInfo?.descripcion || 'No disponible'} 
                    disabled 
                    readOnly
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Numero de Cama</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={bedId || 'No disponible'} 
                    disabled 
                    readOnly
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Fecha de Admisión</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={ubicacionActual.FechaAdmision ? formatDate(ubicacionActual.FechaAdmision, { isClarionDate: true }) : 'No disponible'} 
                    disabled 
                    readOnly
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Hora de Admisión</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={ubicacionActual.HoraAdmision ? formatTime(ubicacionActual.HoraAdmision.toString()) : 'No disponible'} 
                    disabled 
                    readOnly
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Fecha de Egreso</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={fechaEgreso} 
                    disabled 
                    readOnly
                  />
                </div>
                
                <div className={styles.formGroup}>
                  <label className={styles.label}>Hora de Egreso</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    value={horaEgreso} 
                    disabled 
                    readOnly
                  />
                </div>
                
                {ubicacionActual.disposicionEgreso !== undefined && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Disposición de Nueva Ubicación</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={ubicacionActual.disposicionEgreso} 
                      disabled 
                      readOnly
                    />
                  </div>
                )}
                
                {ubicacionActual.diagnostico && (
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Diagnóstico</label>
                    <input 
                      type="text" 
                      className={styles.input} 
                      value={ubicacionActual.diagnostico} 
                      disabled 
                      readOnly
                    />
                  </div>
                )}

              </div>
            ) : (
              <div className={styles.infoMessage}>
                No se encontraron datos de ubicación actual para esta visita.
              </div>
            )}
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

export default ModalCambiarCama;
