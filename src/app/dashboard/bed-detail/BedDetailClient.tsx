'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import BedDetailView from '@/app/components/beds/BedDetailView';
import Loader from '@/app/components/Loader/Loader';
import { Bed } from '@/app/types/beds';

export default function BedDetailClient() {
  const searchParams = useSearchParams();
  const bedId = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [bedData, setBedData] = useState<Bed | null>(null);

  useEffect(() => {
    const fetchBedData = async () => {
      if (!bedId) return;
      try {
        setLoading(false);
        setBedData({
          id: bedId || '0',
          numeroCama: '305',
          sector: 'Internación General',
          estado: 'ocupada',
          estadoDescripcion: 'Ocupada',
          NombrePaciente: 'Juan Pérez',
          documentoPaciente: '28456789',
          fechaIngreso: Date.now(),
          fechaEgreso: 0,
          diagnosticoDescripcion: 'Neumonía bilateral',
          servicioMedicoDescripcion: 'Clínica Médica',
          razonSocialCliente: 'OSDE',
          SexoPaciente: 'm',
          descripcionSexo: 'Masculino',
          numeroVisita: 12345,
          valorEstadoOriginal: 'O',
          mostrarNumeroVisita: '12345',
          observaciones: '',
          tipoRecurso: 'cama',
        });
      } catch (error) {
        console.error('Error al cargar datos de la cama:', error);
        setLoading(false);
      }
    };

    fetchBedData();
  }, [bedId]);

  if (!bedId) {
    return (
      <div className={styles.errorContainer}>
        <h1>Error</h1>
        <p>No se ha especificado una cama para visualizar.</p>
      </div>
    );
  }

  return (
    <main className={styles.container}>
      {loading ? (
        <div style={{ position: 'relative', minHeight: '300px' }}>
          <Loader />
        </div>
      ) : bedData ? (
        <BedDetailView bed={bedData} />
      ) : (
        <div className={styles.errorState}>No se pudo cargar la información de la cama.</div>
      )}
    </main>
  );
}
