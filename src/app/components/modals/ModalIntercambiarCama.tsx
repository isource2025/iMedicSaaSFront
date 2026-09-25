'use client';

import ModalBasePaciente from './ModalBasePaciente';
import IntercambiarCamaPanel from './IntercambiarCamaPanel';
import type { PatientHeaderSnapshot } from '../../utils/bedHeader';
import type { Bed } from '../../types/beds';

interface ModalIntercambiarCamaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (camaNueva: Bed) => void;
  numeroVisita: number;
  header?: PatientHeaderSnapshot | null;
}

export default function ModalIntercambiarCama({
  isOpen,
  onClose,
  onSuccess,
  numeroVisita,
  header,
}: ModalIntercambiarCamaProps) {
  if (!isOpen) return null;

  return (
    <ModalBasePaciente
      isOpen={isOpen}
      onClose={onClose}
      titulo="Intercambiar cama entre pacientes"
      numeroVisita={String(numeroVisita)}
      header={header}
    >
      <div style={{ padding: '1rem' }}>
        <IntercambiarCamaPanel
          numeroVisita={numeroVisita}
          nombrePaciente={header?.nombre}
          onSuccess={(camaNueva) => {
            setTimeout(() => {
              onClose();
              onSuccess?.(camaNueva);
            }, 1500);
          }}
        />
      </div>
    </ModalBasePaciente>
  );
}
