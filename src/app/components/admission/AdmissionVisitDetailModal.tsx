'use client';

import { useEffect, useState } from 'react';
import Modal from '@/app/components/UI/Modal';
import AdmissionVisitDetailContent from './AdmissionVisitDetailContent';
import AdmissionVisitExportModal from './AdmissionVisitExportModal';
import styles from './AdmissionVisitDetailModal.module.css';

export type VisitDetailPayload = {
  generadoEn?: string;
  admision?: {
    NumeroVisita?: number;
    IdPaciente?: number;
    ApellidoYNombre?: string;
    NumeroDocumento?: string;
    NumeroHC?: string;
    FechaAdmision?: string;
    HoraAdmision?: string;
  };
  historialClinico?: Record<string, unknown>[];
  practicasPaciente?: Array<{
    Valor?: number;
    Practica?: string | number;
    PracticaDescripcion?: string;
    TipoPractica?: string;
    CantidadPractica?: string | number;
    FechaPractica?: string | null;
    HoraPracticaInicio?: string | null;
    HoraPracticaFin?: string | null;
    ValorSector?: string;
    Estado?: string | number;
    Factura?: string | number;
    Autorizada?: string | number;
    Profesionales?: string;
  }>;
  indicaciones?: Record<string, unknown>[];
  medicamentos?: Record<string, unknown>[];
  practicas?: {
    laboratorios?: Array<{
      IdExamen?: number;
      TipoEstudio?: string;
      FechaExamen?: string;
      HoraExamen?: string;
      Protocolo?: string;
      Laboratorio?: string;
      Estado?: string;
      detalles?: Array<Record<string, unknown>>;
    }>;
    adjuntos?: Array<Record<string, unknown>>;
  };
  /** Pedidos imPedidosEstudios (paridad iMedicAD) */
  estudios?: Array<{
    id?: number;
    IdPedido?: number;
    fechaPedido?: string | null;
    FechaPedido?: string | null;
    pedidoEstudio?: string;
    PedidoEstudio?: string;
    practicaDescripcion?: string;
    PracticaDescripcion?: string;
    idProtocolo?: number | null;
    estadoUrgencia?: string;
    EstadoUrgencia?: string;
    resultadoEstudio?: string;
    ResultadoEstudio?: string;
    nroProtocolo?: string;
    NroProtocolo?: string;
    estadoResultado?: string;
    fechaResultado?: string | null;
    cantidadAdjuntos?: number;
    medicoSolicitanteNombre?: string;
    MedicoSolicitanteNombre?: string;
    realizadorNombre?: string;
    RealizadorNombre?: string;
  }>;
  /** Protocolos clínicos HCProtocolosPtes */
  protocolos?: Array<{
    idProtocolo?: number;
    numeroProtocolo?: number;
    fecha?: string | null;
    tipoProtocolo?: string;
    tipoDescripcion?: string | null;
    diagnosticoPre?: string | null;
    diagnosticoPos?: string | null;
    tecnica?: string | null;
    texto?: string;
    estado?: string | null;
    operadorNombre?: string | null;
    practicas?: Array<Record<string, unknown>>;
  }>;
  evolucionesMedicas?: Record<string, unknown>[];
};

export type VisitDetailTabId =
  | 'resumen'
  | 'hcIngreso'
  | 'practicas'
  | 'indicaciones'
  | 'medicamentos'
  | 'evoluciones'
  | 'estudios'
  | 'protocolos'
  | 'adjuntos';

interface AdmissionVisitDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  numeroVisita: number | null;
  loading: boolean;
  data: VisitDetailPayload | null;
  initialTab?: VisitDetailTabId;
  backLabel?: string;
  onReloadData?: () => void;
}

export default function AdmissionVisitDetailModal({
  isOpen,
  onClose,
  numeroVisita,
  loading,
  data,
  initialTab,
  backLabel = '← Atrás a resultados',
  onReloadData,
}: AdmissionVisitDetailModalProps) {
  const [exportModalOpen, setExportModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) setExportModalOpen(false);
  }, [isOpen]);

  const title = numeroVisita ? `Visita #${numeroVisita}` : 'Detalle de visita';

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title={title} size="full">
        <div className={styles.modalBody}>
          <AdmissionVisitDetailContent
            numeroVisita={numeroVisita}
            loading={loading}
            data={data}
            initialSection={initialTab}
            onBack={onClose}
            backLabel={backLabel}
            onReloadData={onReloadData}
            exportButton={
              <button
                type="button"
                className={styles.exportToolbarBtn}
                onClick={() => setExportModalOpen(true)}
                disabled={!numeroVisita || loading || !data}
              >
                Exportar…
              </button>
            }
          />
        </div>
      </Modal>
      {isOpen ? (
        <AdmissionVisitExportModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          numeroVisita={numeroVisita}
          evolucionesMedicas={data?.evolucionesMedicas}
        />
      ) : null}
    </>
  );
}
