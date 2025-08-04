// Interfaces for AdmissionTables components
import React from 'react';
import { OpcGrd, OpcGrdGroup } from '../../../types/opcGrd.types';
import { ClasePaciente } from '../../../types/clasePaciente.types';
import { DadorOrganos } from '../../../types/dadorOrganos.types';
import { Diagnostico } from '../../../types/diagnostico.types';
import { DisposicionEgreso } from '../../../types/disposicionEgreso.types';
import { EstadoAmbulatorio } from '../../../types/estadoAmbulatorio.types';
import { EstadoCivil } from '../../../types/estadoCivil.types';

// Props for the AdmissionTables component
export interface AdmissionTablesProps {
  // Any props needed would go here
}

// Card props for individual option cards
export interface TableCardProps {
  option: OpcGrd;
  onEdit: (option: OpcGrd) => void;
  onDelete: (option: OpcGrd) => void;
  onShowData: (optionType: string) => void;
  hasDadorOrganos?: boolean;
  hasDiagnosticos?: boolean;
  hasDisposicionEgreso?: boolean;
  hasEstadoAmbulatorio?: boolean;
  hasEstadoCivil?: boolean;
}

// Props for TableHeader component
export interface TableHeaderProps {
  showCreateForm: boolean;
  setShowCreateForm: React.Dispatch<React.SetStateAction<boolean>>;
  createDescripcion: string;
  setCreateDescripcion: React.Dispatch<React.SetStateAction<string>>;
  handleCreateOption: () => void;
}

// Props for CreateOptionForm component
export interface CreateOptionFormProps {
  createDescripcion: string;
  setCreateDescripcion: React.Dispatch<React.SetStateAction<string>>;
  handleCreateOption: () => void;
  handleCancelCreate: () => void;
}
