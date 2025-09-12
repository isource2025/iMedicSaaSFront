// Motor de análisis avanzado para insights hospitalarios
import { IndicadorData } from '../types/indicadores';
import { CamasPorFecha } from '../services/camasIndicadoresService';

export interface AnalysisResult {
  title: string;
  insights: string[];
  recommendations: string[];
  metrics?: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[];
}

// Análisis de Pico de Ocupación para Camas
export function analyzePeakOccupancy(
  indicadores: CamasPorFecha[],
  resumen: any,
  estadoActual: any
): AnalysisResult {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const metrics: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[] = [];

  if (!indicadores.length || !resumen) {
    return {
      title: "Análisis de Pico de Ocupación",
      insights: ["Datos insuficientes para realizar el análisis"],
      recommendations: ["Recopilar más datos históricos"],
      metrics: []
    };
  }

  // Calcular métricas avanzadas
  const ocupacionPorcentajes = indicadores.map(i => i.porcentajeOcupacion);
  const maxOcupacion = Math.max(...ocupacionPorcentajes);
  const minOcupacion = Math.min(...ocupacionPorcentajes);
  const variabilidad = maxOcupacion - minOcupacion;
  
  // Detectar patrones de días de la semana
  const ocupacionPorDia = new Array(7).fill(0).map(() => ({ total: 0, count: 0 }));
  indicadores.forEach(ind => {
    const fecha = new Date(ind.fecha);
    const diaSemana = fecha.getDay();
    ocupacionPorDia[diaSemana].total += ind.porcentajeOcupacion;
    ocupacionPorDia[diaSemana].count++;
  });

  const promediosPorDia = ocupacionPorDia.map(dia => 
    dia.count > 0 ? dia.total / dia.count : 0
  );
  const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const diaMaxOcupacion = promediosPorDia.indexOf(Math.max(...promediosPorDia));
  const diaMinOcupacion = promediosPorDia.indexOf(Math.min(...promediosPorDia));

  // Métricas clave
  metrics.push(
    { label: "Ocupación Máxima", value: `${maxOcupacion.toFixed(1)}%`, trend: maxOcupacion > 90 ? 'up' : 'stable' },
    { label: "Variabilidad", value: `${variabilidad.toFixed(1)} puntos`, trend: variabilidad > 20 ? 'up' : 'stable' },
    { label: "Día de Mayor Demanda", value: diasSemana[diaMaxOcupacion], trend: 'stable' },
    { label: "Diferencia Máx-Mín", value: `${(promediosPorDia[diaMaxOcupacion] - promediosPorDia[diaMinOcupacion]).toFixed(1)}%`, trend: 'stable' }
  );

  // Insights basados en análisis
  if (maxOcupacion > 95) {
    insights.push("Se detectaron períodos de ocupación crítica superior al 95%");
    recommendations.push("Implementar protocolo de emergencia para gestión de capacidad");
  }

  if (variabilidad > 30) {
    insights.push("Alta variabilidad en la ocupación indica demanda impredecible");
    recommendations.push("Desarrollar sistema de predicción de demanda basado en patrones históricos");
  }

  insights.push(`Los ${diasSemana[diaMaxOcupacion]} muestran la mayor demanda promedio (${promediosPorDia[diaMaxOcupacion].toFixed(1)}%)`);
  
  if (promediosPorDia[diaMaxOcupacion] - promediosPorDia[diaMinOcupacion] > 15) {
    recommendations.push("Considerar redistribución de personal según patrones semanales");
  }

  return {
    title: "Análisis Avanzado de Picos de Ocupación",
    insights,
    recommendations,
    metrics
  };
}

// Análisis de Eficiencia Operativa para Camas
export function analyzeOperationalEfficiency(
  indicadores: CamasPorFecha[],
  resumen: any
): AnalysisResult {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const metrics: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[] = [];

  if (!resumen) {
    return {
      title: "Análisis de Eficiencia Operativa",
      insights: ["Datos insuficientes"],
      recommendations: ["Recopilar datos de resumen"],
      metrics: []
    };
  }

  const ocupacionPromedio = resumen.porcentajeOcupacionPromedio;
  const ocupacionOptima = 80; // Benchmark hospitalario
  const desviacionOptima = Math.abs(ocupacionPromedio - ocupacionOptima);
  
  // Calcular tendencia
  const ultimosMes = indicadores.slice(-30);
  const primeraMitad = ultimosMes.slice(0, 15);
  const segundaMitad = ultimosMes.slice(15);
  
  const promedioPrimera = primeraMitad.reduce((acc, ind) => acc + (ind.ocupadas / ind.totalCamas) * 100, 0) / primeraMitad.length;
  const promedioSegunda = segundaMitad.reduce((acc, ind) => acc + (ind.ocupadas / ind.totalCamas) * 100, 0) / segundaMitad.length;
  const tendencia = promedioSegunda - promedioPrimera;

  metrics.push(
    { label: "Eficiencia vs Óptimo", value: `${(100 - desviacionOptima).toFixed(1)}%`, trend: desviacionOptima < 5 ? 'up' : 'down' },
    { label: "Desviación del Óptimo", value: `${desviacionOptima.toFixed(1)} puntos`, trend: desviacionOptima < 10 ? 'down' : 'up' },
    { label: "Tendencia Mensual", value: `${tendencia > 0 ? '+' : ''}${tendencia.toFixed(1)}%`, trend: tendencia > 2 ? 'up' : tendencia < -2 ? 'down' : 'stable' }
  );

  if (ocupacionPromedio < 70) {
    insights.push("Subutilización de recursos: ocupación por debajo del 70%");
    recommendations.push("Evaluar reducción temporal de camas o redistribución de servicios");
  } else if (ocupacionPromedio > 90) {
    insights.push("Sobreutilización: riesgo de saturación del sistema");
    recommendations.push("Considerar expansión de capacidad o mejora en flujo de altas");
  } else if (desviacionOptima < 5) {
    insights.push("Operación en rango óptimo de eficiencia (75-85%)");
  }

  if (Math.abs(tendencia) > 5) {
    insights.push(`Tendencia ${tendencia > 0 ? 'creciente' : 'decreciente'} significativa detectada`);
    recommendations.push("Monitorear de cerca y ajustar estrategias operativas");
  }

  return {
    title: "Análisis de Eficiencia Operativa",
    insights,
    recommendations,
    metrics
  };
}

// Análisis de Patrones de Ingreso para Pacientes
export function analyzeAdmissionPatterns(
  indicadores: IndicadorData[],
  resumen: any
): AnalysisResult {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const metrics: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[] = [];

  if (!indicadores.length || !resumen) {
    return {
      title: "Análisis de Patrones de Ingreso",
      insights: ["Datos insuficientes"],
      recommendations: ["Recopilar más datos históricos"],
      metrics: []
    };
  }

  // Análisis de distribución por clase
  const claseDistribution = indicadores.reduce((acc, ind) => {
    acc[ind.ClasePaciente] = (acc[ind.ClasePaciente] || 0) + ind.TotalIngresos;
    return acc;
  }, {} as Record<string, number>);

  const totalIngresos = Object.values(claseDistribution).reduce((a: number, b: number) => a + b, 0);
  const clasePrincipal = Object.entries(claseDistribution)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0];

  // Análisis temporal
  const ingresosPorDia = indicadores.map(ind => ind.TotalIngresos);
  const maxIngresosDia = Math.max(...ingresosPorDia);
  const minIngresosDia = Math.min(...ingresosPorDia);
  const variabilidadIngresos = maxIngresosDia - minIngresosDia;

  metrics.push(
    { label: "Clase Predominante", value: `${clasePrincipal[0]} (${(((clasePrincipal[1] as number) / totalIngresos) * 100).toFixed(1)}%)`, trend: 'stable' },
    { label: "Variabilidad Diaria", value: `${variabilidadIngresos} ingresos`, trend: variabilidadIngresos > 10 ? 'up' : 'stable' },
    { label: "Pico Máximo", value: `${maxIngresosDia} ingresos/día`, trend: 'up' },
    { label: "Diversidad de Clases", value: `${Object.keys(claseDistribution).length} tipos`, trend: 'stable' }
  );

  // Insights específicos
  if ((clasePrincipal[1] as number) / totalIngresos > 0.6) {
    insights.push(`Alta concentración en ${clasePrincipal[0]} (${(((clasePrincipal[1] as number) / totalIngresos) * 100).toFixed(1)}%)`);
    recommendations.push("Evaluar capacidad específica para esta clase de pacientes");
  }

  const promedioDiario = totalIngresos / indicadores.length;
  
  if (variabilidadIngresos > promedioDiario * 0.5) {
    insights.push("Alta variabilidad en ingresos diarios detectada");
    recommendations.push("Implementar sistema de alerta temprana para picos de demanda");
  }

  insights.push(`Promedio de ${promedioDiario.toFixed(1)} ingresos diarios con ${Object.keys(claseDistribution).length} clases activas`);

  return {
    title: "Análisis Avanzado de Patrones de Ingreso",
    insights,
    recommendations,
    metrics
  };
}
