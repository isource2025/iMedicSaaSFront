'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  pacsService,
  normalizarDni,
  type PacsArchivo,
  type PacsEstudio,
  type PacsSerie,
} from '@/app/services/pacsService';
import styles from './Pacs.module.css';

// dicom-parser se descarga recién al abrir un estudio
const PacsSerieViewer = dynamic(() => import('./PacsSerieViewer'), {
  ssr: false,
  loading: () => <div className={styles.empty}>Cargando visor…</div>,
});

function fechaDicom(d: string, t?: string): string {
  const s = String(d || '');
  if (!/^\d{8}$/.test(s)) return s || '—';
  const fecha = `${s.slice(6, 8)}/${s.slice(4, 6)}/${s.slice(0, 4)}`;
  const h = String(t || '');
  return /^\d{4}/.test(h) ? `${fecha} ${h.slice(0, 2)}:${h.slice(2, 4)}` : fecha;
}

function nombreDicom(n: string): string {
  return String(n || '').replace(/\^+/g, ' ').trim();
}

function fechaIso(d: string | null | undefined): string {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '—';
}

interface PacsEstudiosPanelProps {
  /** Solo estudios de esta visita (por AccessionNumber o fecha ingreso–egreso). */
  numeroVisita?: number | null;
  /** Todos los estudios del DNI (si no se pasa numeroVisita). */
  documento?: string | number | null;
}

export default function PacsEstudiosPanel({ numeroVisita, documento }: PacsEstudiosPanelProps) {
  const porVisita = Boolean(numeroVisita && numeroVisita > 0);
  const [dni, setDni] = useState(normalizarDni(documento));
  const [rango, setRango] = useState<{ desde: string | null; hasta: string | null; egresada: boolean } | null>(null);
  const [estudios, setEstudios] = useState<PacsEstudio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [estudio, setEstudio] = useState<PacsEstudio | null>(null);
  const [series, setSeries] = useState<PacsSerie[]>([]);
  const [archivos, setArchivos] = useState<PacsArchivo[]>([]);
  const [serieUid, setSerieUid] = useState('');
  const [loadingEstudio, setLoadingEstudio] = useState(false);
  const [errorEstudio, setErrorEstudio] = useState('');

  useEffect(() => {
    setEstudio(null);
    setEstudios([]);
    setRango(null);
    setError('');
    const dniDirecto = normalizarDni(documento);
    setDni(dniDirecto);
    if (!porVisita && !dniDirecto) return;
    let cancelled = false;
    setLoading(true);
    const consulta = porVisita
      ? pacsService.listarEstudiosVisita(numeroVisita as number).then((r) => {
          if (!cancelled) {
            setDni(r.documento);
            setRango({ desde: r.desde, hasta: r.hasta, egresada: r.egresada });
          }
          return r.studies;
        })
      : pacsService.listarEstudios(dniDirecto);
    consulta
      .then((data) => {
        if (!cancelled) setEstudios(data);
      })
      .catch((e: Error & { code?: string }) => {
        if (cancelled) return;
        setError(
          e.code === 'PACS_URL_MISSING'
            ? 'Esta clínica no tiene un PACS (servidor de imágenes) configurado.'
            : e.message || 'No se pudo consultar el PACS.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [porVisita, numeroVisita, documento]);

  const abrirEstudio = async (e: PacsEstudio) => {
    setEstudio(e);
    setSeries([]);
    setArchivos([]);
    setSerieUid('');
    setErrorEstudio('');
    setLoadingEstudio(true);
    try {
      const [s, f] = await Promise.all([
        pacsService.listarSeries(e.studyInstanceUid),
        pacsService.listarArchivos(e.studyInstanceUid),
      ]);
      setSeries(s);
      setArchivos(f);
      const conArchivos = s.find((x) => f.some((a) => a.path.startsWith(`${x.seriesInstanceUid}/`)));
      setSerieUid(conArchivos?.seriesInstanceUid || s[0]?.seriesInstanceUid || '');
    } catch (err) {
      setErrorEstudio(err instanceof Error ? err.message : 'No se pudo abrir el estudio');
    } finally {
      setLoadingEstudio(false);
    }
  };

  const archivosSerie = useMemo(() => {
    if (!serieUid) return archivos;
    const propios = archivos.filter((a) => a.path.startsWith(`${serieUid}/`));
    return propios.length || series.length > 1 ? propios : archivos;
  }, [archivos, serieUid, series.length]);

  const serieActual = series.find((s) => s.seriesInstanceUid === serieUid);

  if (!dni && !loading && !error && (!porVisita || rango)) {
    return <div className={styles.empty}>El paciente no tiene DNI cargado: no se puede buscar en el PACS.</div>;
  }

  const contexto = rango
    ? `Tomógrafo · DNI ${dni} · del ${fechaIso(rango.desde)} al ${rango.egresada ? fechaIso(rango.hasta) : 'hoy (internación en curso)'}`
    : '';

  if (estudio) {
    return (
      <div className={styles.panel}>
        <div className={styles.studyHeader}>
          <button type="button" className={styles.backBtn} onClick={() => setEstudio(null)}>
            ← Estudios
          </button>
          <div className={styles.studyTitle}>
            <strong>{estudio.studyDescription || 'Estudio sin descripción'}</strong>
            <span>{fechaDicom(estudio.studyDate, estudio.studyTime)}</span>
          </div>
        </div>

        {errorEstudio ? <div className={styles.error}>{errorEstudio}</div> : null}
        {loadingEstudio ? <div className={styles.empty}>Abriendo estudio…</div> : null}

        {series.length > 1 ? (
          <div className={styles.seriesTabs} role="tablist">
            {series.map((s) => (
              <button
                key={s.seriesInstanceUid}
                type="button"
                role="tab"
                aria-selected={s.seriesInstanceUid === serieUid}
                className={s.seriesInstanceUid === serieUid ? styles.seriesTabActive : styles.seriesTab}
                onClick={() => setSerieUid(s.seriesInstanceUid)}
              >
                {s.modality || '—'} · {s.seriesDescription || `Serie ${s.seriesNumber || ''}`} ({s.instanceCount})
              </button>
            ))}
          </div>
        ) : serieActual ? (
          <div className={styles.seriesSingle}>
            {serieActual.modality || '—'} · {serieActual.seriesDescription || `Serie ${serieActual.seriesNumber}`}
          </div>
        ) : null}

        {!loadingEstudio && !errorEstudio ? (
          <PacsSerieViewer
            key={`${estudio.studyInstanceUid}:${serieUid}`}
            studyUid={estudio.studyInstanceUid}
            files={archivosSerie}
            modality={serieActual?.modality}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      {contexto ? <div className={styles.seriesSingle}>{contexto}</div> : null}
      {error ? <div className={styles.error}>{error}</div> : null}
      {loading ? (
        <div className={styles.empty}>{porVisita ? 'Buscando estudios de esta visita…' : `Buscando estudios del DNI ${dni}…`}</div>
      ) : null}
      {!loading && !error && estudios.length === 0 ? (
        <div className={styles.empty}>
          {porVisita ? 'No hay estudios del tomógrafo en esta visita.' : `No hay estudios en el PACS para el DNI ${dni}.`}
        </div>
      ) : null}
      {estudios.length > 0 ? (
        <ul className={styles.studyList}>
          {estudios.map((e) => (
            <li key={e.studyInstanceUid}>
              <button type="button" className={styles.studyItem} onClick={() => void abrirEstudio(e)}>
                <span className={styles.studyDate}>{fechaDicom(e.studyDate, e.studyTime)}</span>
                <span className={styles.studyDesc}>
                  {e.studyDescription || 'Estudio sin descripción'}
                  <small>{nombreDicom(e.patientsName)}</small>
                </span>
                <span className={styles.studyCount}>
                  {e.seriesCount} {e.seriesCount === 1 ? 'serie' : 'series'} · {e.instanceCount} imágenes
                </span>
                <span className={styles.studyOpen}>Ver</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
