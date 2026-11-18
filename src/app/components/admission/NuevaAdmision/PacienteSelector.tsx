'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import ModalAddPatient from '@/app/components/modals/ModalAddPatient';
import { createPatient, searchPatients } from '@/app/services/patientService';
import type { Patient, PatientFormData } from '@/app/types/PatientInterface';
import styles from './styles.module.css';

export interface PacienteElegido {
  idPaciente: number;
  apellidoyNombre: string;
  documento: string;
  numeroHC: string;
  /** imClientes.Valor: precarga la cobertura del formulario */
  cobertura: string;
  /** imClientes.RazonSocial, solo para mostrar */
  coberturaDescripcion: string;
  /** imPacientes.NumeroSSN. Informativo: no se persiste en imVisita. */
  nAfiliado: string;
}

interface Props {
  paciente: PacienteElegido | null;
  onSeleccionar: (p: PacienteElegido) => void;
  onLimpiar: () => void;
  disabled?: boolean;
}

function aPacienteElegido(p: Patient): PacienteElegido {
  return {
    idPaciente: Number(p.IDPaciente),
    apellidoyNombre: String(p.ApellidoyNombre || '').trim(),
    documento: String(p.NumeroDocumento || '').trim(),
    numeroHC: String(p.NumeroHC || '').trim(),
    cobertura: String(p.Cobertura || '').trim(),
    coberturaDescripcion: String(p.CoberturaDescripcion || '').trim(),
    nAfiliado: String(p.nAfiliado || '').trim(),
  };
}

export default function PacienteSelector({
  paciente,
  onSeleccionar,
  onLimpiar,
  disabled,
}: Props) {
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState<Patient[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState('');
  const [modalNuevo, setModalNuevo] = useState(false);
  const [guardandoPaciente, setGuardandoPaciente] = useState(false);
  const contenedor = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCrearPaciente = useCallback(
    async (data: PatientFormData) => {
      setGuardandoPaciente(true);
      try {
        const file: File | null = (data as { _fotoFile?: File })._fotoFile || null;
        const created = await createPatient(data, file);
        onSeleccionar(aPacienteElegido(created));
        setModalNuevo(false);
        setAbierto(false);
        setQuery('');
        return true;
      } catch (err) {
        console.error('Error al crear paciente desde nueva admisión:', err);
        return false;
      } finally {
        setGuardandoPaciente(false);
      }
    },
    [onSeleccionar],
  );

  // Al entrar a Nueva Admisión, el cursor arranca en el buscador de paciente.
  useEffect(() => {
    if (disabled || paciente) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [disabled, paciente]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResultados([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setBuscando(true);
        setError('');
        setResultados(await searchPatients(q));
      } catch {
        setError('No se pudo buscar el paciente');
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (contenedor.current && !contenedor.current.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener('mousedown', cerrar);
    return () => document.removeEventListener('mousedown', cerrar);
  }, []);

  if (paciente) {
    return (
      <div className={styles.pacienteElegido}>
        <div>
          <span className={styles.pacienteNombre}>{paciente.apellidoyNombre || '—'}</span>
          <span className={styles.pacienteDatos}>
            DNI {paciente.documento || '—'}
            {paciente.numeroHC ? ` · HC ${paciente.numeroHC}` : ''}
            {` · ID ${paciente.idPaciente}`}
            {paciente.coberturaDescripcion ? ` · ${paciente.coberturaDescripcion}` : ''}
            {paciente.nAfiliado ? ` · Afiliado ${paciente.nAfiliado}` : ''}
          </span>
        </div>
        {!disabled && (
          <button type="button" className={styles.botonIcono} onClick={onLimpiar} title="Cambiar paciente">
            <X size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.buscadorPaciente} ref={contenedor} data-asistente-grupo="Paciente de la admisión">
      <div className={styles.buscadorInput}>
        <Search size={16} />
        <input
          ref={inputRef}
          type="text"
          aria-label="Buscar paciente por apellido, nombre, DNI o nº de visita"
          value={query}
          placeholder="Buscar por apellido, nombre, documento o nº de visita (mínimo 3 caracteres)"
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          disabled={disabled}
        />
        {/* Fuera del Tab: después del buscador sigue Fecha → Hora → resto del form */}
        <button
          type="button"
          className={styles.enlaceNuevoPaciente}
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setModalNuevo(true)}
        >
          <UserPlus size={14} /> Nuevo paciente
        </button>
      </div>

      {abierto && query.trim().length >= 3 && (
        <ul className={styles.resultados}>
          {buscando && <li className={styles.resultadoVacio}>Buscando…</li>}
          {!buscando && error && <li className={styles.resultadoError}>{error}</li>}
          {!buscando && !error && resultados.length === 0 && (
            <li className={styles.resultadoVacio}>Sin resultados</li>
          )}
          {!buscando &&
            resultados.map((p) => (
              <li key={p.IDPaciente}>
                <button
                  type="button"
                  onClick={() => {
                    onSeleccionar(aPacienteElegido(p));
                    setAbierto(false);
                    setQuery('');
                  }}
                >
                  <span className={styles.resultadoNombre}>{p.ApellidoyNombre}</span>
                  <span className={styles.resultadoMeta}>
                    DNI {p.NumeroDocumento || '—'}
                    {p.NumeroHC ? ` · HC ${p.NumeroHC}` : ''}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}

      <ModalAddPatient
        isOpen={modalNuevo}
        onClose={() => setModalNuevo(false)}
        onSubmit={handleCrearPaciente}
        isSubmitting={guardandoPaciente}
      />
    </div>
  );
}
