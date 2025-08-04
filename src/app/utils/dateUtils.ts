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
export const formatTime = (clarionTime: number | string | null | undefined): string => {
  if (!clarionTime || Number(clarionTime) === 0) return '-';

  try {
    const totalSeconds = Math.floor(Number(clarionTime) / 100); // Clarion → centésimas de segundo
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (err) {
    console.error('Error al convertir hora Clarion:', err);
    return '-';
  }
};




/**
 * Hook para formatear fechas en el sistema
 * @returns Objeto con funciones de utilidad para fechas
 */
/**
 * Convierte una fecha JavaScript a formato Clarion (días desde 28/12/1800)
 * @param date Fecha a convertir
 * @returns Número de días desde 28/12/1800 (formato Clarion)
 */
export const dateToClarionDate = (date: Date): number => {
  // Fecha base Clarion: 28/12/1800
  const clarionEpochDate = new Date(1800, 11, 28);
  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  
  // Calcular la diferencia en días
  const diffTime = date.getTime() - clarionEpochDate.getTime();
  const diffDays = Math.floor(diffTime / millisecondsPerDay);
  
  return diffDays;
};

/**
 * Convierte una hora JavaScript a formato Clarion (centésimas de segundo desde medianoche)
 * @param date Fecha que contiene la hora a convertir
 * @returns Número de centésimas de segundo desde medianoche (formato Clarion)
 */
export const timeToClarionTime = (date: Date): number => {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  
  // Calcular el total de centésimas de segundo
  const totalCentiseconds = ((hours * 3600) + (minutes * 60) + seconds) * 100;
  
  return totalCentiseconds;
};

/**
 * Formatea una fecha en formato SQL (como '2025-04-29 18:21:44.410') a un formato legible
 * @param sqlDate Fecha en formato SQL como string
 * @param options Opciones de formato
 * @returns Fecha y/u hora formateada como string o '-' si la fecha no es válida
 */
export const formatSqlDate = (
  sqlDate: string | null | undefined,
  options: {
    locale?: string;
    showDate?: boolean;
    showTime?: boolean;
    showSeconds?: boolean;
    adjustTimezone?: boolean;
  } = {}
): string => {
  const {
    locale = 'es-ES',
    showDate = true,
    showTime = true,
    showSeconds = false,
    adjustTimezone = true // Por defecto, ajustar a la zona horaria local
  } = options;

  if (!sqlDate) return '-';

  try {
    // Crear objeto Date a partir de la fecha SQL
    const date = new Date(sqlDate);
    
    if (isNaN(date.getTime())) {
      return '-';
    }

    // Si la fecha viene con 'Z' al final (UTC), ajustar a la zona horaria local
    // o mantener la hora original según la opción adjustTimezone
    let dateToFormat = date;
    
    if (!adjustTimezone && sqlDate.endsWith('Z')) {
      // Si no queremos ajustar la zona horaria y la fecha es UTC,
      // creamos una fecha con los componentes UTC pero sin conversión
      const utcYear = date.getUTCFullYear();
      const utcMonth = date.getUTCMonth();
      const utcDay = date.getUTCDate();
      const utcHours = date.getUTCHours();
      const utcMinutes = date.getUTCMinutes();
      const utcSeconds = date.getUTCSeconds();
      
      dateToFormat = new Date(utcYear, utcMonth, utcDay, utcHours, utcMinutes, utcSeconds);
    }

    let result = '';
    
    if (showDate) {
      result += dateToFormat.toLocaleDateString(locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
    
    if (showTime) {
      if (showDate) result += ' ';
      
      result += dateToFormat.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: showSeconds ? '2-digit' : undefined,
        hour12: true // Usar formato 12 horas (AM/PM)
      });
    }
    
    return result;
  } catch (error) {
    console.error('Error al formatear fecha SQL:', error);
    return '-';
  }
};

/**
 * Convierte una fecha en formato Clarion a formato DD/MM/YYYY
 * @param clarionDate Fecha en formato Clarion (número entero)
 * @returns Fecha en formato DD/MM/YYYY o string vacío si la fecha no es válida
 */
export const fn_ClarionDATE2FULLSQL = (clarionDate: number | string | null | undefined): string => {
  if (clarionDate === null || clarionDate === undefined || clarionDate === '') {
    return '';
  }
  
  const date = clarionDateToDate(clarionDate);
  
  if (!date || isNaN(date.getTime())) {
    return '';
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${day}/${month}/${year}`;
};

/**
 * Calcula la edad en años a partir de una fecha de nacimiento
 * @param birthDate Fecha de nacimiento (puede ser Date, string, número o formato Clarion)
 * @param isClarionDate Indica si la fecha está en formato Clarion
 * @returns Edad en años o null si la fecha no es válida
 */
export const calculateAge = (birthDate: Date | string | number | null | undefined, isClarionDate: boolean = false): number | null => {
  if (!birthDate) return null;
  
  let birthDateObj: Date | null;
  
  if (isClarionDate && (typeof birthDate === 'number' || typeof birthDate === 'string')) {
    birthDateObj = clarionDateToDate(birthDate);
  } else if (birthDate instanceof Date) {
    birthDateObj = birthDate;
  } else {
    // Intentar convertir desde string o número normal
    birthDateObj = new Date(birthDate);
  }
  
  if (!birthDateObj || isNaN(birthDateObj.getTime())) {
    return null;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birthDateObj.getFullYear();
  const monthDiff = today.getMonth() - birthDateObj.getMonth();
  
  // Si aún no ha cumplido años este año, restar un año
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
    age--;
  }
  
  return age;
};

export const useDateFormatter = () => {
  return {
    formatDate,
    clarionDateToDate,
    formatTime,
    formatSqlDate,
    fn_ClarionDATE2FULLSQL,
    calculateAge
  };
};

export default useDateFormatter;
