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

// Análisis de Demanda por Sectores para Camas
export function analyzeSectorDemand(
  resumen: any,
  indicadoresPorFecha: any[]
): AnalysisResult {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const metrics: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[] = [];

  if (!resumen || !resumen.resumenPorSector || Object.keys(resumen.resumenPorSector).length === 0) {
    return {
      title: "Análisis de Demanda por Sectores",
      insights: ["Datos insuficientes de sectores"],
      recommendations: ["Verificar configuración de sectores en el sistema"],
      metrics: []
    };
  }

  // Obtener top 3 sectores con mayor demanda
  const sectoresOrdenados = Object.entries(resumen.resumenPorSector)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .slice(0, 3);

  // Calcular métricas del top 3
  const totalOcupacion = Object.values(resumen.resumenPorSector).reduce((a, b) => (a as number) + (b as number), 0) as number;
  
  sectoresOrdenados.forEach(([sector, ocupacion], index) => {
    const porcentaje = ((ocupacion as number) / totalOcupacion * 100).toFixed(1);
    const posicion = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
    metrics.push({
      label: `${posicion} ${sector}`,
      value: `${(ocupacion as number).toFixed(1)}% ocupación (${porcentaje}% del total)`,
      trend: index === 0 ? 'up' : 'stable'
    });
  });

  // Análisis de concentración
  const sectorPrincipal = sectoresOrdenados[0];
  const concentracion = (sectorPrincipal[1] as number) / totalOcupacion;
  
  if (concentracion > 0.4) {
    insights.push(`Alta concentración de demanda en ${sectorPrincipal[0]} (${(concentracion * 100).toFixed(1)}% del total)`);
    recommendations.push("Considerar redistribución de recursos o expansión del sector principal");
  }

  // Análisis de diversidad
  const numeroSectores = Object.keys(resumen.resumenPorSector).length;
  if (numeroSectores >= 5) {
    insights.push(`Buena diversificación con ${numeroSectores} sectores activos`);
    recommendations.push("Mantener equilibrio entre sectores para optimizar recursos");
  } else if (numeroSectores <= 3) {
    insights.push(`Baja diversificación con solo ${numeroSectores} sectores activos`);
    recommendations.push("Evaluar activación de sectores adicionales según demanda");
  }

  // Análisis de eficiencia del top 3
  const top3Total = sectoresOrdenados.reduce((sum, [,ocupacion]) => sum + (ocupacion as number), 0);
  const eficienciaTop3 = (top3Total / totalOcupacion * 100).toFixed(1);
  
  insights.push(`Los 3 sectores principales representan ${eficienciaTop3}% de la ocupación total`);
  
  if (parseFloat(eficienciaTop3) > 80) {
    recommendations.push("Monitorear capacidad de los sectores principales para evitar saturación");
  } else {
    recommendations.push("Evaluar oportunidades de optimización en sectores secundarios");
  }

  return {
    title: "Análisis de Demanda por Sectores",
    insights,
    recommendations,
    metrics
  };
}

export function analyzeOperationalEfficiency(
  indicadoresPorFecha: any[],
  resumen: any
): AnalysisResult {
  const insights: string[] = [];
  const recommendations: string[] = [];
  const metrics: { label: string; value: string; trend?: 'up' | 'down' | 'stable' }[] = [];

  if (!resumen || !indicadoresPorFecha || indicadoresPorFecha.length === 0) {
    return {
      title: 'Análisis de Eficiencia Operativa',
      insights: ['No hay suficientes datos para realizar el análisis de eficiencia operativa.'],
      recommendations: ['Asegurar la recolección continua de datos de ocupación de camas.'],
      metrics: []
    };
  }

  const ocupacionPromedio = resumen.porcentajeOcupacionPromedio || 0;
  const totalCamas = resumen.totalCamas || 0;
  const camasOcupadas = resumen.camasOcupadas || 0;

  // Calcular métricas de eficiencia
  metrics.push({ label: 'Ocupación Promedio', value: `${ocupacionPromedio.toFixed(1)}%` });
  metrics.push({ label: 'Camas Totales', value: totalCamas.toString() });
  metrics.push({ label: 'Camas Ocupadas Actuales', value: camasOcupadas.toString() });
  
  // Calcular variabilidad de ocupación
  const ocupacionesDiarias = indicadoresPorFecha.map(d => d.porcentajeOcupacion || 0);
  const desviacionEstandar = Math.sqrt(
    ocupacionesDiarias.reduce((sum, occ) => sum + Math.pow(occ - ocupacionPromedio, 2), 0) / ocupacionesDiarias.length
  );
  
  metrics.push({ label: 'Variabilidad Ocupación', value: `${desviacionEstandar.toFixed(1)}%` });

  // Análisis de eficiencia
  if (ocupacionPromedio >= 70 && ocupacionPromedio <= 90) {
    insights.push(`La ocupación promedio de ${ocupacionPromedio.toFixed(1)}% se encuentra en el rango óptimo (70-90%).`);
    insights.push('El hospital mantiene un equilibrio adecuado entre disponibilidad y utilización de camas.');
  } else if (ocupacionPromedio < 70) {
    insights.push(`La ocupación promedio de ${ocupacionPromedio.toFixed(1)}% indica subutilización de recursos.`);
    insights.push(`Aproximadamente ${((70 - ocupacionPromedio) * totalCamas / 100).toFixed(0)} camas adicionales podrían utilizarse para alcanzar el rango óptimo.`);
  } else {
    insights.push(`La ocupación promedio de ${ocupacionPromedio.toFixed(1)}% indica sobreutilización y posible saturación.`);
    insights.push('Existe riesgo de comprometer la calidad de atención y flexibilidad operativa.');
  }

  // Análisis de variabilidad
  if (desviacionEstandar > 15) {
    insights.push(`La alta variabilidad en ocupación (${desviacionEstandar.toFixed(1)}%) sugiere fluctuaciones significativas en la demanda.`);
  } else if (desviacionEstandar < 5) {
    insights.push(`La baja variabilidad en ocupación (${desviacionEstandar.toFixed(1)}%) indica patrones de demanda estables.`);
  }

  // Recomendaciones basadas en eficiencia
  if (ocupacionPromedio < 70) {
    recommendations.push('Implementar estrategias de marketing médico para aumentar la captación de pacientes.');
    recommendations.push('Evaluar la redistribución de camas entre servicios con mayor demanda.');
    recommendations.push('Considerar programas de cirugía ambulatoria para optimizar el uso de camas.');
  } else if (ocupacionPromedio > 90) {
    recommendations.push('Evaluar la expansión de capacidad o mejora en los flujos de alta.');
    recommendations.push('Implementar protocolos de gestión de altas tempranas seguras.');
    recommendations.push('Optimizar los procesos de admisión y programación quirúrgica.');
  } else {
    recommendations.push('Mantener los niveles actuales de eficiencia operativa.');
    recommendations.push('Monitorear continuamente para prevenir desviaciones del rango óptimo.');
  }

  if (desviacionEstandar > 15) {
    recommendations.push('Desarrollar estrategias de nivelación de demanda para reducir la variabilidad.');
    recommendations.push('Implementar sistemas de predicción de demanda para mejor planificación.');
  }

  return {
    title: 'Análisis de Eficiencia Operativa',
    insights,
    recommendations,
    metrics
  };
}
