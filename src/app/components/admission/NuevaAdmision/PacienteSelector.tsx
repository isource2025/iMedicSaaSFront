'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { searchPatients } from '@/app/services/patientService';
import type { Patient } from '@/app/types/PatientInterface';
import styles from './styles.module.css';

export interface PacienteElegido {
  idPaciente: number;
  apellidoyNombre: string;
  documento: string;
  numeroHC: string;
  /** imPacientes.NumeroCuenta: precarga la cobertura del formulario */
  cobertura: string;
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
  const contenedor = useRef<HTMLDivElement>(null);

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
    <div className={styles.buscadorPaciente} ref={contenedor}>
      <div className={styles.buscadorInput}>
        <Search size={16} />
        <input
          type="text"
          value={query}
          placeholder="Buscar por apellido, nombre o documento (mínimo 3 caracteres)"
          onChange={(e) => {
            setQuery(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          disabled={disabled}
        />
        <a href="/dashboard/patients" className={styles.enlaceNuevoPaciente}>
          <UserPlus size={14} /> Nuevo paciente
        </a>
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
    </div>
  );
}
