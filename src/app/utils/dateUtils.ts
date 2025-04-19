/**
 * Utilidades para el manejo de fechas en el sistema iMedicWS
 * Incluye funciones para convertir fechas en formato Clarion a formato estándar
 */

/**
 * Convierte una fecha en formato Clarion a un objeto Date de JavaScript
 * Emula la funcionalidad de fn_ClarionDATE2SQL en el frontend
 * @param clarionDate Fecha en formato Clarion (número entero)
 * @returns Objeto Date de JavaScript o null si la fecha no es válida
 */
export const clarionDateToDate = (clarionDate: number | string | null | undefined): Date | null => {
  if (clarionDate === null || clarionDate === undefined || clarionDate === '') {
    return null;
  }
  
  // Convertir a número si es string
  const numericDate = typeof clarionDate === 'string' ? parseInt(clarionDate, 10) : clarionDate;
  
  // Validar que sea un número válido
  if (isNaN(numericDate)) {
    return null;
  }
  
  // Algoritmo de conversión de fecha Clarion a fecha JavaScript
  // En Clarion, las fechas se almacenan como días desde el 28/12/1800
  const clarionEpochDate = new Date(1800, 11, 28); // 28 de diciembre de 1800
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  const resultDate = new Date(clarionEpochDate.getTime() + (numericDate * millisecondsPerDay));
  
  return resultDate;
};

/**
 * Formatea una fecha para mostrarla en formato local
 * @param dateValue Fecha a formatear (puede ser Date, string, número o formato Clarion)
 * @param options Opciones de formato
 * @returns Fecha formateada como string o '-' si la fecha no es válida
 */
export const formatDate = (
  dateValue: Date | string | number | null | undefined,
  options: { 
    locale?: string; 
    isClarionDate?: boolean;
    showTime?: boolean;
  } = {}
): string => {
  const { 
    locale = 'es-AR', 
    isClarionDate = false,
    showTime = false
  } = options;
  
  if (dateValue === null || dateValue === undefined) {
    return '-';
  }
  
  try {
    let date: Date | null;
    
    if (isClarionDate && (typeof dateValue === 'number' || typeof dateValue === 'string')) {
      // Convertir desde formato Clarion
      date = clarionDateToDate(dateValue);
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      // Intentar convertir desde string o número normal
      date = new Date(dateValue);
    }
    
    if (!date || isNaN(date.getTime())) {
      return '-';
    }
    
    // Formatear la fecha según las opciones
    const dateStr = date.toLocaleDateString(locale);
    
    if (showTime) {
      const timeStr = date.toLocaleTimeString(locale, { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      return `${dateStr} ${timeStr}`;
    }
    
    return dateStr;
  } catch (error) {
    console.error('Error al formatear fecha:', error);
    return '-';
  }
};

/**
 * Formatea un tiempo para mostrar solo horas y minutos (HH:MM)
 * @param timeString Cadena de tiempo a formatear
 * @returns Tiempo formateado como HH:MM o el valor original si no se puede formatear
 */
export const formatTime = (timeString: string | null | undefined): string => {
  if (!timeString) return '-';
  
  try {
    // Si ya tiene formato de hora con ":" (por ejemplo, "14:30:00")
    if (timeString.includes(':')) {
      // Extraer solo horas y minutos (HH:MM)
      return timeString.substring(0, 5);
    }
    
    // Si es un número (segundos desde medianoche)
    const numericTime = parseInt(timeString, 10);
    if (!isNaN(numericTime)) {
      const hours = Math.floor(numericTime / 3600);
      const minutes = Math.floor((numericTime % 3600) / 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return timeString;
  } catch (error) {
    console.error('Error al formatear hora:', error);
    return timeString;
  }
};

/**
 * Hook para formatear fechas en el sistema
 * @returns Objeto con funciones de utilidad para fechas
 */
export const useDateFormatter = () => {
  return {
    formatDate,
    clarionDateToDate,
    formatTime
  };
};

export default useDateFormatter;
