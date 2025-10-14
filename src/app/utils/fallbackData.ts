/**
 * Datos de fallback para el dashboard
 * @module utils/fallbackData
 */

import { MovimientoInternacion, ActividadReciente, TipoActividad, ACTIVITY_ICONS } from '../types/dashboard';

// Datos de fallback para movimientos de internación
export const FALLBACK_MOVIMIENTOS: MovimientoInternacion[] = [
  {
    NumeroVisita: 12345,
    FechaAdmision: 44927,
    HoraAdmision: 3240,
    ValorHabitacionCama: 'HAB-101',
    ValorSector: 'UTI',
    EstadoCama: 'O',
    IDPaciente: 1001,
    ApellidoyNombre: 'PÉREZ, JUAN CARLOS',
    NumeroDocumento: '12345678',
    SectorDescripcion: 'Unidad de Terapia Intensiva',
    TipoMovimiento: 'Ingreso',
    FechaAdmisionFormateada: new Date().toISOString()
  },
  {
    NumeroVisita: 12344,
    FechaAdmision: 44926,
    HoraAdmision: 2880,
    FechaEgreso: 44927,
    HoraEgreso: 1440,
    ValorHabitacionCama: 'HAB-205',
    ValorSector: 'MED',
    EstadoCama: 'U',
    IDPaciente: 1002,
    ApellidoyNombre: 'RODRÍGUEZ, MARÍA ELENA',
    NumeroDocumento: '87654321',
    SectorDescripcion: 'Medicina General',
    TipoMovimiento: 'Egreso',
    FechaAdmisionFormateada: new Date(Date.now() - 86400000).toISOString(),
    FechaEgresoFormateada: new Date().toISOString()
  }
];

// Datos de fallback por categoría de actividad
export const FALLBACK_ACTIVIDADES: Record<TipoActividad, ActividadReciente[]> = {
  internacion: [
    {
      time: '09:45',
      action: 'Ingreso de paciente',
      details: 'Juan Pérez - Habitación 203',
      icon: ACTIVITY_ICONS.internacion.ingreso,
      tipo: 'internacion',
      prioridad: 'alta',
      sector: 'UTI'
    },
    {
      time: '11:30',
      action: 'Alta médica',
      details: 'María Rodríguez - Habitación 108',
      icon: ACTIVITY_ICONS.internacion.egreso,
      tipo: 'internacion',
      prioridad: 'media',
      sector: 'Medicina General'
    }
  ],
  camas: [],
  cirugia: [],
  citas: [
    {
      time: '15:30',
      action: 'Cita programada',
      details: 'Carlos López - Consulta externa',
      icon: ACTIVITY_ICONS.citas.programada,
      tipo: 'citas',
      prioridad: 'baja'
    }
  ],
  laboratorio: [
    {
      time: '16:45',
      action: 'Resultado de laboratorio',
      details: 'Análisis urgente - Paciente 1234',
      icon: ACTIVITY_ICONS.laboratorio.resultado,
      tipo: 'laboratorio',
      prioridad: 'alta'
    }
  ],
  general: [
    {
      time: '17:00',
      action: 'Notificación del sistema',
      details: 'Actualización de protocolos',
      icon: ACTIVITY_ICONS.general.notificacion,
      tipo: 'general',
      prioridad: 'baja'
    }
  ]
};

// Función para obtener actividades de fallback combinadas
export const obtenerActividadesFallback = (limite: number = 10): ActividadReciente[] => {
  const todasLasActividades = Object.values(FALLBACK_ACTIVIDADES).flat();
  
  // Ordenar por prioridad y tiempo
  const actividadesOrdenadas = todasLasActividades.sort((a, b) => {
    const prioridadOrder = { alta: 3, media: 2, baja: 1 };
    const prioridadA = prioridadOrder[a.prioridad || 'baja'];
    const prioridadB = prioridadOrder[b.prioridad || 'baja'];
    
    if (prioridadA !== prioridadB) {
      return prioridadB - prioridadA; // Mayor prioridad primero
    }
    
    // Si tienen la misma prioridad, ordenar por tiempo (más reciente primero)
    return b.time.localeCompare(a.time);
  });
  
  return actividadesOrdenadas.slice(0, limite);
};
