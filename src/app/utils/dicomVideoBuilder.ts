import { renderDicomToCanvas } from '@/app/utils/dicomRenderer';
import { sortDicomFilesByNumericOrder } from '@/app/utils/dicomSort';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSupportedVideoMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'video/webm';
}

async function renderFrameToCanvas(
  buffer: ArrayBuffer,
  canvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): Promise<void> {
  const temp = document.createElement('canvas');
  await renderDicomToCanvas(buffer, temp);

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el lienzo de video.');

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(temp, 0, 0, targetWidth, targetHeight);
}

export interface DicomVideoBuildProgress {
  current: number;
  total: number;
  phase: 'render' | 'encode';
  message: string;
}

export interface DicomVideoBuildResult {
  blob: Blob;
  fileName: string;
  frameCount: number;
  fps: number;
  mimeType: string;
}

export async function buildVideoFromDicomFiles(
  files: File[],
  fps: number,
  onProgress?: (progress: DicomVideoBuildProgress) => void
): Promise<DicomVideoBuildResult> {
  const sorted = sortDicomFilesByNumericOrder(files);
  if (sorted.length < 2) {
    throw new Error('Se necesitan al menos 2 archivos DICOM para generar un video.');
  }

  const safeFps = Math.min(60, Math.max(1, Math.round(fps)));
  const canvas = document.createElement('canvas');

  onProgress?.({
    current: 0,
    total: sorted.length,
    phase: 'render',
    message: 'Preparando primer frame…',
  });

  const firstBuffer = await sorted[0].arrayBuffer();
  const probe = document.createElement('canvas');
  await renderDicomToCanvas(firstBuffer, probe);
  const targetWidth = probe.width;
  const targetHeight = probe.height;

  if (!targetWidth || !targetHeight) {
    throw new Error('No se pudieron leer las dimensiones del primer DICOM.');
  }

  const mimeType = getSupportedVideoMimeType();
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
  });

  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  const recordingDone = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const baseType = mimeType.split(';')[0];
      resolve(new Blob(chunks, { type: baseType }));
    };
    recorder.onerror = () => reject(new Error('Error al codificar el video.'));
  });

  recorder.start(100);

  for (let i = 0; i < sorted.length; i += 1) {
    onProgress?.({
      current: i + 1,
      total: sorted.length,
      phase: 'render',
      message: `Renderizando frame ${i + 1} de ${sorted.length}…`,
    });

    const buffer = await sorted[i].arrayBuffer();
    await renderFrameToCanvas(buffer, canvas, targetWidth, targetHeight);
    track.requestFrame?.();
    await wait(Math.round(1000 / safeFps));
  }

  onProgress?.({
    current: sorted.length,
    total: sorted.length,
    phase: 'encode',
    message: 'Finalizando video…',
  });

  await wait(300);
  recorder.stop();
  const blob = await recordingDone;

  const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  return {
    blob,
    fileName: `dicom_serie_${stamp}.${ext}`,
    frameCount: sorted.length,
    fps: safeFps,
    mimeType: mimeType.split(';')[0],
  };
}
