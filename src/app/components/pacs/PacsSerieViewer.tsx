'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { pacsService, type PacsArchivo } from '@/app/services/pacsService';
import { parseDicomFrame, renderDicomFrame, type DicomFrame } from '@/app/utils/dicomFrame';
import styles from './Pacs.module.css';

const CONCURRENCIA = 4;
const FPS_OPCIONES = [5, 10, 15, 20, 30];

const PRESETS_CT: { id: string; label: string; wc: number; ww: number }[] = [
  { id: 'blandas', label: 'Partes blandas', wc: 40, ww: 400 },
  { id: 'pulmon', label: 'Pulmón', wc: -600, ww: 1500 },
  { id: 'hueso', label: 'Hueso', wc: 400, ww: 1800 },
  { id: 'cerebro', label: 'Cerebro', wc: 40, ww: 80 },
];

function ordenPorNombre(path: string): number {
  const m = path.match(/(\d+)\.dcm$/i);
  return m ? Number(m[1]) : 0;
}

interface PacsSerieViewerProps {
  studyUid: string;
  files: PacsArchivo[];
  modality?: string;
}

export default function PacsSerieViewer({ studyUid, files, modality }: PacsSerieViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const framesRef = useRef<(DicomFrame | null)[]>([]);
  const dragRef = useRef<{ x: number; y: number; wc: number; ww: number } | null>(null);

  const [orden, setOrden] = useState<number[]>([]);
  const [pos, setPos] = useState(0);
  const [cargados, setCargados] = useState(0);
  const [fallidos, setFallidos] = useState(0);
  const [errorCarga, setErrorCarga] = useState('');
  const [playing, setPlaying] = useState(false);
  const [fps, setFps] = useState(10);
  const [ventana, setVentana] = useState<{ wc: number; ww: number } | null>(null);

  const total = files.length;

  useEffect(() => {
    const controller = new AbortController();
    const inicial = files
      .map((f, i) => ({ i, n: ordenPorNombre(f.path) }))
      .sort((a, b) => a.n - b.n)
      .map((x) => x.i);

    framesRef.current = new Array(files.length).fill(null);
    setOrden(inicial);
    setPos(0);
    setCargados(0);
    setFallidos(0);
    setErrorCarga('');
    setPlaying(false);
    setVentana(null);

    let siguiente = 0;
    let ok = 0;
    let ko = 0;

    const worker = async () => {
      while (!controller.signal.aborted && siguiente < inicial.length) {
        const idx = inicial[siguiente];
        siguiente += 1;
        try {
          const buffer = await pacsService.descargarArchivo(studyUid, files[idx].path, controller.signal);
          if (controller.signal.aborted) return;
          framesRef.current[idx] = parseDicomFrame(buffer);
          ok += 1;
          setCargados(ok);
        } catch (e) {
          if (controller.signal.aborted) return;
          ko += 1;
          setFallidos(ko);
          setErrorCarga(e instanceof Error ? e.message : 'Error al cargar una imagen');
        }
      }
    };

    void Promise.all(Array.from({ length: Math.min(CONCURRENCIA, inicial.length) }, worker)).then(() => {
      if (controller.signal.aborted) return;
      const frames = framesRef.current;
      const conInstancia = inicial.every((i) => frames[i] == null || frames[i]!.instanceNumber != null);
      if (!conInstancia) return;
      setOrden((prev) => {
        const actual = prev.length ? prev : inicial;
        const reordenado = [...actual].sort(
          (a, b) => (frames[a]?.instanceNumber ?? 0) - (frames[b]?.instanceNumber ?? 0),
        );
        return reordenado;
      });
    });

    return () => controller.abort();
  }, [studyUid, files]);

  const frameActual = orden.length ? framesRef.current[orden[pos]] : null;

  useEffect(() => {
    if (!ventana && frameActual) setVentana({ wc: frameActual.windowCenter, ww: frameActual.windowWidth });
  }, [frameActual, ventana]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !frameActual || !ventana) return;
    renderDicomFrame(canvas, frameActual, ventana.wc, ventana.ww);
  }, [frameActual, ventana, cargados, pos, orden]);

  const mover = useCallback(
    (delta: number) => {
      if (!total) return;
      setPos((p) => Math.min(total - 1, Math.max(0, p + delta)));
    },
    [total],
  );

  useEffect(() => {
    if (!playing || !total) return;
    const id = window.setInterval(() => setPos((p) => (p + 1) % total), 1000 / fps);
    return () => window.clearInterval(id);
  }, [playing, fps, total]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setPlaying(false);
      mover(e.deltaY > 0 ? 1 : -1);
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, [mover]);

  // Flechas a nivel ventana: no dependen de que el canvas tenga foco.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || t?.isContentEditable) return;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        setPlaying(false);
        mover(1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        setPlaying(false);
        mover(-1);
      } else if (e.key === ' ') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mover]);

  useEffect(() => {
    stageRef.current?.focus({ preventScroll: true });
  }, [studyUid, files]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!ventana) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, wc: ventana.wc, ww: ventana.ww };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const k = Math.max(d.ww / 300, 0.5);
    setVentana({
      ww: Math.max(1, d.ww + (e.clientX - d.x) * k),
      wc: d.wc + (e.clientY - d.y) * k,
    });
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const restablecerVentana = () => {
    if (frameActual) setVentana({ wc: frameActual.windowCenter, ww: frameActual.windowWidth });
  };

  const descargarActual = async () => {
    if (!orden.length) return;
    const file = files[orden[pos]];
    try {
      const buffer = await pacsService.descargarArchivo(studyUid, file.path);
      const url = URL.createObjectURL(new Blob([buffer], { type: 'application/dicom' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = file.path.split('/').pop() || 'imagen.dcm';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      setErrorCarga(e instanceof Error ? e.message : 'No se pudo descargar');
    }
  };

  if (!total) return <div className={styles.empty}>La serie no tiene imágenes.</div>;

  const esCT = (modality || '').toUpperCase() === 'CT';
  const progreso = cargados + fallidos;

  return (
    <div className={styles.viewer}>
      <div
        ref={stageRef}
        className={styles.stage}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={restablecerVentana}
      >
        <canvas ref={canvasRef} className={styles.canvas} />
        {!frameActual ? (
          <div className={styles.stageMsg}>
            {fallidos === total ? errorCarga || 'No se pudieron cargar las imágenes.' : 'Cargando imagen…'}
          </div>
        ) : null}
        <div className={styles.overlayTL}>
          Imagen {pos + 1} / {total}
          {frameActual?.sliceLocation != null ? ` · Pos. ${frameActual.sliceLocation.toFixed(1)} mm` : ''}
        </div>
        {ventana ? (
          <div className={styles.overlayTR}>
            C {Math.round(ventana.wc)} · A {Math.round(ventana.ww)}
          </div>
        ) : null}
        {progreso < total ? (
          <div className={styles.overlayBL}>
            Descargando {progreso}/{total}
          </div>
        ) : null}
      </div>

      <input
        type="range"
        className={styles.slider}
        min={0}
        max={Math.max(total - 1, 0)}
        value={pos}
        onChange={(e) => {
          setPlaying(false);
          setPos(Number(e.target.value));
        }}
        aria-label="Imagen de la serie"
      />

      <div className={styles.controls}>
        <button type="button" className={styles.ctrlBtn} onClick={() => mover(-1)} aria-label="Anterior">
          ◀
        </button>
        <button
          type="button"
          className={`${styles.ctrlBtn} ${styles.ctrlPrimary}`}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? '❚❚ Pausa' : '▶ Reproducir'}
        </button>
        <button type="button" className={styles.ctrlBtn} onClick={() => mover(1)} aria-label="Siguiente">
          ▶
        </button>
        <label className={styles.ctrlLabel}>
          Velocidad
          <select value={fps} onChange={(e) => setFps(Number(e.target.value))} className={styles.ctrlSelect}>
            {FPS_OPCIONES.map((f) => (
              <option key={f} value={f}>
                {f} img/s
              </option>
            ))}
          </select>
        </label>

        <span className={styles.ctrlSep} />

        {esCT
          ? PRESETS_CT.map((p) => (
              <button key={p.id} type="button" className={styles.ctrlBtn} onClick={() => setVentana({ wc: p.wc, ww: p.ww })}>
                {p.label}
              </button>
            ))
          : null}
        <button type="button" className={styles.ctrlBtn} onClick={restablecerVentana}>
          Original
        </button>
        <button type="button" className={styles.ctrlBtn} onClick={() => void descargarActual()}>
          Descargar .dcm
        </button>
      </div>

      <p className={styles.hint}>
        ← → o rueda: cambiar imagen · Arrastrar: brillo/contraste · Doble clic: restablecer · Espacio: reproducir
      </p>
      {fallidos > 0 && fallidos < total ? (
        <p className={styles.warn}>
          {fallidos} imagen(es) no se pudieron cargar{errorCarga ? `: ${errorCarga}` : ''}
        </p>
      ) : null}
    </div>
  );
}
