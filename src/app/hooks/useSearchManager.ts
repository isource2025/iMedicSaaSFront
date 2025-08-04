import { useState, useEffect, useRef } from 'react';

/**
 * Propiedades para el hook useSearchManager
 * @template T - Tipo de datos que se manejarán
 */
export interface UseSearchManagerProps<T> {
  /** 
   * Dataset opcional. Si se proporciona, el hook filtrará localmente.
   * Si no se proporciona, utilizará fetchRemote para buscar en el servidor.
   */
  dataset?: T[];
  
  /** 
   * Claves del objeto T que se utilizarán para filtrar en búsquedas locales 
   */
  searchKeys: (keyof T)[];
  
  /** 
   * Función para buscar remotamente. Requerida si no se proporciona dataset.
   * @param term - Término de búsqueda
   * @returns Promise con los resultados
   */
  fetchRemote?: (term: string) => Promise<T[]>;
  
  /**
   * Tiempo de espera para el debounce en milisegundos
   * @default 300
   */
  debounceTime?: number;
  
  /**
   * Longitud mínima del término de búsqueda para activar la búsqueda
   * @default 2
   */
  minSearchLength?: number;
}

/**
 * Hook para manejar búsquedas, ya sea filtrando localmente o buscando en el servidor
 * @template T - Tipo de datos que se manejarán
 */
export const useSearchManager = <T>({
  dataset,
  searchKeys,
  fetchRemote,
  debounceTime = 300,
  minSearchLength = 2,
}: UseSearchManagerProps<T>) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [results, setResults] = useState<T[]>(dataset || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Referencia para el timeout del debounce
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Referencia para el término de búsqueda anterior para evitar búsquedas duplicadas
  const prevSearchTermRef = useRef<string>('');
  
  // Referencia para almacenar los resultados previos para comparación
  const prevResultsRef = useRef<T[]>([]);

  useEffect(() => {
    // Normalizar el término de búsqueda
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const prevNormalizedTerm = prevSearchTermRef.current.trim().toLowerCase();
    
    // Actualizar la referencia del término de búsqueda
    prevSearchTermRef.current = searchTerm;
  
    
    // Si el término es demasiado corto, no realizar búsqueda
    if (normalizedTerm.length < minSearchLength) {
      return;
    }
    
    // Si el término es el mismo que el anterior, no realizar búsqueda nuevamente
    // Eliminamos la comparación con results para evitar bucles infinitos
    if (normalizedTerm === prevNormalizedTerm) {
      return;
    }
    
    // Limpiar el timeout anterior si existe
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Configurar el debounce para evitar demasiadas búsquedas
    timeoutRef.current = setTimeout(() => {
      if (dataset) {
        // Filtrado local cuando hay dataset disponible
        try {
          const filtered = dataset.filter((item) =>
            searchKeys.some((key) => {
              const value = item[key];
              // Convertir el valor a string si es posible y verificar si incluye el término
              if (value === null || value === undefined) return false;
              return String(value).toLowerCase().includes(normalizedTerm);
            })
          );
          // Guardar los resultados actuales antes de actualizarlos
          prevResultsRef.current = [...filtered];
          setResults(filtered);
          setError(null);
        } catch (err) {
          console.error('Error al filtrar datos localmente:', err);
          setError('Error al filtrar datos');
          setResults([]);
        }
      } else if (fetchRemote) {
        // Búsqueda remota cuando no hay dataset
        setLoading(true);
        fetchRemote(normalizedTerm)
          .then((data) => {
            // Verificar que el término de búsqueda no haya cambiado mientras se realizaba la búsqueda
            if (prevSearchTermRef.current.trim().toLowerCase() === normalizedTerm) {
              // Guardar los resultados actuales antes de actualizarlos
              prevResultsRef.current = [...data];
              setResults(data);
              setError(null);
            }
          })
          .catch((err) => {
            console.error('Error en búsqueda remota:', err);
            setError('Error al buscar datos');
            setResults([]);
          })
          .finally(() => {
            setLoading(false);
          });
      }
    }, debounceTime);
    
    // Limpiar el timeout si el componente se desmonta o cambian las dependencias
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [searchTerm, dataset, fetchRemote, searchKeys, debounceTime, minSearchLength]);

  return {
    searchTerm,
    setSearchTerm,
    results,
    loading,
    error,
    isSearching: searchTerm.trim().length >= minSearchLength,
  };
};

export default useSearchManager;
