import { useEffect, useState } from 'react';
import { MedicacionActiva } from '../types/medicacion';
import { PedidoEstudio } from '../types/estudios';

interface UseBedRelatedDataResult {
  meds: MedicacionActiva[];
  studies: PedidoEstudio[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useBedRelatedData(numeroVisita?: number | null): UseBedRelatedDataResult {
  const [meds, setMeds] = useState<MedicacionActiva[]>([]);
  const [studies, setStudies] = useState<PedidoEstudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!numeroVisita) {
        setMeds([]);
        setStudies([]);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        // Temporal: backend no expone medicaciones/estudios aún
        if (!mounted) return;
        setMeds([]);
        setStudies([]);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Error cargando datos relacionados');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [numeroVisita, tick]);

  const refresh = () => setTick(t => t + 1);

  return { meds, studies, loading, error, refresh };
}
